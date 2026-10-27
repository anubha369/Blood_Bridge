const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { localStore } = require('../db/db');
const { authenticateUser } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/signup
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const { email, password, name, role = 'requester', phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name are required.' });
    }

    if (!['requester', 'donor'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be either "requester" or "donor". Admin accounts cannot be self-registered.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = localStore.users.find((u) => u.email === normalizedEmail);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = {
      id: uuidv4(),
      email: normalizedEmail,
      password_hash,
      name: name.trim(),
      role,
      phone: phone ? phone.trim() : null,
      created_at: new Date().toISOString()
    };

    localStore.users.push(newUser);

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
        phone: newUser.phone
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = localStore.users.find((u) => u.email === normalizedEmail);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Also look up donor profile if role is donor
    const donorProfile = localStore.donors.find((d) => d.user_id === user.id);

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

// GET /api/auth/me
router.get('/me', authenticateUser, (req, res) => {
  const user = localStore.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User profile not found.' });
  }

  const donorProfile = localStore.donors.find((d) => d.user_id === user.id);

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
