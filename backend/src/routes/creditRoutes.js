const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../middleware/auth');
const {
  POINT_RULES,
  REDEMPTION_BENEFITS,
  awardCreditPoints,
  getUserCreditBalance,
  getUserCreditHistory,
  getUserCreditWallet,
  redeemCreditBenefit,
  processMonthlyAvailabilityRewardForDonor,
  processAllMonthlyAvailabilityRewards,
  adminAdjustCredit,
  getAdminCreditStats
} = require('../services/creditService');
const { localStore, isPostgresConnected, getPool } = require('../db/db');

// GET /api/credits/balance
router.get('/balance', authenticateUser, async (req, res) => {
  try {
    const balance = await getUserCreditBalance(req.user.id);
    return res.json({
      success: true,
      user_id: req.user.id,
      balance,
      rules: POINT_RULES,
      disclaimer: 'BloodBridge Credit Points are for voluntary participation and non-monetary recognition only. Points carry zero cash value, are non-transferable, and never determine clinical priority, medical compatibility, or emergency blood allocation.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/credits/wallet
// Comprehensive Credit Wallet for Dashboards
router.get('/wallet', authenticateUser, async (req, res) => {
  try {
    const wallet = await getUserCreditWallet(req.user.id);
    return res.json({
      success: true,
      user_id: req.user.id,
      wallet,
      ...wallet
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/credits/history
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const history = await getUserCreditHistory(req.user.id, limit);
    const balance = await getUserCreditBalance(req.user.id);
    return res.json({
      success: true,
      user_id: req.user.id,
      balance,
      count: history.length,
      history
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/credits/catalog
// Available platform benefits that can legitimately be redeemed
router.get('/catalog', authenticateUser, (req, res) => {
  return res.json({
    success: true,
    catalog: REDEMPTION_BENEFITS,
    benefits: REDEMPTION_BENEFITS
  });
});

// POST /api/credits/redeem
// Redeem credits for a platform benefit (deducts credits, prevents negative balance, generates voucher)
router.post('/redeem', authenticateUser, async (req, res) => {
  const { benefit_id } = req.body;
  if (!benefit_id) {
    return res.status(400).json({ success: false, error: 'benefit_id is required for redemption.' });
  }

  try {
    const result = await redeemCreditBenefit({
      userId: req.user.id,
      benefitId: benefit_id
    });

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/credits/check-monthly
// Donor checks and claims monthly availability reward if 30 continuous days reached
router.post('/check-monthly', authenticateUser, async (req, res) => {
  try {
    let donor = null;
    if (isPostgresConnected() && getPool()) {
      const dbRes = await getPool().query('SELECT * FROM public.donors WHERE user_id = $1 LIMIT 1', [req.user.id]);
      if (dbRes.rows.length > 0) donor = dbRes.rows[0];
    }
    if (!donor && localStore.donors) {
      donor = localStore.donors.find((d) => d.user_id === req.user.id);
    }

    if (!donor) {
      return res.status(400).json({ success: false, error: 'User is not registered as a blood donor.' });
    }

    const result = await processMonthlyAvailabilityRewardForDonor(donor.id);
    return res.json({
      success: true,
      reward_awarded: Boolean(result.success && result.action === 'awarded'),
      message: result.message || result.reason,
      balance_after: result.balance || result.balance_after,
      ...result
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================

// GET /api/credits/admin/stats
router.get('/admin/stats', authenticateUser, requireRole(['admin']), async (req, res) => {
  try {
    const stats = await getAdminCreditStats();
    return res.json({
      success: true,
      stats,
      ...stats
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/credits/admin/adjust
// Manual documented credit adjustment with audit logging
router.post('/admin/adjust', authenticateUser, requireRole(['admin']), async (req, res) => {
  const target_user_id = req.body.target_user_id || req.body.user_id;
  const amount = req.body.amount != null ? req.body.amount : req.body.points;
  const reason = req.body.reason;

  if (!target_user_id || amount == null || !reason) {
    return res.status(400).json({
      success: false,
      error: 'target_user_id (or user_id), amount (or points), and documented reason are required.'
    });
  }

  try {
    const result = await adminAdjustCredit({
      adminUserId: req.user.id,
      targetUserId: target_user_id,
      amount: parseInt(amount, 10),
      reason
    });

    return res.json({
      success: true,
      message: 'Admin credit adjustment recorded successfully.',
      ...result
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/credits/admin/process-monthly
// Batch trigger for monthly availability rewards
router.post('/admin/process-monthly', authenticateUser, requireRole(['admin']), async (req, res) => {
  try {
    const summary = await processAllMonthlyAvailabilityRewards();
    return res.json({
      success: true,
      message: `Processed ${summary.processed} donors. Awarded: ${summary.awarded}, Skipped: ${summary.skipped}`,
      evaluated_donors: summary.processed,
      rewards_awarded: summary.awarded,
      summary,
      ...summary
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
