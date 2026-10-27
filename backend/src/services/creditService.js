/**
 * BloodBridge Vision-X: Credit Points & Donor Recognition Ledger Service
 * 
 * Implements Section 7 of Specification:
 * - Non-cash participation and recognition ledger
 * - Strictly non-monetary (NOT payment or condition for blood supply)
 * - Server-side only point calculation
 * - Strict idempotency key protection preventing duplicate rewards
 * - Does NOT affect clinical compatibility or emergency matching priority
 */

const { localStore } = require('../db/db');
const { v4: uuidv4 } = require('uuid');

const POINT_RULES = {
  profile_completion: { points: 50, label: 'Profile Completion & Voluntary Consent' },
  availability_update: { points: 10, label: 'Monthly Availability Confirmation' },
  directory_verification: { points: 25, label: 'Verified Blood Centre Listing Contribution' },
  referral_registered: { points: 40, label: 'Consenting Community Donor Referral' },
  awareness_campaign: { points: 15, label: 'Community Blood Drive Awareness Participation' }
};

/**
 * Award points to a user via ledger entry with strict idempotency
 */
function awardCreditPoints({ userId, donorId = null, eventType, idempotencyKey, reason = null, metadata = {} }) {
  if (!userId) {
    throw new Error('User ID is required to award credit points.');
  }

  if (!idempotencyKey) {
    throw new Error('Idempotency key is required to prevent duplicate credit awards.');
  }

  const rule = POINT_RULES[eventType];
  if (!rule && eventType !== 'admin_adjustment') {
    throw new Error(`Invalid credit event type: ${eventType}`);
  }

  const points = rule ? rule.points : (metadata.customPoints || 0);

  // Check idempotency: if entry with key exists, return it safely without duplicating points
  if (!localStore.credit_ledger) {
    localStore.credit_ledger = [];
  }

  const existing = localStore.credit_ledger.find((entry) => entry.idempotency_key === idempotencyKey);
  if (existing) {
    return {
      success: true,
      action: 'idempotent_skip',
      entry: existing,
      balance: getUserCreditBalance(userId)
    };
  }

  const newEntry = {
    id: uuidv4(),
    user_id: userId,
    donor_id: donorId,
    event_type: eventType,
    points,
    timestamp: new Date().toISOString(),
    idempotency_key: idempotencyKey,
    verification_status: 'verified',
    reason: reason || (rule ? rule.label : 'Admin Recognition Adjustment'),
    metadata
  };

  localStore.credit_ledger.push(newEntry);

  return {
    success: true,
    action: 'awarded',
    entry: newEntry,
    balance: getUserCreditBalance(userId)
  };
}

/**
 * Calculate the verified points balance for a user
 */
function getUserCreditBalance(userId) {
  if (!localStore.credit_ledger) return 0;

  return localStore.credit_ledger
    .filter((entry) => entry.user_id === userId && entry.verification_status === 'verified')
    .reduce((sum, entry) => sum + entry.points, 0);
}

/**
 * Retrieve user ledger history
 */
function getUserCreditHistory(userId) {
  if (!localStore.credit_ledger) return [];

  return localStore.credit_ledger
    .filter((entry) => entry.user_id === userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = {
  POINT_RULES,
  awardCreditPoints,
  getUserCreditBalance,
  getUserCreditHistory
};
