const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const {
  localStore,
  calculateHaversineDistanceKm,
  getPrivacySafeDistanceBand,
  searchNearbyTelegramDonors,
  isPostgresConnected,
  getPool,
  getTelegramNotificationByRequestAndDonor,
  saveTelegramNotification
} = require('../db/db');
const { authenticateUser, optionalAuth } = require('../middleware/auth');
const {
  rankCandidateDonors,
  isGroupCompatible,
  getCompatibleDonorGroups,
  MEDICAL_SAFETY_DISCLAIMER
} = require('../services/matchingService');
const { findNearbyDonors, resolveCityCoordinates } = require('../services/spatialService');
const { recordCompletedDonation } = require('../services/cooldownService');
const {
  dispatchEmergencyRequestNotifications,
  sendEmergencyBloodRequestNotification,
  sendDonorSelectionReconfirmation
} = require('../services/telegramService');

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_STATUSES = [
  'registered',
  'alerting_donors',
  'donors_responded',
  'donor_selected',
  'fulfilled',
  'cancelled',
  'expired',
  'closed',
  'draft',
  'submitted',
  'validating',
  'searching',
  'notifications_queued',
  'responses_received',
  'coordination_in_progress',
  'active',
  'pending',
  'partially_fulfilled'
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
      status: 'registered',
      confirmation_status: 'pending',
      reconfirmed_at: null,
      fulfilled_at: null,
      selected_donor_id: null,
      selected_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localStore.blood_requests.push(newRequest);

    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        await pool.query(
          `INSERT INTO public.blood_requests (
            id, requester_id, patient_name, blood_group, units_needed,
            hospital_name, hospital_address, city, latitude, longitude,
            urgency, needed_by, description, contact_phone, contact_preference,
            status, confirmation_status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17, NOW(), NOW()
          )
          ON CONFLICT (id) DO NOTHING`,
          [
            newRequest.id,
            newRequest.requester_id,
            newRequest.patient_name,
            newRequest.blood_group,
            newRequest.units_needed,
            newRequest.hospital_name,
            newRequest.hospital_address,
            newRequest.city,
            newRequest.latitude,
            newRequest.longitude,
            newRequest.urgency,
            newRequest.needed_by,
            newRequest.description,
            newRequest.contact_phone,
            newRequest.contact_preference,
            newRequest.status,
            newRequest.confirmation_status
          ]
        );
      } catch (dbErr) {
        console.warn('PostgreSQL blood request insert warning:', dbErr.message);
      }
    }

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
router.get('/', optionalAuth, async (req, res) => {
  const { status, city, blood_group, own_only } = req.query;

  let requests = [...localStore.blood_requests];

  if (isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const resDb = await pool.query('SELECT * FROM public.blood_requests ORDER BY created_at DESC');
      if (resDb.rows.length > 0) {
        const seen = new Set(requests.map((r) => r.id));
        for (const row of resDb.rows) {
          if (!seen.has(row.id)) {
            requests.push(row);
            seen.add(row.id);
          }
        }
      }
    } catch (e) {}
  }

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
    requests = requests.filter((r) => r.city && r.city.toLowerCase() === city.toLowerCase());
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
router.get('/:id', optionalAuth, async (req, res) => {
  let request = localStore.blood_requests.find((r) => r.id === req.params.id);

  if (!request && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const resDb = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
      if (resDb.rows.length > 0) {
        request = resDb.rows[0];
        if (!localStore.blood_requests.find((r) => r.id === request.id)) {
          localStore.blood_requests.push(request);
        }
      }
    } catch (e) {}
  }
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
    let request = localStore.blood_requests.find((r) => r.id === req.params.id);
    if (!request && isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const resDb = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
        if (resDb.rows.length > 0) {
          request = resDb.rows[0];
          if (!localStore.blood_requests.find((r) => r.id === request.id)) {
            localStore.blood_requests.push(request);
          }
        }
      } catch (e) {
        console.warn('PostgreSQL blood request candidate lookup notice:', e.message);
      }
    }

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

    // Graceful fallback to primary hub if coordinates cannot be resolved
    if (
      searchLat == null ||
      searchLon == null ||
      !Number.isFinite(Number(searchLat)) ||
      !Number.isFinite(Number(searchLon))
    ) {
      searchLat = 26.8467;
      searchLon = 80.9462;
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
      disclaimer: MEDICAL_SAFETY_DISCLAIMER
    });
  } catch (err) {
    next(err);
  }
});

// Helper to get donor by ID from memory or PostgreSQL with phone details
async function getDonorWithContact(donorId) {
  let donor = (localStore.donors || []).find((d) => d.id === donorId);
  if ((!donor || !donor.phone) && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const res = await pool.query('SELECT * FROM public.donors WHERE id = $1 LIMIT 1', [donorId]);
      if (res.rows.length > 0) {
        donor = res.rows[0];
      }
    } catch (_) {}
  }
  return donor || null;
}

// POST /api/requests/:id/send-donor-request
// Requester dispatches an emergency contact request to an individual matched donor via Telegram
router.post('/:id/send-donor-request', authenticateUser, async (req, res, next) => {
  try {
    const { donor_id } = req.body;
    if (!donor_id) {
      return res.status(400).json({ success: false, error: 'donor_id is required.' });
    }

    // 1. Retrieve blood request
    let request = localStore.blood_requests.find((r) => r.id === req.params.id);
    if (!request && isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const dbRes = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
        if (dbRes.rows.length > 0) request = dbRes.rows[0];
      } catch (_) {}
    }
    if (!request) {
      return res.status(404).json({ success: false, error: 'Blood request not found.' });
    }

    // 2. Validate request ownership (requester owns request, or admin)
    if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to manage this blood request.' });
    }

    // Check request active status
    if (['fulfilled', 'cancelled', 'closed', 'expired'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        error: 'This blood request has expired or is no longer active.'
      });
    }

    // 3. Verify selected donor exists and is a legitimate potential match
    const donor = await getDonorWithContact(donor_id);
    if (!donor) {
      return res.status(404).json({ success: false, error: 'Donor profile not found.' });
    }

    if (!isGroupCompatible(request.blood_group, donor.blood_group)) {
      return res.status(400).json({
        success: false,
        error: `Selected donor blood group (${donor.blood_group}) is not compatible with request (${request.blood_group}).`
      });
    }

    // 4. Check donor availability
    if (donor.availability_status && donor.availability_status !== 'available') {
      return res.status(400).json({ success: false, error: 'Donor is currently marked unavailable.' });
    }

    // 5. Check donor contact consent
    if (donor.consent_to_contact === false || donor.consent_status === 'withdrawn') {
      return res.status(400).json({ success: false, error: 'Donor has withdrawn contact consent.' });
    }

    // 6. Check that donor has linked Telegram
    if (!donor.telegram_chat_id) {
      return res.status(400).json({
        success: false,
        error: 'Donor has not linked their Telegram account yet.'
      });
    }

    // 7. Check Telegram notification opt-in
    if (donor.telegram_opt_in !== true) {
      return res.status(400).json({
        success: false,
        error: 'Donor has not enabled Telegram notifications.'
      });
    }

    // 8. Check for duplicate contact requests
    const existing = await getTelegramNotificationByRequestAndDonor(request.id, donor.id);
    if (existing) {
      if (existing.donor_response && ['accepted', 'declined'].includes(existing.donor_response)) {
        return res.status(400).json({
          success: false,
          error: `Donor has already responded (${existing.donor_response}) to this request.`
        });
      }
      return res.status(400).json({
        success: false,
        error: 'A coordination request has already been sent to this donor.'
      });
    }

    // Calculate privacy-safe distance band
    let distanceBand = 'Proximity verified';
    if (request.latitude && request.longitude && donor.latitude && donor.longitude) {
      const dist = calculateHaversineDistanceKm(request.latitude, request.longitude, donor.latitude, donor.longitude);
      distanceBand = getPrivacySafeDistanceBand(dist);
    }

    // 9, 10, 11. Send Telegram Notification and store actual dispatch status
    const notificationResult = await sendEmergencyBloodRequestNotification(donor, request);

    if (notificationResult && notificationResult.success) {
      if (['registered', 'submitted', 'active'].includes(request.status)) {
        request.status = 'alerting_donors';
        request.updated_at = new Date().toISOString();
        if (isPostgresConnected() && getPool()) {
          try {
            await getPool().query('UPDATE public.blood_requests SET status = $1, updated_at = NOW() WHERE id = $2', [request.status, request.id]);
          } catch (_) {}
        }
      }
      return res.json({
        success: true,
        message: 'Telegram request sent successfully. Waiting for donor response.',
        status: 'sent',
        request_status: request.status,
        donor_id: donor.id,
        distance_band: distanceBand
      });
    }

    if (notificationResult && notificationResult.skipped) {
      return res.status(400).json({
        success: false,
        error: 'A coordination request has already been sent to this donor.'
      });
    }

    return res.status(502).json({
      success: false,
      error: notificationResult?.error || 'Telegram service temporarily unavailable.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/requests/:id/alert-donors
// Stage 2: Alert potential eligible matching donors via Telegram and transition to alerting_donors
router.post('/:id/alert-donors', authenticateUser, async (req, res, next) => {
  try {
    let request = localStore.blood_requests.find((r) => r.id === req.params.id);
    if (!request && isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const dbRes = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
        if (dbRes.rows.length > 0) request = dbRes.rows[0];
      } catch (_) {}
    }
    if (!request) {
      return res.status(404).json({ success: false, error: 'Blood request not found.' });
    }

    if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to alert donors for this request.' });
    }

    if (['fulfilled', 'cancelled', 'closed', 'expired'].includes(request.status)) {
      return res.status(400).json({ success: false, error: 'This blood request is no longer active.' });
    }

    const { radius_km = 30, max_recipients = 10 } = req.body;

    let searchLat = request.latitude;
    let searchLon = request.longitude;
    if (searchLat == null || searchLon == null) {
      const coords = resolveCityCoordinates(request.city);
      if (coords) {
        searchLat = coords.lat;
        searchLon = coords.lon;
      }
    }
    if (searchLat == null || searchLon == null) {
      searchLat = 26.8467;
      searchLon = 80.9462;
    }

    const nearbyDonors = await searchNearbyTelegramDonors({
      latitude: searchLat,
      longitude: searchLon,
      radiusKm: parseFloat(radius_km),
      bloodGroup: request.blood_group,
      limit: parseInt(max_recipients, 10) * 2
    });

    const dispatchResult = await dispatchEmergencyRequestNotifications({
      request,
      eligibleDonors: nearbyDonors,
      maxRecipients: parseInt(max_recipients, 10)
    });

    if (['registered', 'submitted', 'active'].includes(request.status)) {
      request.status = 'alerting_donors';
      request.updated_at = new Date().toISOString();
      if (isPostgresConnected() && getPool()) {
        try {
          await getPool().query('UPDATE public.blood_requests SET status = $1, updated_at = NOW() WHERE id = $2', [request.status, request.id]);
        } catch (_) {}
      }
    }

    return res.json({
      success: true,
      message: `Alerts dispatched to ${dispatchResult.sent_count} eligible donors.`,
      request_status: request.status,
      request,
      ...dispatchResult
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/requests/:id/contact-requests
// Returns all contact requests for this blood request with strict contact disclosure enforcement
router.get('/:id/contact-requests', authenticateUser, async (req, res, next) => {
  try {
    let request = localStore.blood_requests.find((r) => r.id === req.params.id);
    if (!request && isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const dbRes = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
        if (dbRes.rows.length > 0) request = dbRes.rows[0];
      } catch (_) {}
    }
    if (!request) {
      return res.status(404).json({ success: false, error: 'Blood request not found.' });
    }

    if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view contact requests for this request.' });
    }

    let notifications = [];
    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const q = `
          SELECT 
            tn.id, tn.request_id, tn.donor_id, tn.status, tn.donor_response, tn.responded_at, tn.created_at,
            d.name, d.blood_group, d.city, d.area, d.phone, d.verification_status, d.availability_status,
            d.latitude, d.longitude, d.consent_to_contact, d.consent_status
          FROM public.telegram_notifications tn
          JOIN public.donors d ON tn.donor_id = d.id
          WHERE tn.request_id = $1
          ORDER BY tn.created_at DESC
        `;
        const dbRes = await pool.query(q, [request.id]);
        notifications = dbRes.rows;
      } catch (e) {
        console.warn('DB contact-requests query warning:', e.message);
      }
    }

    // Merge with localStore if empty
    if (notifications.length === 0 && localStore.telegram_notifications) {
      const memoryNotifs = localStore.telegram_notifications.filter((n) => n.request_id === request.id);
      for (const mn of memoryNotifs) {
        const d = await getDonorWithContact(mn.donor_id);
        if (d) {
          notifications.push({
            id: mn.id,
            request_id: mn.request_id,
            donor_id: mn.donor_id,
            status: mn.status,
            donor_response: mn.donor_response,
            responded_at: mn.responded_at,
            created_at: mn.created_at,
            name: d.name,
            blood_group: d.blood_group,
            city: d.city,
            area: d.area,
            phone: d.phone,
            verification_status: d.verification_status,
            availability_status: d.availability_status,
            latitude: d.latitude,
            longitude: d.longitude,
            consent_to_contact: d.consent_to_contact,
            consent_status: d.consent_status
          });
        }
      }
    }

    const items = notifications.map((n) => {
      const responseStatus = n.donor_response || n.status || 'pending';
      const isAccepted = responseStatus === 'accepted';
      const isDeclined = responseStatus === 'declined';
      const isExpired = responseStatus === 'expired' || n.status === 'expired';

      let distanceBand = 'Proximity verified';
      if (request.latitude && request.longitude && n.latitude && n.longitude) {
        const dist = calculateHaversineDistanceKm(request.latitude, request.longitude, n.latitude, n.longitude);
        distanceBand = getPrivacySafeDistanceBand(dist);
      }

      const isSelected = request.selected_donor_id === n.donor_id;
      const canSelect = isAccepted && !isDeclined && request.status !== 'fulfilled' && request.status !== 'cancelled';

      // Status message per Section 6
      let statusMessage = 'Waiting for donor response.';
      if (isAccepted) {
        statusMessage = 'Donor accepted your contact request. You can now view the available contact information.';
      } else if (isDeclined) {
        statusMessage = 'Donor declined this request.';
      } else if (isExpired) {
        statusMessage = 'Contact request expired.';
      }

      // CRITICAL PRIVACY & AUTHORIZATION ENFORCEMENT (Section 5):
      // Phone is revealed ONLY if donor explicitly accepted!
      // If no valid phone exists, null is returned with has_phone: false. Never a fake number!
      const validPhone = isAccepted && n.phone && String(n.phone).trim().length >= 8 ? String(n.phone).trim() : null;

      return {
        id: n.id,
        donor_id: n.donor_id,
        name: n.name || 'Voluntary Donor',
        blood_group: n.blood_group,
        city: n.city,
        area: n.area,
        distance_band: distanceBand,
        verification_status: n.verification_status,
        availability_status: n.availability_status,
        status: isAccepted ? 'accepted' : isDeclined ? 'declined' : isExpired ? 'expired' : 'pending',
        response_status: isAccepted ? 'accepted' : isDeclined ? 'declined' : 'pending',
        status_message: statusMessage,
        responded_at: n.responded_at,
        created_at: n.created_at,
        is_selected: isSelected,
        can_select: canSelect,
        phone: validPhone,
        has_phone: Boolean(validPhone),
        phone_message: isAccepted
          ? validPhone ? null : 'No contact phone number provided by donor.'
          : 'Waiting for donor response.'
      };
    });

    // Auto-transition Stage 2 (alerting_donors) to Stage 3 (donors_responded) if any responses received
    const hasResponses = items.some((i) => i.status === 'accepted' || i.status === 'declined');
    if (hasResponses && ['alerting_donors', 'notifications_queued'].includes(request.status)) {
      request.status = 'donors_responded';
      request.updated_at = new Date().toISOString();
      if (isPostgresConnected() && getPool()) {
        try {
          await getPool().query('UPDATE public.blood_requests SET status = $1, updated_at = NOW() WHERE id = $2', [request.status, request.id]);
        } catch (_) {}
      }
    }

    return res.json({
      success: true,
      request_id: request.id,
      request_status: request.status,
      selected_donor_id: request.selected_donor_id || null,
      selected_at: request.selected_at || null,
      confirmation_status: request.confirmation_status || 'pending',
      reconfirmed_at: request.reconfirmed_at || null,
      fulfilled_at: request.fulfilled_at || null,
      count: items.length,
      contact_requests: items
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/requests/:id/accepted-donors (Maintained for backward-compatibility)
router.get('/:id/accepted-donors', authenticateUser, async (req, res, next) => {
  try {
    let request = localStore.blood_requests.find((r) => r.id === req.params.id);
    if (!request && isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const dbRes = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
        if (dbRes.rows.length > 0) request = dbRes.rows[0];
      } catch (_) {}
    }
    if (!request) {
      return res.status(404).json({ success: false, error: 'Blood request not found.' });
    }

    if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view accepted donors for this request.' });
    }

    let acceptedRows = [];
    if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const q = `
          SELECT 
            tn.id, tn.request_id, tn.donor_id, tn.donor_response, tn.responded_at,
            d.name, d.blood_group, d.city, d.area, d.phone, d.verification_status, d.availability_status,
            d.latitude, d.longitude
          FROM public.telegram_notifications tn
          JOIN public.donors d ON tn.donor_id = d.id
          WHERE tn.request_id = $1 AND tn.donor_response = 'accepted'
          ORDER BY tn.responded_at DESC
        `;
        const dbRes = await pool.query(q, [request.id]);
        acceptedRows = dbRes.rows;
      } catch (e) {
        console.warn('DB accepted-donors query warning:', e.message);
      }
    }

    if (acceptedRows.length === 0) {
      const memoryAccepted = [
        ...(localStore.telegram_notifications || []).filter(
          (n) => n.request_id === request.id && n.donor_response === 'accepted'
        ),
        ...(localStore.whatsapp_notifications || []).filter(
          (n) => n.request_id === request.id && n.donor_response === 'accepted'
        )
      ];
      for (const ma of memoryAccepted) {
        const d = await getDonorWithContact(ma.donor_id);
        if (d) {
          acceptedRows.push({
            id: ma.id,
            request_id: ma.request_id,
            donor_id: ma.donor_id,
            donor_response: 'accepted',
            responded_at: ma.responded_at,
            name: d.name,
            blood_group: d.blood_group,
            city: d.city,
            area: d.area,
            phone: d.phone,
            verification_status: d.verification_status,
            availability_status: d.availability_status,
            latitude: d.latitude,
            longitude: d.longitude
          });
        }
      }
    }

    const acceptedDonors = acceptedRows.map((row) => {
      let distanceBand = 'Proximity verified';
      if (request.latitude && request.longitude && row.latitude && row.longitude) {
        const dist = calculateHaversineDistanceKm(request.latitude, request.longitude, row.latitude, row.longitude);
        distanceBand = getPrivacySafeDistanceBand(dist);
      }
      const isSelected = request.selected_donor_id === row.donor_id;
      const validPhone = row.phone && String(row.phone).trim().length >= 8 ? String(row.phone).trim() : null;

      return {
        donor_id: row.donor_id,
        name: row.name || 'Voluntary Donor',
        blood_group: row.blood_group || request.blood_group,
        city: row.city || request.city,
        area: row.area || null,
        distance_band: distanceBand,
        responded_at: row.responded_at,
        is_selected: isSelected,
        phone: isSelected ? validPhone : undefined,
        has_phone: Boolean(validPhone),
        phone_message: isSelected ? (validPhone ? null : 'No contact phone number provided by donor.') : 'Phone protected until selected'
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
  } catch (err) {
    next(err);
  }
});

// POST /api/requests/:id/select-donor
// Stage 4: Requester manually selects one accepted donor & initiates reconfirmation
router.post('/:id/select-donor', authenticateUser, async (req, res) => {
  let request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const dbRes = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
      if (dbRes.rows.length > 0) request = dbRes.rows[0];
    } catch (_) {}
  }
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to select a donor for this request.' });
  }

  if (['fulfilled', 'cancelled', 'closed', 'expired'].includes(request.status)) {
    return res.status(400).json({ success: false, error: 'This blood request is no longer active.' });
  }

  const { donor_id, manual_confirm = false } = req.body;
  if (!donor_id) {
    return res.status(400).json({ success: false, error: 'donor_id is required.' });
  }

  // Validate that this donor actually responded and ACCEPTED this specific request!
  // Rejected donors MUST NOT be selectable per requirement!
  let acceptedJob = (localStore.telegram_notifications || []).find(
    (j) => j.request_id === request.id && j.donor_id === donor_id
  ) || (localStore.whatsapp_notifications || []).find(
    (j) => j.request_id === request.id && j.donor_id === donor_id
  );
  if (!acceptedJob && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const q = "SELECT * FROM public.telegram_notifications WHERE request_id = $1 AND donor_id = $2 LIMIT 1";
      const dbRes = await pool.query(q, [request.id, donor_id]);
      if (dbRes.rows.length > 0) acceptedJob = dbRes.rows[0];
    } catch (_) {}
  }

  if (!acceptedJob) {
    return res.status(400).json({
      success: false,
      error: 'Cannot select donor: No response recorded for this donor on this request.'
    });
  }

  if (acceptedJob.donor_response !== 'accepted') {
    return res.status(400).json({
      success: false,
      error: 'Cannot select donor: Only donors who accepted should be eligible for the next selection stage. Rejected donors must not be selectable.'
    });
  }

  const donor = await getDonorWithContact(donor_id);
  if (!donor) {
    return res.status(404).json({ success: false, error: 'Donor record not found.' });
  }

  const nowIso = new Date().toISOString();
  request.selected_donor_id = donor_id;
  request.selected_at = nowIso;
  request.status = 'donor_selected';
  request.updated_at = nowIso;

  let reconfirmResult = null;
  if (manual_confirm) {
    request.confirmation_status = 'confirmed';
    request.reconfirmed_at = nowIso;
  } else {
    request.confirmation_status = 'pending';
    request.reconfirmed_at = null;
    // Dispatch reconfirmation alert via Telegram
    try {
      reconfirmResult = await sendDonorSelectionReconfirmation(donor, request);
    } catch (tgErr) {
      console.warn('Reconfirmation dispatch warning:', tgErr.message);
    }
  }

  if (isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      await pool.query(
        `UPDATE public.blood_requests 
         SET selected_donor_id = $1, 
             selected_at = NOW(), 
             confirmation_status = $2, 
             reconfirmed_at = $3, 
             status = $4, 
             updated_at = NOW() 
         WHERE id = $5`,
        [donor_id, request.confirmation_status, request.reconfirmed_at, request.status, request.id]
      );
    } catch (e) {
      console.warn('DB select-donor update error:', e.message);
    }
  }

  // Audit event
  localStore.audit_events.push({
    id: String(Date.now()),
    actor_id: req.user.id,
    actor_role: req.user.role,
    action: 'donor_selected',
    entity_type: 'blood_request',
    entity_id: request.id,
    metadata: { donor_id, patient_name: request.patient_name, manual_confirm },
    timestamp: nowIso
  });

  return res.json({
    success: true,
    message: manual_confirm
      ? `Donor ${donor.name} selected and confirmed. Contact details are enabled.`
      : `Donor ${donor.name} selected. Confirmation request dispatched to donor. You may also contact them directly.`,
    request,
    confirmation_status: request.confirmation_status,
    reconfirmation_dispatched: Boolean(reconfirmResult?.success),
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

// POST /api/requests/:id/reconfirm-donor
// Stage 4: Donor reconfirms willingness/availability, or requester records phone confirmation
router.post('/:id/reconfirm-donor', authenticateUser, async (req, res) => {
  let request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const dbRes = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
      if (dbRes.rows.length > 0) request = dbRes.rows[0];
    } catch (_) {}
  }
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  const { action, method = 'portal' } = req.body;
  if (!['confirm', 'decline'].includes(action)) {
    return res.status(400).json({ success: false, error: 'action must be "confirm" or "decline".' });
  }

  // Authorization: Requester/Admin or the selected donor themselves
  let isAuthorized = false;
  if (req.user.role === 'admin' || request.requester_id === req.user.id) {
    isAuthorized = true;
  } else {
    const donor = (localStore.donors || []).find((d) => d.id === request.selected_donor_id && d.user_id === req.user.id);
    if (donor) isAuthorized = true;
    else if (isPostgresConnected() && getPool()) {
      try {
        const pool = getPool();
        const dRes = await pool.query('SELECT id FROM public.donors WHERE id = $1 AND user_id = $2 LIMIT 1', [request.selected_donor_id, req.user.id]);
        if (dRes.rows.length > 0) isAuthorized = true;
      } catch (_) {}
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({ success: false, error: 'Unauthorized to submit reconfirmation for this donor selection.' });
  }

  const nowIso = new Date().toISOString();
  if (action === 'confirm') {
    request.confirmation_status = 'confirmed';
    request.reconfirmed_at = nowIso;
    request.status = 'donor_selected';
    request.updated_at = nowIso;

    if (isPostgresConnected() && getPool()) {
      try {
        await getPool().query(
          `UPDATE public.blood_requests 
           SET confirmation_status = 'confirmed', reconfirmed_at = NOW(), status = 'donor_selected', updated_at = NOW() 
           WHERE id = $1`,
          [request.id]
        );
      } catch (e) {}
    }

    localStore.audit_events.push({
      action: 'donor_reconfirmed',
      actor_id: req.user.id,
      actor_role: req.user.role,
      entity_type: 'blood_request',
      entity_id: request.id,
      metadata: { method, confirmation_status: 'confirmed' },
      timestamp: nowIso
    });

    return res.json({
      success: true,
      message: 'Donor availability confirmed. You may now coordinate final donation.',
      confirmation_status: 'confirmed',
      request
    });
  } else {
    // Declined
    request.confirmation_status = 'declined';
    request.reconfirmed_at = nowIso;
    request.status = 'donors_responded';
    const previousDonorId = request.selected_donor_id;
    request.selected_donor_id = null; // Cleared so requester can select another eligible donor
    request.updated_at = nowIso;

    if (isPostgresConnected() && getPool()) {
      try {
        await getPool().query(
          `UPDATE public.blood_requests 
           SET confirmation_status = 'declined', reconfirmed_at = NOW(), status = 'donors_responded', selected_donor_id = NULL, updated_at = NOW() 
           WHERE id = $1`,
          [request.id]
        );
      } catch (e) {}
    }

    localStore.audit_events.push({
      action: 'donor_declined_reconfirmation',
      actor_id: req.user.id,
      actor_role: req.user.role,
      entity_type: 'blood_request',
      entity_id: request.id,
      metadata: { method, previous_donor_id: previousDonorId, confirmation_status: 'declined' },
      timestamp: nowIso
    });

    return res.json({
      success: true,
      message: 'Donor declined reconfirmation. You may now select another eligible donor.',
      confirmation_status: 'declined',
      request
    });
  }
});

// POST /api/requests/:id/reselect-donor
// Clear selection and allow picking another accepting donor
router.post('/:id/reselect-donor', authenticateUser, async (req, res) => {
  let request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const dbRes = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
      if (dbRes.rows.length > 0) request = dbRes.rows[0];
    } catch (_) {}
  }
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to reselect for this request.' });
  }

  const nowIso = new Date().toISOString();
  request.selected_donor_id = null;
  request.selected_at = null;
  request.confirmation_status = 'pending';
  request.reconfirmed_at = null;
  request.status = 'donors_responded';
  request.updated_at = nowIso;

  if (isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      await pool.query(
        `UPDATE public.blood_requests 
         SET selected_donor_id = NULL, 
             selected_at = NULL, 
             confirmation_status = 'pending', 
             reconfirmed_at = NULL, 
             status = 'donors_responded', 
             updated_at = NOW() 
         WHERE id = $1`,
        [request.id]
      );
    } catch (e) {}
  }

  return res.json({
    success: true,
    message: 'Donor selection cleared. You may select another accepting donor.',
    request
  });
});

// POST /api/requests/:id/fulfill
// Stage 5: Confirm blood received, mark fulfilled, and activate donor 3-month cooldown
router.post('/:id/fulfill', authenticateUser, async (req, res) => {
  let request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const dbRes = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
      if (dbRes.rows.length > 0) request = dbRes.rows[0];
    } catch (_) {}
  }
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to mark this request as fulfilled.' });
  }

  // Duplicate fulfillment prevention
  if (request.status === 'fulfilled') {
    return res.status(400).json({
      success: false,
      error: 'This blood request is already marked as fulfilled.',
      fulfilled_at: request.fulfilled_at
    });
  }

  // Cannot fulfill cancelled request
  if (request.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      error: 'Cannot fulfill a cancelled blood request.'
    });
  }

  if (!request.selected_donor_id) {
    return res.status(400).json({
      success: false,
      error: 'Cannot fulfill request: No donor has been selected.'
    });
  }

  const nowIso = new Date().toISOString();
  const today = nowIso.split('T')[0];

  request.status = 'fulfilled';
  request.fulfilled_at = nowIso;
  request.updated_at = nowIso;

  if (isPostgresConnected() && getPool()) {
    try {
      await getPool().query(
        `UPDATE public.blood_requests 
         SET status = 'fulfilled', fulfilled_at = NOW(), updated_at = NOW() 
         WHERE id = $1`,
        [request.id]
      );
    } catch (e) {
      console.warn('DB fulfill update error:', e.message);
    }
  }

  // Trigger 3-Month Notification Cooldown on the selected donor
  let updatedDonor = null;
  try {
    updatedDonor = await recordCompletedDonation(
      request.selected_donor_id,
      today,
      'request_fulfilled',
      request.id
    );
  } catch (cooldownErr) {
    console.warn('Cooldown activation warning:', cooldownErr.message);
  }

  localStore.audit_events.push({
    action: 'request_fulfilled',
    actor_id: req.user.id,
    actor_role: req.user.role,
    entity_type: 'blood_request',
    entity_id: request.id,
    metadata: {
      selected_donor_id: request.selected_donor_id,
      patient_name: request.patient_name,
      cooldown_until: updatedDonor?.cooldown_until
    },
    timestamp: nowIso
  });

  return res.json({
    success: true,
    message: 'Blood donation confirmed and request fulfilled successfully. 3-month notification cooldown active for donor.',
    request,
    cooldown: {
      donor_id: request.selected_donor_id,
      cooldown_start: updatedDonor?.cooldown_start || nowIso,
      cooldown_until: updatedDonor?.cooldown_until || null
    }
  });
});

// POST /api/requests/:id/cancel
// Cancel request without applying cooldown
router.post('/:id/cancel', authenticateUser, async (req, res) => {
  let request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const dbRes = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
      if (dbRes.rows.length > 0) request = dbRes.rows[0];
    } catch (_) {}
  }
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to cancel this request.' });
  }

  if (request.status === 'fulfilled') {
    return res.status(400).json({ success: false, error: 'Cannot cancel an already fulfilled request.' });
  }

  const nowIso = new Date().toISOString();
  request.status = 'cancelled';
  request.updated_at = nowIso;

  if (isPostgresConnected() && getPool()) {
    try {
      await getPool().query(
        `UPDATE public.blood_requests 
         SET status = 'cancelled', updated_at = NOW() 
         WHERE id = $1`,
        [request.id]
      );
    } catch (e) {}
  }

  localStore.audit_events.push({
    action: 'request_cancelled',
    actor_id: req.user.id,
    actor_role: req.user.role,
    entity_type: 'blood_request',
    entity_id: request.id,
    timestamp: nowIso
  });

  return res.json({
    success: true,
    message: 'Blood request cancelled. No cooldown applied.',
    request
  });
});

// PATCH /api/requests/:id/status
router.patch('/:id/status', authenticateUser, async (req, res) => {
  let request = localStore.blood_requests.find((r) => r.id === req.params.id);
  if (!request && isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const dbRes = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [req.params.id]);
      if (dbRes.rows.length > 0) request = dbRes.rows[0];
    } catch (_) {}
  }
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

  if (status === 'fulfilled' && request.status === 'fulfilled') {
    return res.status(400).json({ success: false, error: 'This request is already marked as fulfilled.' });
  }

  const nowIso = new Date().toISOString();
  request.status = status;
  if (status === 'fulfilled') {
    request.fulfilled_at = nowIso;
  }
  request.updated_at = nowIso;

  if (isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      await pool.query(
        `UPDATE public.blood_requests 
         SET status = $1, 
             fulfilled_at = (CASE WHEN $1 = 'fulfilled' THEN NOW() ELSE fulfilled_at END),
             updated_at = NOW() 
         WHERE id = $2`,
        [status, request.id]
      );
    } catch (e) {}
  }

  // If request is marked fulfilled and a donor was selected, record completed donation & trigger cooldown
  if (status === 'fulfilled' && request.selected_donor_id) {
    await recordCompletedDonation(request.selected_donor_id, nowIso.split('T')[0], 'request_fulfilled', request.id);
  }

  return res.json({
    success: true,
    message: `Request status updated to "${status}".`,
    request
  });
});

module.exports = router;
