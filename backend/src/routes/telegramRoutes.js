const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  generateTelegramLinkCode,
  setTelegramConsent,
  unlinkTelegramAccount,
  handleTelegramUpdate,
  maskChatId,
  BOT_USERNAME,
  dispatchEmergencyRequestNotifications
} = require('../services/telegramService');
const {
  getDonorByUserId,
  searchNearbyTelegramDonors,
  localStore,
  isPostgresConnected,
  getPool
} = require('../db/db');
const { resolveCityCoordinates } = require('../services/spatialService');

// Helper to look up a blood request
async function findBloodRequestById(requestId) {
  let request = (localStore.blood_requests || []).find((r) => r.id === requestId);
  if (!request && isPostgresConnected()) {
    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [requestId]);
        if (res.rows.length > 0) request = res.rows[0];
      } catch (err) {
        console.warn('DB lookup blood_requests warning:', err.message);
      }
    }
  }
  return request;
}

// POST /api/telegram/link-code
// Generate a cryptographically secure 15-minute one-time code for account linking
router.post('/link-code', authenticateUser, async (req, res, next) => {
  try {
    const donor = await getDonorByUserId(req.user.id);
    if (!donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor profile not found. Please complete donor registration first.'
      });
    }

    const codeData = await generateTelegramLinkCode(donor.id);

    return res.status(201).json({
      success: true,
      code: codeData.code,
      deep_link: codeData.deep_link,
      bot_username: codeData.bot_username,
      expires_at: codeData.expires_at,
      expires_in_minutes: codeData.expires_in_minutes,
      instructions: `Open the Telegram link or start @${codeData.bot_username} with /start ${codeData.code} within ${codeData.expires_in_minutes} minutes.`
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/telegram/status
// Check current donor's Telegram linking status and notification preferences
router.get('/status', authenticateUser, async (req, res, next) => {
  try {
    const donor = await getDonorByUserId(req.user.id);
    if (!donor) {
      return res.json({
        success: true,
        donor_registered: false,
        linked: false,
        bot_username: BOT_USERNAME
      });
    }

    return res.json({
      success: true,
      donor_registered: true,
      donor_id: donor.id,
      linked: Boolean(donor.telegram_chat_id),
      telegram_username: donor.telegram_username || null,
      telegram_chat_id_masked: maskChatId(donor.telegram_chat_id),
      telegram_opt_in: Boolean(donor.telegram_opt_in),
      telegram_opt_in_at: donor.telegram_opt_in_at || null,
      telegram_opt_out_at: donor.telegram_opt_out_at || null,
      telegram_linked_at: donor.telegram_linked_at || null,
      bot_username: BOT_USERNAME
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/telegram/consent
// Explicitly opt-in or opt-out of Telegram notifications
router.post('/consent', authenticateUser, async (req, res, next) => {
  try {
    const donor = await getDonorByUserId(req.user.id);
    if (!donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor profile not found.'
      });
    }

    if (!donor.telegram_chat_id) {
      return res.status(400).json({
        success: false,
        error: 'Please connect your Telegram account before managing notification preferences.'
      });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled boolean field is required.'
      });
    }

    const updated = await setTelegramConsent(donor.id, enabled);

    return res.json({
      success: true,
      telegram_opt_in: Boolean(updated ? updated.telegram_opt_in : enabled),
      message: enabled
        ? 'Telegram emergency notifications enabled.'
        : 'Telegram emergency notifications paused.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/telegram/unlink
// Unlink Telegram account from donor profile
router.post('/unlink', authenticateUser, async (req, res, next) => {
  try {
    const donor = await getDonorByUserId(req.user.id);
    if (!donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor profile not found.'
      });
    }

    await unlinkTelegramAccount(donor.id);

    return res.json({
      success: true,
      message: 'Telegram account unlinked successfully.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/telegram/send-request-notifications
// Dispatch Telegram alerts to matching eligible donors
router.post('/send-request-notifications', authenticateUser, async (req, res, next) => {
  try {
    const { request_id, radius_km = 30, max_recipients = 10 } = req.body;

    if (!request_id) {
      return res.status(400).json({ success: false, error: 'request_id is required.' });
    }

    const request = await findBloodRequestById(request_id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Blood request not found.' });
    }

    // Authorization: owner or admin only
    if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to dispatch alerts for this request.' });
    }

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
      return res.status(400).json({
        success: false,
        error: 'Valid coordinates or supported city required to find nearby Telegram donors.'
      });
    }

    const radius = Number(radius_km);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 100) {
      return res.status(400).json({
        success: false,
        error: 'Search radius must be between 1 and 100 km.'
      });
    }

    const matchingDonors = await searchNearbyTelegramDonors({
      latitude: searchLat,
      longitude: searchLon,
      radiusKm: radius,
      bloodGroup: request.blood_group,
      limit: 50
    });

    const dispatchResult = await dispatchEmergencyRequestNotifications({
      request,
      eligibleDonors: matchingDonors,
      maxRecipients: parseInt(max_recipients, 10) || 10
    });

    return res.json({
      success: true,
      request_id: request.id,
      blood_group: request.blood_group,
      city: request.city,
      ...dispatchResult
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/telegram/webhook
// Receiver for Telegram Bot Webhook
router.post('/webhook', async (req, res) => {
  try {
    await handleTelegramUpdate(req.body);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook handler error:', err.message);
    return res.status(200).json({ ok: true }); // Always 200 OK to Telegram
  }
});

module.exports = router;
