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

module.exports = router;
