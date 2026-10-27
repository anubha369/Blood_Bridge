/**
 * BloodBridge Vision-X: Google Forms & Sheets Webhook Service
 * 
 * Implements:
 * Google Form -> Google Sheets -> Apps Script -> Secure Backend API -> Supabase/Database
 * - Secret signature validation
 * - Strict schema validation
 * - Deduplication by email, phone, or submission_id
 * - Default status: 'pending_verification'
 * - Integration audit logging in both localStore and Supabase/PostgreSQL
 * - Direct sync to Supabase / PostgreSQL when database is connected
 */

const { localStore, getPool, isPostgresConnected, getSupabase } = require('../db/db');
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
 * Safely synchronize donor record to Supabase / PostgreSQL if database connection is active
 */
async function syncDonorToDatabase(donorData, isUpdate) {
  const pool = getPool();
  const supabase = getSupabase();

  if (pool && isPostgresConnected()) {
    try {
      // Check existing row in Supabase PostgreSQL
      const checkRes = await pool.query(
        `SELECT id FROM donors 
         WHERE google_form_submission_id = $1 
            OR (phone IS NOT NULL AND phone = $2)
            OR (email IS NOT NULL AND email = $3)
         LIMIT 1;`,
        [donorData.google_form_submission_id, donorData.phone || '', donorData.email || '']
      );

      if (checkRes.rows.length > 0) {
        const existingId = checkRes.rows[0].id;
        await pool.query(
          `UPDATE donors
           SET name = $1,
               blood_group = $2,
               city = $3,
               area = $4,
               phone = COALESCE($5, phone),
               email = COALESCE($6, email),
               latitude = COALESCE($7, latitude),
               longitude = COALESCE($8, longitude),
               consent_to_contact = $9,
               consent_status = $10,
               donated_last_3_months = $11,
               donation_history_status = $12,
               cooldown_until = $13,
               availability_status = $14,
               google_form_submission_id = $15,
               updated_at = NOW()
           WHERE id = $16;`,
          [
            donorData.name,
            donorData.blood_group,
            donorData.city,
            donorData.area,
            donorData.phone,
            donorData.email,
            donorData.latitude,
            donorData.longitude,
            donorData.consent_to_contact,
            donorData.consent_status,
            donorData.donated_last_3_months,
            donorData.donation_history_status,
            donorData.cooldown_until,
            donorData.availability_status,
            donorData.google_form_submission_id,
            existingId
          ]
        );

        await pool.query(
          `INSERT INTO integration_logs (id, source, event_type, status, payload_summary, created_at)
           VALUES ($1, 'google_forms', 'donor_updated', 'success', $2, NOW());`,
          [uuidv4(), JSON.stringify({ donor_id: existingId, blood_group: donorData.blood_group, city: donorData.city })]
        );
      } else {
        await pool.query(
          `INSERT INTO donors (
             id, name, blood_group, city, area, phone, email,
             latitude, longitude, availability_status, consent_to_contact,
             consent_status, donated_last_3_months, donation_history_status,
             cooldown_until, verification_status, source, google_form_submission_id,
             created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7,
             $8, $9, $10, $11,
             $12, $13, $14,
             $15, 'pending_verification', 'google_forms', $16,
             NOW(), NOW()
           );`,
          [
            donorData.id,
            donorData.name,
            donorData.blood_group,
            donorData.city,
            donorData.area,
            donorData.phone,
            donorData.email,
            donorData.latitude,
            donorData.longitude,
            donorData.availability_status,
            donorData.consent_to_contact,
            donorData.consent_status,
            donorData.donated_last_3_months,
            donorData.donation_history_status,
            donorData.cooldown_until,
            donorData.google_form_submission_id
          ]
        );

        await pool.query(
          `INSERT INTO integration_logs (id, source, event_type, status, payload_summary, created_at)
           VALUES ($1, 'google_forms', 'donor_registered', 'success', $2, NOW());`,
          [uuidv4(), JSON.stringify({ donor_id: donorData.id, blood_group: donorData.blood_group, city: donorData.city })]
        );
      }
    } catch (pgErr) {
      console.warn('PostgreSQL / Supabase sync notice:', pgErr.message);
    }
  } else if (supabase) {
    try {
      const { data: existingRows } = await supabase
        .from('donors')
        .select('id')
        .or(`google_form_submission_id.eq.${donorData.google_form_submission_id},phone.eq.${donorData.phone || 'none'},email.eq.${donorData.email || 'none'}`)
        .limit(1);

      if (existingRows && existingRows.length > 0) {
        await supabase
          .from('donors')
          .update({
            name: donorData.name,
            blood_group: donorData.blood_group,
            city: donorData.city,
            area: donorData.area,
            consent_to_contact: donorData.consent_to_contact,
            consent_status: donorData.consent_status,
            donated_last_3_months: donorData.donated_last_3_months,
            donation_history_status: donorData.donation_history_status,
            cooldown_until: donorData.cooldown_until,
            availability_status: donorData.availability_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRows[0].id);
      } else {
        await supabase
          .from('donors')
          .insert({
            id: donorData.id,
            name: donorData.name,
            blood_group: donorData.blood_group,
            city: donorData.city,
            area: donorData.area,
            phone: donorData.phone,
            email: donorData.email,
            latitude: donorData.latitude,
            longitude: donorData.longitude,
            availability_status: donorData.availability_status,
            consent_to_contact: donorData.consent_to_contact,
            consent_status: donorData.consent_status,
            donated_last_3_months: donorData.donated_last_3_months,
            donation_history_status: donorData.donation_history_status,
            cooldown_until: donorData.cooldown_until,
            verification_status: 'pending_verification',
            source: 'google_forms',
            google_form_submission_id: donorData.google_form_submission_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (sbErr) {
      console.warn('Supabase client sync notice:', sbErr.message);
    }
  }
}

/**
 * Process verified incoming submission from Google Apps Script
 */
async function processGoogleFormSubmission(payload, secretHeader) {
  // 1. Verify Secret Header
  const expectedSecret = config.googleFormWebhookSecret;
  if (!secretHeader || secretHeader !== expectedSecret) {
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
      lat = 26.8467;
      lon = 80.9462;
    }
  }

  // 4. Deduplication & Idempotent Upsert
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
    existingDonor.blood_group = data.blood_group;
    if (data.city) existingDonor.city = data.city;
    if (data.area) existingDonor.area = data.area;
    existingDonor.consent_to_contact = data.consent_to_contact;
    existingDonor.consent_status = data.consent_to_contact ? 'consented' : 'withdrawn';
    existingDonor.consent_updated_at = new Date().toISOString();
    existingDonor.donated_last_3_months = data.donated_last_3_months;

    if (data.donated_last_3_months) {
      existingDonor.availability_status = availabilityStatus;
      existingDonor.donation_history_status = donationHistoryStatus;
      if (cooldownUntil) {
        existingDonor.cooldown_until = cooldownUntil;
      }
    }

    existingDonor.google_form_submission_id = data.submission_id;
    existingDonor.updated_at = new Date().toISOString();

    // Sync to Supabase/Postgres asynchronously
    await syncDonorToDatabase({ ...existingDonor, latitude: lat, longitude: lon }, true);

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

  // Sync to Supabase/Postgres asynchronously
  await syncDonorToDatabase(newDonor, false);

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
  processGoogleFormSubmission,
  syncDonorToDatabase
};
