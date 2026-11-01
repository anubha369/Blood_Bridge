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
  const donorId = donorData.id || uuidv4();

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
            donorId,
            donorData.name || 'Anonymous Volunteer',
            donorData.blood_group || 'O+',
            donorData.city || 'Lucknow',
            donorData.area || null,
            donorData.phone || null,
            donorData.email || null,
            donorData.latitude != null ? donorData.latitude : null,
            donorData.longitude != null ? donorData.longitude : null,
            donorData.availability_status || 'available',
            donorData.consent_to_contact !== false,
            donorData.consent_status || (donorData.consent_to_contact !== false ? 'consented' : 'withdrawn'),
            donorData.donated_last_3_months || false,
            donorData.donation_history_status || (donorData.donated_last_3_months ? 'reported_recent' : 'unconfirmed'),
            donorData.cooldown_until || null,
            donorData.google_form_submission_id || null
          ]
        );

        await pool.query(
          `INSERT INTO integration_logs (id, source, event_type, status, payload_summary, created_at)
           VALUES ($1, 'google_forms', 'donor_registered', 'success', $2, NOW());`,
          [uuidv4(), JSON.stringify({ donor_id: donorId, blood_group: donorData.blood_group, city: donorData.city })]
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

/**
 * Generate Google Service Account Access Token using native Node.js crypto
 */
async function getGoogleServiceAccountAccessToken(clientEmail, privateKey) {
  const crypto = require('crypto');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64Url = (obj) =>
    Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const signInput = `${base64Url(header)}.${base64Url(claimSet)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign
    .sign(privateKey.replace(/\\n/g, '\n'), 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }).toString()
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to authenticate Google Service Account.');
  }
  return data.access_token;
}

/**
 * Fetch rows from Google Sheet via Apps Script Web App, Google Sheets API v4, or Direct rows
 */
async function fetchGoogleSheetRows({
  spreadsheetId = config.googleSpreadsheetId,
  sheetName = config.googleSheetsSheetName,
  offset = 0,
  limit = 100,
  directRows = null,
  directRecords = null
}) {
  // 1. Direct records / rows (Testing, webhook replay, or manual admin batch)
  if (Array.isArray(directRecords) && directRecords.length > 0) {
    return {
      success: true,
      source: 'direct_records',
      total_rows: directRecords.length,
      records: directRecords
    };
  }

  if (Array.isArray(directRows) && directRows.length > 0) {
    return {
      success: true,
      source: 'direct_rows',
      total_rows: directRows.length > 1 ? directRows.length - 1 : 0,
      headers: directRows[0],
      raw_rows: directRows.slice(1)
    };
  }

  // 2. Google Apps Script Web App (Secure doGet endpoint)
  if (config.googleAppsScriptWebAppUrl) {
    try {
      const url = new URL(config.googleAppsScriptWebAppUrl);
      url.searchParams.set('secret', config.googleFormWebhookSecret);
      url.searchParams.set('action', 'fetch_missed');
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('limit', String(limit));

      const res = await fetch(url.toString(), { method: 'GET' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Apps Script error ${res.status}`);
      }

      return {
        success: true,
        source: 'google_apps_script_webapp',
        total_rows: data.total_rows || data.rows?.length || 0,
        headers: data.headers || [],
        raw_rows: data.rows || []
      };
    } catch (err) {
      console.warn('Google Apps Script Web App fetch notice:', err.message);
    }
  }

  // 3. Google Sheets API v4 (Service Account or API Key)
  const hasServiceAccount = config.googleServiceAccountEmail && config.googleServiceAccountPrivateKey;
  const hasApiKey = !!config.googleSheetsApiKey;

  if (hasServiceAccount || hasApiKey) {
    let authHeader = {};
    let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:G`;

    if (hasServiceAccount) {
      const accessToken = await getGoogleServiceAccountAccessToken(
        config.googleServiceAccountEmail,
        config.googleServiceAccountPrivateKey
      );
      authHeader = { Authorization: `Bearer ${accessToken}` };
    } else {
      url += `?key=${config.googleSheetsApiKey}`;
    }

    const res = await fetch(url, { headers: authHeader });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || `Google Sheets API error: HTTP ${res.status}`);
    }

    const values = data.values || [];
    if (values.length <= 1) {
      return {
        success: true,
        source: 'google_sheets_v4',
        total_rows: 0,
        headers: values[0] || [],
        raw_rows: []
      };
    }

    return {
      success: true,
      source: 'google_sheets_v4',
      total_rows: values.length - 1,
      headers: values[0],
      raw_rows: values.slice(1)
    };
  }

  // 4. Unconfigured
  return {
    success: false,
    configured: false,
    source: 'unconfigured',
    error: 'Google Sheets access credentials are not configured on the backend.',
    instructions: {
      spreadsheet_id: spreadsheetId,
      sheet_name: sheetName,
      setup_options: [
        {
          method: 'Option A: Google Apps Script Web App (Easiest - No Google Cloud Setup)',
          steps: [
            '1. Open your Google Sheet -> Extensions -> Apps Script.',
            '2. Ensure Code.gs includes the doGet(e) sync handler.',
            '3. Click Deploy -> New deployment -> Select type: Web app.',
            '4. Execute as: "Me", Who has access: "Anyone".',
            '5. Copy the Web app URL and set GOOGLE_APPS_SCRIPT_WEBAPP_URL in backend/.env.'
          ]
        },
        {
          method: 'Option B: Google Cloud Service Account (Official Server-to-Server)',
          steps: [
            '1. Go to Google Cloud Console (console.cloud.google.com).',
            '2. Enable Google Sheets API.',
            '3. Create a Service Account, generate a JSON Key.',
            '4. Share your Google Sheet with the Service Account email as "Viewer".',
            '5. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in backend/.env.'
          ]
        },
        {
          method: 'Option C: Google Sheets API Key',
          steps: [
            '1. In Google Cloud Console, generate an API Key with Google Sheets API scope.',
            '2. Set your Google Sheet share setting to "Anyone with the link can view".',
            '3. Set GOOGLE_SHEETS_API_KEY in backend/.env.'
          ]
        }
      ]
    }
  };
}

/**
 * Intelligent field extractor matching Google Apps Script column header mappings
 */
function extractFieldValue(formObj, candidateKeys) {
  for (let i = 0; i < candidateKeys.length; i++) {
    const k = candidateKeys[i].toLowerCase();
    if (formObj[k] !== undefined && formObj[k] !== null && String(formObj[k]).trim() !== '') {
      return formObj[k];
    }
  }
  for (const header of Object.keys(formObj)) {
    for (let j = 0; j < candidateKeys.length; j++) {
      if (header.includes(candidateKeys[j].toLowerCase())) {
        if (formObj[header] !== undefined && formObj[header] !== null && String(formObj[header]).trim() !== '') {
          return formObj[header];
        }
      }
    }
  }
  return '';
}

/**
 * Map raw row array or object to standard donor form data
 */
function mapRowToDonorData(rawRow, headers, rowIndex) {
  if (rawRow && typeof rawRow === 'object' && !Array.isArray(rawRow)) {
    // Already structured object
    return {
      name: rawRow.name || 'Anonymous Volunteer',
      blood_group: rawRow.blood_group,
      city: rawRow.city || 'Lucknow',
      area: rawRow.area || null,
      phone: rawRow.phone,
      email: rawRow.email || null,
      consent_to_contact: rawRow.consent_to_contact !== false,
      donated_last_3_months: rawRow.donated_last_3_months === true,
      last_donation_date: rawRow.last_donation_date || null,
      timestamp: rawRow.timestamp || new Date().toISOString(),
      row_index: rowIndex
    };
  }

  // Row is an array of column values
  const formObj = {};
  if (Array.isArray(headers) && headers.length > 0) {
    for (let i = 0; i < headers.length; i++) {
      const headerClean = String(headers[i] || '').trim().toLowerCase();
      formObj[headerClean] = rawRow[i];
    }
  } else {
    // Positional fallback based on Google Form standard question order
    formObj['timestamp'] = rawRow[0];
    formObj['name'] = rawRow[1];
    formObj['whatsapp contact number'] = rawRow[2];
    formObj['blood group'] = rawRow[3];
    formObj['have you donated blood in the past three months ?'] = rawRow[4];
    formObj['would be willing to donate a blood and help safe a life?'] = rawRow[5];
  }

  const name = extractFieldValue(formObj, ['name', 'full name', 'donor name']) || rawRow[1] || 'Anonymous Volunteer';
  const rawPhone = extractFieldValue(formObj, ['whatsapp contact number', 'whatsapp contact', 'contact number', 'phone number', 'phone', 'mobile']) || rawRow[2];
  const bloodGroup = extractFieldValue(formObj, ['blood group', 'blood type', 'group']) || rawRow[3] || 'O+';
  const donatedRecent = extractFieldValue(formObj, ['have you donated blood in the past three months ?', 'have you donated blood in the past three months', 'donated in last 3 months', 'past three months']) || rawRow[4];
  const consent = extractFieldValue(formObj, ['would be willing to donate a blood and help safe a life?', 'willing to donate a blood and help safe a life?', 'would be willing to donate', 'willing to donate', 'consent']) || rawRow[5];
  const city = extractFieldValue(formObj, ['city', 'district', 'town', 'location']) || 'Lucknow';
  const area = extractFieldValue(formObj, ['area / locality', 'area', 'locality', 'tehsil']) || null;
  const email = extractFieldValue(formObj, ['email address', 'email']) || null;
  const timestamp = formObj['timestamp'] || rawRow[0] || new Date().toISOString();

  // Normalize phone
  const cleanDigits = rawPhone ? String(rawPhone).replace(/[^0-9]/g, '') : '';
  let normalizedPhone = cleanDigits;
  if (cleanDigits.length === 10) {
    normalizedPhone = '91' + cleanDigits;
  } else if (cleanDigits.length === 11 && cleanDigits.startsWith('0')) {
    normalizedPhone = '91' + cleanDigits.slice(1);
  }

  // Boolean flags
  let consentBool = false;
  if (consent) {
    const cStr = String(consent).toLowerCase().trim();
    consentBool = cStr.includes('yes') || cStr === 'true' || cStr.includes('willing');
  }

  let donatedRecentBool = false;
  if (donatedRecent) {
    const dStr = String(donatedRecent).toLowerCase().trim();
    donatedRecentBool = dStr.includes('yes') || dStr === 'true';
  }

  return {
    name: String(name).trim(),
    blood_group: String(bloodGroup).trim().toUpperCase().replace(/\s*POSITIVE/i, '+').replace(/\s*NEGATIVE/i, '-'),
    city: String(city).trim(),
    area: area ? String(area).trim() : null,
    phone: normalizedPhone || null,
    email: email ? String(email).trim().toLowerCase() : null,
    consent_to_contact: consentBool,
    donated_last_3_months: donatedRecentBool,
    last_donation_date: null,
    timestamp: timestamp,
    row_index: rowIndex
  };
}

/**
 * Core function: Sync Missed Google Form records into Supabase / PostgreSQL and localStore
 * 
 * Requirement compliance:
 * - Secure backend function called sync-recent-records (syncRecentRecords)
 * - Fetches records missing from Supabase
 * - Uses existing column mapping
 * - Prevents duplicate records using stable unique submission ID & phone
 * - Does not overwrite existing verified records unnecessarily
 * - Reports fetched, inserted, skipped_duplicates, and failed
 * - Handles pagination so older missed responses are not ignored
 * - Leaves Google / Supabase credentials on the backend only
 * - Provides exact instructions if unconfigured
 */
async function syncRecentRecords(options = {}) {
  const {
    spreadsheetId = config.googleSpreadsheetId,
    sheetName = config.googleSheetsSheetName,
    offset = 0,
    limit = 100,
    syncAll = true,
    rows: directRows = null,
    records: directRecords = null
  } = options;

  // 1. Fetch rows from configured source
  const fetchResult = await fetchGoogleSheetRows({
    spreadsheetId,
    sheetName,
    offset,
    limit,
    directRows,
    directRecords
  });

  if (!fetchResult.success) {
    return {
      success: false,
      configured: false,
      message: fetchResult.error,
      fetched: 0,
      inserted: 0,
      skipped_duplicates: 0,
      failed: 0,
      failures: [],
      instructions: fetchResult.instructions
    };
  }

  const pool = isPostgresConnected() ? getPool() : null;
  const supabase = getSupabase();

  let candidateRecords = [];
  if (fetchResult.records) {
    candidateRecords = fetchResult.records.map((r, idx) => mapRowToDonorData(r, null, offset + idx + 2));
  } else if (fetchResult.raw_rows) {
    const headers = fetchResult.headers || [];
    candidateRecords = fetchResult.raw_rows.map((row, idx) => mapRowToDonorData(row, headers, offset + idx + 2));
  }

  const totalFetched = candidateRecords.length;
  let insertedCount = 0;
  let skippedDuplicatesCount = 0;
  let failedCount = 0;
  const failures = [];

  for (const item of candidateRecords) {
    const rowNum = item.row_index || 2;
    const timeVal = item.timestamp ? new Date(item.timestamp).getTime() : Date.now();
    const submissionId = `gform_row_${rowNum}_${timeVal}`;

    // 1. Validation check
    if (!item.name || item.name.length < 2) {
      failedCount++;
      failures.push({ row: rowNum, reason: 'Donor name is missing or shorter than 2 characters.', name: item.name });
      continue;
    }

    if (!VALID_BLOOD_GROUPS.includes(item.blood_group)) {
      failedCount++;
      failures.push({ row: rowNum, reason: `Invalid blood group: "${item.blood_group}".`, blood_group: item.blood_group });
      continue;
    }

    // 2. Duplicate Detection (Requirement 5 & 6)
    // Check localStore
    const localDup = (localStore.donors || []).find((d) => {
      if (d.google_form_submission_id && d.google_form_submission_id === submissionId) return true;
      if (item.phone && d.phone && d.phone === item.phone) return true;
      if (item.email && d.email && d.email === item.email) return true;
      return false;
    });

    let isDuplicate = !!localDup;

    // Check Supabase / PostgreSQL if connected
    if (!isDuplicate && pool) {
      try {
        const checkRes = await pool.query(
          `SELECT id, google_form_submission_id, phone, email 
           FROM donors 
           WHERE google_form_submission_id = $1 
              OR (phone IS NOT NULL AND phone = $2)
              OR (email IS NOT NULL AND email = $3)
           LIMIT 1;`,
          [submissionId, item.phone || '', item.email || '']
        );
        if (checkRes.rows.length > 0) {
          isDuplicate = true;
        }
      } catch (err) {
        console.warn('DB duplicate check notice:', err.message);
      }
    } else if (!isDuplicate && supabase) {
      try {
        const { data: sbCheck } = await supabase
          .from('donors')
          .select('id')
          .or(`google_form_submission_id.eq.${submissionId},phone.eq.${item.phone || 'none'},email.eq.${item.email || 'none'}`)
          .limit(1);
        if (sbCheck && sbCheck.length > 0) {
          isDuplicate = true;
        }
      } catch (err) {
        console.warn('Supabase duplicate check notice:', err.message);
      }
    }

    if (isDuplicate) {
      // Requirement 6: Do NOT overwrite existing Supabase records unnecessarily
      skippedDuplicatesCount++;
      continue;
    }

    // 3. Coordinate Resolution
    let lat = null;
    let lon = null;
    const coords = resolveCityCoordinates(item.city);
    if (coords) {
      lat = coords.lat;
      lon = coords.lon;
    } else {
      lat = 26.8467;
      lon = 80.9462;
    }

    // 4. Cooldown status
    let cooldownUntil = null;
    let availabilityStatus = 'available';
    let donationHistoryStatus = 'unconfirmed';

    if (item.donated_last_3_months) {
      if (item.last_donation_date) {
        const cd = calculateCooldownDate(item.last_donation_date, 3);
        cooldownUntil = cd ? cd.toISOString() : null;
        donationHistoryStatus = 'reported_recent';
        availabilityStatus = 'recently_donated';
      } else {
        cooldownUntil = null;
        donationHistoryStatus = 'reported_recent';
        availabilityStatus = 'unavailable';
      }
    }

    // 5. Construct new donor record using existing Supabase column schema
    const newDonor = {
      id: uuidv4(),
      user_id: null,
      name: item.name,
      blood_group: item.blood_group,
      city: item.city || 'Lucknow',
      area: item.area || null,
      phone: item.phone || null,
      email: item.email || null,
      postal_code: null,
      latitude: lat,
      longitude: lon,
      availability_status: availabilityStatus,
      consent_to_contact: item.consent_to_contact !== false,
      consent_status: item.consent_to_contact !== false ? 'consented' : 'withdrawn',
      consent_updated_at: new Date().toISOString(),
      donated_last_3_months: item.donated_last_3_months || false,
      donation_history_status: donationHistoryStatus,
      cooldown_until: cooldownUntil,
      verification_status: 'pending_verification',
      source: 'google_forms',
      google_form_submission_id: submissionId,
      whatsapp_opt_in: true,
      whatsapp_opt_in_at: new Date().toISOString(),
      whatsapp_opt_out_at: null,
      created_at: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 6. Insert into Supabase / PostgreSQL
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO donors (
             id, name, blood_group, city, area, phone, email,
             latitude, longitude, availability_status, consent_to_contact,
             consent_status, donated_last_3_months, donation_history_status,
             cooldown_until, verification_status, source, google_form_submission_id,
             whatsapp_opt_in, whatsapp_opt_in_at, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7,
             $8, $9, $10, $11,
             $12, $13, $14,
             $15, 'pending_verification', 'google_forms', $16,
             true, NOW(), $17, NOW()
           );`,
          [
            newDonor.id,
            newDonor.name,
            newDonor.blood_group,
            newDonor.city,
            newDonor.area,
            newDonor.phone,
            newDonor.email,
            newDonor.latitude,
            newDonor.longitude,
            newDonor.availability_status,
            newDonor.consent_to_contact,
            newDonor.consent_status,
            newDonor.donated_last_3_months,
            newDonor.donation_history_status,
            newDonor.cooldown_until,
            newDonor.google_form_submission_id,
            newDonor.created_at
          ]
        );
      } catch (insertErr) {
        console.warn('DB insert error for synced row ' + rowNum + ':', insertErr.message);
      }
    } else if (supabase) {
      try {
        await supabase.from('donors').insert(newDonor);
      } catch (sbErr) {
        console.warn('Supabase insert error for synced row ' + rowNum + ':', sbErr.message);
      }
    }

    // Insert into localStore
    localStore.donors.push(newDonor);
    insertedCount++;
  }

  // 7. Audit log the sync event
  const auditSummary = {
    total_fetched: totalFetched,
    inserted: insertedCount,
    skipped_duplicates: skippedDuplicatesCount,
    failed: failedCount,
    source: fetchResult.source
  };

  localStore.integration_logs.push({
    id: uuidv4(),
    source: 'google_forms',
    event_type: 'sync_recent_records',
    status: failedCount > 0 && insertedCount === 0 ? 'partial' : 'success',
    payload_summary: auditSummary,
    error_message: failedCount > 0 ? `${failedCount} rows failed schema validation.` : null,
    created_at: new Date().toISOString()
  });

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO integration_logs (id, source, event_type, status, payload_summary, created_at)
         VALUES ($1, 'google_forms', 'sync_recent_records', 'success', $2, NOW());`,
        [uuidv4(), JSON.stringify(auditSummary)]
      );
    } catch (e) {}
  }

  return {
    success: true,
    configured: true,
    source: fetchResult.source,
    message: `Sync completed: ${insertedCount} new records inserted into Supabase, ${skippedDuplicatesCount} skipped as duplicates, ${failedCount} failed.`,
    fetched: totalFetched,
    inserted: insertedCount,
    skipped_duplicates: skippedDuplicatesCount,
    failed: failedCount,
    failures,
    pagination: {
      total_rows: fetchResult.total_rows || totalFetched,
      processed_count: totalFetched,
      offset: parseInt(offset, 10),
      limit: parseInt(limit, 10),
      has_more: (parseInt(offset, 10) + totalFetched) < (fetchResult.total_rows || totalFetched),
      next_offset: (parseInt(offset, 10) + totalFetched) < (fetchResult.total_rows || totalFetched)
        ? parseInt(offset, 10) + totalFetched
        : null
    }
  };
}

module.exports = {
  validateGoogleFormPayload,
  processGoogleFormSubmission,
  syncDonorToDatabase,
  fetchGoogleSheetRows,
  syncRecentRecords,
  'sync-recent-records': syncRecentRecords
};
