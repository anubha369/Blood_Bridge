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
let currentPollingOffset = 0;

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
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (netErr) {
    let sanitized = netErr.message || 'Network error';
    if (token && sanitized.includes(token)) {
      sanitized = sanitized.replaceAll(token, '[REDACTED_BOT_TOKEN]');
    }
    throw new Error(`Telegram API network failure on ${method}: ${sanitized}`);
  }

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
 * Send an arbitrary Telegram text message with automatic Markdown fallback
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
  try {
    const res = await callTelegramApi('sendMessage', payload);
    console.log(`[Telegram SendMessage] Delivered successfully (msg_id: ${res.result?.message_id}, ok: ${res.ok}) [chat: ${maskChatId(chatId)}]`);
    return res;
  } catch (err) {
    // If Markdown parsing fails, retry without parse_mode so message is guaranteed to deliver
    if (err.message && err.message.toLowerCase().includes("can't parse entities")) {
      console.warn('[Telegram Bot] Markdown parsing failed, retrying in plain text for chat:', maskChatId(chatId));
      const plainPayload = {
        chat_id: chatId,
        text
      };
      if (inlineKeyboard) {
        plainPayload.reply_markup = inlineKeyboard;
      }
      const plainRes = await callTelegramApi('sendMessage', plainPayload);
      console.log(`[Telegram SendMessage] Plain text delivered successfully (msg_id: ${plainRes.result?.message_id}, ok: ${plainRes.ok}) [chat: ${maskChatId(chatId)}]`);
      return plainRes;
    }
    console.error(`[Telegram SendMessage Error] Failed to send message to chat ${maskChatId(chatId)}: ${err.message}`);
    throw err;
  }
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
 * Handle incoming Telegram command or message with robust syntax parsing
 */
async function handleTelegramMessage(message) {
  if (!message || !message.chat || !message.text) return;

  const chatId = message.chat.id;
  const username = message.from ? message.from.username : null;
  const trimmed = message.text.trim();
  const parts = trimmed.split(/\s+/);
  const firstPart = parts[0] || '';

  let command = null;
  let rawArg = '';

  // Match command and optional bot username e.g. /start, /start@Blood_Bridgebot, /start@BloodBridgeVisionXBot
  const cmdMatch = firstPart.match(/^\/([a-zA-Z0-9_]+)(?:@([a-zA-Z0-9_]+))?$/i);
  if (cmdMatch) {
    command = cmdMatch[1].toLowerCase();
    const botTarget = cmdMatch[2];
    const isPrivateChat = !message.chat.type || message.chat.type === 'private';
    if (botTarget && !isPrivateChat && botTarget.toLowerCase() !== BOT_USERNAME.toLowerCase() && !botTarget.toLowerCase().includes('blood')) {
      // Message targeted at another bot in a group chat
      return;
    }
    rawArg = parts.slice(1).join(' ').trim();
  } else {
    // Plain text fallback without slash e.g. "start", "start <code>", "status", "stop", "unlink", "help"
    const lowerFirst = firstPart.toLowerCase();
    if (['start', 'status', 'stop', 'unlink', 'help'].includes(lowerFirst)) {
      command = lowerFirst === 'help' ? 'start' : lowerFirst;
      rawArg = parts.slice(1).join(' ').trim();
    } else {
      // Any other text greeting (e.g. "hi", "hello") routes safely to welcome guidance
      command = 'start';
      rawArg = '';
    }
  }

  console.log(`[Telegram Command Handler] Handling /${command} (has_code_arg: ${Boolean(rawArg)}) [chat: ${maskChatId(chatId)}]`);

  // Command 1: /start
  if (command === 'start') {
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
        console.log(`[Telegram Command Handler] Account linking reply sent [chat: ${maskChatId(chatId)}]`);
      } catch (err) {
        const failMessage =
          `❌ *Account Linking Failed*\n\n` +
          `${err.message}\n\n` +
          `To generate a new code, please open your BloodBridge *Donor Dashboard* and click *Connect Telegram*.`;
        await sendTelegramMessage(chatId, failMessage);
        console.log(`[Telegram Command Handler] Account linking failure reply sent [chat: ${maskChatId(chatId)}]`);
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
    console.log(`[Telegram Command Handler] Welcome guidance reply sent [chat: ${maskChatId(chatId)}]`);
    return;
  }

  // Command 2: /status
  if (command === 'status') {
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
  if (command === 'stop') {
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
  if (command === 'unlink') {
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
  const updateType = update.message
    ? 'message'
    : update.callback_query
    ? 'callback_query'
    : update.edited_message
    ? 'edited_message'
    : update.my_chat_member
    ? 'my_chat_member'
    : 'other';

  console.log(`[Telegram Update] Dispatching update_id #${update.update_id} (type: ${updateType})`);

  if (update.message) {
    await handleTelegramMessage(update.message);
  } else if (update.edited_message) {
    await handleTelegramMessage(update.edited_message);
  } else if (update.callback_query) {
    await handleTelegramCallbackQuery(update.callback_query);
  } else if (update.my_chat_member) {
    console.log(`[Telegram Update] Chat membership updated for chat: ${maskChatId(update.my_chat_member.chat ? update.my_chat_member.chat.id : null)}`);
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

  console.log(`[Telegram Bot] Initializing long polling for @${BOT_USERNAME}...`);

  // First clear any existing webhook to avoid 409 conflict
  try {
    const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: false })
    });
    const delData = await delRes.json();
    console.log(`[Telegram Bot] Webhook clear status:`, delData.ok ? 'Webhook cleared, polling enabled' : delData.description);
  } catch (err) {
    console.warn('[Telegram Bot] deleteWebhook notice:', err.message);
  }

  let pollCycle = 0;

  // Polling loop
  (async () => {
    console.log(`[Telegram Bot] Polling loop active for @${BOT_USERNAME}`);
    while (pollingActive) {
      pollCycle++;
      const cycleStart = Date.now();
      try {
        // Use client-side timeout of 16s so fetch never hangs indefinitely on dead sockets
        const clientTimeoutSignal = AbortSignal.timeout(16000);
        const requestSignal = pollingAbortController
          ? AbortSignal.any([clientTimeoutSignal, pollingAbortController.signal])
          : clientTimeoutSignal;

        const reqPayload = {
          timeout: 10
        };
        if (currentPollingOffset > 0) {
          reqPayload.offset = currentPollingOffset;
        }

        const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload),
          signal: requestSignal
        });

        const elapsedMs = Date.now() - cycleStart;

        if (!res.ok) {
          const errText = await res.text();
          let parsedErr = {};
          try {
            parsedErr = JSON.parse(errText);
          } catch (_) {}

          if (res.status === 409 || parsedErr.error_code === 409) {
            console.warn(`[Telegram Polling WARNING] HTTP 409 Conflict detected (cycle #${pollCycle}, took ${elapsedMs}ms). Another process or bot instance is actively calling getUpdates or a webhook is configured.`);
          } else if (res.status === 401 || parsedErr.error_code === 401) {
            console.error(`[Telegram Polling ERROR] HTTP 401 Unauthorized (cycle #${pollCycle}). Bot token is invalid.`);
          } else {
            console.warn(`[Telegram Polling Warning] HTTP ${res.status} (cycle #${pollCycle}, took ${elapsedMs}ms): ${parsedErr.description || errText}`);
          }
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }

        const data = await res.json();
        const updateCount = Array.isArray(data.result) ? data.result.length : 0;

        // Log the HTTP response status, Telegram ok field, update count, and offset (privacy-safe, no chat IDs or tokens)
        console.log(`[Telegram Polling] Cycle #${pollCycle} | HTTP ${res.status} | ok: ${Boolean(data.ok)} | updates_received: ${updateCount} | current_offset: ${currentPollingOffset} | duration: ${elapsedMs}ms`);

        if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
          const prevOffset = currentPollingOffset;
          console.log(`[Telegram Polling] Received ${data.result.length} update(s). Dispatching to handler...`);

          for (const update of data.result) {
            try {
              await handleTelegramUpdate(update);
              // Requirement 9: Only advance offset after processing successfully!
              if (update.update_id >= currentPollingOffset) {
                currentPollingOffset = update.update_id + 1;
              }
            } catch (itemErr) {
              console.error(`[Telegram Update Error] Error processing update #${update.update_id}:`, itemErr.message);
              if (update.update_id >= currentPollingOffset) {
                currentPollingOffset = update.update_id + 1;
              }
            }
          }
          console.log(`[Telegram Polling] Polling offset advanced from ${prevOffset} to ${currentPollingOffset}`);
        }
      } catch (pollErr) {
        if (!pollingActive) break;
        if (pollingAbortController && pollingAbortController.signal.aborted) break;

        const isTimeout =
          pollErr.name === 'TimeoutError' ||
          (pollErr.name === 'AbortError' && (!pollingAbortController || !pollingAbortController.signal.aborted));

        if (isTimeout) {
          console.log(`[Telegram Polling] Cycle #${pollCycle} client socket timeout after ${Date.now() - cycleStart}ms. Re-polling...`);
          continue;
        }

        let safeErrMsg = pollErr.message || 'Unknown network error';
        if (token && safeErrMsg.includes(token)) {
          safeErrMsg = safeErrMsg.replaceAll(token, '[REDACTED_BOT_TOKEN]');
        }
        console.error(`[Telegram Polling Network Error] Cycle #${pollCycle}: ${safeErrMsg}`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    console.log('[Telegram Bot] Long polling loop stopped.');
  })();
}

/**
 * Stop polling gracefully on server shutdown or during one-time diagnostic
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

/**
 * Controlled One-Time Diagnostic Function
 * Pauses normal polling, calls getUpdates once for timeoutSeconds,
 * captures and reports metadata (status, ok, count, update IDs, types),
 * dispatches any received update, and resumes polling.
 */
async function runOneTimeDiagnostic(timeoutSeconds = 25) {
  const token = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { error: 'No Telegram bot token configured' };
  }

  const wasPolling = pollingActive;
  console.log(`[Telegram Diagnostic] Stopping polling loop to perform controlled diagnostic (timeout: ${timeoutSeconds}s)...`);

  if (pollingActive) {
    stopPolling();
    // Allow in-flight socket to abort and close cleanly
    await new Promise((r) => setTimeout(r, 1200));
  }

  const startTime = Date.now();
  let resultMeta = {};

  try {
    const reqPayload = { timeout: timeoutSeconds };
    if (currentPollingOffset > 0) {
      reqPayload.offset = currentPollingOffset;
    }

    const clientTimeoutSignal = AbortSignal.timeout((timeoutSeconds + 6) * 1000);
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqPayload),
      signal: clientTimeoutSignal
    });

    const elapsedMs = Date.now() - startTime;
    const httpStatus = res.status;
    let data = {};
    try {
      data = await res.json();
    } catch (_) {}

    const isOk = Boolean(data.ok);
    const updates = Array.isArray(data.result) ? data.result : [];
    const updateCount = updates.length;
    const updateIds = updates.map((u) => u.update_id);
    const updateTypes = updates.map((u) =>
      u.message
        ? 'message'
        : u.callback_query
        ? 'callback_query'
        : u.edited_message
        ? 'edited_message'
        : u.my_chat_member
        ? 'my_chat_member'
        : 'other'
    );

    resultMeta = {
      httpStatus,
      telegramOk: isOk,
      updateCount,
      updateIds,
      updateTypes,
      durationMs: elapsedMs,
      description: data.description || null
    };

    console.log(`[Telegram Diagnostic] HTTP ${httpStatus} | ok: ${isOk} | count: ${updateCount} | duration: ${elapsedMs}ms`);
    if (updateCount > 0) {
      console.log(`[Telegram Diagnostic] Update IDs: [${updateIds.join(', ')}] | Types: [${updateTypes.join(', ')}]`);
      for (const update of updates) {
        try {
          await handleTelegramUpdate(update);
          if (update.update_id >= currentPollingOffset) {
            currentPollingOffset = update.update_id + 1;
          }
        } catch (itemErr) {
          console.error(`[Telegram Diagnostic Error] Error processing update #${update.update_id}:`, itemErr.message);
          if (update.update_id >= currentPollingOffset) {
            currentPollingOffset = update.update_id + 1;
          }
        }
      }
    }
  } catch (err) {
    let safeMsg = err.message || 'Unknown network error';
    if (token && safeMsg.includes(token)) {
      safeMsg = safeMsg.replaceAll(token, '[REDACTED_BOT_TOKEN]');
    }
    console.error(`[Telegram Diagnostic Network Error]: ${safeMsg}`);
    resultMeta = {
      error: safeMsg,
      durationMs: Date.now() - startTime
    };
  } finally {
    if (wasPolling && process.env.NODE_ENV !== 'test') {
      console.log('[Telegram Diagnostic] Resuming background polling loop...');
      startPolling().catch((e) => console.warn('[Telegram Poller Restart Warning]:', e.message));
    }
  }

  return resultMeta;
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
  runOneTimeDiagnostic,
  maskChatId,
  mockSentMessages,
  BOT_USERNAME
};
