const rateLimit = require('express-rate-limit');

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

// Stricter Auth Limiter (Brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please wait 15 minutes before retrying.'
  }
});

// AI & Natural Language Limiter
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60, // 60 queries per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI query rate limit reached. Please wait a moment before sending another query.'
  }
});

// Webhook Limiter
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'Webhook rate limit exceeded.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  aiLimiter,
  webhookLimiter
};
