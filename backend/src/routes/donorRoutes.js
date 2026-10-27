const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { localStore } = require('../db/db');
const { authenticateUser, optionalAuth, requireRole } = require('../middleware/auth');
const { findNearbyDonors, resolveCityCoordinates, getAllSupportedCities } = require('../services/spatialService');

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
    const existing = localStore.donors.find((d) => d.user_id === req.user.id);
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
      verification_status: 'verified', // Platform registered donors verified via verified account
      last_donation_date: last_donation_date || null,
      source: 'platform',
      notification_preferences: notification_preferences || { email: true, in_app: true },
      created_at: new Date().toISOString()
    };

    localStore.donors.push(newDonor);

    // Update user role to donor if not admin
    const userRecord = localStore.users.find((u) => u.id === req.user.id);
    if (userRecord && userRecord.role !== 'admin') {
      userRecord.role = 'donor';
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
router.get('/profile', authenticateUser, (req, res) => {
  const donor = localStore.donors.find((d) => d.user_id === req.user.id);
  if (!donor) {
    return res.status(404).json({ success: false, error: 'No donor profile found for current user.' });
  }
  return res.json({ success: true, donor });
});

// PUT /api/donors/profile
router.put('/profile', authenticateUser, (req, res, next) => {
  try {
    const donor = localStore.donors.find((d) => d.user_id === req.user.id);
    if (!donor) {
      return res.status(404).json({ success: false, error: 'No donor profile found.' });
    }

    const { availability_status, consent_to_contact, city, area, last_donation_date, notification_preferences } = req.body;

    if (availability_status && ['available', 'unavailable', 'recently_donated'].includes(availability_status)) {
      donor.availability_status = availability_status;
    }

    if (typeof consent_to_contact === 'boolean') {
      donor.consent_to_contact = consent_to_contact;
    }

    if (city) donor.city = city.trim();
    if (area !== undefined) donor.area = area ? area.trim() : null;
    if (last_donation_date !== undefined) donor.last_donation_date = last_donation_date;
    if (notification_preferences) donor.notification_preferences = notification_preferences;

    donor.updated_at = new Date().toISOString();

    return res.json({
      success: true,
      message: 'Donor profile updated successfully.',
      donor
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/donors/consent/withdraw
// Quickly withdraw contact consent
router.post('/consent/withdraw', authenticateUser, (req, res) => {
  const donor = localStore.donors.find((d) => d.user_id === req.user.id);
  if (!donor) {
    return res.status(404).json({ success: false, error: 'Donor profile not found.' });
  }

  donor.consent_to_contact = false;
  donor.updated_at = new Date().toISOString();

  return res.json({
    success: true,
    message: 'Consent to be contacted has been withdrawn. You will no longer appear in public donor coordination searches.',
    consent_to_contact: false
  });
});

module.exports = router;
