const express = require('express');
const router = express.Router();
const { localStore } = require('../db/db');
const { authenticateUser, optionalAuth } = require('../middleware/auth');
const { findNearbyDonors } = require('../services/spatialService');
const {
  generateManualWhatsAppLink,
  dispatchRequestNotifications,
  handleDonorActionToken
} = require('../services/whatsappService');

// POST /api/whatsapp/send-request-notifications
// Trigger WhatsApp notification jobs to matching eligible donors
router.post('/send-request-notifications', authenticateUser, async (req, res, next) => {
  try {
    const { request_id, radius_km = 30, max_recipients = 10 } = req.body;

    if (!request_id) {
      return res.status(400).json({ success: false, error: 'Request ID is required.' });
    }

    const request = localStore.blood_requests.find((r) => r.id === request_id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Blood request not found.' });
    }

    // Authorization: only request owner or admin
    if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to dispatch alerts for this request.' });
    }

    // Find nearby donors
    const searchLat = request.latitude || 26.8700;
    const searchLon = request.longitude || 80.9200;

    const nearbyDonors = await findNearbyDonors({
      latitude: searchLat,
      longitude: searchLon,
      radiusKm: parseFloat(radius_km),
      bloodGroup: null, // Allow all compatible groups
      limit: 50
    });

    const result = await dispatchRequestNotifications({
      request,
      eligibleDonors: nearbyDonors,
      maxRecipients: parseInt(max_recipients, 10)
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/whatsapp/jobs/:requestId
// Inspect notification statuses for a request
router.get('/jobs/:requestId', authenticateUser, (req, res) => {
  const request = localStore.blood_requests.find((r) => r.id === req.params.requestId);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Blood request not found.' });
  }

  const jobs = (localStore.whatsapp_notifications || []).filter((j) => j.request_id === req.params.requestId);

  return res.json({
    success: true,
    request_id: request.id,
    request_status: request.status,
    total_jobs: jobs.length,
    jobs
  });
});

// GET /api/whatsapp/action/:token
// Resolve an action token when clicked by a donor in WhatsApp
router.get('/action/:token', (req, res) => {
  const job = (localStore.whatsapp_notifications || []).find((j) => j.action_token === req.params.token);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Notification action link is invalid or expired.' });
  }

  const request = localStore.blood_requests.find((r) => r.id === job.request_id);

  return res.json({
    success: true,
    action_token: job.action_token,
    status: job.status,
    donor_response: job.donor_response,
    request: request ? {
      patient_name: request.patient_name,
      blood_group: request.blood_group,
      units_needed: request.units_needed,
      hospital_name: request.hospital_name,
      city: request.city,
      urgency: request.urgency
    } : null
  });
});

// POST /api/whatsapp/action/:token
// Process voluntary donor response (Accept / Decline / Unavailable / Withdraw Consent / Completed Donation)
router.post('/action/:token', (req, res) => {
  const { action } = req.body;
  if (!action) {
    return res.status(400).json({ success: false, error: 'Action parameter is required.' });
  }

  try {
    const result = handleDonorActionToken(req.params.token, action);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/whatsapp/manual-link
// Generate a prefilled manual WhatsApp link for requesters
router.post('/manual-link', (req, res) => {
  const { phone, message } = req.body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Message text is required for manual WhatsApp link.' });
  }
  const link = generateManualWhatsAppLink(phone, message);
  return res.json({ success: true, url: link });
});

module.exports = router;
