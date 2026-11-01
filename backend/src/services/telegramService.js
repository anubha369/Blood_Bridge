const crypto = require('crypto');
const config = require('../config');
const {
  localStore,
  saveTelegramLinkCode,
  getTelegramLinkCodeByHash,
  markTelegramLinkCodeUsed,
  getDonorByTelegramChatId,
  getDonorByUserId,
  getDonorById,
  linkDonorTelegramAccount,
  unlinkDonorTelegramAccount,
  setDonorTelegramConsent,
  saveTelegramNotification,
  getTelegramNotificationByRequestAndDonor,
  updateTelegramNotificationResponse,
  calculateHaversineDistanceKm,
  getPrivacySafeDistanceBand,
  isPostgresConnected,
  getPool
} = require('../db/db');

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'Blood_Bridgebot';
const CODE_EXPIRY_MINUTES = 15;

// Mock sent messages store for testing / offline simulations
const mockSentMessages = [];
let pollingActive = false;
let pollingAbortController = null;

/**
 * Mask Telegram Chat ID for privacy in API responses
 */
function maskChatId(chatId) {
  if (!chatId) return null;
  const str = String(chatId);
  if (str.length <= 4) return '***' + str;
  return str.slice(0, 2) + '****' + str.slice(-2);
}

/**
 * Helper to call Telegram Bot API
 */
async function callTelegramApi(method, payload) {
  const token = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

  // Use mock mode if in test or if TELEGRAM_MOCK=true or if token not configured
  if (process.env.NODE_ENV === 'test' || process.env.TELEGRAM_MOCK === 'true' || !token) {
    const mockMessageId = Math.floor(100000 + Math.random() * 900000);
    const mockRecord = {
      method,
      payload,
      timestamp: new Date().toISOString(),
      message_id: mockMessageId
    };
    mockSentMessages.push(mockRecord);
    return {
      ok: true,
      result: {
        message_id: mockMessageId,
        chat: { id: payload.chat_id },
        date: Math.floor(Date.now() / 1000),
        text: payload.text
      }
    };
  }

  const url = `https://api.telegram.org/bot${token}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!data.ok) {
    const err = new Error(data.description || `Telegram API error on ${method}`);
    err.error_code = data.error_code;
    throw err;
  }
  return data;
}

/**
 * Generate a cryptographically secure 15-minute one-time linking code.
 * Raw code is never stored in DB; only SHA-256 hash is persisted.
 */
async function generateTelegramLinkCode(donorId, expiresInMinutes = CODE_EXPIRY_MINUTES) {
  if (!donorId) {
    throw new Error('donorId is required to generate a Telegram linking code.');
  }

  // Generate 16 bytes of cryptographically secure random hex (32 characters)
  const rawCode = crypto.randomBytes(16).toString('hex');
  const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  await saveTelegramLinkCode({
    donor_id: donorId,
    code_hash: codeHash,
    expires_at: expiresAt
  });

  const deepLink = `https://t.me/${BOT_USERNAME}?start=${rawCode}`;

  return {
    code: rawCode,
    bot_username: BOT_USERNAME,
    deep_link: deepLink,
    expires_at: expiresAt,
    expires_in_minutes: expiresInMinutes
  };
}

/**
 * Validate one-time code and link Telegram account to donor
 */
async function validateAndLinkTelegramAccount(rawCode, chatInfo) {
  if (!rawCode || typeof rawCode !== 'string') {
    throw new Error('A valid linking code is required.');
  }
  if (!chatInfo || !chatInfo.id) {
    throw new Error('Valid Telegram chat information is required.');
  }

  const codeHash = crypto.createHash('sha256').update(rawCode.trim()).digest('hex');
  const codeEntry = await getTelegramLinkCodeByHash(codeHash);

  if (!codeEntry) {
    throw new Error('Invalid linking code. Please generate a new code from your Donor Dashboard.');
  }

  if (codeEntry.used_at) {
    throw new Error('This linking code has already been used. Please generate a fresh code.');
  }

  if (new Date(codeEntry.expires_at) < new Date()) {
    throw new Error('This linking code has expired. Please generate a new code from your Donor Dashboard.');
  }

  // Multi-donor protection: Ensure this Telegram chat is not already linked to another active donor
  const existingLinkedDonor = await getDonorByTelegramChatId(chatInfo.id);
  if (existingLinkedDonor && existingLinkedDonor.id !== codeEntry.donor_id) {
    throw new Error('This Telegram account is already linked to another BloodBridge donor profile. Please unlink it first using /unlink.');
  }

  // Retrieve donor profile
  const donor = await getDonorById(codeEntry.donor_id);
  if (!donor) {
    throw new Error('Associated donor profile was not found.');
  }

  // Link account and activate consent
  const updatedDonor = await linkDonorTelegramAccount({
    donor_id: donor.id,
    telegram_chat_id: chatInfo.id,
    telegram_username: chatInfo.username || null
  });

  // Mark code as used
  await markTelegramLinkCodeUsed(codeHash);

  return {
    success: true,
    donor: updatedDonor || donor
  };
}

/**
 * Toggle Telegram notifications consent (opt-in / opt-out)
 */
async function setTelegramConsent(donorId, enabled) {
  if (!donorId) throw new Error('donorId is required.');
  return await setDonorTelegramConsent(donorId, enabled);
}

/**
 * Unlink Telegram account completely
 */
async function unlinkTelegramAccount(donorId) {
  if (!donorId) throw new Error('donorId is required.');
  return await unlinkDonorTelegramAccount(donorId);
}

/**
 * Send an arbitrary Telegram text message
 */
async function sendTelegramMessage(chatId, text, inlineKeyboard = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown'
  };
  if (inlineKeyboard) {
    payload.reply_markup = inlineKeyboard;
  }
  return await callTelegramApi('sendMessage', payload);
}

/**
 * Answer Telegram callback query (from inline buttons)
 */
async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
  return await callTelegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert
  });
}

/**
 * Edit an existing Telegram message text (e.g. to reflect action taken)
 */
async function editMessageText(chatId, messageId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'Markdown'
  };
  if (replyMarkup !== undefined) {
    payload.reply_markup = replyMarkup;
  }
  return await callTelegramApi('editMessageText', payload);
}

/**
 * Format emergency blood alert text with clinical disclaimer
 */
function formatEmergencyMessage(donor, bloodRequest, distanceBand) {
  const urgencyLabel = (bloodRequest.urgency || 'emergency').toUpperCase();
  return (
    `🚨 *BLOODBRIDGE EMERGENCY ALERT* 🚨\n\n` +
    `A verified urgent blood requirement has been issued matching your blood group (*${bloodRequest.blood_group}*).\n\n` +
    `🏥 *Hospital:* ${bloodRequest.hospital_name}\n` +
    `📍 *Location:* ${bloodRequest.city}${bloodRequest.hospital_address ? ` (${bloodRequest.hospital_address})` : ''}\n` +
    `🩸 *Units Needed:* ${bloodRequest.units_needed} unit(s)\n` +
    `⚡ *Urgency Level:* ${urgencyLabel}\n` +
    `📏 *Proximity:* ${distanceBand}\n\n` +
    `⚠️ *Clinical Safety Disclaimer:* Tapping Accept indicates your immediate availability and voluntary willingness to donate. It is *not* a clinical guarantee of compatibility. Final cross-matching and transfusion compatibility belong exclusively to authorized medical professionals at the hospital.\n\n` +
    `Are you feeling healthy, available, and able to donate?`
  );
}

/**
 * Send Emergency Blood Request Notification to an individual donor
 */
async function sendEmergencyBloodRequestNotification(donor, bloodRequest) {
  if (!donor || !donor.telegram_chat_id) {
    return { success: false, error: 'Donor has no linked Telegram chat ID.' };
  }

  // 1. Strict Telegram consent check
  if (donor.telegram_opt_in !== true) {
    return { success: false, error: 'Donor has not opted into Telegram notifications.' };
  }

  // 2. Cooldown check
  if (donor.cooldown_until && new Date(donor.cooldown_until) > new Date()) {
    return { success: false, error: 'Donor is currently in recovery cooldown.' };
  }

  // 3. Availability check
  if (donor.availability_status && donor.availability_status !== 'available') {
    return { success: false, error: 'Donor is marked unavailable.' };
  }

  // 4. Duplicate prevention
  const existingNotification = await getTelegramNotificationByRequestAndDonor(
    bloodRequest.id,
    donor.id
  );
  if (existingNotification) {
    return {
      success: true,
      skipped: true,
      reason: 'duplicate_suppression',
      message: 'Notification already dispatched to this donor for this request.'
    };
  }

  // 5. Distance Band calculation
  let distanceBand = 'Proximity verified';
  if (
    bloodRequest.latitude != null &&
    bloodRequest.longitude != null &&
    donor.latitude != null &&
    donor.longitude != null
  ) {
    const dist = calculateHaversineDistanceKm(
      bloodRequest.latitude,
      bloodRequest.longitude,
      donor.latitude,
      donor.longitude
    );
    distanceBand = getPrivacySafeDistanceBand(dist);
  }

  const messageText = formatEmergencyMessage(donor, bloodRequest, distanceBand);

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '✅ Accept Request',
          callback_data: `accept_req_${bloodRequest.id}`
        },
        {
          text: '❌ Decline Request',
          callback_data: `decline_req_${bloodRequest.id}`
        }
      ]
    ]
  };

  const apiRes = await sendTelegramMessage(
    donor.telegram_chat_id,
    messageText,
    inlineKeyboard
  );

  const telegramMsgId = apiRes && apiRes.result ? apiRes.result.message_id : null;

  // Persist notification record
  const notification = await saveTelegramNotification({
    request_id: bloodRequest.id,
    donor_id: donor.id,
    telegram_chat_id: donor.telegram_chat_id,
    message_text: messageText,
    telegram_message_id: telegramMsgId,
    status: 'sent'
  });

  return {
    success: true,
    notification_id: notification ? notification.id : null,
    telegram_message_id: telegramMsgId,
    recipient_chat_id: donor.telegram_chat_id
  };
}

/**
 * Dispatch emergency alerts to a list of eligible matching donors
 */
async function dispatchEmergencyRequestNotifications({ request, eligibleDonors, maxRecipients = 10 }) {
  if (!request) throw new Error('Blood request is required.');

  const candidates = (eligibleDonors || []).filter((d) => {
    if (!d.telegram_chat_id) return false;
    if (d.telegram_opt_in !== true) return false;
    if (d.availability_status && d.availability_status !== 'available') return false;
    if (d.consent_to_contact === false || d.consent_status === 'withdrawn') return false;
    if (d.cooldown_until && new Date(d.cooldown_until) > new Date()) return false;
    return true;
  });

  const recipients = candidates.slice(0, maxRecipients);
  const results = [];
  let sentCount = 0;
  let skippedCount = 0;

  for (const donor of recipients) {
    try {
      const res = await sendEmergencyBloodRequestNotification(donor, request);
      if (res.skipped) {
        skippedCount++;
      } else if (res.success) {
        sentCount++;
      }
      results.push({ donor_id: donor.id, ...res });
    } catch (err) {
      results.push({ donor_id: donor.id, success: false, error: err.message });
    }
  }

  return {
    total_candidates: candidates.length,
    attempted_count: recipients.length,
    sent_count: sentCount,
    skipped_count: skippedCount,
    results
  };
}

/**
 * Handle incoming Telegram command or message
 */
async function handleTelegramMessage(message) {
  if (!message || !message.chat || !message.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const username = message.from ? message.from.username : null;

  // Command 1: /start
  if (text.startsWith('/start')) {
    const rawArg = text.replace(/^\/start\s*/, '').trim();

    if (rawArg) {
      // Account linking attempt
      try {
        const linkRes = await validateAndLinkTelegramAccount(rawArg, {
          id: chatId,
          username
        });
        const linkedDonor = linkRes.donor;

        const welcomeLinked =
          `✅ *Telegram Account Linked Successfully!*\n\n` +
          `Welcome, *${linkedDonor.name}*! Your Telegram account is now securely linked to your BloodBridge donor profile (*${linkedDonor.blood_group}* in *${linkedDonor.city}*).\n\n` +
          `🔔 *Emergency notifications are now ENABLED.*\n` +
          `Whenever an urgent blood requirement matching your group is reported in your vicinity, you will receive an immediate alert here with instant Accept / Decline buttons.\n\n` +
          `Commands:\n` +
          `• /status — Check connection and notification status\n` +
          `• /stop — Pause Telegram notifications\n` +
          `• /unlink — Disconnect your Telegram account`;

        await sendTelegramMessage(chatId, welcomeLinked);
      } catch (err) {
        const failMessage =
          `❌ *Account Linking Failed*\n\n` +
          `${err.message}\n\n` +
          `To generate a new code, please open your BloodBridge *Donor Dashboard* and click *Connect Telegram*.`;
        await sendTelegramMessage(chatId, failMessage);
      }
      return;
    }

    // Default /start without code
    const welcomeGeneral =
      `👋 *Welcome to BloodBridge Vision-X Emergency Alert Network!*\n\n` +
      `BloodBridge connects voluntary blood donors with verified, urgent blood requests at hospitals across your region.\n\n` +
      `🔗 *How to link your donor account:*\n` +
      `1. Log in to your BloodBridge account on the web platform.\n` +
      `2. Open your *Donor Dashboard*.\n` +
      `3. Click the *Connect Telegram* button.\n` +
      `4. Open the generated bot link or send \`/start <your_code>\` here.\n\n` +
      `Available commands:\n` +
      `• /status — Check account connection & notification consent\n` +
      `• /stop — Pause Telegram alerts (keeps account linked)\n` +
      `• /unlink — Disconnect your Telegram account completely`;

    await sendTelegramMessage(chatId, welcomeGeneral);
    return;
  }

  // Command 2: /status
  if (text === '/status') {
    const donor = await getDonorByTelegramChatId(chatId);
    if (!donor) {
      const notLinkedMsg =
        `ℹ️ *Status: Not Linked*\n\n` +
        `This Telegram account is currently not connected to any BloodBridge donor profile.\n\n` +
        `To link your account, log in to your BloodBridge Donor Dashboard, click *Connect Telegram*, and send your one-time code.`;
      await sendTelegramMessage(chatId, notLinkedMsg);
      return;
    }

    const optInStatus = donor.telegram_opt_in ? '🟢 Active (Opted In)' : '🔴 Paused (Opted Out)';
    const linkedDate = donor.telegram_linked_at ? new Date(donor.telegram_linked_at).toLocaleDateString() : 'Active';

    const statusMsg =
      `📋 *BloodBridge Donor Status*\n\n` +
      `• *Donor Name:* ${donor.name}\n` +
      `• *Blood Group:* ${donor.blood_group}\n` +
      `• *City:* ${donor.city}\n` +
      `• *Telegram Alerts:* ${optInStatus}\n` +
      `• *Linked Since:* ${linkedDate}\n\n` +
      (donor.telegram_opt_in
        ? `You are active and ready to receive urgent emergency alerts.`
        : `Alerts are currently paused. Send /start or enable notifications in your Donor Dashboard to re-activate.`);

    await sendTelegramMessage(chatId, statusMsg);
    return;
  }

  // Command 3: /stop
  if (text === '/stop') {
    const donor = await getDonorByTelegramChatId(chatId);
    if (!donor) {
      await sendTelegramMessage(chatId, `ℹ️ This Telegram account is not connected to a BloodBridge donor profile.`);
      return;
    }

    await setDonorTelegramConsent(donor.id, false);

    const stopMsg =
      `⏸ *Telegram Notifications Paused*\n\n` +
      `You will no longer receive emergency blood alerts on Telegram.\n\n` +
      `Your account remains securely connected. To resume alerts at any time, toggle notifications ON in your Donor Dashboard or send /start.`;

    await sendTelegramMessage(chatId, stopMsg);
    return;
  }

  // Command 4: /unlink
  if (text === '/unlink') {
    const donor = await getDonorByTelegramChatId(chatId);
    if (!donor) {
      await sendTelegramMessage(chatId, `ℹ️ This Telegram account is not connected to a BloodBridge donor profile.`);
      return;
    }

    await unlinkDonorTelegramAccount(donor.id);

    const unlinkMsg =
      `🔗❌ *Account Disconnected*\n\n` +
      `Your Telegram account has been unlinked from BloodBridge. You will not receive any further alerts on this chat.\n\n` +
      `You can reconnect at any time from your Donor Dashboard.`;

    await sendTelegramMessage(chatId, unlinkMsg);
    return;
  }
}

/**
 * Handle incoming callback queries from inline buttons (Accept / Decline)
 */
async function handleTelegramCallbackQuery(callbackQuery) {
  if (!callbackQuery || !callbackQuery.id || !callbackQuery.data) return;

  const callbackId = callbackQuery.id;
  const data = callbackQuery.data;
  const chatId = callbackQuery.message ? callbackQuery.message.chat.id : null;
  const messageId = callbackQuery.message ? callbackQuery.message.message_id : null;
  const originalText = callbackQuery.message ? callbackQuery.message.text : '';

  const match = data.match(/^(accept|decline)_req_(.+)$/);
  if (!match) {
    await answerCallbackQuery(callbackId, 'Unrecognized action.');
    return;
  }

  const action = match[1]; // 'accept' or 'decline'
  const requestId = match[2];

  // 1. Verify donor by Telegram Chat ID
  const donor = await getDonorByTelegramChatId(chatId);
  if (!donor) {
    await answerCallbackQuery(callbackId, 'Donor account not found. Please link your account first.', true);
    return;
  }

  // 2. Verify blood request existence and active status
  let bloodRequest = (localStore.blood_requests || []).find((r) => r.id === requestId);
  if (!bloodRequest && isPostgresConnected()) {
    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM public.blood_requests WHERE id = $1 LIMIT 1', [requestId]);
        if (res.rows.length > 0) bloodRequest = res.rows[0];
      } catch (err) {
        console.warn('DB bloodRequest lookup error:', err.message);
      }
    }
  }

  if (!bloodRequest) {
    await answerCallbackQuery(callbackId, 'Blood request not found.', true);
    return;
  }

  if (['fulfilled', 'cancelled', 'closed', 'expired'].includes(bloodRequest.status)) {
    await answerCallbackQuery(callbackId, 'This emergency request has concluded or is no longer active.', true);
    if (chatId && messageId) {
      await editMessageText(
        chatId,
        messageId,
        `${originalText}\n\n⚠️ *Update:* This emergency request has concluded or is no longer active.`,
        { inline_keyboard: [] }
      );
    }
    return;
  }

  // 3. Duplicate response prevention
  const existingNotification = await getTelegramNotificationByRequestAndDonor(requestId, donor.id);
  if (existingNotification && existingNotification.donor_response) {
    await answerCallbackQuery(
      callbackId,
      `You have already ${existingNotification.donor_response.toUpperCase()} this request.`,
      false
    );
    return;
  }

  // 4. Record response in telegram notifications
  const responseType = action === 'accept' ? 'accepted' : 'declined';
  await updateTelegramNotificationResponse(requestId, donor.id, responseType);

  // 5. Also record in localStore.whatsapp_notifications (shared response tracking)
  // so /api/requests/:id/accepted-donors sees this donor!
  if (!localStore.whatsapp_notifications) localStore.whatsapp_notifications = [];
  const existingShared = localStore.whatsapp_notifications.find(
    (n) => n.request_id === requestId && n.donor_id === donor.id
  );
  if (existingShared) {
    existingShared.donor_response = responseType;
    existingShared.responded_at = new Date().toISOString();
  } else {
    localStore.whatsapp_notifications.push({
      id: crypto.randomUUID(),
      request_id: requestId,
      donor_id: donor.id,
      donor_name: donor.name,
      recipient_phone: donor.phone || 'Telegram User',
      template_name: 'telegram_emergency_alert',
      message_body: originalText,
      status: 'responded',
      donor_response: responseType,
      responded_at: new Date().toISOString(),
      action_token: `tg_${donor.id}_${requestId}`,
      created_at: new Date().toISOString()
    });
  }

  // 6. Update request_matches table in PostgreSQL if available
  if (isPostgresConnected()) {
    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `UPDATE public.request_matches
           SET status = $1, evaluated_at = NOW()
           WHERE request_id = $2 AND donor_id = $3`,
          [responseType, requestId, donor.id]
        );
      } catch (matchErr) {
        // Table or row may not exist
      }
    }
  }

  // 7. Acknowledge callback and update message UI
  if (action === 'accept') {
    await answerCallbackQuery(
      callbackId,
      'Lifesaving willingness confirmed! The hospital coordination team has been informed.',
      false
    );
    if (chatId && messageId) {
      const updatedText =
        `${originalText}\n\n` +
        `✅ *Response Recorded: ACCEPTED*\n` +
        `Thank you for stepping up! The coordination team has been notified. If your donation is selected, you will be contacted immediately.\n\n` +
        `_Clinical Cross-Matching Note: Acceptance indicates availability; hospital staff will confirm clinical compatibility prior to transfusion._`;
      await editMessageText(chatId, messageId, updatedText, { inline_keyboard: [] });
    }
  } else {
    await answerCallbackQuery(
      callbackId,
      'Decline recorded. Thank you for keeping responders updated.',
      false
    );
    if (chatId && messageId) {
      const updatedText =
        `${originalText}\n\n` +
        `❌ *Response Recorded: DECLINED*\n` +
        `Thank you for notifying us promptly so alternative voluntary donors can be reached.`;
      await editMessageText(chatId, messageId, updatedText, { inline_keyboard: [] });
    }
  }
}

/**
 * Handle incoming webhook update
 */
async function handleTelegramUpdate(update) {
  if (!update) return;
  if (update.message) {
    await handleTelegramMessage(update.message);
  } else if (update.callback_query) {
    await handleTelegramCallbackQuery(update.callback_query);
  }
}

/**
 * Long-polling engine for development and local testing
 */
async function startPolling() {
  const token = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token || process.env.NODE_ENV === 'test') {
    return;
  }

  if (pollingActive) return;
  pollingActive = true;
  pollingAbortController = new AbortController();

  console.log(`Telegram Bot long polling initializing for @${BOT_USERNAME}...`);

  // First clear any existing webhook to avoid conflict
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
  } catch (err) {
    console.warn('deleteWebhook notice:', err.message);
  }

  let offset = 0;

  // Polling loop
  (async () => {
    while (pollingActive) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20&allowed_updates=["message","callback_query"]`, {
          signal: pollingAbortController ? pollingAbortController.signal : undefined
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`Telegram polling HTTP error: ${res.status}`, errText);
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }

        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            if (update.update_id >= offset) {
              offset = update.update_id + 1;
            }
            try {
              await handleTelegramUpdate(update);
            } catch (itemErr) {
              console.error('Error processing Telegram update:', itemErr.message);
            }
          }
        }
      } catch (pollErr) {
        if (!pollingActive) break;
        // Exponential/constant backoff on network drop
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    console.log('Telegram Bot long polling stopped.');
  })();
}

/**
 * Stop polling gracefully on server shutdown
 */
function stopPolling() {
  pollingActive = false;
  if (pollingAbortController) {
    try {
      pollingAbortController.abort();
    } catch (e) {
      // Ignore abort errors
    }
  }
}

module.exports = {
  generateTelegramLinkCode,
  validateAndLinkTelegramAccount,
  setTelegramConsent,
  unlinkTelegramAccount,
  sendTelegramMessage,
  sendEmergencyBloodRequestNotification,
  dispatchEmergencyRequestNotifications,
  handleTelegramMessage,
  handleTelegramCallbackQuery,
  handleTelegramUpdate,
  startPolling,
  stopPolling,
  maskChatId,
  mockSentMessages,
  BOT_USERNAME
};
