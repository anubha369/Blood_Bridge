/**
 * BloodBridge Vision-X: Donor Availability & 3-Month Cooldown Service
 * 
 * Implements Section 6 of Specification:
 * - 3 calendar month cooldown policy
 * - Accurate month-end date rollover (e.g., Nov 30 -> Feb 28/29)
 * - Handling missing donation dates without fabricating data
 * - Instant notification suppression during active cooldown
 * - Consent-gated verification check
 */

const { localStore } = require('../db/db');

const DEFAULT_COOLDOWN_MONTHS = 3;

/**
 * Accurately calculate cooldown date adding exact calendar months
 * Clamps to the last day of target month if day overflows (e.g., Nov 30 + 3 months -> Feb 28/29)
 */
function calculateCooldownDate(dateInput, months = DEFAULT_COOLDOWN_MONTHS) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedTargetMonth = targetMonthIndex % 12;

  // Number of days in the target month
  const daysInTargetMonth = new Date(targetYear, normalizedTargetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInTargetMonth);

  return new Date(Date.UTC(targetYear, normalizedTargetMonth, clampedDay, 23, 59, 59, 999));
}

/**
 * Check if a donor is eligible to receive blood request notifications
 * Evaluates consent, cooldown status, and recent availability
 */
function isDonorEligibleForNotification(donor, referenceTime = new Date()) {
  if (!donor) return false;

  // 1. Consent check: must have active consent and not withdrawn
  if (donor.consent_to_contact === false || donor.consent_status === 'withdrawn') {
    return false;
  }

  // 2. Explicit availability check
  if (donor.availability_status !== 'available') {
    return false;
  }

  // 3. Verification check: rejected or inactive records never contacted
  if (['rejected', 'inactive'].includes(donor.verification_status)) {
    return false;
  }

  const now = new Date(referenceTime).getTime();

  // 4. Active cooldown check
  if (donor.cooldown_until) {
    const cooldownTime = new Date(donor.cooldown_until).getTime();
    if (cooldownTime > now) {
      return false; // Still within cooldown window
    }
  }

  // 5. Google Form reported recent donation without verified date
  // Suppress notification until date or eligibility is confirmed
  if (donor.donated_last_3_months === true && !donor.cooldown_until) {
    return false;
  }

  return true;
}

/**
 * Confirm a completed donation and activate the 3-month cooldown
 */
function recordCompletedDonation(donorId, donationDate = new Date().toISOString().split('T')[0], confirmedBy = 'donor') {
  const donor = (localStore.donors || []).find((d) => d.id === donorId);
  if (!donor) {
    throw new Error('Donor record not found.');
  }

  const cooldownEndDate = calculateCooldownDate(donationDate, DEFAULT_COOLDOWN_MONTHS);

  donor.last_donation_date = donationDate;
  donor.donated_last_3_months = true;
  donor.cooldown_until = cooldownEndDate ? cooldownEndDate.toISOString() : null;
  donor.availability_status = 'recently_donated';
  donor.donation_history_status = 'verified_recent';
  donor.last_availability_confirmed_at = new Date().toISOString();
  donor.updated_at = new Date().toISOString();

  // Audit event
  if (localStore.audit_events) {
    localStore.audit_events.push({
      action: 'donation_confirmed',
      actor_id: donorId,
      actor_role: confirmedBy,
      entity_type: 'donor',
      entity_id: donorId,
      metadata: {
        donation_date: donationDate,
        cooldown_until: donor.cooldown_until
      },
      timestamp: new Date().toISOString()
    });
  }

  return donor;
}

/**
 * Process cooldown expiry and re-confirmation
 */
function checkAndUpdateCooldownExpiry(donor, referenceTime = new Date()) {
  if (!donor || !donor.cooldown_until) return donor;

  const now = new Date(referenceTime).getTime();
  const cooldownTime = new Date(donor.cooldown_until).getTime();

  if (cooldownTime <= now && donor.availability_status === 'recently_donated') {
    // Cooldown has elapsed; donor becomes eligible upon re-confirming availability
    donor.donated_last_3_months = false;
    donor.donation_history_status = 'eligible';
    donor.availability_status = 'available';
    donor.updated_at = new Date().toISOString();
  }

  return donor;
}

module.exports = {
  DEFAULT_COOLDOWN_MONTHS,
  calculateCooldownDate,
  isDonorEligibleForNotification,
  recordCompletedDonation,
  checkAndUpdateCooldownExpiry
};
