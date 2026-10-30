/**
 * BloodBridge Vision-X: WhatsApp Notification Service
 * 
 * Supports:
 * 1. Click-to-chat manual fallback URLs (https://wa.me/91XXXXXXXXXX?text=...)
 *    - Strict E.164 phone normalization without plus (e.g. 919876543210)
 *    - Safe URL encoding of multi-line emergency messages
 *    - Clear human-review disclaimer (click-to-chat does NOT auto-send)
 * 2. Official WhatsApp Business Platform / Cloud API integration
 *    - Server-side credentials only (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID)
 *    - Safe simulation mode when credentials not configured (WHATSAPP_API_ENABLED=false)
 *    - Tokenized donor response links (accept, decline, unavailable, withdraw consent)
 *    - Provider message ID and delivery status tracking
 * 3. PostgreSQL persistence with localStore fallback
 *    - Duplicate-safe notification creation via database constraint
 *    - Explicit donor opt-in and consent enforcement
 *    - 48-hour action token expiry
 */

const { localStore, getPool, isPostgresConnected } = require('../db/db');
const { isDonorEligibleForNotification, recordCompletedDonation } = require('./cooldownService');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

const WHATSAPP_API_VERSION = 'v19.0';
const ACTION_TOKEN_EXPIRY_HOURS = 48;

/**
 * Normalize phone number specifically for WhatsApp URL / Cloud API (E.164 without plus)
 * India format: 10-digit mobile (e.g. 9876543210) -> 919876543210
 */
function normalizePhoneForWhatsApp(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Generate a prefilled manual WhatsApp deep-link for patient or requester fallback
 * Generates: https://wa.me/91XXXXXXXXXX?text=URL_ENCODED_MESSAGE
 */
function generateManualWhatsAppLink(phone, messageText) {
  const cleanPhone = normalizePhoneForWhatsApp(phone);
  const encodedMsg = encodeURIComponent(messageText || '');
  if (cleanPhone && cleanPhone.length >= 10) {
    return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  }
  return `https://wa.me/?text=${encodedMsg}`;
}

/**
 * Format privacy-conscious emergency alert text for a voluntary donor
 */
function formatDonorNotificationMessage(request, donor, actionToken) {
  return (
    `*BloodBridge Emergency Alert*\n\n` +
    `A verified blood coordination request matching your blood group (*${request.blood_group}*) is active in *${request.city}*.\n` +
    `Hospital: ${request.hospital_name}\n` +
    `Units Needed: ${request.units_needed}\n\n` +
    `If you are feeling healthy, available, and willing to help, review request & respond securely:\n` +
    `https://bloodbridge.org/action/${actionToken}\n\n` +
    `_BloodBridge never exposes your private address. You can update availability or withdraw notification consent at any time._`
  );
}

/**
 * Queue and dispatch WhatsApp notification jobs for a blood request
 */
async function dispatchRequestNotifications({ request, eligibleDonors, maxRecipients = 10 }) {
  if (!request) throw new Error('Blood request is required.');

  if (!localStore.whatsapp_notifications) {
    localStore.whatsapp_notifications = [];
  }

  const jobs = [];
  const pool = isPostgresConnected() ? getPool() : null;

  // Filter donors strictly for WhatsApp opt-in, general consent, availability, and cooldown
  const selectedDonors = (eligibleDonors || [])
    .filter((d) => {
      // 1. WhatsApp explicit opt-in is mandatory
      if (d.whatsapp_opt_in !== true) return false;

      // 2. Cooldown and general eligibility check
      if (d.consent_to_contact === false || d.consent_status === 'withdrawn') return false;
      if (d.availability_status && d.availability_status !== 'available') return false;
      if (['rejected', 'inactive'].includes(d.verification_status)) return false;
      if (d.cooldown_until && new Date(d.cooldown_until) > new Date()) return false;
      if (d.donated_last_3_months === true && !d.cooldown_until) return false;

      // 3. Indian E.164 mobile phone verification
      const phone = normalizePhoneForWhatsApp(d.phone);
      return /^91\d{10}$/.test(phone);
    })
    .slice(0, maxRecipients);

  const hasCloudApi = config.whatsappApiEnabled && !!(config.whatsappToken && config.whatsappPhoneNumberId);

  for (const donor of selectedDonors) {
    const donorId = donor.id || donor.donor_id;
    const recipientPhone = normalizePhoneForWhatsApp(donor.phone);

    // Check duplicate in localStore
    let existing = localStore.whatsapp_notifications.find(
      (n) => n.request_id === request.id && n.donor_id === donorId
    );

    // Check duplicate in PostgreSQL if connected
    if (!existing && pool) {
      try {
        const dbCheck = await pool.query(
          `SELECT * FROM whatsapp_notifications WHERE request_id = $1 AND donor_id = $2 LIMIT 1;`,
          [request.id, donorId]
        );
        if (dbCheck.rows.length > 0) {
          existing = dbCheck.rows[0];
          // Sync into localStore cache
          if (!localStore.whatsapp_notifications.some((n) => n.id === existing.id)) {
            localStore.whatsapp_notifications.push(existing);
          }
        }
      } catch (err) {
        console.warn('DB notification check notice:', err.message);
      }
    }

    if (existing) {
      jobs.push(existing);
      continue;
    }

    const templateName = config.whatsappTemplateName || 'blood_donation_urgent_request';
    const actionToken = `bb_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
    const messageBody = formatDonorNotificationMessage(request, donor, actionToken);
    const jobId = uuidv4();

    const job = {
      id: jobId,
      request_id: request.id,
      donor_id: donorId,
      donor_name: donor.name,
      recipient_phone: recipientPhone,
      template_name: templateName,
      message_body: messageBody,
      action_token: actionToken,
      status: hasCloudApi ? 'queued' : 'simulated_sent',
      simulated: !hasCloudApi,
      delivery_mode: hasCloudApi ? 'live_cloud_api' : 'simulated_development_mock',
      provider_message_id: hasCloudApi ? null : `sim_wa_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      donor_response: null,
      responded_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (hasCloudApi) {
      try {
        const cloudRes = await sendViaWhatsAppCloudApi({
          to: recipientPhone,
          message: messageBody,
          template: job.template_name,
          request,
          donor,
          actionToken
        });
        job.status = 'sent';
        job.delivery_status = 'sent';
        job.provider_message_id = cloudRes.messages?.[0]?.id || `wa_msg_${Date.now()}`;
      } catch (err) {
        job.status = 'failed';
        job.delivery_status = 'failed';
        job.error_message = err.message;
      }
    } else {
      console.log(`[SIMULATED WHATSAPP NOTIFICATION] Dev simulation for donor ${donorId} (${donor.name}), phone: ${recipientPhone.slice(0, 4)}...${recipientPhone.slice(-4)}`);
    }

    // Persist to PostgreSQL if connected
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO whatsapp_notifications (
             id, request_id, donor_id, recipient_phone, template_name, message_body,
             status, provider_message_id, delivery_status, action_token, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
           )
           ON CONFLICT (action_token) DO NOTHING;`,
          [
            job.id,
            job.request_id,
            job.donor_id,
            job.recipient_phone,
            job.template_name,
            job.message_body,
            job.status,
            job.provider_message_id,
            job.delivery_status || null,
            job.action_token
          ]
        );
      } catch (dbErr) {
        console.warn('DB notification insert notice:', dbErr.message);
      }
    }

    localStore.whatsapp_notifications.push(job);
    jobs.push(job);
  }

  // Update blood request status to notifications_queued or searching
  const newStatus = jobs.length > 0 ? 'notifications_queued' : 'searching';
  request.status = newStatus;
  request.updated_at = new Date().toISOString();

  if (pool) {
    try {
      await pool.query(
        `UPDATE blood_requests SET status = $1, updated_at = NOW() WHERE id = $2;`,
        [newStatus, request.id]
      );
    } catch (err) {
      // Localstore is already updated
    }
  }

  return {
    success: true,
    request_id: request.id,
    dispatched_count: jobs.length,
    delivery_mode: hasCloudApi ? 'live_cloud_api' : 'simulated_development_mock',
    simulated: !hasCloudApi,
    jobs
  };
}

/**
 * Handle donor response through their secure action token
 */
function handleDonorActionToken(token, action) {
  if (!token) throw new Error('Action token is required.');

  const pool = isPostgresConnected() ? getPool() : null;
  let job = (localStore.whatsapp_notifications || []).find((n) => n.action_token === token);

  if (!job) {
    throw new Error('Invalid or expired notification action link.');
  }

  // 1. Token Expiry Check (48-hour limit)
  if (job.created_at) {
    const ageMs = Date.now() - new Date(job.created_at).getTime();
    if (ageMs > ACTION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000) {
      throw new Error(`This emergency notification link has expired (valid for ${ACTION_TOKEN_EXPIRY_HOURS} hours).`);
    }
  }

  // 2. Idempotency Check: if identical action already submitted
  if (job.donor_response && job.donor_response === action) {
    return {
      success: true,
      action,
      message: 'Your response was already recorded. Thank you!',
      job
    };
  }

  // 3. Single-Use Check: once an action is recorded, token cannot be reused for a different action
  if (job.donor_response && job.donor_response !== action) {
    throw new Error('This notification action link has already been used and cannot be modified.');
  }

  const donor = (localStore.donors || []).find((d) => d.id === job.donor_id);
  const request = (localStore.blood_requests || []).find((r) => r.id === job.request_id);

  job.donor_response = action;
  job.responded_at = new Date().toISOString();
  job.updated_at = new Date().toISOString();

  let message = '';

  switch (action) {
    case 'accepted':
      if (request) {
        request.status = 'responses_received';
        request.updated_at = new Date().toISOString();
      }
      if (pool) {
        pool.query(
          `UPDATE blood_requests 
           SET status = 'responses_received', updated_at = NOW() 
           WHERE id = $1 AND status IN ('searching', 'notifications_queued', 'active');`,
          [job.request_id]
        ).catch((e) => console.warn('DB request update notice:', e.message));
      }
      message = 'Thank you for your willingness to help! The requester has been notified with coordination details.';
      break;

    case 'declined':
      message = 'Understood. Thank you for letting us know.';
      break;

    case 'unavailable':
      if (donor) {
        donor.availability_status = 'unavailable';
        donor.last_availability_confirmed_at = new Date().toISOString();
        donor.updated_at = new Date().toISOString();
      }
      if (pool) {
        pool.query(
          `UPDATE donors 
           SET availability_status = 'unavailable', last_availability_confirmed_at = NOW(), updated_at = NOW() 
           WHERE id = $1;`,
          [job.donor_id]
        ).catch((e) => console.warn('DB donor update notice:', e.message));
      }
      message = 'Your status has been updated to temporarily unavailable. You will not receive emergency alerts until you toggle availability.';
      break;

    case 'withdrawn_consent':
      if (donor) {
        donor.consent_to_contact = false;
        donor.consent_status = 'withdrawn';
        donor.whatsapp_opt_in = false;
        donor.whatsapp_opt_out_at = new Date().toISOString();
        donor.consent_updated_at = new Date().toISOString();
        donor.updated_at = new Date().toISOString();
      }
      if (pool) {
        pool.query(
          `UPDATE donors 
           SET consent_to_contact = false, consent_status = 'withdrawn', whatsapp_opt_in = false, whatsapp_opt_out_at = NOW(), updated_at = NOW() 
           WHERE id = $1;`,
          [job.donor_id]
        ).catch((e) => console.warn('DB donor update notice:', e.message));
      }
      message = 'Your notification consent has been successfully withdrawn. You will receive no further messages.';
      break;

    case 'completed_donation':
      // Security Rule: Do NOT mark the request fulfilled from donor response alone.
      // Record completed donation cooldown on donor only.
      if (donor) {
        recordCompletedDonation(donor.id, new Date().toISOString().split('T')[0], 'donor_self_reported');
      }
      if (pool) {
        pool.query(
          `UPDATE donors 
           SET donated_last_3_months = true, 
               cooldown_until = NOW() + INTERVAL '3 months', 
               availability_status = 'recently_donated', 
               donation_history_status = 'reported_recent', 
               updated_at = NOW() 
           WHERE id = $1;`,
          [job.donor_id]
        ).catch((e) => console.warn('DB donor cooldown notice:', e.message));
      }
      message = 'Thank you for reporting your donation! Your 3-month biological recovery cooldown has been activated.';
      break;

    default:
      throw new Error(`Unsupported donor response action: "${action}"`);
  }

  // Update notification record in PostgreSQL
  if (pool) {
    pool.query(
      `UPDATE whatsapp_notifications 
       SET donor_response = $1, responded_at = NOW(), updated_at = NOW() 
       WHERE action_token = $2;`,
      [action, token]
    ).catch((dbErr) => console.warn('DB notification response update notice:', dbErr.message));
  }

  return {
    success: true,
    action,
    message,
    job
  };
}

/**
 * Real WhatsApp Cloud API dispatcher (invoked when credentials are provided)
 */
async function sendViaWhatsAppCloudApi({ to, message, template, request, donor, actionToken }) {
  const token = config.whatsappToken || process.env.WHATSAPP_TOKEN;
  const phoneNumberId = config.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp Cloud API credentials not configured (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID).');
  }

  const cleanPhone = normalizePhoneForWhatsApp(to);
  if (!cleanPhone || !/^91\d{10}$/.test(cleanPhone)) {
    throw new Error(`Invalid recipient phone number for WhatsApp: "${to}". Must be a 10-digit Indian mobile number.`);
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  let payload;
  if (config.whatsappUseTemplate && template) {
    // Official template message with positional parameters:
    // {{1}} = Blood group, {{2}} = Hospital, {{3}} = City, {{4}} = Units, {{5}} = Action URL
    const actionUrl = actionToken ? `https://bloodbridge.org/action/${actionToken}` : '';
    const bodyParams = request ? [
      { type: 'text', text: request.blood_group || '' },
      { type: 'text', text: request.hospital_name || '' },
      { type: 'text', text: request.city || '' },
      { type: 'text', text: String(request.units_needed || 1) },
      { type: 'text', text: actionUrl }
    ] : [
      { type: 'text', text: message }
    ];

    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: template,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: bodyParams
          }
        ]
      }
    };
  } else {
    // Standard text message
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: { preview_url: true, body: message }
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.error?.message || `WhatsApp API error ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

module.exports = {
  normalizePhoneForWhatsApp,
  generateManualWhatsAppLink,
  formatDonorNotificationMessage,
  dispatchRequestNotifications,
  handleDonorActionToken,
  sendViaWhatsAppCloudApi
};
