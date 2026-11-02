const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { localStore, isPostgresConnected, getPool } = require('../db/db');
const { authenticateUser } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { sendOtpEmail, maskEmail } = require('../services/emailService');

// Initialize memory store for OTP challenges & email verifications
if (!localStore.otp_challenges) {
  localStore.otp_challenges = [];
}
if (!localStore.email_otp_verifications) {
  localStore.email_otp_verifications = [];
}

/**
 * Cryptographic 6-digit OTP generator & SHA-256 HMAC timing-safe hasher
 */
function generateCryptographicOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp).trim() + config.jwtSecret).digest('hex');
}

function verifyOtpHash(otp, hash) {
  try {
    const computed = hashOtp(otp);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch (_) {
    return false;
  }
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

    // Check email verification status
    if (user.is_verified === false) {
      return res.status(403).json({
        success: false,
        error: 'Your email address has not been verified yet. Please complete email verification.',
        unverified: true,
        email: user.email
      });
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

// POST /api/auth/register-initiate
// Validates registration data, generates cryptographically secure 6-digit OTP, and dispatches email via Brevo
router.post('/register-initiate', authLimiter, async (req, res, next) => {
  try {
    let { email, password, name, role = 'donor', phone, username } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Full name, email address, and password are required.' });
    }

    if (role === 'patient') role = 'requester';
    if (role === 'admin') {
      return res.status(403).json({ success: false, error: 'Public registration as Administrator is not permitted.' });
    }
    if (!['requester', 'donor'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be either "donor" or "requester".' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    // Phone validation if supplied
    let normalizedPhone = null;
    if (phone) {
      const parsedPhone = validateAndNormalizeIndianPhone(phone);
      if (!parsedPhone) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid 10-digit Indian mobile number (+91).'
        });
      }
      normalizedPhone = parsedPhone.normalized;
    }

    // Check if user already exists in PostgreSQL or memory
    let existingUser = localStore.users.find((u) => u.email === normalizedEmail);
    if (!existingUser && isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const check = await pool.query('SELECT id FROM public.users WHERE LOWER(email) = $1 LIMIT 1', [normalizedEmail]);
        if (check.rows.length > 0) existingUser = check.rows[0];
      } catch (_) {}
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // Cryptographically secure 6-digit OTP & SHA-256 HMAC hash
    const otp = generateCryptographicOtp();
    const otpHashed = hashOtp(otp);
    const challengeId = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const registrationData = {
      name: name.trim(),
      username: username ? String(username).trim().toLowerCase() : normalizedEmail.split('@')[0],
      email: normalizedEmail,
      password_hash,
      role,
      phone: normalizedPhone
    };

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Save to PostgreSQL if connected
    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        // Invalidate previous challenges for this email
        await pool.query('UPDATE public.email_otp_verifications SET consumed = TRUE WHERE LOWER(email) = $1', [normalizedEmail]);
        await pool.query(
          `INSERT INTO public.email_otp_verifications 
           (id, email, otp_hash, registration_data, attempts, max_attempts, expires_at, last_sent_at, verified, consumed, created_at)
           VALUES ($1, $2, $3, $4, 0, 5, $5, NOW(), FALSE, FALSE, NOW())`,
          [challengeId, normalizedEmail, otpHashed, JSON.stringify(registrationData), expiresAt]
        );
      } catch (dbErr) {
        console.warn('PostgreSQL save email verification challenge notice:', dbErr.message);
      }
    }

    // Update memory store
    localStore.email_otp_verifications = (localStore.email_otp_verifications || []).filter(
      (c) => c.email !== normalizedEmail
    );
    const memChallenge = {
      id: challengeId,
      email: normalizedEmail,
      otp_hash: otpHashed,
      registration_data: registrationData,
      attempts: 0,
      max_attempts: 5,
      expires_at: expiresAt.getTime(),
      last_sent_at: Date.now(),
      verified: false,
      consumed: false
    };
    if (process.env.NODE_ENV === 'test') {
      memChallenge._test_otp = otp;
    }
    localStore.email_otp_verifications.push(memChallenge);

    // Send Email via Brevo
    await sendOtpEmail({
      toEmail: normalizedEmail,
      toName: name.trim(),
      otp,
      expiresInMinutes: 5
    });

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${maskEmail(normalizedEmail)}.`,
      challenge_id: challengeId,
      email: normalizedEmail,
      email_masked: maskEmail(normalizedEmail),
      expires_in_seconds: 300,
      cooldown_seconds: 60
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-email-otp
// Verifies 6-digit OTP code, completes user registration, and issues JWT authentication session
router.post('/verify-email-otp', authLimiter, async (req, res, next) => {
  try {
    const { email, otp, challenge_id } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, error: 'Six-digit verification code is required.' });
    }

    const cleanOtp = String(otp).trim();
    if (cleanOtp.length !== 6) {
      return res.status(400).json({ success: false, error: 'Verification code must be exactly 6 digits.' });
    }

    let challenge = null;

    // Search PostgreSQL if connected
    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        let q = 'SELECT * FROM public.email_otp_verifications WHERE id = $1 LIMIT 1';
        let params = [challenge_id];
        if (!challenge_id && email) {
          q = 'SELECT * FROM public.email_otp_verifications WHERE LOWER(email) = $1 AND consumed = FALSE ORDER BY created_at DESC LIMIT 1';
          params = [String(email).trim().toLowerCase()];
        }
        const dbRes = await pool.query(q, params);
        if (dbRes.rows.length > 0) {
          challenge = dbRes.rows[0];
          if (typeof challenge.registration_data === 'string') {
            try { challenge.registration_data = JSON.parse(challenge.registration_data); } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('PostgreSQL lookup verification challenge notice:', err.message);
      }
    }

    // Fallback to memory store
    if (!challenge) {
      if (challenge_id) {
        challenge = (localStore.email_otp_verifications || []).find((c) => c.id === challenge_id);
      } else if (email) {
        const cleanLower = String(email).trim().toLowerCase();
        challenge = (localStore.email_otp_verifications || []).find(
          (c) => c.email === cleanLower && !c.consumed
        );
      }
    }

    if (!challenge || challenge.consumed) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification session. Please request a new code or register again.'
      });
    }

    // Check expiration
    const expiryTime = challenge.expires_at instanceof Date ? challenge.expires_at.getTime() : new Date(challenge.expires_at).getTime();
    if (Date.now() > expiryTime) {
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired (valid for 5 minutes). Please click Resend Code.'
      });
    }

    // Check attempts
    challenge.attempts = (challenge.attempts || 0) + 1;
    const maxAttempts = challenge.max_attempts || 5;

    if (challenge.attempts > maxAttempts) {
      return res.status(429).json({
        success: false,
        error: 'Too many incorrect attempts. For security, please request a new verification code.'
      });
    }

    // Verify cryptographic SHA-256 OTP Hash
    const isMatch = verifyOtpHash(cleanOtp, challenge.otp_hash);

    if (!isMatch) {
      if (isPostgresConnected() && getPool()) {
        try {
          const pool = getPool();
          await pool.query('UPDATE public.email_otp_verifications SET attempts = $1 WHERE id = $2', [challenge.attempts, challenge.id]);
        } catch (_) {}
      }
      const remaining = maxAttempts - challenge.attempts;
      return res.status(400).json({
        success: false,
        error: remaining > 0 
          ? `Incorrect verification code. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
          : 'Too many incorrect attempts. Please request a new code.'
      });
    }

    // OTP is valid! Mark challenge as consumed and verified
    challenge.verified = true;
    challenge.consumed = true;

    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        await pool.query('UPDATE public.email_otp_verifications SET verified = TRUE, consumed = TRUE WHERE id = $1', [challenge.id]);
      } catch (_) {}
    }

    // Create user in public.users
    const regData = challenge.registration_data || {};
    const newUser = {
      id: uuidv4(),
      email: challenge.email,
      username: regData.username || challenge.email.split('@')[0],
      password_hash: regData.password_hash,
      name: regData.name || 'BloodBridge Member',
      role: regData.role || 'donor',
      phone: regData.phone || null,
      is_verified: true,
      created_at: new Date().toISOString()
    };

    localStore.users.push(newUser);

    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        await pool.query(
          `INSERT INTO public.users (id, email, password_hash, name, role, phone, is_verified, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
           ON CONFLICT (email) DO UPDATE 
           SET is_verified = TRUE, updated_at = NOW()`,
          [newUser.id, newUser.email, newUser.password_hash, newUser.name, newUser.role, newUser.phone]
        );
      } catch (err) {
        console.warn('PostgreSQL insert verified user notice:', err.message);
      }
    }

    // Issue JWT Token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.status(201).json({
      success: true,
      message: 'Account verified successfully! Welcome to BloodBridge Vision-X.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        phone: newUser.phone,
        username: newUser.username,
        is_verified: true
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-email-otp
// Dispatches a new 6-digit OTP code to user email subject to 60-second cooldown
router.post('/resend-email-otp', authLimiter, async (req, res, next) => {
  try {
    const { email, challenge_id } = req.body;
    let challenge = null;

    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        let q = 'SELECT * FROM public.email_otp_verifications WHERE id = $1 LIMIT 1';
        let params = [challenge_id];
        if (!challenge_id && email) {
          q = 'SELECT * FROM public.email_otp_verifications WHERE LOWER(email) = $1 AND consumed = FALSE ORDER BY created_at DESC LIMIT 1';
          params = [String(email).trim().toLowerCase()];
        }
        const dbRes = await pool.query(q, params);
        if (dbRes.rows.length > 0) {
          challenge = dbRes.rows[0];
          if (typeof challenge.registration_data === 'string') {
            try { challenge.registration_data = JSON.parse(challenge.registration_data); } catch (_) {}
          }
        }
      } catch (_) {}
    }

    if (!challenge) {
      if (challenge_id) {
        challenge = (localStore.email_otp_verifications || []).find((c) => c.id === challenge_id);
      } else if (email) {
        const cleanLower = String(email).trim().toLowerCase();
        challenge = (localStore.email_otp_verifications || []).find(
          (c) => c.email === cleanLower && !c.consumed
        );
      }
    }

    if (!challenge || challenge.consumed) {
      return res.status(400).json({
        success: false,
        error: 'Registration session expired. Please start registration again.'
      });
    }

    // Cooldown check (60 seconds)
    const lastSent = challenge.last_sent_at instanceof Date ? challenge.last_sent_at.getTime() : new Date(challenge.last_sent_at).getTime();
    const timeSince = Date.now() - lastSent;
    const cooldownMs = 60 * 1000;
    if (timeSince < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - timeSince) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${remainingSec} seconds before requesting another verification code.`,
        retry_after_seconds: remainingSec
      });
    }

    // Generate fresh OTP
    const newOtp = generateCryptographicOtp();
    const newOtpHashed = hashOtp(newOtp);
    const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    challenge.otp_hash = newOtpHashed;
    challenge.attempts = 0;
    challenge.expires_at = newExpiresAt;
    challenge.last_sent_at = new Date();

    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        await pool.query(
          'UPDATE public.email_otp_verifications SET otp_hash = $1, attempts = 0, expires_at = $2, last_sent_at = NOW() WHERE id = $3',
          [newOtpHashed, newExpiresAt, challenge.id]
        );
      } catch (_) {}
    }

    // Send email via Brevo
    const regData = challenge.registration_data || {};
    await sendOtpEmail({
      toEmail: challenge.email,
      toName: regData.name,
      otp: newOtp,
      expiresInMinutes: 5
    });

    return res.status(200).json({
      success: true,
      message: `A new 6-digit verification code has been dispatched to ${maskEmail(challenge.email)}.`,
      challenge_id: challenge.id,
      cooldown_seconds: 60,
      expires_in_seconds: 300
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
    const generatedOtp = generateCryptographicOtp();
    let otpSent = generatedOtp;

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
      console.log(`[SMS OTP Simulation] OTP challenge generated for ${parsedPhone.masked}`);
    }

    // Save in challenges store
    localStore.otp_challenges = localStore.otp_challenges.filter((c) => c.phone_digits !== parsedPhone.digits);
    localStore.otp_challenges.push({
      challenge_id: challengeId,
      phone_digits: parsedPhone.digits,
      phone_normalized: parsedPhone.normalized,
      phone_masked: parsedPhone.masked,
      otp: generatedOtp,
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

    if (cleanOtp !== challenge.otp) {
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
      cooldown_seconds: 60
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
