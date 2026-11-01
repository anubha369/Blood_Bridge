const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { localStore, calculateHaversineDistanceKm, getPrivacySafeDistanceBand, searchNearbyTelegramDonors } = require('../db/db');
const { authenticateUser, optionalAuth } = require('../middleware/auth');
const { rankCandidateDonors } = require('../services/matchingService');
const { findNearbyDonors, resolveCityCoordinates } = require('../services/spatialService');
const { recordCompletedDonation } = require('../services/cooldownService');
const { dispatchEmergencyRequestNotifications } = require('../services/telegramService');

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_STATUSES = [
  'draft',
  'submitted',
  'validating',
  'searching',
  'notifications_queued',
  'responses_received',
  'donor_selected',
  'coordination_in_progress',
  'active',
  'pending',
  'partially_fulfilled',
  'fulfilled',
  'cancelled',
  'expired',
  'closed'
];

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
      selected_donor_id: null,
      selected_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localStore.blood_requests.push(newRequest);

    // Automatic Telegram emergency alerts if urgency is emergency
    if (newRequest.urgency === 'emergency' && (newRequest.latitude != null && newRequest.longitude != null)) {
      (async () => {
        try {
          const eligibleDonors = await searchNearbyTelegramDonors({
            latitude: newRequest.latitude,
            longitude: newRequest.longitude,
            radiusKm: 30,
            bloodGroup: newRequest.blood_group,
            limit: 20
          });
          if (eligibleDonors && eligibleDonors.length > 0) {
            await dispatchEmergencyRequestNotifications({
              request: newRequest,
              eligibleDonors,
              maxRecipients: 10
            });
          }
        } catch (alertErr) {
          console.warn('Auto Telegram emergency alert notice:', alertErr.message);
        }
      })();
    }

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
    let searchLat = request.latitude;
    let searchLon = request.longitude;

    if (searchLat == null || searchLon == null) {
      const coords = resolveCityCoordinates(request.city);
      if (coords) {
        searchLat = coords.lat;
        searchLon = coords.lon;
      }
    }

    if (
      searchLat == null ||
      searchLon == null ||
      !Number.isFinite(Number(searchLat)) ||
      !Number.isFinite(Number(searchLon))
    ) {
      return res.status(400).json({
        success: false,
        error: 'Valid request coordinates or a supported city location are required for candidate matching.'
      });
    }

    const nearbyDonors = await findNearbyDonors({
      latitude: searchLat,
      longitude: searchLon,
      radiusKm,
      bloodGroup: null,
      limit: 50
    });

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

// GET /api/requests/:id/accepted-donors
// Returns ONLY donors who explicitly accepted this specific request
// Contact phone is revealed ONLY for the selected donor (Sections 8 & 9)
router.get('/:id/accepted-donors', authenticateUser, (req, res) => {
  const request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  // Only requester of this request or an admin can access accepted donors
  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to view accepted donors for this request.' });
  }

  // Find notification jobs for this request that have donor_response === 'accepted'
  const whatsappAccepted = (localStore.whatsapp_notifications || []).filter(
    (j) => j.request_id === request.id && j.donor_response === 'accepted'
  );
  const telegramAccepted = (localStore.telegram_notifications || []).filter(
    (j) => j.request_id === request.id && j.donor_response === 'accepted'
  );
  const acceptedJobs = [...whatsappAccepted];
  for (const tgJob of telegramAccepted) {
    if (!acceptedJobs.some((j) => j.donor_id === tgJob.donor_id)) {
      acceptedJobs.push(tgJob);
    }
  }

  const acceptedDonors = acceptedJobs.map((job) => {
    const donor = (localStore.donors || []).find((d) => d.id === job.donor_id);
    const isSelected = request.selected_donor_id === job.donor_id;

    let distanceBand = 'Proximity verified';
    if (donor && donor.latitude && donor.longitude && request.latitude && request.longitude) {
      const dist = calculateHaversineDistanceKm(request.latitude, request.longitude, donor.latitude, donor.longitude);
      distanceBand = getPrivacySafeDistanceBand(dist);
    }

    return {
      donor_id: job.donor_id,
      name: job.donor_name || (donor ? donor.name : 'Voluntary Donor'),
      blood_group: donor ? donor.blood_group : request.blood_group,
      city: donor ? donor.city : request.city,
      area: donor ? donor.area : null,
      distance_band: distanceBand,
      responded_at: job.responded_at,
      action_token: job.action_token,
      is_selected: isSelected,
      // CRITICAL PRIVACY RULE: phone number is ONLY exposed if this donor is selected!
      phone: isSelected && donor ? donor.phone : undefined
    };
  });

  return res.json({
    success: true,
    request_id: request.id,
    request_status: request.status,
    selected_donor_id: request.selected_donor_id || null,
    selected_at: request.selected_at || null,
    count: acceptedDonors.length,
    donors: acceptedDonors
  });
});

// POST /api/requests/:id/select-donor
// Select one accepting donor for coordination and reveal contact info
router.post('/:id/select-donor', authenticateUser, (req, res) => {
  const request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to select a donor for this request.' });
  }

  const { donor_id } = req.body;
  if (!donor_id) {
    return res.status(400).json({ success: false, error: 'donor_id is required.' });
  }

  // Validate that this donor actually accepted this specific request!
  const acceptedJob = (localStore.whatsapp_notifications || []).find(
    (j) => j.request_id === request.id && j.donor_id === donor_id && j.donor_response === 'accepted'
  ) || (localStore.telegram_notifications || []).find(
    (j) => j.request_id === request.id && j.donor_id === donor_id && j.donor_response === 'accepted'
  );

  if (!acceptedJob) {
    return res.status(400).json({
      success: false,
      error: 'Cannot select donor: This donor has not accepted this emergency request.'
    });
  }

  const donor = (localStore.donors || []).find((d) => d.id === donor_id);
  if (!donor) {
    return res.status(404).json({ success: false, error: 'Donor record not found.' });
  }

  request.selected_donor_id = donor_id;
  request.selected_at = new Date().toISOString();
  request.status = 'donor_selected';
  request.updated_at = new Date().toISOString();

  // Audit event
  localStore.audit_events.push({
    id: String(Date.now()),
    actor_id: req.user.id,
    actor_role: req.user.role,
    action: 'donor_selected',
    entity_type: 'blood_request',
    entity_id: request.id,
    metadata: { donor_id, patient_name: request.patient_name },
    timestamp: new Date().toISOString()
  });

  return res.json({
    success: true,
    message: `Donor ${donor.name} selected for coordination. Contact details are now enabled.`,
    request,
    selected_donor: {
      id: donor.id,
      name: donor.name,
      blood_group: donor.blood_group,
      phone: donor.phone,
      city: donor.city,
      area: donor.area
    }
  });
});

// POST /api/requests/:id/reselect-donor
// Clear selection and allow picking another accepting donor
router.post('/:id/reselect-donor', authenticateUser, (req, res) => {
  const request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to reselect for this request.' });
  }

  request.selected_donor_id = null;
  request.selected_at = null;
  request.status = 'responses_received';
  request.updated_at = new Date().toISOString();

  return res.json({
    success: true,
    message: 'Donor selection cleared. You may select another accepting donor.',
    request
  });
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

  // If request is marked fulfilled and a donor was selected, record completed donation & trigger cooldown
  if (status === 'fulfilled' && request.selected_donor_id) {
    recordCompletedDonation(request.selected_donor_id, new Date().toISOString().split('T')[0], 'request_fulfilled');
  }

  return res.json({
    success: true,
    message: `Request status updated to "${status}".`,
    request
  });
});

module.exports = router;
