const express = require('express');
const router = express.Router();
const { processGoogleFormSubmission } = require('../services/googleFormService');
const { localStore } = require('../db/db');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { webhookLimiter } = require('../middleware/rateLimiter');

// POST /api/integrations/google-forms/webhook
// Webhook endpoint called by Google Apps Script on Form submission
router.post('/google-forms/webhook', webhookLimiter, async (req, res, next) => {
  try {
    const secretHeader = req.headers['x-webhook-secret'] || req.query.secret;
    const payload = req.body;

    const result = await processGoogleFormSubmission(payload, secretHeader);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/integrations/logs
// Admin inspect integration sync logs
router.get('/logs', authenticateUser, requireRole(['admin']), (req, res) => {
  const { source, status, limit = 50 } = req.query;

  let logs = [...localStore.integration_logs];

  if (source) {
    logs = logs.filter((l) => l.source === source);
  }
  if (status) {
    logs = logs.filter((l) => l.status === status);
  }

  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return res.json({
    success: true,
    count: logs.length,
    logs: logs.slice(0, parseInt(limit, 10))
  });
});

module.exports = router;
