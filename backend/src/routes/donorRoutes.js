const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const {
  localStore,
  isPostgresConnected,
  getPool,
  getDonorByUserId,
  findUnclaimedGoogleFormDonor,
  claimDonorRecord,
  getTelegramNotificationByRequestAndDonor,
  updateTelegramNotificationResponse
} = require('../db/db');
const { authenticateUser, optionalAuth, requireRole } = require('../middleware/auth');
const { findNearbyDonors, resolveCityCoordinates, getAllSupportedCities } = require('../services/spatialService');
const { calculateCooldownDate, recordCompletedDonation, isDonorEligibleForNotification, checkAndUpdateCooldownExpiry } = require('../services/cooldownService');
const { awardCreditPoints } = require('../services/creditService');
const { isGroupCompatible, MEDICAL_SAFETY_DISCLAIMER } = require('../services/matchingService');

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// GET /api/donors/locations
// Returns all supported cities and districts, with Uttar Pradesh prioritized
router.get('/locations', (req, res) => {
  const locations = getAllSupportedCities();
  return res.json({
    success: true,
    count: locations.length,
    locations
  });
});

// GET /api/donors/nearby
// Spatial search using PostGIS ST_DWithin / ST_Distance logic with privacy protection
router.get('/nearby', optionalAuth, async (req, res, next) => {
  try {
    const { latitude, longitude, radius_km, blood_group, city, limit = 20, offset = 0 } = req.query;

    let searchLat = latitude;
    let searchLon = longitude;

    let searchCity = city || null;

    // If city supplied instead of coordinates, resolve coordinates
    if ((!searchLat || !searchLon) && city) {
      const coords = resolveCityCoordinates(city);
      if (coords) {
        searchLat = coords.lat;
        searchLon = coords.lon;
        searchCity = coords.name;
      }
    }

    // Graceful default: if no coordinates or city given, default to Lucknow regional hub
    if (!searchLat || !searchLon) {
      searchLat = 26.8467;
      searchLon = 80.9462;
      searchCity = searchCity || 'Lucknow';
    }

    // Query donors in radius
    const allNearby = await findNearbyDonors({
      latitude: searchLat,
      longitude: searchLon,
      radiusKm: radius_km,
      bloodGroup: null, // Fetch all in radius to allow compatible ranking
      limit: 100,
      offset: 0
    });

    let results = allNearby;
    if (blood_group) {
      const targetGroup = blood_group.trim().toUpperCase();
      // 1. Incompatible groups must never appear
      results = results.filter((d) => isGroupCompatible(targetGroup, d.blood_group));

      // 2. Deterministic ranking: Exact matches first, then compatible, closer first, verified first
      results.sort((a, b) => {
        const isExactA = (a.blood_group || '').trim().toUpperCase() === targetGroup;
        const isExactB = (b.blood_group || '').trim().toUpperCase() === targetGroup;
        if (isExactA !== isExactB) return isExactA ? -1 : 1;

        const distA = a.distance_km != null ? Number(a.distance_km) : 9999;
        const distB = b.distance_km != null ? Number(b.distance_km) : 9999;
        if (Math.abs(distA - distB) > 0.05) return distA - distB;

        const isVerifiedA = ['verified', 'verified_by_authorized_personnel'].includes(a.verification_status);
        const isVerifiedB = ['verified', 'verified_by_authorized_personnel'].includes(b.verification_status);
        if (isVerifiedA !== isVerifiedB) return isVerifiedA ? -1 : 1;

        return String(a.donor_id || a.id).localeCompare(String(b.donor_id || b.id));
      });
    }

    // Apply pagination
    const paginated = results.slice(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10));

    return res.json({
      success: true,
      count: paginated.length,
      total_count: results.length,
      search_center: {
        latitude: parseFloat(searchLat),
        longitude: parseFloat(searchLon),
        city: city || 'Custom Coordinates'
      },
      radius_km: parseFloat(radius_km || 25),
      blood_group_filter: blood_group || 'All Compatible',
      results: paginated,
      disclaimer: MEDICAL_SAFETY_DISCLAIMER
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/donors/register
// Registered user completes donor registration
router.post('/register', authenticateUser, async (req, res, next) => {
  try {
    const {
      blood_group,
      city,
      area,
      postal_code,
      latitude,
      longitude,
      consent_to_contact = true,
      last_donation_date,
      notification_preferences
    } = req.body;

    if (!blood_group || !city) {
      return res.status(400).json({ success: false, error: 'Blood group and city are required.' });
    }

    const normalizedGroup = blood_group.trim().toUpperCase();
    if (!VALID_BLOOD_GROUPS.includes(normalizedGroup)) {
      return res.status(400).json({ success: false, error: `Invalid blood group. Must be one of: ${VALID_BLOOD_GROUPS.join(', ')}` });
    }

    // Check if user already registered as donor
    let existing = localStore.donors.find((d) => d.user_id === req.user.id);
    if (!existing && isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const check = await pool.query('SELECT id FROM public.donors WHERE user_id = $1 LIMIT 1', [req.user.id]);
        if (check.rows.length > 0) existing = check.rows[0];
      } catch (e) {}
    }

    if (existing) {
      return res.status(409).json({ success: false, error: 'A donor profile already exists for this account. Please update your existing profile.' });
    }

    // Resolve coordinates if not provided
    let lat = latitude ? parseFloat(latitude) : null;
    let lon = longitude ? parseFloat(longitude) : null;
    if (isNaN(lat) || isNaN(lon) || lat == null || lon == null) {
      const coords = resolveCityCoordinates(city);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
      } else {
        lat = 26.9124;
        lon = 75.7873;
      }
    }

    const newDonor = {
      id: uuidv4(),
      user_id: req.user.id,
      name: req.user.name,
      blood_group: normalizedGroup,
      city: city.trim(),
      area: area ? area.trim() : null,
      postal_code: postal_code ? postal_code.trim() : null,
      latitude: lat,
      longitude: lon,
      availability_status: 'available',
      consent_to_contact: Boolean(consent_to_contact),
      consent_status: Boolean(consent_to_contact) ? 'consented' : 'withdrawn',
      consent_updated_at: new Date().toISOString(),
      donated_last_3_months: false,
      cooldown_until: null,
      last_availability_confirmed_at: new Date().toISOString(),
      donation_history_status: last_donation_date ? 'reported_recent' : 'unconfirmed',
      verification_status: 'verified', // Platform registered donors verified via verified account
      last_donation_date: last_donation_date || null,
      source: 'platform',
      notification_preferences: notification_preferences || { email: true, in_app: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localStore.donors.push(newDonor);

    // Persist into PostgreSQL donors table
    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        await pool.query(
          `INSERT INTO public.donors (
            id, user_id, name, blood_group, city, area, postal_code,
            latitude, longitude, availability_status, consent_to_contact,
            consent_status, consent_updated_at, verification_status,
            last_donation_date, source, phone, email,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, NOW(), $13,
            $14, $15, $16, $17,
            NOW(), NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            blood_group = EXCLUDED.blood_group,
            city = EXCLUDED.city,
            area = EXCLUDED.area,
            postal_code = EXCLUDED.postal_code,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            updated_at = NOW()`,
          [
            newDonor.id,
            newDonor.user_id,
            newDonor.name,
            newDonor.blood_group,
            newDonor.city,
            newDonor.area,
            newDonor.postal_code,
            newDonor.latitude,
            newDonor.longitude,
            newDonor.availability_status,
            newDonor.consent_to_contact,
            newDonor.consent_status,
            'verified',
            newDonor.last_donation_date,
            'platform',
            req.user.phone || null,
            req.user.email || null
          ]
        );
      } catch (dbErr) {
        console.warn('PostgreSQL donor insert warning:', dbErr.message);
      }
    }

    // Award initial profile completion points (50 points)
    try {
      awardCreditPoints({
        userId: req.user.id,
        donorId: newDonor.id,
        eventType: 'profile_completion',
        idempotencyKey: `init_reg_${newDonor.id}`
      });
    } catch (e) {
      // Non-blocking for registration
    }

    // Update user role to donor if not admin
    const userRecord = localStore.users.find((u) => u.id === req.user.id);
    if (userRecord && userRecord.role !== 'admin') {
      userRecord.role = 'donor';
    }

    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        await pool.query(
          `UPDATE public.users SET role = 'donor', updated_at = NOW() WHERE id = $1 AND role <> 'admin'`,
          [req.user.id]
        );
      } catch (e) {}
    }

    return res.status(201).json({
      success: true,
      message: 'Donor registration completed successfully.',
      donor: newDonor
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/donors/profile
router.get('/profile', authenticateUser, async (req, res) => {
  let donor = await getDonorByUserId(req.user.id);
  if (!donor) {
    donor = localStore.donors.find((d) => d.user_id === req.user.id);
  }

  // Automatic account linking: if user has no donor record yet, search for unclaimed Google Form registration
  if (!donor && (req.user.phone || req.user.email)) {
    try {
      const unclaimed = await findUnclaimedGoogleFormDonor({ phone: req.user.phone, email: req.user.email });
      if (unclaimed) {
        const claimResult = await claimDonorRecord(unclaimed.id, req.user.id);
        if (claimResult.success) {
          donor = claimResult.donor;
          console.log(`[Auto-Link] Unclaimed Google Form donor ${unclaimed.id} linked to user ${req.user.id}`);
        }
      }
    } catch (linkErr) {
      console.warn('[Auto-Link Warning]:', linkErr.message);
    }
  }

  if (!donor) {
    return res.status(404).json({ success: false, error: 'No donor profile found for current user.' });
  }
  return res.json({ success: true, donor });
});

// POST /api/donors/claim-google-form-record
router.post('/claim-google-form-record', authenticateUser, async (req, res) => {
  try {
    const existingDonor = await getDonorByUserId(req.user.id);
    if (existingDonor) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active donor profile connected to this account.',
        donor: existingDonor
      });
    }

    const phoneToSearch = req.body.phone || req.user.phone;
    const emailToSearch = req.body.email || req.user.email;

    const candidate = await findUnclaimedGoogleFormDonor({ phone: phoneToSearch, email: emailToSearch });
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'No unclaimed Google Form registration found matching your verified mobile number.'
      });
    }

    const claimRes = await claimDonorRecord(candidate.id, req.user.id);
    if (!claimRes.success) {
      if (claimRes.reason === 'already_claimed') {
        return res.status(409).json({
          success: false,
          error: 'This donor registration record has already been linked to another account.'
        });
      }
      return res.status(500).json({
        success: false,
        error: claimRes.error || 'Failed to link donor record. Please contact coordination support.'
      });
    }

    return res.json({
      success: true,
      message: 'Google Form donor registration successfully linked to your account.',
      donor: claimRes.donor
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/donors/profile
router.put('/profile', authenticateUser, async (req, res, next) => {
  try {
    let donor = localStore.donors.find((d) => d.user_id === req.user.id);
    if (!donor && isPostgresConnected()) {
      donor = await getDonorByUserId(req.user.id);
    }
    if (!donor) {
      return res.status(404).json({ success: false, error: 'No donor profile found.' });
    }

    const { availability_status, consent_to_contact, city, area, last_donation_date, notification_preferences } = req.body;

    if (availability_status && ['available', 'unavailable', 'recently_donated'].includes(availability_status)) {
      donor.availability_status = availability_status;
    }

    if (typeof consent_to_contact === 'boolean') {
      donor.consent_to_contact = consent_to_contact;
      donor.consent_status = consent_to_contact ? 'consented' : 'withdrawn';
    }

    if (city) donor.city = city.trim();
    if (area !== undefined) donor.area = area ? area.trim() : null;
    if (last_donation_date !== undefined) donor.last_donation_date = last_donation_date;
    if (notification_preferences) donor.notification_preferences = notification_preferences;

    donor.updated_at = new Date().toISOString();

    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        await pool.query(
          `UPDATE public.donors SET
            availability_status = $1,
            consent_to_contact = $2,
            consent_status = $3,
            city = COALESCE($4, city),
            area = $5,
            last_donation_date = $6,
            updated_at = NOW()
          WHERE user_id = $7`,
          [
            donor.availability_status,
            donor.consent_to_contact,
            donor.consent_status,
            city || null,
            donor.area,
            donor.last_donation_date,
            req.user.id
          ]
        );
      } catch (dbErr) {
        console.warn('PostgreSQL donor update warning:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Donor profile updated successfully.',
      donor
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/donors/availability
// Toggle current availability
router.post('/availability', authenticateUser, async (req, res) => {
  let donor = localStore.donors.find((d) => d.user_id === req.user.id);
  if (!donor && isPostgresConnected()) {
    donor = await getDonorByUserId(req.user.id);
  }
  if (!donor) {
    return res.status(404).json({ success: false, error: 'Donor profile not found.' });
  }

  const { status } = req.body;
  if (!['available', 'unavailable'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Status must be "available" or "unavailable".' });
  }

  donor.availability_status = status;
  donor.last_availability_confirmed_at = new Date().toISOString();
  donor.updated_at = new Date().toISOString();

  if (isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      await pool.query(
        `UPDATE public.donors SET
          availability_status = $1,
          last_availability_confirmed_at = NOW(),
          updated_at = NOW()
        WHERE user_id = $2`,
        [status, req.user.id]
      );
    } catch (e) {}
  }

  // Award monthly availability confirmation points (10 pts) idempotently
  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  try {
    awardCreditPoints({
      userId: req.user.id,
      donorId: donor.id,
      eventType: 'availability_update',
      idempotencyKey: `avail_${donor.id}_${currentMonthKey}`
    });
  } catch (e) {
    // Ignore duplicate
  }

  return res.json({
    success: true,
    message: `Availability updated to ${status}.`,
    availability_status: donor.availability_status,
    last_availability_confirmed_at: donor.last_availability_confirmed_at
  });
});

// POST /api/donors/confirm-donation
// Record a completed donation and activate the 3-month cooldown
router.post('/confirm-donation', authenticateUser, (req, res) => {
  const donor = localStore.donors.find((d) => d.user_id === req.user.id);
  if (!donor) {
    return res.status(404).json({ success: false, error: 'Donor profile not found.' });
  }

  const { donation_date = new Date().toISOString().split('T')[0] } = req.body;

  try {
    const updated = recordCompletedDonation(donor.id, donation_date, 'donor');
    return res.json({
      success: true,
      message: 'Donation confirmed. 3-month cooldown is now active. Emergency request notifications are temporarily paused for your recovery.',
      donor: updated
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/donors/cooldown-status
router.get('/cooldown-status', authenticateUser, (req, res) => {
  const donor = localStore.donors.find((d) => d.user_id === req.user.id);
  if (!donor) {
    return res.status(404).json({ success: false, error: 'Donor profile not found.' });
  }

  // Check if cooldown has elapsed
  checkAndUpdateCooldownExpiry(donor);

  const now = Date.now();
  let inCooldown = false;
  let daysRemaining = 0;

  if (donor.cooldown_until) {
    const cooldownTime = new Date(donor.cooldown_until).getTime();
    if (cooldownTime > now) {
      inCooldown = true;
      daysRemaining = Math.ceil((cooldownTime - now) / (1000 * 60 * 60 * 24));
    }
  }

  return res.json({
    success: true,
    donor_id: donor.id,
    in_cooldown: inCooldown,
    cooldown_until: donor.cooldown_until,
    days_remaining: daysRemaining,
    availability_status: donor.availability_status,
    consent_status: donor.consent_status || 'consented',
    last_donation_date: donor.last_donation_date,
    eligible_for_notification: isDonorEligibleForNotification(donor)
  });
});

// POST /api/donors/consent/withdraw
// Quickly withdraw contact consent
router.post('/consent/withdraw', authenticateUser, (req, res) => {
  const donor = localStore.donors.find((d) => d.user_id === req.user.id);
  if (!donor) {
    return res.status(404).json({ success: false, error: 'Donor profile not found.' });
  }

  donor.consent_to_contact = false;
  donor.consent_status = 'withdrawn';
  donor.consent_updated_at = new Date().toISOString();
  donor.updated_at = new Date().toISOString();

  return res.json({
    success: true,
    message: 'Consent to be contacted has been withdrawn. You will no longer appear in public donor coordination searches.',
    consent_to_contact: false,
    consent_status: 'withdrawn'
  });
});

// POST /api/donors/consent/grant
// Re-grant contact consent
router.post('/consent/grant', authenticateUser, (req, res) => {
  const donor = localStore.donors.find((d) => d.user_id === req.user.id);
  if (!donor) {
    return res.status(404).json({ success: false, error: 'Donor profile not found.' });
  }

  donor.consent_to_contact = true;
  donor.consent_status = 'consented';
  donor.consent_updated_at = new Date().toISOString();
  donor.updated_at = new Date().toISOString();

  return res.json({
    success: true,
    message: 'Consent granted. You are now eligible to appear in emergency coordination searches when available.',
    consent_to_contact: true,
    consent_status: 'consented'
  });
});

// GET /api/donors/contact-requests
// Donor views all emergency contact requests addressed to them
router.get('/contact-requests', authenticateUser, async (req, res, next) => {
  try {
    const donor = await getDonorByUserId(req.user.id);
    if (!donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor profile not found for this account.'
      });
    }

    let notifications = [];
    if (isPostgresConnected() && getPool()) {
      const pool = getPool();
      try {
        const query = `
          SELECT 
            tn.id AS notification_id,
            tn.request_id,
            tn.donor_id,
            tn.status,
            tn.donor_response,
            tn.responded_at,
            tn.created_at,
            br.patient_name,
            br.blood_group,
            br.units_needed,
            br.hospital_name,
            br.city,
            br.urgency,
            br.status AS request_status
          FROM public.telegram_notifications tn
          JOIN public.blood_requests br ON tn.request_id = br.id
          WHERE tn.donor_id = $1
          ORDER BY tn.created_at DESC
        `;
        const dbRes = await pool.query(query, [donor.id]);
        notifications = dbRes.rows;
      } catch (e) {
        console.warn('DB donor contact-requests query warning:', e.message);
      }
    }

    // Merge with localStore
    if (notifications.length === 0 && localStore.telegram_notifications) {
      const matchingNotifs = localStore.telegram_notifications.filter((n) => n.donor_id === donor.id);
      notifications = matchingNotifs.map((n) => {
        const br = (localStore.blood_requests || []).find((r) => r.id === n.request_id) || {};
        return {
          notification_id: n.id,
          request_id: n.request_id,
          donor_id: n.donor_id,
          status: n.status,
          donor_response: n.donor_response || 'pending',
          responded_at: n.responded_at,
          created_at: n.created_at,
          patient_name: br.patient_name || 'Emergency Patient',
          blood_group: br.blood_group || donor.blood_group,
          units_needed: br.units_needed || 1,
          hospital_name: br.hospital_name || 'Hospital',
          city: br.city || donor.city,
          urgency: br.urgency || 'urgent',
          request_status: br.status || 'active'
        };
      });
    }

    return res.json({
      success: true,
      count: notifications.length,
      requests: notifications,
      notifications: notifications
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/donors/contact-requests/:requestId/respond
// Donor clicks Accept or Decline from web dashboard
router.post('/contact-requests/:requestId/respond', authenticateUser, async (req, res, next) => {
  try {
    const { action } = req.body; // 'accept' or 'decline'
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Valid action (accept or decline) is required.' });
    }

    const donor = await getDonorByUserId(req.user.id);
    if (!donor) {
      return res.status(404).json({ success: false, error: 'Donor profile not found.' });
    }

    const requestId = req.params.requestId;
    const responseType = action === 'accept' ? 'accepted' : 'declined';

    // Verify existing notification
    const existing = await getTelegramNotificationByRequestAndDonor(requestId, donor.id);
    if (existing && existing.donor_response && ['accepted', 'declined'].includes(existing.donor_response)) {
      return res.status(400).json({
        success: false,
        error: `You have already ${existing.donor_response} this request.`
      });
    }

    // Update response in telegram_notifications
    await updateTelegramNotificationResponse(requestId, donor.id, responseType);

    // Update request status if accepted
    if (action === 'accept') {
      let br = (localStore.blood_requests || []).find((r) => r.id === requestId);
      if (br && br.status === 'active') br.status = 'responses_received';
      if (isPostgresConnected() && getPool()) {
        try {
          const pool = getPool();
          await pool.query(
            "UPDATE public.blood_requests SET status = 'responses_received', updated_at = NOW() WHERE id = $1 AND status = 'active'",
            [requestId]
          );
        } catch (_) {}
      }
    }

    return res.json({
      success: true,
      message: action === 'accept'
        ? 'Thank you! You have accepted this emergency contact request. The requester has been notified and can view your contact information.'
        : 'You have declined this request. The requester has been notified.',
      status: responseType
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
