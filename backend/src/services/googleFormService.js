/**
 * BloodBridge Vision-X: Google Forms & Sheets Webhook Service
 * 
 * Implements Section 10:
 * Google Form -> Google Sheets -> Apps Script -> Secure Backend API -> Supabase/Database
 * - Secret signature validation
 * - Strict schema validation
 * - Deduplication by email/phone
 * - Default status: 'pending_verification'
 * - Integration audit logging
 */

const { localStore } = require('../db/db');
const { resolveCityCoordinates } = require('./spatialService');
const { calculateCooldownDate } = require('./cooldownService');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Normalize and validate Google Form submission payload
 */
function validateGoogleFormPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be a JSON object.' };
  }

  const {
    name,
    blood_group,
    city,
    area,
    phone,
    email,
    consent_to_contact,
    donated_last_3_months,
    last_donation_date,
    submission_id
  } = payload;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return { valid: false, error: 'Donor name is required (minimum 2 characters).' };
  }

  if (!blood_group || typeof blood_group !== 'string') {
    return { valid: false, error: 'Blood group is required.' };
  }

  const normalizedGroup = blood_group.trim().toUpperCase().replace(/\s*POSITIVE/i, '+').replace(/\s*NEGATIVE/i, '-');
  if (!VALID_BLOOD_GROUPS.includes(normalizedGroup)) {
    return { valid: false, error: `Invalid blood group "${blood_group}". Must be one of: ${VALID_BLOOD_GROUPS.join(', ')}` };
  }

  if (city !== undefined && (typeof city !== 'string' || city.trim().length < 2)) {
    return { valid: false, error: 'City is required for approximate donor location.' };
  }

  // If city is omitted in 4-field initial form, default to state capital pending profile completion
  const normalizedCity = (city && typeof city === 'string' && city.trim().length >= 2)
    ? city.trim()
    : 'Lucknow';

  // Contact consent check
  const consentBool = consent_to_contact === true || consent_to_contact === 'true' || consent_to_contact === 'Yes';

  // 3-month cooldown flag check
  const donatedRecentBool = donated_last_3_months === true ||
    donated_last_3_months === 'true' ||
    donated_last_3_months === 'Yes' ||
    donated_last_3_months === 'yes';

  return {
    valid: true,
    data: {
      name: name.trim(),
      blood_group: normalizedGroup,
      city: normalizedCity,
      area: area ? area.trim() : null,
      phone: phone ? phone.trim() : null,
      email: email ? email.trim().toLowerCase() : null,
      consent_to_contact: consentBool,
      donated_last_3_months: donatedRecentBool,
      last_donation_date: last_donation_date || null,
      submission_id: submission_id || `gform_${Date.now()}`
    }
  };
}

/**
 * Process verified incoming submission from Google Apps Script
 */
async function processGoogleFormSubmission(payload, secretHeader) {
  // 1. Verify Secret Header
  const expectedSecret = config.googleFormWebhookSecret;
  if (!secretHeader || secretHeader !== expectedSecret) {
    // Log unauthorized attempt
    localStore.integration_logs.push({
      id: uuidv4(),
      source: 'google_forms',
      event_type: 'webhook_submission',
      status: 'error',
      payload_summary: { error: 'Invalid or missing webhook secret header' },
      error_message: 'Unauthorized webhook access attempt.',
      created_at: new Date().toISOString()
    });

    const error = new Error('Unauthorized: Invalid or missing webhook secret.');
    error.status = 401;
    throw error;
  }

  // 2. Validate payload fields
  const validation = validateGoogleFormPayload(payload);
  if (!validation.valid) {
    localStore.integration_logs.push({
      id: uuidv4(),
      source: 'google_forms',
      event_type: 'validation_failure',
      status: 'error',
      payload_summary: { reason: validation.error },
      error_message: validation.error,
      created_at: new Date().toISOString()
    });

    const error = new Error(`Validation failed: ${validation.error}`);
    error.status = 400;
    throw error;
  }

  const data = validation.data;

  // 3. Coordinate resolution
  let lat = payload.latitude ? parseFloat(payload.latitude) : null;
  let lon = payload.longitude ? parseFloat(payload.longitude) : null;

  if (isNaN(lat) || isNaN(lon) || lat == null || lon == null) {
    const coords = resolveCityCoordinates(data.city);
    if (coords) {
      lat = coords.lat;
      lon = coords.lon;
    } else {
      // Default fallback coordinates (Jaipur reference center)
      lat = 26.9124;
      lon = 75.7873;
    }
  }

  // 4. Deduplication & Idempotent Upsert
  // Check by submission ID, or existing donor by phone or email
  const existingBySubId = localStore.donors.find((d) => d.google_form_submission_id === data.submission_id);
  if (existingBySubId) {
    return {
      success: true,
      action: 'skipped_duplicate',
      message: 'Submission already processed previously.',
      donor_id: existingBySubId.id
    };
  }

  // Calculate 3-month cooldown if donor reported donating recently
  let cooldownUntil = null;
  let availabilityStatus = 'available';
  let donationHistoryStatus = 'unconfirmed';

  if (data.donated_last_3_months) {
    if (data.last_donation_date) {
      const cooldownDate = calculateCooldownDate(data.last_donation_date, 3);
      cooldownUntil = cooldownDate ? cooldownDate.toISOString() : null;
      donationHistoryStatus = 'reported_recent';
      availabilityStatus = 'recently_donated';
    } else {
      // Missing donation date: do not invent a date; flag for review and suppress from notifications
      cooldownUntil = null;
      donationHistoryStatus = 'reported_recent';
      availabilityStatus = 'unavailable';
    }
  }

  // Check if donor already exists by phone or email
  const existingDonor = localStore.donors.find((d) => {
    if (data.phone && d.phone && d.phone === data.phone) return true;
    if (data.email && d.email && d.email === data.email) return true;
    return false;
  });

  if (existingDonor) {
    // Update existing donor without overwriting verified donation history
    existingDonor.blood_group = data.blood_group;
    if (data.city) existingDonor.city = data.city;
    if (data.area) existingDonor.area = data.area;
    existingDonor.consent_to_contact = data.consent_to_contact;
    existingDonor.consent_status = data.consent_to_contact ? 'consented' : 'withdrawn';
    existingDonor.consent_updated_at = new Date().toISOString();
    existingDonor.donated_last_3_months = data.donated_last_3_months;

    // Only update cooldown if fresh submission reports recent donation
    if (data.donated_last_3_months) {
      existingDonor.availability_status = availabilityStatus;
      existingDonor.donation_history_status = donationHistoryStatus;
      if (cooldownUntil) {
        existingDonor.cooldown_until = cooldownUntil;
      }
    }

    existingDonor.google_form_submission_id = data.submission_id;
    existingDonor.updated_at = new Date().toISOString();

    return {
      success: true,
      action: 'updated',
      message: 'Existing donor record safely updated with new Google Form submission.',
      donor_id: existingDonor.id,
      availability_status: existingDonor.availability_status,
      cooldown_until: existingDonor.cooldown_until
    };
  }

  // 5. Create new donor with pending_verification status
  const newDonor = {
    id: uuidv4(),
    user_id: null,
    name: data.name,
    blood_group: data.blood_group,
    city: data.city,
    area: data.area,
    phone: data.phone,
    email: data.email,
    postal_code: payload.postal_code || null,
    latitude: lat,
    longitude: lon,
    availability_status: availabilityStatus,
    consent_to_contact: data.consent_to_contact,
    consent_status: data.consent_to_contact ? 'consented' : 'withdrawn',
    consent_updated_at: new Date().toISOString(),
    donated_last_3_months: data.donated_last_3_months,
    donation_history_status: donationHistoryStatus,
    cooldown_until: cooldownUntil,
    last_availability_confirmed_at: new Date().toISOString(),
    verification_status: 'pending_verification',
    last_donation_date: data.last_donation_date,
    source: 'google_forms',
    google_form_submission_id: data.submission_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  localStore.donors.push(newDonor);

  // 6. Log successful integration
  localStore.integration_logs.push({
    id: uuidv4(),
    source: 'google_forms',
    event_type: 'donor_registered',
    status: 'success',
    payload_summary: {
      donor_id: newDonor.id,
      blood_group: newDonor.blood_group,
      city: newDonor.city,
      consent: newDonor.consent_to_contact,
      donated_last_3_months: newDonor.donated_last_3_months,
      availability: newDonor.availability_status,
      cooldown_until: newDonor.cooldown_until,
      verification_status: newDonor.verification_status
    },
    error_message: null,
    created_at: new Date().toISOString()
  });

  return {
    success: true,
    action: 'created',
    message: 'Donor successfully registered from Google Form with pending verification status.',
    donor_id: newDonor.id,
    availability_status: newDonor.availability_status,
    cooldown_until: newDonor.cooldown_until,
    verification_status: newDonor.verification_status
  };
}

module.exports = {
  validateGoogleFormPayload,
  processGoogleFormSubmission
};
