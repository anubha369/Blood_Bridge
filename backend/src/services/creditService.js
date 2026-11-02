/**
 * BloodBridge Vision-X: Comprehensive Credit & Reward Management System
 * 
 * Implements:
 * 1. Credit Earning Rules:
 *    - Registration Reward: 10 credits (once per account, duplicate prevented)
 *    - Successful Blood Donation Reward: 20 credits (only on confirmed fulfillment, duplicate prevented)
 *    - Monthly Availability Reward: 10 credits (30 days continuous availability, duplicate prevented)
 * 2. Credit Redemption:
 *    - Platform benefits, voucher generation, negative balance prevention
 * 3. Auditable Transaction Ledger with Idempotency Key protection
 * 4. PostgreSQL Database Persistence + LocalStore Resilience
 * 5. Section 27 Statutory Compliance: Credits NEVER influence medical blood allocation or clinical priority.
 */

const { localStore, isPostgresConnected, getPool } = require('../db/db');
const { v4: uuidv4 } = require('uuid');

const POINT_RULES = {
  registration_reward: { points: 10, label: 'Welcome Registration Reward' },
  successful_donation_reward: { points: 20, label: 'Successful Verified Blood Donation' },
  monthly_availability_reward: { points: 10, label: 'Monthly Donor Availability Reward' },
  // Backwards compatibility
  profile_completion: { points: 10, label: 'Profile Completion Reward' },
  availability_update: { points: 10, label: 'Monthly Availability Confirmation' }
};

const REDEMPTION_BENEFITS = [
  {
    id: 'benefit_lifesaver_badge',
    title: 'Verified Community Lifesaver Digital Badge',
    cost: 15,
    category: 'recognition',
    description: 'Unlocks the official gold verified Lifesaver Badge on your BloodBridge profile and dashboard.'
  },
  {
    id: 'benefit_donor_certificate',
    title: 'Certified Voluntary Donor Certificate',
    cost: 20,
    category: 'certificate',
    description: 'Issues an official, digitally verifiable Certificate of Altruistic Recognition celebrating voluntary donation readiness.'
  },
  {
    id: 'benefit_priority_dispatch',
    title: 'Emergency Notification Priority Routing',
    cost: 25,
    category: 'feature',
    description: 'Elevates your profile to priority dispatch for matching regional emergency blood alerts on Telegram.'
  },
  {
    id: 'benefit_health_screening_voucher',
    title: 'Partner Clinic Vitals & Hemoglobin Screening Pass',
    cost: 30,
    category: 'health',
    description: 'Generates a digital voucher pass for complimentary blood grouping and hemoglobin screening at participating hospital blood centres.'
  }
];

/**
 * Award or deduct credit points via ledger entry with strict idempotency and database persistence
 */
async function awardCreditPoints({
  userId,
  donorId = null,
  eventType,
  idempotencyKey,
  points = null,
  reason = null,
  relatedRequestId = null,
  metadata = {}
}) {
  if (!userId) {
    throw new Error('User ID is required to award or deduct credits.');
  }

  if (!idempotencyKey) {
    throw new Error('Idempotency key is required to prevent duplicate credit awards.');
  }

  // Calculate points
  let finalPoints = points;
  if (finalPoints == null) {
    const rule = POINT_RULES[eventType];
    if (rule) {
      finalPoints = rule.points;
    } else if (eventType === 'admin_adjustment') {
      finalPoints = metadata.customPoints || 0;
    } else {
      throw new Error(`Invalid credit event type: ${eventType}`);
    }
  }

  if (finalPoints === 0) {
    throw new Error('Credit amount cannot be zero.');
  }

  const pool = isPostgresConnected() ? getPool() : null;

  // 1. Check idempotency in PostgreSQL DB
  if (pool) {
    try {
      const existingRes = await pool.query(
        'SELECT * FROM public.credit_ledger WHERE idempotency_key = $1 LIMIT 1',
        [idempotencyKey]
      );
      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        const balance = await getUserCreditBalance(userId);
        return {
          success: true,
          action: 'idempotent_skip',
          entry: existing,
          balance
        };
      }
    } catch (e) {
      console.warn('DB check existing credit ledger warning:', e.message);
    }
  }

  // Check idempotency in localStore
  if (!localStore.credit_ledger) localStore.credit_ledger = [];
  const existingLocal = localStore.credit_ledger.find((e) => e.idempotency_key === idempotencyKey);
  if (existingLocal) {
    const balance = await getUserCreditBalance(userId);
    return {
      success: true,
      action: 'idempotent_skip',
      entry: existingLocal,
      balance
    };
  }

  // Prevent negative balance on debit/redemption
  const currentBalance = await getUserCreditBalance(userId);
  if (finalPoints < 0 && (currentBalance + finalPoints) < 0) {
    throw new Error(`Insufficient credits. Current balance is ${currentBalance}, cannot deduct ${Math.abs(finalPoints)}.`);
  }

  const newBalance = currentBalance + finalPoints;
  const nowIso = new Date().toISOString();
  const entryId = uuidv4();

  const newEntry = {
    id: entryId,
    user_id: userId,
    donor_id: donorId,
    event_type: eventType,
    points: finalPoints,
    balance_after: newBalance,
    timestamp: nowIso,
    idempotency_key: idempotencyKey,
    verification_status: 'verified',
    reason: reason || POINT_RULES[eventType]?.label || (finalPoints > 0 ? 'Credit Reward' : 'Credit Redemption'),
    related_request_id: relatedRequestId,
    metadata
  };

  // Persist to PostgreSQL DB
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO public.credit_ledger (
          id, user_id, donor_id, event_type, points, balance_after,
          timestamp, idempotency_key, verification_status, reason,
          related_request_id, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          NOW(), $7, 'verified', $8,
          $9, $10
        ) ON CONFLICT (idempotency_key) DO NOTHING`,
        [
          newEntry.id,
          newEntry.user_id,
          newEntry.donor_id,
          newEntry.event_type,
          newEntry.points,
          newEntry.balance_after,
          newEntry.idempotency_key,
          newEntry.reason,
          newEntry.related_request_id,
          JSON.stringify(newEntry.metadata)
        ]
      );
    } catch (dbErr) {
      console.warn('DB credit_ledger insert warning:', dbErr.message);
    }
  }

  // Persist to localStore
  localStore.credit_ledger.push(newEntry);

  return {
    success: true,
    action: finalPoints > 0 ? 'awarded' : 'deducted',
    entry: newEntry,
    balance: newBalance,
    balance_after: newBalance
  };
}

/**
 * Calculate the verified points balance for a user from database or ledger
 */
async function getUserCreditBalance(userId) {
  if (!userId) return 0;
  const pool = isPostgresConnected() ? getPool() : null;

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT COALESCE(SUM(points), 0)::integer as balance 
         FROM public.credit_ledger 
         WHERE user_id = $1 AND verification_status = 'verified'`,
        [userId]
      );
      if (res.rows.length > 0) {
        return parseInt(res.rows[0].balance, 10) || 0;
      }
    } catch (e) {
      console.warn('DB getUserCreditBalance warning:', e.message);
    }
  }

  // Fallback to localStore
  if (!localStore.credit_ledger) return 0;
  return localStore.credit_ledger
    .filter((entry) => entry.user_id === userId && entry.verification_status === 'verified')
    .reduce((sum, entry) => sum + (entry.points || 0), 0);
}

/**
 * Retrieve user ledger history sorted newest first
 */
async function getUserCreditHistory(userId, limit = 50) {
  if (!userId) return [];
  const pool = isPostgresConnected() ? getPool() : null;

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT * FROM public.credit_ledger 
         WHERE user_id = $1 
         ORDER BY timestamp DESC LIMIT $2`,
        [userId, limit]
      );
      return res.rows;
    } catch (e) {
      console.warn('DB getUserCreditHistory warning:', e.message);
    }
  }

  // Fallback
  if (!localStore.credit_ledger) return [];
  return localStore.credit_ledger
    .filter((entry) => entry.user_id === userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

/**
 * Get comprehensive wallet status for user dashboard
 */
async function getUserCreditWallet(userId) {
  if (!userId) throw new Error('User ID is required for credit wallet.');

  const pool = isPostgresConnected() ? getPool() : null;
  const history = await getUserCreditHistory(userId, 50);

  let totalEarned = 0;
  let totalRedeemed = 0;
  let registrationHistory = [];
  let donationHistory = [];
  let monthlyHistory = [];
  let redemptionHistory = [];

  for (const entry of history) {
    const pts = entry.points || 0;
    if (pts > 0) totalEarned += pts;
    else totalRedeemed += Math.abs(pts);

    if (entry.event_type === 'registration_reward') registrationHistory.push(entry);
    else if (entry.event_type === 'successful_donation_reward') donationHistory.push(entry);
    else if (entry.event_type === 'monthly_availability_reward') monthlyHistory.push(entry);
    else if (entry.event_type === 'credit_redemption') redemptionHistory.push(entry);
  }

  const currentBalance = totalEarned - totalRedeemed;

  // Retrieve donor monthly tracking progress if user is a donor
  let donorRecord = null;
  if (pool) {
    try {
      const dRes = await pool.query('SELECT * FROM public.donors WHERE user_id = $1 LIMIT 1', [userId]);
      if (dRes.rows.length > 0) donorRecord = dRes.rows[0];
    } catch (_) {}
  }
  if (!donorRecord && localStore.donors) {
    donorRecord = localStore.donors.find((d) => d.user_id === userId);
  }

  let nextMonthlyReward = {
    is_tracking: false,
    available_since: null,
    days_accumulated: 0,
    days_required: 30,
    days_remaining: 30,
    eligible: false
  };

  if (donorRecord && donorRecord.availability_status === 'available') {
    const trackingSince = donorRecord.available_since ? new Date(donorRecord.available_since) : new Date(donorRecord.created_at);
    const lastReward = donorRecord.last_monthly_reward_at ? new Date(donorRecord.last_monthly_reward_at) : null;
    const baseDate = lastReward && lastReward > trackingSince ? lastReward : trackingSince;

    const diffDays = Math.max(0, Math.floor((Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
    const remaining = Math.max(0, 30 - diffDays);

    nextMonthlyReward = {
      is_tracking: true,
      available_since: baseDate.toISOString(),
      days_accumulated: Math.min(30, diffDays),
      days_required: 30,
      days_remaining: remaining,
      eligible: diffDays >= 30
    };
  }

  // Active redemptions
  let activeRedemptions = [];
  if (pool) {
    try {
      const rRes = await pool.query('SELECT * FROM public.credit_redemptions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      activeRedemptions = rRes.rows;
    } catch (_) {}
  }

  return {
    balance: currentBalance,
    total_earned: totalEarned,
    total_redeemed: totalRedeemed,
    recent_transactions: history.slice(0, 15),
    registration_reward_history: registrationHistory,
    donation_reward_history: donationHistory,
    monthly_availability_reward_history: monthlyHistory,
    redemption_history: redemptionHistory,
    active_redemptions: activeRedemptions,
    next_monthly_reward: nextMonthlyReward,
    disclaimer: 'BloodBridge Credit Points carry zero cash value, cannot be redeemed for money, and strictly never influence medical compatibility, blood allocation, or patient matching priority.'
  };
}

/**
 * Redeem credits for a legitimate platform benefit
 */
async function redeemCreditBenefit({ userId, benefitId }) {
  if (!userId || !benefitId) {
    throw new Error('User ID and Benefit ID are required for redemption.');
  }

  const benefit = REDEMPTION_BENEFITS.find(
    (b) => b.id === benefitId ||
           b.id === `benefit_${benefitId}` ||
           b.id.replace('benefit_', '') === benefitId.replace('benefit_', '') ||
           b.id.replace(/_/g, '') === benefitId.replace(/_/g, '')
  );
  if (!benefit) {
    throw new Error(`Benefit not found: "${benefitId}". Please choose from available benefits.`);
  }

  const currentBalance = await getUserCreditBalance(userId);
  if (currentBalance < benefit.cost) {
    throw new Error(`Insufficient credits. You need ${benefit.cost} credits to redeem "${benefit.title}", but your current balance is ${currentBalance}.`);
  }

  const pool = isPostgresConnected() ? getPool() : null;
  const voucherCode = `BB-${benefit.category.toUpperCase().slice(0, 3)}-${uuidv4().substring(0, 6).toUpperCase()}`;
  const idempotencyKey = `redemption_${userId}_${benefitId}_${Date.now()}`;

  // 1. Record credit debit transaction in ledger
  const deductRes = await awardCreditPoints({
    userId,
    eventType: 'credit_redemption',
    points: -benefit.cost,
    idempotencyKey,
    reason: `Redeemed: ${benefit.title}`,
    metadata: {
      benefit_id: benefit.id,
      benefit_title: benefit.title,
      voucher_code: voucherCode,
      cost: benefit.cost
    }
  });

  // 2. Insert into credit_redemptions table
  const redemptionRecord = {
    id: uuidv4(),
    user_id: userId,
    benefit_id: benefit.id,
    title: benefit.title,
    credits_spent: benefit.cost,
    voucher_code: voucherCode,
    status: 'active',
    metadata: {
      category: benefit.category,
      redeemed_at: new Date().toISOString()
    },
    created_at: new Date().toISOString()
  };

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO public.credit_redemptions (
          id, user_id, benefit_id, title, credits_spent, voucher_code, status, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          redemptionRecord.id,
          redemptionRecord.user_id,
          redemptionRecord.benefit_id,
          redemptionRecord.title,
          redemptionRecord.credits_spent,
          redemptionRecord.voucher_code,
          redemptionRecord.status,
          JSON.stringify(redemptionRecord.metadata)
        ]
      );
    } catch (e) {
      console.warn('DB credit_redemptions insert warning:', e.message);
    }
  }

  return {
    success: true,
    message: `Successfully redeemed "${benefit.title}"! Voucher code: ${voucherCode}`,
    voucher: redemptionRecord,
    credits_spent: benefit.cost,
    new_balance: deductRes.balance
  };
}

/**
 * Process monthly availability reward for a single donor
 */
async function processMonthlyAvailabilityRewardForDonor(donorId) {
  const pool = isPostgresConnected() ? getPool() : null;
  let donor = null;

  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM public.donors WHERE id = $1 LIMIT 1', [donorId]);
      if (res.rows.length > 0) donor = res.rows[0];
    } catch (_) {}
  }
  if (!donor && localStore.donors) {
    donor = localStore.donors.find((d) => d.id === donorId);
  }

  if (!donor) return { success: false, reason: 'Donor record not found.' };

  // Rule: Must be currently available and consent active
  if (donor.availability_status !== 'available' || !donor.consent_to_contact) {
    return { success: false, reason: 'Donor is not currently available or consent is inactive.' };
  }

  const availableSince = donor.available_since ? new Date(donor.available_since) : new Date(donor.created_at);
  const lastReward = donor.last_monthly_reward_at ? new Date(donor.last_monthly_reward_at) : null;
  const baseDate = lastReward && lastReward > availableSince ? lastReward : availableSince;

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return {
      success: false,
      reason: `Donor has been available for ${diffDays} days. 30 continuous days required for monthly reward.`,
      days_accumulated: diffDays,
      days_remaining: 30 - diffDays
    };
  }

  // Eligible! Generate month-specific idempotency key
  const yearMonth = `${now.getUTCFullYear()}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const idempotencyKey = `monthly_availability_${donor.id}_${yearMonth}`;

  const awardRes = await awardCreditPoints({
    userId: donor.user_id,
    donorId: donor.id,
    eventType: 'monthly_availability_reward',
    idempotencyKey,
    points: 10,
    reason: `Monthly Donor Availability Reward (${now.toLocaleString('default', { month: 'long', year: 'numeric' })})`,
    metadata: {
      month_key: yearMonth,
      continuous_days: diffDays
    }
  });

  if (awardRes.action === 'awarded') {
    // Update donor's last_monthly_reward_at in DB
    if (pool) {
      try {
        await pool.query('UPDATE public.donors SET last_monthly_reward_at = NOW(), updated_at = NOW() WHERE id = $1', [donor.id]);
      } catch (_) {}
    }
    donor.last_monthly_reward_at = now.toISOString();
  }

  return {
    success: true,
    action: awardRes.action,
    message: awardRes.action === 'awarded' ? 'Monthly availability reward awarded (10 credits).' : 'Monthly reward already claimed for this period.',
    balance: awardRes.balance,
    balance_after: awardRes.balance
  };
}

/**
 * Batch process monthly availability rewards for all eligible donors
 */
async function processAllMonthlyAvailabilityRewards() {
  const pool = isPostgresConnected() ? getPool() : null;
  let donors = [];

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT id, user_id, availability_status, consent_to_contact, available_since, last_monthly_reward_at, created_at 
         FROM public.donors 
         WHERE availability_status = 'available' AND consent_to_contact = true`
      );
      donors = res.rows;
    } catch (_) {}
  }
  if (donors.length === 0 && localStore.donors) {
    donors = localStore.donors.filter((d) => d.availability_status === 'available' && d.consent_to_contact);
  }

  let awardedCount = 0;
  let skippedCount = 0;
  const results = [];

  for (const d of donors) {
    try {
      const res = await processMonthlyAvailabilityRewardForDonor(d.id);
      if (res.success && res.action === 'awarded') awardedCount++;
      else skippedCount++;
      results.push({ donor_id: d.id, ...res });
    } catch (e) {
      skippedCount++;
    }
  }

  return {
    processed: donors.length,
    awarded: awardedCount,
    skipped: skippedCount,
    timestamp: new Date().toISOString()
  };
}

/**
 * Admin manual credit adjustment with auditable reason
 */
async function adminAdjustCredit({ adminUserId, targetUserId, amount, reason, metadata = {} }) {
  if (!targetUserId || amount == null || !reason) {
    throw new Error('Target user ID, adjustment amount, and documented reason are required.');
  }

  const intAmount = parseInt(amount, 10);
  if (isNaN(intAmount) || intAmount === 0) {
    throw new Error('Adjustment amount must be a non-zero integer.');
  }

  const idempotencyKey = `admin_adj_${targetUserId}_${Date.now()}_${uuidv4().substring(0, 6)}`;

  return await awardCreditPoints({
    userId: targetUserId,
    eventType: 'admin_adjustment',
    points: intAmount,
    idempotencyKey,
    reason: `Admin Adjustment: ${reason.trim()}`,
    metadata: {
      adjusted_by_admin: adminUserId,
      reason: reason.trim(),
      ...metadata
    }
  });
}

/**
 * Retrieve global platform credit statistics for Admin
 */
async function getAdminCreditStats() {
  const pool = isPostgresConnected() ? getPool() : null;

  if (pool) {
    try {
      const statsRes = await pool.query(`
        SELECT 
          COUNT(*)::integer as total_transactions,
          COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0)::integer as total_issued,
          COALESCE(SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END), 0)::integer as total_redeemed,
          COALESCE(SUM(points), 0)::integer as net_circulation
        FROM public.credit_ledger
        WHERE verification_status = 'verified'
      `);

      const typeRes = await pool.query(`
        SELECT event_type, COUNT(*)::integer as count, COALESCE(SUM(points), 0)::integer as total_points
        FROM public.credit_ledger
        GROUP BY event_type
      `);

      const topHoldersRes = await pool.query(`
        SELECT u.id, u.name, u.email, u.role, COALESCE(SUM(cl.points), 0)::integer as balance
        FROM public.users u
        JOIN public.credit_ledger cl ON u.id = cl.user_id
        GROUP BY u.id, u.name, u.email, u.role
        ORDER BY balance DESC
        LIMIT 10
      `);

      return {
        summary: statsRes.rows[0],
        total_circulating_credits: statsRes.rows[0].net_circulation,
        total_credits_earned: statsRes.rows[0].total_issued,
        total_credits_redeemed: statsRes.rows[0].total_redeemed,
        by_type: typeRes.rows,
        top_holders: topHoldersRes.rows
      };
    } catch (e) {
      console.warn('DB getAdminCreditStats warning:', e.message);
    }
  }

  // Fallback
  const ledger = localStore.credit_ledger || [];
  let totalIssued = 0;
  let totalRedeemed = 0;
  for (const e of ledger) {
    if (e.points > 0) totalIssued += e.points;
    else totalRedeemed += Math.abs(e.points);
  }

  return {
    summary: {
      total_transactions: ledger.length,
      total_issued: totalIssued,
      total_redeemed: totalRedeemed,
      net_circulation: totalIssued - totalRedeemed
    },
    total_circulating_credits: totalIssued - totalRedeemed,
    total_credits_earned: totalIssued,
    total_credits_redeemed: totalRedeemed,
    by_type: [],
    top_holders: []
  };
}

module.exports = {
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
};
