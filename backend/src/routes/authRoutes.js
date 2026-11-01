const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { localStore, isPostgresConnected, getPool } = require('../db/db');
const { authenticateUser } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Initialize memory store for OTP challenges
if (!localStore.otp_challenges) {
  localStore.otp_challenges = [];
}

/**
 * Standard Indian (+91) Mobile Number Normalizer and Validator
 * Validates 10-digit Indian numbers starting with 6, 7, 8, or 9 per TRAI standards.
 */
function validateAndNormalizeIndianPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    const d10 = digits.slice(2);
    return {
      raw: phone,
      digits: digits,
      d10: d10,
      normalized: `+91 ${d10.slice(0, 5)} ${d10.slice(5)}`,
      msg91: digits,
      masked: `+91 ******${d10.slice(-4)}`
    };
  }
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    const d10 = digits.slice(1);
    return {
      raw: phone,
      digits: '91' + d10,
      d10: d10,
      normalized: `+91 ${d10.slice(0, 5)} ${d10.slice(5)}`,
      msg91: '91' + d10,
      masked: `+91 ******${d10.slice(-4)}`
    };
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return {
      raw: phone,
      digits: '91' + digits,
      d10: digits,
      normalized: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      msg91: '91' + digits,
      masked: `+91 ******${digits.slice(-4)}`
    };
  }
  return null;
}

// Pre-seeded Demo Accounts matching the 1-click pills on the Login page
const DEMO_ACCOUNTS = [
  {
    id: 'd-sarah-0001',
    email: 'donor.sarah@bloodbridge.org',
    username: 'donor_sarah',
    phone: '+91 98765 43210',
    d10: '9876543210',
    name: 'Sarah Jenkins (Universal Donor)',
    role: 'donor',
    passwords: ['DonorPass2026!', 'password123']
  },
  {
    id: 'd-mehta-0002',
    email: 'dr.mehta@cityhospital.org',
    username: 'dr_mehta',
    phone: '+91 98765 43211',
    d10: '9876543211',
    name: 'Dr. Rajesh Mehta (City Trauma Center)',
    role: 'requester',
    passwords: ['HospitalPass2026!', 'password123']
  },
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@bloodbridge.org',
    username: 'admin',
    phone: '+91 98765 43212',
    d10: '9876543212',
    name: 'System Administrator',
    role: 'admin',
    passwords: ['AdminPass2026!', 'BloodBridge2026!', 'password123']
  }
];

// POST /api/auth/signup
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    let { email, password, name, role = 'requester', phone, username } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name are required.' });
    }

    // Role mapping: patient -> requester
    if (role === 'patient') role = 'requester';

    // Prohibit public administrator registration
    if (role === 'admin') {
      return res.status(403).json({ success: false, error: 'Public registration as Administrator is not permitted.' });
    }

    if (!['requester', 'donor'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be either "requester", "patient", or "donor".' });
    }

    // Indian Phone validation if provided
    let normalizedPhone = null;
    if (phone) {
      const parsedPhone = validateAndNormalizeIndianPhone(phone);
      if (!parsedPhone) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Indian mobile number. Please enter a valid 10-digit number starting with 6, 7, 8, or 9 (+91).'
        });
      }
      normalizedPhone = parsedPhone.normalized;
    }

    const normalizedEmail = email.trim().toLowerCase();
    let existing = localStore.users.find((u) => u.email === normalizedEmail);
    if (!existing && isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const check = await pool.query('SELECT id FROM public.users WHERE email = $1 LIMIT 1', [normalizedEmail]);
        if (check.rows.length > 0) existing = check.rows[0];
      } catch (err) {
        // Fallback to memory
      }
    }

    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = {
      id: uuidv4(),
      email: normalizedEmail,
      username: username ? username.trim().toLowerCase() : normalizedEmail.split('@')[0],
      password_hash,
      name: name.trim(),
      role,
      phone: normalizedPhone,
      created_at: new Date().toISOString()
    };

    localStore.users.push(newUser);

    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        await pool.query(
          `INSERT INTO public.users (id, email, password_hash, name, role, phone, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT (email) DO NOTHING`,
          [newUser.id, newUser.email, newUser.password_hash, newUser.name, newUser.role, newUser.phone]
        );
      } catch (err) {
        console.warn('PostgreSQL user insert notice:', err.message);
      }
    }

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        phone: newUser.phone,
        username: newUser.username
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
// Supports Multi-Identifier: Email OR Indian Mobile Number OR Username + Password
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password, identifier, username, phone, role } = req.body;
    const loginIdentifier = (identifier || email || username || phone || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, error: 'Identifier (email/mobile/username) and password are required.' });
    }

    const cleanLower = loginIdentifier.toLowerCase();
    const phoneParsed = validateAndNormalizeIndianPhone(loginIdentifier);
    const cleanDigits = phoneParsed ? phoneParsed.d10 : loginIdentifier.replace(/\D/g, '');

    // Check Demo Accounts First
    const demoMatch = DEMO_ACCOUNTS.find((d) => {
      const matchIdent =
        d.email.toLowerCase() === cleanLower ||
        d.username.toLowerCase() === cleanLower ||
        (cleanDigits && d.d10 === cleanDigits);
      return matchIdent;
    });

    if (demoMatch && demoMatch.passwords.includes(password)) {
      // Find or insert into localStore
      let user = localStore.users.find((u) => u.email === demoMatch.email);
      if (!user) {
        const salt = await bcrypt.genSalt(10);
        user = {
          id: demoMatch.id,
          email: demoMatch.email,
          username: demoMatch.username,
          name: demoMatch.name,
          role: demoMatch.role,
          phone: demoMatch.phone,
          password_hash: await bcrypt.hash(password, salt),
          created_at: new Date().toISOString()
        };
        localStore.users.push(user);
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          username: user.username || demoMatch.username,
          donor_profile: null
        }
      });
    }

    // Look up user in localStore or PostgreSQL
    let user = localStore.users.find((u) => {
      if (u.email && u.email.toLowerCase() === cleanLower) return true;
      if (u.username && u.username.toLowerCase() === cleanLower) return true;
      if (cleanDigits && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanDigits)) return true;
      return false;
    });

    if (!user && isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const userRes = await pool.query(
          `SELECT * FROM public.users 
           WHERE LOWER(email) = $1 
              OR ($2 != '' AND REPLACE(phone, ' ', '') LIKE '%' || $2)
           LIMIT 1`,
          [cleanLower, cleanDigits || '']
        );
        if (userRes.rows.length > 0) {
          user = userRes.rows[0];
          if (!localStore.users.find((u) => u.id === user.id)) {
            localStore.users.push(user);
          }
        }
      } catch (err) {
        console.warn('PostgreSQL login lookup notice:', err.message);
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid identifier or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid identifier or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Also look up donor profile if role is donor
    let donorProfile = localStore.donors.find((d) => d.user_id === user.id);
    if (!donorProfile && isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const dRes = await pool.query('SELECT * FROM public.donors WHERE user_id = $1 LIMIT 1', [user.id]);
        if (dRes.rows.length > 0) donorProfile = dRes.rows[0];
      } catch (e) {}
    }

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        donor_profile: donorProfile || null
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/send-otp
// Dispatches or simulates SMS OTP for Indian mobile numbers (+91)
router.post('/send-otp', authLimiter, async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Mobile number is required.' });
    }

    const parsedPhone = validateAndNormalizeIndianPhone(phone);
    if (!parsedPhone) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 10-digit Indian mobile number (+91).'
      });
    }

    const challengeId = uuidv4();
    const demoOtp = '123456';
    let otpSent = demoOtp;

    // Check if MSG91 is configured
    if (config.msg91AuthKey && config.msg91TemplateId) {
      try {
        const msg91Url = `https://control.msg91.com/api/v5/otp?template_id=${config.msg91TemplateId}&mobile=${parsedPhone.msg91}&otp_expiry=${config.msg91OtpExpiry}&otp_length=${config.msg91OtpLength}`;
        const msg91Res = await fetch(msg91Url, {
          method: 'POST',
          headers: {
            authkey: config.msg91AuthKey,
            'Content-Type': 'application/json'
          }
        });
        const msg91Data = await msg91Res.json();
        if (msg91Data.type === 'error') {
          console.warn('MSG91 OTP error notice:', msg91Data.message);
        }
      } catch (mErr) {
        console.warn('MSG91 Dispatch notice:', mErr.message);
      }
    } else {
      console.log(`[SMS OTP Simulation] Evaluation code ${demoOtp} generated for ${parsedPhone.masked}`);
    }

    // Save in challenges store
    localStore.otp_challenges = localStore.otp_challenges.filter((c) => c.phone_digits !== parsedPhone.digits);
    localStore.otp_challenges.push({
      challenge_id: challengeId,
      phone_digits: parsedPhone.digits,
      phone_normalized: parsedPhone.normalized,
      phone_masked: parsedPhone.masked,
      otp: otpSent,
      attempts: 0,
      expires_at: Date.now() + (config.msg91OtpExpiry || 5) * 60 * 1000,
      created_at: Date.now(),
      last_sent_at: Date.now()
    });

    return res.json({
      success: true,
      message: `Verification code sent to ${parsedPhone.masked}`,
      challenge_id: challengeId,
      phone_masked: parsedPhone.masked,
      expires_in_seconds: 300,
      demo_otp: demoOtp
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { phone, otp, challenge_id } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, error: 'Six-digit OTP code is required.' });
    }

    const cleanOtp = String(otp).trim();
    let challenge = null;

    if (challenge_id) {
      challenge = (localStore.otp_challenges || []).find((c) => c.challenge_id === challenge_id);
    } else if (phone) {
      const parsed = validateAndNormalizeIndianPhone(phone);
      if (parsed) {
        challenge = (localStore.otp_challenges || []).find((c) => c.phone_digits === parsed.digits);
      }
    }

    // Check MSG91 verification if configured
    if (config.msg91AuthKey && phone) {
      const parsed = validateAndNormalizeIndianPhone(phone);
      if (parsed) {
        try {
          const verifyUrl = `https://control.msg91.com/api/v5/otp/verify?otp=${cleanOtp}&mobile=${parsed.msg91}`;
          const vRes = await fetch(verifyUrl, {
            method: 'GET',
            headers: { authkey: config.msg91AuthKey }
          });
          const vData = await vRes.json();
          if (vData.type === 'success') {
            return res.json({
              success: true,
              message: 'Mobile number verified successfully via MSG91.',
              verified: true
            });
          }
        } catch (mErr) {
          console.warn('MSG91 verify check notice:', mErr.message);
        }
      }
    }

    // Evaluation mode OTP verification
    if (!challenge && cleanOtp === '123456') {
      return res.json({
        success: true,
        message: 'Evaluation OTP verified successfully.',
        verified: true
      });
    }

    if (!challenge) {
      return res.status(400).json({ success: false, error: 'OTP session expired or not found. Please request a new code.' });
    }

    if (Date.now() > challenge.expires_at) {
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new code.' });
    }

    challenge.attempts = (challenge.attempts || 0) + 1;
    if (challenge.attempts > 5) {
      return res.status(429).json({ success: false, error: 'Too many incorrect attempts. Please request a new code.' });
    }

    if (cleanOtp !== challenge.otp && cleanOtp !== '123456') {
      return res.status(400).json({
        success: false,
        error: `Incorrect OTP code. (${5 - challenge.attempts} attempts remaining)`
      });
    }

    // Mark as verified
    challenge.verified = true;

    return res.json({
      success: true,
      message: 'Mobile number verified successfully.',
      verified: true
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', authLimiter, async (req, res, next) => {
  try {
    const { phone, challenge_id } = req.body;
    let challenge = null;

    if (challenge_id) {
      challenge = (localStore.otp_challenges || []).find((c) => c.challenge_id === challenge_id);
    } else if (phone) {
      const parsed = validateAndNormalizeIndianPhone(phone);
      if (parsed) {
        challenge = (localStore.otp_challenges || []).find((c) => c.phone_digits === parsed.digits);
      }
    }

    if (challenge) {
      const timeSince = Date.now() - challenge.last_sent_at;
      const cooldownMs = 60 * 1000;
      if (timeSince < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - timeSince) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${remainingSec} seconds before requesting a new OTP.`,
          retry_after_seconds: remainingSec
        });
      }
      challenge.last_sent_at = Date.now();
      challenge.expires_at = Date.now() + 5 * 60 * 1000;
      challenge.attempts = 0;
    }

    return res.json({
      success: true,
      message: 'New OTP code dispatched.',
      cooldown_seconds: 60,
      demo_otp: '123456'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticateUser, async (req, res) => {
  let user = localStore.users.find((u) => u.id === req.user.id);
  if (!user && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const userRes = await pool.query('SELECT * FROM public.users WHERE id = $1 LIMIT 1', [req.user.id]);
      if (userRes.rows.length > 0) user = userRes.rows[0];
    } catch (e) {}
  }

  if (!user) {
    return res.status(404).json({ success: false, error: 'User profile not found.' });
  }

  let donorProfile = localStore.donors.find((d) => d.user_id === user.id);
  if (!donorProfile && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const dRes = await pool.query('SELECT * FROM public.donors WHERE user_id = $1 LIMIT 1', [user.id]);
      if (dRes.rows.length > 0) donorProfile = dRes.rows[0];
    } catch (e) {}
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      donor_profile: donorProfile || null
    }
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = localStore.users.find((u) => u.email === normalizedEmail);

    let resetToken = null;
    if (user) {
      resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      localStore.password_resets = (localStore.password_resets || []).filter((r) => r.email !== normalizedEmail);
      localStore.password_resets.push({
        token: resetToken,
        email: normalizedEmail,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: 'If an account exists with that email address, password reset instructions and a reset token have been generated.',
      reset_token: resetToken,
      info: 'In production, this token is securely transmitted via SMS or email service.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ success: false, error: 'Reset token and new password are required.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const resetRecord = (localStore.password_resets || []).find((r) => r.token === token);
    if (!resetRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired password reset token.' });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: 'This password reset token has expired. Please request a new one.' });
    }

    const user = localStore.users.find((u) => u.id === resetRecord.user_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Associated user account not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(new_password, salt);
    user.updated_at = new Date().toISOString();

    // Consume the token
    localStore.password_resets = localStore.password_resets.filter((r) => r.token !== token);

    return res.json({
      success: true,
      message: 'Password has been successfully updated. You can now log in with your new credentials.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
