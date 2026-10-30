const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {
  localStore,
  searchNearbyWhatsAppDonors,
  isPostgresConnected,
  getPool
} = require('../db/db');
const { resolveCityCoordinates } = require('../services/spatialService');
const { authenticateUser } = require('../middleware/auth');
const {
  generateManualWhatsAppLink,
  dispatchRequestNotifications,
  handleDonorActionToken
} = require('../services/whatsappService');
const config = require('../config');

// Helper to find a blood request in memory or PostgreSQL
async function findBloodRequestById(requestId) {
  let request = (localStore.blood_requests || []).find((r) => r.id === requestId);
  if (!request && isPostgresConnected()) {
    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM blood_requests WHERE id = $1 LIMIT 1', [requestId]);
        if (res.rows.length > 0) {
          request = res.rows[0];
          if (!localStore.blood_requests) localStore.blood_requests = [];
          if (!localStore.blood_requests.some((r) => r.id === request.id)) {
            localStore.blood_requests.push(request);
          }
        }
      } catch (err) {
        console.warn('DB request lookup notice:', err.message);
      }
    }
  }
  return request;
}

// POST /api/whatsapp/send-request-notifications
// Trigger WhatsApp notification jobs to matching eligible donors
router.post('/send-request-notifications', authenticateUser, async (req, res, next) => {
  try {
    const { request_id, radius_km = 30, max_recipients = 10 } = req.body;

    if (!request_id) {
      return res.status(400).json({ success: false, error: 'Request ID is required.' });
    }

    const request = await findBloodRequestById(request_id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Blood request not found.' });
    }

    // Authorization: only request owner or system admin
    if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to dispatch alerts for this request.' });
    }

    // Resolve coordinates if missing, otherwise return clear validation error (Section 6)
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
        error: 'Valid request coordinates or a supported city location are required before searching for WhatsApp donors.'
      });
    }

    const radius = Number(radius_km);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 100) {
      return res.status(400).json({
        success: false,
        error: 'Search radius must be between 1 and 100 km.'
      });
    }

    // Use request's actual blood group for preliminary filtering
    const nearbyDonors = await searchNearbyWhatsAppDonors({
      latitude: searchLat,
      longitude: searchLon,
      radiusKm: radius,
      bloodGroup: request.blood_group,
      limit: 50
    });

    const result = await dispatchRequestNotifications({
      request,
      eligibleDonors: nearbyDonors,
      maxRecipients: parseInt(max_recipients, 10)
    });

    return res.json({
      ...result,
      clinical_disclaimer: 'Blood group matching indicates preliminary voluntary availability and never guarantees clinical compatibility. Final cross-matching must be performed by authorized healthcare professionals.'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/whatsapp/jobs/:requestId
// Inspect notification statuses for a request with privacy masking
router.get('/jobs/:requestId', authenticateUser, async (req, res, next) => {
  try {
    const request = await findBloodRequestById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Blood request not found.' });
    }

    // Security check: Only request owner or admin can inspect notification jobs
    if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view notification jobs for this request.' });
    }

    let jobs = (localStore.whatsapp_notifications || []).filter((j) => j.request_id === req.params.requestId);

    // Query PostgreSQL if connected
    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const dbJobs = await pool.query(
            'SELECT * FROM whatsapp_notifications WHERE request_id = $1 ORDER BY created_at DESC',
            [req.params.requestId]
          );
          if (dbJobs.rows.length > 0) {
            jobs = dbJobs.rows;
          }
        } catch (e) {}
      }
    }

    // Privacy Masking: Mask phone numbers for non-admin users (e.g. 9198******10)
    const sanitizedJobs = jobs.map((j) => ({
      ...j,
      recipient_phone: req.user.role === 'admin'
        ? j.recipient_phone
        : (j.recipient_phone && j.recipient_phone.length >= 8
            ? `${j.recipient_phone.slice(0, 4)}******${j.recipient_phone.slice(-2)}`
            : 'Protected')
    }));

    return res.json({
      success: true,
      request_id: request.id,
      request_status: request.status,
      total_jobs: sanitizedJobs.length,
      jobs: sanitizedJobs
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/whatsapp/action/:token
// Resolve an action token when clicked by a donor in WhatsApp
// Privacy safe: Does NOT return sensitive patient identity or contact info
router.get('/action/:token', async (req, res, next) => {
  try {
    let job = (localStore.whatsapp_notifications || []).find((j) => j.action_token === req.params.token);

    if (!job && isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const dbJob = await pool.query(
            'SELECT * FROM whatsapp_notifications WHERE action_token = $1 LIMIT 1',
            [req.params.token]
          );
          if (dbJob.rows.length > 0) {
            job = dbJob.rows[0];
          }
        } catch (e) {}
      }
    }

    if (!job) {
      return res.status(404).json({ success: false, error: 'Notification action link is invalid or expired.' });
    }

    // Token Expiry Check (48 hours)
    if (job.created_at) {
      const ageMs = Date.now() - new Date(job.created_at).getTime();
      if (ageMs > 48 * 60 * 60 * 1000) {
        return res.status(410).json({ success: false, error: 'This emergency alert link has expired (48-hour limit).' });
      }
    }

    const request = await findBloodRequestById(job.request_id);

    return res.json({
      success: true,
      action_token: job.action_token,
      status: job.status,
      donor_response: job.donor_response,
      responded_at: job.responded_at,
      request: request ? {
        patient_blood_group: request.blood_group,
        units_needed: request.units_needed,
        hospital_name: request.hospital_name,
        city: request.city,
        urgency: request.urgency
      } : null,
      disclaimer: 'BloodBridge coordinates potential blood availability; clinical cross-matching and transfusion compatibility belong exclusively to authorized medical professionals.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/action/:token
// Process voluntary donor response (Accept / Decline / Unavailable / Withdraw Consent / Completed Donation)
router.post('/action/:token', async (req, res, next) => {
  try {
    const { action } = req.body;
    if (!action) {
      return res.status(400).json({ success: false, error: 'Action parameter is required.' });
    }

    const result = await handleDonorActionToken(req.params.token, action);
    return res.json(result);
  } catch (err) {
    const status = err.message.includes('expired') ? 410 : 400;
    return res.status(status).json({ success: false, error: err.message });
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
  return res.json({
    success: true,
    url: link,
    notice: 'Click-to-chat opens WhatsApp with a prefilled message. The sender must press Send to dispatch the message.'
  });
});

// GET /api/whatsapp/webhook
// Meta WhatsApp Cloud API Webhook Challenge Verification
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = config.whatsappWebhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && expectedToken && token === expectedToken) {
    console.log('WhatsApp Cloud API Webhook verified successfully.');
    return res.status(200).send(challenge);
  } else if (!expectedToken) {
    return res.status(403).json({ error: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN not configured on server.' });
  } else {
    return res.status(403).json({ error: 'Webhook verify token mismatch.' });
  }
});

// In-memory set for webhook event deduplication / replay prevention
const processedWebhookEventIds = new Set();

// Delivery status monotonic ranking to prevent out-of-order status regressions
const DELIVERY_STATUS_RANK = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4
};

// POST /api/whatsapp/webhook
// Meta WhatsApp Cloud API Webhook Delivery Status Updates
router.post('/webhook', async (req, res) => {
  try {
    // 1. Signature Verification using WHATSAPP_APP_SECRET
    const appSecret = config.whatsappAppSecret || process.env.WHATSAPP_APP_SECRET;
    if (appSecret) {
      const signatureHeader = req.headers['x-hub-signature-256'];
      if (!signatureHeader) {
        return res.status(401).json({ error: 'Missing x-hub-signature-256 signature header.' });
      }

      const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex');

      const expectedBuf = Buffer.from(expectedSignature);
      const signatureBuf = Buffer.from(signatureHeader);

      if (
        expectedBuf.length !== signatureBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, signatureBuf)
      ) {
        return res.status(401).json({ error: 'Invalid webhook signature.' });
      }
    }

    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const statuses = value?.statuses;

      if (statuses && statuses.length > 0) {
        for (const statusObj of statuses) {
          const messageId = statusObj.id;
          const deliveryStatus = statusObj.status; // sent, delivered, read, failed
          const eventTimestamp = statusObj.timestamp || Date.now();
          const eventKey = `${messageId}_${deliveryStatus}_${eventTimestamp}`;

          // Webhook replay check
          if (processedWebhookEventIds.has(eventKey)) {
            continue;
          }
          processedWebhookEventIds.add(eventKey);
          if (processedWebhookEventIds.size > 5000) {
            // Prevent unbounded set growth
            const first = processedWebhookEventIds.values().next().value;
            processedWebhookEventIds.delete(first);
          }

          // Update localStore
          const job = (localStore.whatsapp_notifications || []).find((j) => j.provider_message_id === messageId);
          if (job) {
            const currentRank = DELIVERY_STATUS_RANK[job.delivery_status] || 0;
            const newRank = DELIVERY_STATUS_RANK[deliveryStatus] || 0;

            // Only advance delivery status monotonically (never downgrade read -> sent)
            if (newRank >= currentRank) {
              job.delivery_status = deliveryStatus;
              if (deliveryStatus === 'failed') {
                job.status = 'failed';
                job.error_message = statusObj.errors?.[0]?.message || 'Delivery failed';
              } else if (deliveryStatus === 'delivered' || deliveryStatus === 'read') {
                job.status = deliveryStatus;
              }
              job.updated_at = new Date().toISOString();
            }
          }

          // Update PostgreSQL if connected
          if (isPostgresConnected()) {
            const pool = getPool();
            if (pool) {
              await pool.query(
                `UPDATE whatsapp_notifications 
                 SET delivery_status = $1, 
                     status = CASE WHEN $1 IN ('delivered', 'read', 'failed') THEN $1 ELSE status END, 
                     updated_at = NOW() 
                 WHERE provider_message_id = $2`,
                [deliveryStatus, messageId]
              );
            }
          }
        }
      }
    }
    return res.status(200).json({ status: 'received' });
  } catch (err) {
    console.error('WhatsApp webhook callback error:', err.message);
    return res.status(200).json({ status: 'error_logged' });
  }
});

module.exports = router;
