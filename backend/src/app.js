
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { isPostgresConnected } = require('./db/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const donorRoutes = require('./routes/donorRoutes');
const requestRoutes = require('./routes/requestRoutes');
const bloodBankRoutes = require('./routes/bloodBankRoutes');
const aiRoutes = require('./routes/aiRoutes');
const ragRoutes = require('./routes/ragRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const creditRoutes = require('./routes/creditRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const telegramRoutes = require('./routes/telegramRoutes');

const app = express();

// Reverse proxy configuration
// Assumes exactly one trusted proxy hop.
// Verify this setting against your deployment topology.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS setup
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      config.allowedOrigins.includes(origin) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }

    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));

// Body parsing (captures rawBody buffer for webhook HMAC signature verification)
app.use(express.json({
  limit: '5mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Global API rate limiter
app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'BloodBridge Vision-X API',
    version: '1.0.0',
    uptime_seconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    database_engine: isPostgresConnected()
      ? 'PostgreSQL with PostGIS Spatial Extension'
      : 'Local In-Memory PostGIS-compatible Geo-Engine',
    groq_configured: !!config.groqApiKey,
    timestamp: new Date().toISOString(),
    clinical_disclaimer:
      'BloodBridge coordinates potential blood availability; clinical cross-matching and transfusion compatibility belong exclusively to authorized medical professionals.'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/blood-banks', bloodBankRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/telegram', telegramRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
