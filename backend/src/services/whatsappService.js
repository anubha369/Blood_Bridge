/**
 * BloodBridge Vision-X: WhatsApp Notification Service
 * 
 * Implements Section 8 of Specification:
 * - Official WhatsApp Cloud API integration structure
 * - Explicit development mock/simulator when credentials are not configured
 * - Manual WhatsApp deep-link fallback generator
 * - Unique secure action tokens for Accept / Decline / Unavailable / Consent Withdrawal
 * - Idempotent delivery tracking and provider response capture
 */

const { localStore } = require('../db/db');
const { isDonorEligibleForNotification, recordCompletedDonation } = require('./cooldownService');
const { v4: uuidv4 } = require('uuid');

const WHATSAPP_API_VERSION = 'v19.0';

/**
 * Generate a prefilled manual WhatsApp deep-link for patient or requester fallback
 */
function generateManualWhatsAppLink(phone, messageText) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(messageText);
  if (cleanPhone) {
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
  const selectedDonors = (eligibleDonors || [])
    .filter((d) => isDonorEligibleForNotification(d))
    .slice(0, maxRecipients);

  const hasCloudApi = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

  for (const donor of selectedDonors) {
    // Check if notification was already sent to this donor for this request
    const existing = localStore.whatsapp_notifications.find(
      (n) => n.request_id === request.id && n.donor_id === donor.id
    );

    if (existing) {
      jobs.push(existing);
      continue;
    }

    const actionToken = `bb_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
    const messageBody = formatDonorNotificationMessage(request, donor, actionToken);
    const recipientPhone = donor.phone || '+919876500000';

    const job = {
      id: uuidv4(),
      request_id: request.id,
      donor_id: donor.id,
      donor_name: donor.name,
      recipient_phone: recipientPhone,
      template_name: 'emergency_blood_request_v1',
      message_body: messageBody,
      action_token: actionToken,
      status: hasCloudApi ? 'queued' : 'simulated_sent',
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
          template: job.template_name
        });
        job.status = 'sent';
        job.provider_message_id = cloudRes.messages?.[0]?.id || `wa_msg_${Date.now()}`;
      } catch (err) {
        job.status = 'failed';
        job.error_message = err.message;
      }
    }

    localStore.whatsapp_notifications.push(job);
    jobs.push(job);
  }

  // Update blood request status to notifications_queued or searching
  request.status = jobs.length > 0 ? 'notifications_queued' : 'searching';
  request.updated_at = new Date().toISOString();

  return {
    success: true,
    request_id: request.id,
    dispatched_count: jobs.length,
    delivery_mode: hasCloudApi ? 'live_cloud_api' : 'simulated_development_mock',
    jobs
  };
}

/**
 * Handle donor response through their secure action token
 */
function handleDonorActionToken(token, action) {
  if (!localStore.whatsapp_notifications) return null;

  const job = localStore.whatsapp_notifications.find((n) => n.action_token === token);
  if (!job) {
    throw new Error('Invalid or expired notification action link.');
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
      message = 'Your status has been updated to temporarily unavailable. You will not receive emergency alerts until you toggle availability.';
      break;

    case 'withdrawn_consent':
      if (donor) {
        donor.consent_to_contact = false;
        donor.consent_status = 'withdrawn';
        donor.consent_updated_at = new Date().toISOString();
        donor.updated_at = new Date().toISOString();
      }
      message = 'Your notification consent has been successfully withdrawn. You will receive no further messages.';
      break;

    case 'completed_donation':
      if (donor) {
        recordCompletedDonation(donor.id, new Date().toISOString().split('T')[0], 'donor_action');
      }
      if (request) {
        request.status = 'fulfilled';
        request.updated_at = new Date().toISOString();
      }
      message = 'Thank you for your lifesaving donation! Your 3-month recovery cooldown has been recorded.';
      break;

    default:
      throw new Error(`Unsupported donor response action: ${action}`);
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
async function sendViaWhatsAppCloudApi({ to, message, template }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp Cloud API credentials not configured.');
  }

  const cleanPhone = to.replace(/[^0-9]/g, '');
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'text',
    text: { preview_url: true, body: message }
  };

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
  generateManualWhatsAppLink,
  formatDonorNotificationMessage,
  dispatchRequestNotifications,
  handleDonorActionToken
};
