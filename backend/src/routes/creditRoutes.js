const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { POINT_RULES, awardCreditPoints, getUserCreditBalance, getUserCreditHistory } = require('../services/creditService');

// GET /api/credits/balance
router.get('/balance', authenticateUser, (req, res) => {
  const balance = getUserCreditBalance(req.user.id);
  return res.json({
    success: true,
    user_id: req.user.id,
    balance,
    rules: POINT_RULES,
    disclaimer: 'BloodBridge Credit Points are for voluntary participation and non-monetary recognition only. Points carry zero cash value, are non-transferable, and never determine clinical priority, medical compatibility, or emergency blood allocation.'
  });
});

// GET /api/credits/history
router.get('/history', authenticateUser, (req, res) => {
  const history = getUserCreditHistory(req.user.id);
  const balance = getUserCreditBalance(req.user.id);
  return res.json({
    success: true,
    user_id: req.user.id,
    balance,
    count: history.length,
    history
  });
});

// POST /api/credits/earn
// Complete a participation milestone
router.post('/earn', authenticateUser, (req, res) => {
  const { event_type, idempotency_key, metadata } = req.body;

  if (!event_type || !idempotency_key) {
    return res.status(400).json({ success: false, error: 'Event type and idempotency key are required.' });
  }

  try {
    const result = awardCreditPoints({
      userId: req.user.id,
      eventType: event_type,
      idempotencyKey: idempotency_key,
      metadata: metadata || {}
    });

    return res.json({
      success: true,
      message: result.action === 'awarded' ? 'Points successfully awarded.' : 'Duplicate event recognized; balance unchanged.',
      entry: result.entry,
      balance: result.balance
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
