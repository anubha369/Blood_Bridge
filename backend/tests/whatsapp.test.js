const test = require('node:test');
const assert = require('node:assert');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const http = require('node:http');

const app = require('../src/app');
const config = require('../src/config');
const { localStore, searchNearbyWhatsAppDonors } = require('../src/db/db');
const {
  normalizePhoneForWhatsApp,
  generateManualWhatsAppLink,
  dispatchRequestNotifications,
  handleDonorActionToken
} = require('../src/services/whatsappService');

// Helper to execute in-memory HTTP requests against Express app
function testRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const payload = body ? JSON.stringify(body) : null;
      const reqHeaders = {
        'content-type': 'application/json',
        ...headers
      };
      if (payload) {
        reqHeaders['content-length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders
        },
        (res) => {
          let resData = '';
          res.on('data', (chunk) => {
            resData += chunk;
          });
          res.on('end', () => {
            server.close();
            let parsed = null;
            try {
              parsed = JSON.parse(resData);
            } catch (e) {
              parsed = resData;
            }
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          });
        }
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  });
}

// 1. Phone Normalization & Invalid Phone Tests
test('WhatsApp: Phone Normalization & Invalid Phone Rejection', () => {
  // Valid Indian 10-digit mobile
  assert.strictEqual(normalizePhoneForWhatsApp('9876543210'), '919876543210');
  // Formatted with spaces and country code
  assert.strictEqual(normalizePhoneForWhatsApp('+91 98765 43210'), '919876543210');
  // Leading zero format (09876543210)
  assert.strictEqual(normalizePhoneForWhatsApp('09876543210'), '919876543210');
  // Empty or invalid input
  assert.strictEqual(normalizePhoneForWhatsApp(''), '');
  assert.strictEqual(normalizePhoneForWhatsApp(null), '');

  // Manual deep link formatting
  const link = generateManualWhatsAppLink('9876543210', 'Emergency O+ needed');
  assert.ok(link.startsWith('https://wa.me/919876543210?text='));
  assert.ok(link.includes('Emergency%20O%2B%20needed'));
});

// 2. WhatsApp Donor Search: Opt-In, Opt-Out, and Cooldown Filtering
test('WhatsApp: searchNearbyWhatsAppDonors enforces opt-in, consent, and cooldown', async () => {
  const lat = 26.85;
  const lon = 80.95;

  // Donor 1: Opted in and eligible
  const d1 = {
    id: uuidv4(),
    name: 'Opted-In Donor',
    blood_group: 'B+',
    phone: '9876500001',
    city: 'Lucknow',
    latitude: 26.852,
    longitude: 80.951,
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: new Date('2026-10-01T10:00:00Z').toISOString(),
    whatsapp_opt_out_at: null,
    consent_to_contact: true,
    consent_status: 'consented',
    availability_status: 'available',
    verification_status: 'verified'
  };

  // Donor 2: Not opted in to WhatsApp (whatsapp_opt_in: false)
  const d2 = {
    id: uuidv4(),
    name: 'Opted-Out Donor',
    blood_group: 'B+',
    phone: '9876500002',
    city: 'Lucknow',
    latitude: 26.853,
    longitude: 80.952,
    whatsapp_opt_in: false,
    consent_to_contact: true,
    consent_status: 'consented',
    availability_status: 'available',
    verification_status: 'verified'
  };

  // Donor 3: Previously opted in, but later opted out (opt_out > opt_in)
  const d3 = {
    id: uuidv4(),
    name: 'Withdrawn WhatsApp Donor',
    blood_group: 'B+',
    phone: '9876500003',
    city: 'Lucknow',
    latitude: 26.851,
    longitude: 80.949,
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: new Date('2026-10-01T10:00:00Z').toISOString(),
    whatsapp_opt_out_at: new Date('2026-10-15T12:00:00Z').toISOString(), // Opt-out is newer!
    consent_to_contact: true,
    consent_status: 'consented',
    availability_status: 'available',
    verification_status: 'verified'
  };

  // Donor 4: Opted in, but currently under active 3-month cooldown
  const d4 = {
    id: uuidv4(),
    name: 'Cooldown Donor',
    blood_group: 'B+',
    phone: '9876500004',
    city: 'Lucknow',
    latitude: 26.854,
    longitude: 80.953,
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: new Date('2026-10-01T10:00:00Z').toISOString(),
    whatsapp_opt_out_at: null,
    consent_to_contact: true,
    consent_status: 'consented',
    availability_status: 'available',
    cooldown_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days remaining!
    verification_status: 'verified'
  };

  localStore.donors.push(d1, d2, d3, d4);

  const results = await searchNearbyWhatsAppDonors({
    latitude: lat,
    longitude: lon,
    radiusKm: 25,
    bloodGroup: 'B+'
  });

  const ids = results.map((r) => r.donor_id || r.id);
  assert.ok(ids.includes(d1.id), 'Opted-in donor must be included');
  assert.ok(!ids.includes(d2.id), 'Non-opted-in donor must be excluded');
  assert.ok(!ids.includes(d3.id), 'Withdrawn donor must be excluded');
  assert.ok(!ids.includes(d4.id), 'Cooldown donor must be excluded');
});

// 3. Notification Dispatch & Duplicate Prevention Tests
test('WhatsApp: dispatchRequestNotifications prevents duplicates and labels simulation', async () => {
  const reqId = uuidv4();
  const request = {
    id: reqId,
    patient_name: 'Emergency Patient',
    blood_group: 'AB-',
    units_needed: 2,
    hospital_name: 'KGMU Lucknow',
    city: 'Lucknow',
    status: 'searching'
  };

  const donor = {
    id: uuidv4(),
    name: 'Eligible WhatsApp Volunteer',
    blood_group: 'AB-',
    phone: '9876511111',
    whatsapp_opt_in: true,
    consent_to_contact: true,
    consent_status: 'consented',
    availability_status: 'available',
    verification_status: 'verified'
  };

  // 1. First dispatch: Job is queued/simulated
  const dispatch1 = await dispatchRequestNotifications({
    request,
    eligibleDonors: [donor],
    maxRecipients: 5
  });

  assert.strictEqual(dispatch1.success, true);
  assert.strictEqual(dispatch1.dispatched_count, 1);
  assert.strictEqual(dispatch1.simulated, true);
  assert.strictEqual(dispatch1.delivery_mode, 'simulated_development_mock');

  const firstJob = dispatch1.jobs[0];
  assert.strictEqual(firstJob.donor_id, donor.id);
  assert.strictEqual(firstJob.recipient_phone, '919876511111');
  assert.strictEqual(firstJob.status, 'simulated_sent');
  assert.strictEqual(request.status, 'notifications_queued');

  // 2. Duplicate dispatch attempt: Should reuse existing job and not create duplicate
  const dispatch2 = await dispatchRequestNotifications({
    request,
    eligibleDonors: [donor],
    maxRecipients: 5
  });

  assert.strictEqual(dispatch2.dispatched_count, 1);
  assert.strictEqual(dispatch2.jobs[0].action_token, firstJob.action_token);
});

// 4. Action Token Security: Expiry, One-Time/Idempotency, and No Request Auto-Fulfillment
test('WhatsApp: handleDonorActionToken handles expiry, idempotency, and prevents unverified fulfillment', async () => {
  const donorId = uuidv4();
  const reqId = uuidv4();

  const testDonor = {
    id: donorId,
    name: 'Action Test Donor',
    blood_group: 'O+',
    availability_status: 'available',
    consent_to_contact: true,
    whatsapp_opt_in: true,
    verification_status: 'verified'
  };
  localStore.donors.push(testDonor);

  const testRequest = {
    id: reqId,
    blood_group: 'O+',
    status: 'notifications_queued'
  };
  localStore.blood_requests.push(testRequest);

  // Expired token test (created 50 hours ago)
  const expiredToken = `token_expired_${Date.now()}`;
  localStore.whatsapp_notifications.push({
    id: uuidv4(),
    request_id: reqId,
    donor_id: donorId,
    action_token: expiredToken,
    created_at: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString()
  });

  assert.throws(
    () => handleDonorActionToken(expiredToken, 'accepted'),
    /expired/i
  );

  // Active token: Accept action
  const activeToken = `token_active_${Date.now()}`;
  localStore.whatsapp_notifications.push({
    id: uuidv4(),
    request_id: reqId,
    donor_id: donorId,
    action_token: activeToken,
    created_at: new Date().toISOString()
  });

  const acceptRes = handleDonorActionToken(activeToken, 'accepted');
  assert.strictEqual(acceptRes.success, true);
  assert.strictEqual(testRequest.status, 'responses_received');

  // Idempotent repeat: submitting 'accepted' again returns success without conflict
  const repeatRes = handleDonorActionToken(activeToken, 'accepted');
  assert.strictEqual(repeatRes.success, true);
  assert.ok(repeatRes.message.includes('already recorded'));

  // Single-use behavior: attempting to modify action to 'unavailable' throws
  assert.throws(
    () => handleDonorActionToken(activeToken, 'unavailable'),
    /already been used/i
  );

  // Security check: completed_donation reports donor cooldown but DOES NOT fulfill request alone
  const completeToken = `token_complete_${Date.now()}`;
  localStore.whatsapp_notifications.push({
    id: uuidv4(),
    request_id: reqId,
    donor_id: donorId,
    action_token: completeToken,
    created_at: new Date().toISOString()
  });

  testRequest.status = 'coordination_in_progress';
  const completeRes = handleDonorActionToken(completeToken, 'completed_donation');
  assert.strictEqual(completeRes.success, true);
  assert.strictEqual(testDonor.availability_status, 'recently_donated');
  assert.strictEqual(testDonor.donated_last_3_months, true);
  // Security enforcement: Request status must NOT be set to fulfilled by donor response alone
  assert.notStrictEqual(testRequest.status, 'fulfilled');
});

// 5. HTTP Routes Security: Missing Coordinates, Unauthorized Dispatch, and Privacy
test('WhatsApp API: Route Authorization, Missing Coordinate Validation, and Privacy Masking', async () => {
  const requesterUser = localStore.users.find((u) => u.role === 'requester');
  const otherUser = localStore.users.find((u) => u.role === 'donor');

  const requesterToken = jwt.sign({ id: requesterUser.id, role: 'requester' }, config.jwtSecret);
  const otherToken = jwt.sign({ id: otherUser.id, role: 'donor' }, config.jwtSecret);

  // 1. Missing coordinates validation error
  const reqNoCoords = {
    id: uuidv4(),
    requester_id: requesterUser.id,
    patient_name: 'Test No Coord',
    blood_group: 'B+',
    hospital_name: 'Remote Clinic',
    city: 'NonExistentUnknownCity12345',
    latitude: null,
    longitude: null,
    status: 'active'
  };
  localStore.blood_requests.push(reqNoCoords);

  const noCoordsRes = await testRequest(
    'POST',
    '/api/whatsapp/send-request-notifications',
    { request_id: reqNoCoords.id },
    { authorization: `Bearer ${requesterToken}` }
  );

  assert.strictEqual(noCoordsRes.status, 400);
  assert.ok(noCoordsRes.body.error.includes('Valid request coordinates'));

  // 2. Unauthorized user cannot dispatch notifications for someone else's request
  const validReq = {
    id: uuidv4(),
    requester_id: requesterUser.id,
    patient_name: 'Auth Patient',
    blood_group: 'B+',
    hospital_name: 'City Hospital',
    city: 'Lucknow',
    latitude: 26.85,
    longitude: 80.95,
    status: 'active'
  };
  localStore.blood_requests.push(validReq);

  const unauthorizedRes = await testRequest(
    'POST',
    '/api/whatsapp/send-request-notifications',
    { request_id: validReq.id },
    { authorization: `Bearer ${otherToken}` } // Other user!
  );

  assert.strictEqual(unauthorizedRes.status, 403);
  assert.ok(unauthorizedRes.body.error.includes('Unauthorized'));

  // 3. Unauthorized user cannot inspect notification jobs
  const unauthJobsRes = await testRequest(
    'GET',
    `/api/whatsapp/jobs/${validReq.id}`,
    null,
    { authorization: `Bearer ${otherToken}` }
  );
  assert.strictEqual(unauthJobsRes.status, 403);

  // 4. Privacy: Action token resolution endpoint does NOT leak patient contact or personal address
  const actionToken = `token_privacy_${Date.now()}`;
  localStore.whatsapp_notifications.push({
    id: uuidv4(),
    request_id: validReq.id,
    donor_id: uuidv4(),
    action_token: actionToken,
    created_at: new Date().toISOString()
  });

  const actionInfoRes = await testRequest('GET', `/api/whatsapp/action/${actionToken}`);
  assert.strictEqual(actionInfoRes.status, 200);
  assert.strictEqual(actionInfoRes.body.request.patient_blood_group, 'B+');
  assert.strictEqual(actionInfoRes.body.request.hospital_name, 'City Hospital');
  assert.strictEqual(actionInfoRes.body.request.patient_name, undefined);
  assert.strictEqual(actionInfoRes.body.request.contact_phone, undefined);
});

// 6. Meta WhatsApp Cloud API Webhook Verification & Status Callback
test('WhatsApp API: Meta Webhook Challenge Verification & Status Updates', async () => {
  // 1. Webhook Challenge Verification (GET)
  const challenge = 'test_hub_challenge_12345';
  const verifyToken = config.whatsappWebhookVerifyToken || 'bloodbridge_wa_webhook_verify_2026';
  config.whatsappWebhookVerifyToken = verifyToken;

  const validVerifyRes = await testRequest(
    'GET',
    `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`
  );
  assert.strictEqual(validVerifyRes.status, 200);
  assert.strictEqual(validVerifyRes.body, challenge);

  // Invalid verify token returns 403
  const badVerifyRes = await testRequest(
    'GET',
    `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=${challenge}`
  );
  assert.strictEqual(badVerifyRes.status, 403);

  // 2. Webhook Delivery Status Update (POST)
  const testMsgId = `wamid_test_${Date.now()}`;
  const testJob = {
    id: uuidv4(),
    request_id: uuidv4(),
    donor_id: uuidv4(),
    action_token: `token_${Date.now()}`,
    provider_message_id: testMsgId,
    status: 'sent',
    delivery_status: 'sent'
  };
  localStore.whatsapp_notifications.push(testJob);

  const statusPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                {
                  id: testMsgId,
                  status: 'delivered',
                  timestamp: '1793200000'
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const statusRes = await testRequest('POST', '/api/whatsapp/webhook', statusPayload);
  assert.strictEqual(statusRes.status, 200);
  assert.strictEqual(testJob.delivery_status, 'delivered');
  assert.strictEqual(testJob.status, 'delivered');

  // Monotonic check: Delayed 'sent' status cannot downgrade 'delivered'
  const delayedSentPayload = {
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ value: { statuses: [{ id: testMsgId, status: 'sent', timestamp: '1793199999' }] } }] }]
  };
  await testRequest('POST', '/api/whatsapp/webhook', delayedSentPayload);
  assert.strictEqual(testJob.delivery_status, 'delivered', 'Status must not downgrade from delivered to sent');

  // Signature check: When app secret is set, unsigned or bad signature is rejected
  const crypto = require('crypto');
  const testSecret = 'test_webhook_app_secret_2026';
  config.whatsappAppSecret = testSecret;

  const unsignedRes = await testRequest('POST', '/api/whatsapp/webhook', statusPayload);
  assert.strictEqual(unsignedRes.status, 401, 'Unsigned webhook payload must be rejected');

  const badSigRes = await testRequest('POST', '/api/whatsapp/webhook', statusPayload, {
    'x-hub-signature-256': 'sha256=bad_signature_hash'
  });
  assert.strictEqual(badSigRes.status, 401, 'Invalid signature must be rejected');

  const rawBody = JSON.stringify(statusPayload);
  const validSig = 'sha256=' + crypto.createHmac('sha256', testSecret).update(rawBody).digest('hex');
  const validSignedRes = await testRequest('POST', '/api/whatsapp/webhook', statusPayload, {
    'x-hub-signature-256': validSig
  });
  assert.strictEqual(validSignedRes.status, 200, 'Valid HMAC signature must be accepted');

  // Clean up config
  config.whatsappAppSecret = '';
});
