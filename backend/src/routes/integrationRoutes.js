const express = require('express');
const router = express.Router();
const { processGoogleFormSubmission, syncRecentRecords } = require('../services/googleFormService');
const { localStore } = require('../db/db');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { webhookLimiter } = require('../middleware/rateLimiter');
const config = require('../config');

// Helper to authenticate either admin user JWT or secure webhook secret
function authenticateAdminOrWebhookSecret(req, res, next) {
  const secretHeader = req.headers['x-webhook-secret'] || req.query.secret;
  if (secretHeader && secretHeader === config.googleFormWebhookSecret) {
    req.authMethod = 'webhook_secret';
    return next();
  }

  // Otherwise fallback to JWT authenticateUser
  authenticateUser(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      req.authMethod = 'jwt_admin';
      return next();
    }
    return res.status(403).json({
      success: false,
      error: 'Access denied: Requires administrator credentials or valid x-webhook-secret header.'
    });
  });
}

// Handler for sync-recent-records
async function handleSyncRecentRecords(req, res, next) {
  try {
    const { spreadsheetId, sheetName, offset = 0, limit = 100, syncAll = true, rows, records } = req.body || {};

    const result = await syncRecentRecords({
      spreadsheetId,
      sheetName,
      offset: parseInt(offset, 10) || 0,
      limit: parseInt(limit, 10) || 100,
      syncAll: syncAll !== false,
      rows,
      records
    });

    if (result.configured === false) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/integrations/google-forms/sync-recent-records
// POST /api/integrations/sync-recent-records
// Secure administrative function to fetch missed Google Form records from Google Sheets
router.post('/google-forms/sync-recent-records', webhookLimiter, authenticateAdminOrWebhookSecret, handleSyncRecentRecords);
router.post('/sync-recent-records', webhookLimiter, authenticateAdminOrWebhookSecret, handleSyncRecentRecords);

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
