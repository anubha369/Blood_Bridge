const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { localStore, isPostgresConnected, getPool, getDonorByUserId } = require('../db/db');
const { authenticateUser, optionalAuth, requireRole } = require('../middleware/auth');
const { findNearbyDonors, resolveCityCoordinates, getAllSupportedCities } = require('../services/spatialService');
const { calculateCooldownDate, recordCompletedDonation, isDonorEligibleForNotification, checkAndUpdateCooldownExpiry } = require('../services/cooldownService');
const { awardCreditPoints } = require('../services/creditService');

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

    // If city supplied instead of coordinates, resolve coordinates
    if ((!searchLat || !searchLon) && city) {
      const coords = resolveCityCoordinates(city);
      if (coords) {
        searchLat = coords.lat;
        searchLon = coords.lon;
      }
    }

    if (!searchLat || !searchLon) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either latitude and longitude or a supported city name.'
      });
    }

    const donors = await findNearbyDonors({
      latitude: searchLat,
      longitude: searchLon,
      radiusKm: radius_km,
      bloodGroup: blood_group ? blood_group.trim().toUpperCase() : null,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    return res.json({
      success: true,
      count: donors.length,
      search_center: {
        latitude: parseFloat(searchLat),
        longitude: parseFloat(searchLon),
        city: city || 'Custom Coordinates'
      },
      radius_km: parseFloat(radius_km || 25),
      blood_group_filter: blood_group || 'All Compatible',
      results: donors,
      disclaimer: 'Potential donor candidates found. Coordinates are approximate to safeguard donor privacy. Always verify clinical compatibility at an authorized blood bank.'
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
  if (!donor) {
    return res.status(404).json({ success: false, error: 'No donor profile found for current user.' });
  }
  return res.json({ success: true, donor });
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

module.exports = router;
