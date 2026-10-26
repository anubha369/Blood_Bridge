const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { localStore } = require('../db/db');
const { authenticateUser, optionalAuth } = require('../middleware/auth');
const { rankCandidateDonors } = require('../services/matchingService');
const { findNearbyDonors, resolveCityCoordinates } = require('../services/spatialService');

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_STATUSES = ['pending', 'active', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired'];

// POST /api/requests
// Create a blood request
router.post('/', authenticateUser, async (req, res, next) => {
  try {
    const {
      patient_name,
      blood_group,
      units_needed = 1,
      hospital_name,
      hospital_address,
      city,
      latitude,
      longitude,
      urgency = 'urgent',
      needed_by,
      description,
      contact_phone,
      contact_preference = 'phone'
    } = req.body;

    if (!patient_name || !blood_group || !hospital_name || !city) {
      return res.status(400).json({
        success: false,
        error: 'Patient name, blood group, hospital name, and city are required.'
      });
    }

    const normalizedGroup = blood_group.trim().toUpperCase();
    if (!VALID_BLOOD_GROUPS.includes(normalizedGroup)) {
      return res.status(400).json({
        success: false,
        error: `Invalid blood group. Must be one of: ${VALID_BLOOD_GROUPS.join(', ')}`
      });
    }

    // Resolve coordinates if missing
    let lat = latitude ? parseFloat(latitude) : null;
    let lon = longitude ? parseFloat(longitude) : null;
    if (isNaN(lat) || isNaN(lon) || lat == null || lon == null) {
      const coords = resolveCityCoordinates(city);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
      }
    }

    const newRequest = {
      id: uuidv4(),
      requester_id: req.user.id,
      patient_name: patient_name.trim(),
      blood_group: normalizedGroup,
      units_needed: Math.max(1, parseInt(units_needed, 10) || 1),
      hospital_name: hospital_name.trim(),
      hospital_address: hospital_address ? hospital_address.trim() : null,
      city: city.trim(),
      latitude: lat,
      longitude: lon,
      urgency: ['emergency', 'urgent', 'scheduled'].includes(urgency) ? urgency : 'urgent',
      needed_by: needed_by || null,
      description: description ? description.trim() : null,
      contact_phone: contact_phone ? contact_phone.trim() : req.user.phone || null,
      contact_preference,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localStore.blood_requests.push(newRequest);

    return res.status(201).json({
      success: true,
      message: 'Blood request registered successfully.',
      request: newRequest
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/requests
// List requests (admin sees all, regular users see own or active public list)
router.get('/', optionalAuth, (req, res) => {
  const { status, city, blood_group, own_only } = req.query;

  let requests = [...localStore.blood_requests];

  if (own_only === 'true' && req.user) {
    requests = requests.filter((r) => r.requester_id === req.user.id);
  } else if (!req.user || req.user.role !== 'admin') {
    // If not admin, hide sensitive requester IDs or allow public active requests
    if (req.user && own_only !== 'false') {
      requests = requests.filter((r) => r.requester_id === req.user.id || r.status === 'active');
    } else {
      requests = requests.filter((r) => r.status === 'active');
    }
  }

  if (status) {
    requests = requests.filter((r) => r.status === status);
  }
  if (city) {
    requests = requests.filter((r) => r.city.toLowerCase() === city.toLowerCase());
  }
  if (blood_group) {
    requests = requests.filter((r) => r.blood_group === blood_group.toUpperCase());
  }

  // Sort newest first
  requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return res.json({
    success: true,
    count: requests.length,
    requests
  });
});

// GET /api/requests/:id
router.get('/:id', optionalAuth, (req, res) => {
  const request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  const requester = localStore.users.find((u) => u.id === request.requester_id);

  return res.json({
    success: true,
    request: {
      ...request,
      requester_name: requester ? requester.name : 'Verified Requester'
    }
  });
});

// GET /api/requests/:id/candidates
// Deterministic candidate matching and ranking for a request
router.get('/:id/candidates', optionalAuth, async (req, res, next) => {
  try {
    const request = localStore.blood_requests.find((r) => r.id === req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Blood request not found.' });
    }

    const radiusKm = parseFloat(req.query.radius_km || 30);
    const searchLat = request.latitude || 26.9124;
    const searchLon = request.longitude || 75.7873;

    // Fetch spatially nearby donors
    const nearbyDonors = await findNearbyDonors({
      latitude: searchLat,
      longitude: searchLon,
      radiusKm,
      bloodGroup: null, // Don't filter to single group here so compatible groups (e.g. O- for B+) can be ranked!
      limit: 50
    });

    // Run deterministic ranking algorithm
    const candidates = rankCandidateDonors(nearbyDonors, request, radiusKm);

    return res.json({
      success: true,
      request_id: request.id,
      patient_blood_group: request.blood_group,
      units_needed: request.units_needed,
      search_radius_km: radiusKm,
      candidate_count: candidates.length,
      candidates,
      disclaimer: 'BloodBridge coordinates potential donor matches based on location and reported blood group. Clinical compatibility, cross-matching, and blood testing must be performed by authorized healthcare professionals.'
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/requests/:id/status
router.patch('/:id/status', authenticateUser, (req, res) => {
  const request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  // Requester of request or Admin can update status
  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to update this request.' });
  }

  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  request.status = status;
  request.updated_at = new Date().toISOString();

  return res.json({
    success: true,
    message: `Request status updated to "${status}".`,
    request
  });
});

module.exports = router;
