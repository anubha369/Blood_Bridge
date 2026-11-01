process.env.NODE_ENV = 'test';
process.env.TELEGRAM_MOCK = 'true';

const test = require('node:test');
const assert = require('node:assert');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const http = require('node:http');

const app = require('../src/app');
const config = require('../src/config');
const {
  localStore,
  searchNearbyTelegramDonors,
  getDonorByTelegramChatId,
  saveTelegramLinkCode,
  saveTelegramNotification
} = require('../src/db/db');
const {
  generateTelegramLinkCode,
  validateAndLinkTelegramAccount,
  setTelegramConsent,
  unlinkTelegramAccount,
  sendEmergencyBloodRequestNotification,
  dispatchEmergencyRequestNotifications,
  handleTelegramMessage,
  handleTelegramCallbackQuery,
  handleTelegramUpdate,
  maskChatId,
  mockSentMessages,
  BOT_USERNAME
} = require('../src/services/telegramService');

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

function makeAuthToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

test('Telegram: Configuration and Masking Helpers', () => {
  assert.ok(BOT_USERNAME, 'Bot username must be configured');
  assert.strictEqual(maskChatId(''), null);
  assert.strictEqual(maskChatId(null), null);
  assert.strictEqual(maskChatId('123'), '***123');
  assert.strictEqual(maskChatId('987654321'), '98****21');
});

test('Telegram: Cryptographic One-Time Code Generation and Expiry Validation', async () => {
  const donorId = uuidv4();
  localStore.donors.push({
    id: donorId,
    user_id: uuidv4(),
    name: 'Secure Donor',
    blood_group: 'O+',
    city: 'Jaipur',
    latitude: 26.9124,
    longitude: 75.7873,
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified'
  });

  // 1. Generate code
  const codeResult = await generateTelegramLinkCode(donorId, 15);
  assert.ok(codeResult.code, 'Should generate a raw linking code');
  assert.strictEqual(codeResult.code.length, 32, 'Raw code should be 32 hex chars (16 bytes)');
  assert.ok(codeResult.deep_link.includes(`start=${codeResult.code}`), 'Deep link must contain raw code');
  assert.ok(new Date(codeResult.expires_at) > new Date(), 'Expiry should be in the future');

  // Verify hash storage in DB / localStore
  const codeRecord = localStore.telegram_link_codes.find((c) => c.donor_id === donorId);
  assert.ok(codeRecord, 'Record must exist in store');
  assert.notStrictEqual(codeRecord.code_hash, codeResult.code, 'DB must store hash, not raw code');

  // 2. Reject non-existent code
  await assert.rejects(
    async () => {
      await validateAndLinkTelegramAccount('nonexistentcode1234567890abcdef', { id: 111111111 });
    },
    /Invalid linking code/
  );

  // 3. Reject expired code
  const expiredCode = 'expiredcode12345678901234567890';
  const crypto = require('crypto');
  const expiredHash = crypto.createHash('sha256').update(expiredCode).digest('hex');
  localStore.telegram_link_codes.push({
    id: uuidv4(),
    donor_id: donorId,
    code_hash: expiredHash,
    expires_at: new Date(Date.now() - 60000).toISOString(),
    used_at: null
  });

  await assert.rejects(
    async () => {
      await validateAndLinkTelegramAccount(expiredCode, { id: 222222222 });
    },
    /expired/
  );
});

test('Telegram: Link Account Flow and Prevent Code Reuse & Multi-Donor Collision', async () => {
  const donorId1 = uuidv4();
  const donorId2 = uuidv4();

  const donor1 = {
    id: donorId1,
    user_id: uuidv4(),
    name: 'Aarav Sharma',
    blood_group: 'A+',
    city: 'Jaipur',
    latitude: 26.9124,
    longitude: 75.7873,
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified',
    telegram_chat_id: null,
    telegram_opt_in: false
  };

  const donor2 = {
    id: donorId2,
    user_id: uuidv4(),
    name: 'Kunal Verma',
    blood_group: 'B+',
    city: 'Jaipur',
    latitude: 26.9124,
    longitude: 75.7873,
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified',
    telegram_chat_id: null,
    telegram_opt_in: false
  };

  localStore.donors.push(donor1, donor2);

  const code1 = await generateTelegramLinkCode(donorId1, 15);
  const testChatId = 777666555;

  // Link donor1
  const linkRes = await validateAndLinkTelegramAccount(code1.code, {
    id: testChatId,
    username: 'aarav_sharma'
  });
  assert.ok(linkRes.success);
  assert.strictEqual(donor1.telegram_chat_id, testChatId);
  assert.strictEqual(donor1.telegram_opt_in, true);
  assert.ok(donor1.telegram_linked_at);

  // Attempting to reuse the same code must fail
  await assert.rejects(
    async () => {
      await validateAndLinkTelegramAccount(code1.code, { id: testChatId });
    },
    /already been used/
  );

  // Attempting to link the same Telegram chat to a DIFFERENT donor must fail
  const code2 = await generateTelegramLinkCode(donorId2, 15);
  await assert.rejects(
    async () => {
      await validateAndLinkTelegramAccount(code2.code, { id: testChatId });
    },
    /already linked to another BloodBridge donor profile/
  );
});

test('Telegram: Bot Commands (/start, /status, /stop, /unlink)', async () => {
  mockSentMessages.length = 0;
  const testChatId = 888999111;

  // 1. /start without code -> Welcome message
  await handleTelegramMessage({
    chat: { id: testChatId },
    text: '/start'
  });
  assert.strictEqual(mockSentMessages.length, 1);
  assert.ok(mockSentMessages[0].payload.text.includes('Welcome to BloodBridge'));

  // 2. /status when unlinked
  mockSentMessages.length = 0;
  await handleTelegramMessage({
    chat: { id: testChatId },
    text: '/status'
  });
  assert.strictEqual(mockSentMessages.length, 1);
  assert.ok(mockSentMessages[0].payload.text.includes('Status: Not Linked'));

  // 3. Link account via /start <code>
  const donorId = uuidv4();
  const donor = {
    id: donorId,
    user_id: uuidv4(),
    name: 'Pooja Nair',
    blood_group: 'AB+',
    city: 'Jaipur',
    latitude: 26.9124,
    longitude: 75.7873,
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified',
    telegram_chat_id: null,
    telegram_opt_in: false
  };
  localStore.donors.push(donor);

  const codeData = await generateTelegramLinkCode(donorId);
  mockSentMessages.length = 0;
  await handleTelegramMessage({
    chat: { id: testChatId },
    text: `/start ${codeData.code}`,
    from: { username: 'pooja_nair' }
  });
  assert.strictEqual(mockSentMessages.length, 1);
  assert.ok(mockSentMessages[0].payload.text.includes('Telegram Account Linked Successfully'));
  assert.strictEqual(donor.telegram_chat_id, testChatId);
  assert.strictEqual(donor.telegram_opt_in, true);

  // 4. /status when linked -> Active status
  mockSentMessages.length = 0;
  await handleTelegramMessage({
    chat: { id: testChatId },
    text: '/status'
  });
  assert.strictEqual(mockSentMessages.length, 1);
  assert.ok(mockSentMessages[0].payload.text.includes('Pooja Nair'));
  assert.ok(mockSentMessages[0].payload.text.includes('🟢 Active'));

  // 5. /stop -> Pauses notifications
  mockSentMessages.length = 0;
  await handleTelegramMessage({
    chat: { id: testChatId },
    text: '/stop'
  });
  assert.strictEqual(mockSentMessages.length, 1);
  assert.ok(mockSentMessages[0].payload.text.includes('Notifications Paused'));
  assert.strictEqual(donor.telegram_opt_in, false);
  assert.ok(donor.telegram_opt_out_at);

  // 6. /unlink -> Disconnects account
  mockSentMessages.length = 0;
  await handleTelegramMessage({
    chat: { id: testChatId },
    text: '/unlink'
  });
  assert.strictEqual(mockSentMessages.length, 1);
  assert.ok(mockSentMessages[0].payload.text.includes('Account Disconnected'));
  assert.strictEqual(donor.telegram_chat_id, null);
  assert.strictEqual(donor.telegram_opt_in, false);

  // 7. Command variations: /start@BloodBridgeVisionXBot, plain "start", and greeting "hello"
  mockSentMessages.length = 0;
  await handleTelegramMessage({
    chat: { id: testChatId },
    text: '/start@BloodBridgeVisionXBot'
  });
  assert.strictEqual(mockSentMessages.length, 1);
  assert.ok(mockSentMessages[0].payload.text.includes('Welcome to BloodBridge'));

  mockSentMessages.length = 0;
  await handleTelegramMessage({
    chat: { id: testChatId },
    text: 'start'
  });
  assert.strictEqual(mockSentMessages.length, 1);
  assert.ok(mockSentMessages[0].payload.text.includes('Welcome to BloodBridge'));

  mockSentMessages.length = 0;
  await handleTelegramMessage({
    chat: { id: testChatId },
    text: 'hello'
  });
  assert.strictEqual(mockSentMessages.length, 1);
  assert.ok(mockSentMessages[0].payload.text.includes('Welcome to BloodBridge'));
});

test('Telegram: Emergency Message Formatting and Duplicate Alert Prevention', async () => {
  mockSentMessages.length = 0;
  const donorId = uuidv4();
  const testChatId = 999888777;

  const donor = {
    id: donorId,
    user_id: uuidv4(),
    name: 'Suresh Patel',
    blood_group: 'O-',
    city: 'Jaipur',
    latitude: 26.8978,
    longitude: 75.8167,
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified',
    telegram_chat_id: testChatId,
    telegram_opt_in: true
  };
  localStore.donors.push(donor);

  const bloodRequest = {
    id: uuidv4(),
    requester_id: uuidv4(),
    blood_group: 'O-',
    hospital_name: 'Apex Super Specialty Hospital',
    city: 'Jaipur',
    latitude: 26.8978,
    longitude: 75.8167,
    units_needed: 2,
    urgency: 'emergency',
    status: 'active'
  };
  localStore.blood_requests.push(bloodRequest);

  // 1. Send first notification -> Success
  const result1 = await sendEmergencyBloodRequestNotification(donor, bloodRequest);
  assert.strictEqual(result1.success, true);
  assert.strictEqual(mockSentMessages.length, 1);

  const sentPayload = mockSentMessages[0].payload;
  assert.ok(sentPayload.text.includes('BLOODBRIDGE EMERGENCY ALERT'));
  assert.ok(sentPayload.text.includes('Apex Super Specialty Hospital'));
  assert.ok(sentPayload.text.includes('Clinical Safety Disclaimer'));
  assert.ok(sentPayload.reply_markup.inline_keyboard.length > 0);
  assert.strictEqual(sentPayload.reply_markup.inline_keyboard[0][0].text, '✅ Accept Request');
  assert.strictEqual(sentPayload.reply_markup.inline_keyboard[0][1].text, '❌ Decline Request');

  // 2. Send second notification to same donor for same request -> Skipped duplicate
  const result2 = await sendEmergencyBloodRequestNotification(donor, bloodRequest);
  assert.strictEqual(result2.success, true);
  assert.strictEqual(result2.skipped, true);
  assert.strictEqual(result2.reason, 'duplicate_suppression');
  assert.strictEqual(mockSentMessages.length, 1, 'Should NOT send duplicate message');

  // 3. If donor opts out -> Send must be rejected
  donor.telegram_opt_in = false;
  const request2 = { ...bloodRequest, id: uuidv4() };
  localStore.blood_requests.push(request2);

  const resultOptOut = await sendEmergencyBloodRequestNotification(donor, request2);
  assert.strictEqual(resultOptOut.success, false);
  assert.ok(resultOptOut.error.includes('not opted into Telegram notifications'));
});

test('Telegram: Interactive Callback Query Handling (Accept & Decline)', async () => {
  mockSentMessages.length = 0;
  const donorId = uuidv4();
  const testChatId = 555444333;
  const requestId = uuidv4();

  const donor = {
    id: donorId,
    user_id: uuidv4(),
    name: 'Vipin Meena',
    phone: '+91 98765 44444',
    blood_group: 'B+',
    city: 'Jaipur',
    latitude: 26.8978,
    longitude: 75.8167,
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified',
    telegram_chat_id: testChatId,
    telegram_opt_in: true
  };
  localStore.donors.push(donor);

  const bloodRequest = {
    id: requestId,
    requester_id: uuidv4(),
    blood_group: 'B+',
    hospital_name: 'Metro Mas Hospital',
    city: 'Jaipur',
    units_needed: 1,
    urgency: 'emergency',
    status: 'active'
  };
  localStore.blood_requests.push(bloodRequest);

  // Send initial notification
  await sendEmergencyBloodRequestNotification(donor, bloodRequest);

  // 1. Donor clicks "Accept Request"
  mockSentMessages.length = 0;
  await handleTelegramCallbackQuery({
    id: 'query_123',
    data: `accept_req_${requestId}`,
    message: {
      message_id: 9901,
      chat: { id: testChatId },
      text: 'Emergency request original text'
    }
  });

  // Verify answerCallbackQuery was called
  const answerCall = mockSentMessages.find((m) => m.method === 'answerCallbackQuery');
  assert.ok(answerCall);
  assert.ok(answerCall.payload.text.includes('Lifesaving willingness confirmed'));

  // Verify editMessageText was called with acceptance confirmation
  const editCall = mockSentMessages.find((m) => m.method === 'editMessageText');
  assert.ok(editCall);
  assert.ok(editCall.payload.text.includes('Response Recorded: ACCEPTED'));
  assert.ok(editCall.payload.text.includes('Clinical Cross-Matching Note'));

  // 2. Duplicate response attempt must be blocked
  mockSentMessages.length = 0;
  await handleTelegramCallbackQuery({
    id: 'query_124',
    data: `accept_req_${requestId}`,
    message: {
      message_id: 9901,
      chat: { id: testChatId },
      text: 'Emergency request original text'
    }
  });
  const dupCall = mockSentMessages.find((m) => m.method === 'answerCallbackQuery');
  assert.ok(dupCall);
  assert.ok(dupCall.payload.text.includes('already ACCEPTED'));

  // 3. Verify that accepted-donors endpoint shows this donor
  const requester = { id: bloodRequest.requester_id, email: 'requester@test.org', role: 'requester', name: 'Requester' };
  localStore.users.push(requester);
  const token = makeAuthToken(requester);

  const acceptedRes = await testRequest(
    'GET',
    `/api/requests/${requestId}/accepted-donors`,
    null,
    { authorization: `Bearer ${token}` }
  );
  assert.strictEqual(acceptedRes.status, 200);
  assert.strictEqual(acceptedRes.body.count, 1);
  assert.strictEqual(acceptedRes.body.donors[0].donor_id, donorId);
  assert.strictEqual(acceptedRes.body.donors[0].name, 'Vipin Meena');
  // Privacy check: phone is hidden before selection
  assert.strictEqual(acceptedRes.body.donors[0].phone, undefined);

  // Select donor and verify phone is revealed
  const selectRes = await testRequest(
    'POST',
    `/api/requests/${requestId}/select-donor`,
    { donor_id: donorId },
    { authorization: `Bearer ${token}` }
  );
  assert.strictEqual(selectRes.status, 200);
  assert.strictEqual(selectRes.body.selected_donor.phone, '+91 98765 44444');
});

test('Telegram API Endpoints: /api/telegram/link-code, /status, /consent, /unlink', async () => {
  const userId = uuidv4();
  const donorId = uuidv4();
  const user = {
    id: userId,
    email: 'telegram_donor@test.org',
    role: 'donor',
    name: 'Telegram Volunteer'
  };
  const token = makeAuthToken(user);

  localStore.users.push(user);
  localStore.donors.push({
    id: donorId,
    user_id: userId,
    name: 'Telegram Volunteer',
    blood_group: 'B-',
    city: 'Jaipur',
    latitude: 26.9124,
    longitude: 75.7873,
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified',
    telegram_chat_id: null,
    telegram_opt_in: false
  });

  // 1. GET /api/telegram/status -> Unlinked
  const statusRes1 = await testRequest('GET', '/api/telegram/status', null, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(statusRes1.status, 200);
  assert.strictEqual(statusRes1.body.linked, false);
  assert.strictEqual(statusRes1.body.donor_registered, true);

  // 2. POST /api/telegram/link-code -> Generates code
  const codeRes = await testRequest('POST', '/api/telegram/link-code', {}, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(codeRes.status, 201);
  assert.ok(codeRes.body.code);
  assert.ok(codeRes.body.deep_link);
  assert.strictEqual(codeRes.body.expires_in_minutes, 15);

  // Link via bot message
  const testChatId = 123456789;
  await handleTelegramMessage({
    chat: { id: testChatId },
    text: `/start ${codeRes.body.code}`,
    from: { username: 'tg_volunteer' }
  });

  // 3. GET /api/telegram/status -> Linked
  const statusRes2 = await testRequest('GET', '/api/telegram/status', null, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(statusRes2.status, 200);
  assert.strictEqual(statusRes2.body.linked, true);
  assert.strictEqual(statusRes2.body.telegram_username, 'tg_volunteer');
  assert.ok(statusRes2.body.telegram_chat_id_masked.includes('****'));
  assert.strictEqual(statusRes2.body.telegram_opt_in, true);

  // 4. POST /api/telegram/consent -> Toggle off
  const consentRes1 = await testRequest(
    'POST',
    '/api/telegram/consent',
    { enabled: false },
    { authorization: `Bearer ${token}` }
  );
  assert.strictEqual(consentRes1.status, 200);
  assert.strictEqual(consentRes1.body.telegram_opt_in, false);

  // 5. POST /api/telegram/unlink -> Unlink
  const unlinkRes = await testRequest(
    'POST',
    '/api/telegram/unlink',
    {},
    { authorization: `Bearer ${token}` }
  );
  assert.strictEqual(unlinkRes.status, 200);

  const statusRes3 = await testRequest('GET', '/api/telegram/status', null, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(statusRes3.body.linked, false);
});

test('Telegram: Decline Callback and Inactive Request Handling', async () => {
  mockSentMessages.length = 0;
  const donorId = uuidv4();
  const testChatId = 666777888;
  const requestId = uuidv4();

  const donor = {
    id: donorId,
    user_id: uuidv4(),
    name: 'Rohit Joshi',
    phone: '+91 98765 77777',
    blood_group: 'A-',
    city: 'Jaipur',
    latitude: 26.8978,
    longitude: 75.8167,
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified',
    telegram_chat_id: testChatId,
    telegram_opt_in: true
  };
  localStore.donors.push(donor);

  const bloodRequest = {
    id: requestId,
    requester_id: uuidv4(),
    blood_group: 'A-',
    hospital_name: 'Santokba Durlabhji Memorial Hospital',
    city: 'Jaipur',
    units_needed: 1,
    urgency: 'emergency',
    status: 'active'
  };
  localStore.blood_requests.push(bloodRequest);

  await sendEmergencyBloodRequestNotification(donor, bloodRequest);

  // 1. Donor clicks "Decline Request"
  mockSentMessages.length = 0;
  await handleTelegramCallbackQuery({
    id: 'query_decline_1',
    data: `decline_req_${requestId}`,
    message: {
      message_id: 8801,
      chat: { id: testChatId },
      text: 'Original emergency message'
    }
  });

  const answerCall = mockSentMessages.find((m) => m.method === 'answerCallbackQuery');
  assert.ok(answerCall);
  assert.ok(answerCall.payload.text.includes('Decline recorded'));

  const editCall = mockSentMessages.find((m) => m.method === 'editMessageText');
  assert.ok(editCall);
  assert.ok(editCall.payload.text.includes('Response Recorded: DECLINED'));

  // 2. Concluded / Fulfilled request handling
  bloodRequest.status = 'fulfilled';
  mockSentMessages.length = 0;
  await handleTelegramCallbackQuery({
    id: 'query_fulfilled_1',
    data: `accept_req_${requestId}`,
    message: {
      message_id: 8801,
      chat: { id: testChatId },
      text: 'Original message'
    }
  });

  const inactiveCall = mockSentMessages.find((m) => m.method === 'answerCallbackQuery');
  assert.ok(inactiveCall);
  assert.ok(inactiveCall.payload.text.includes('no longer active'));
});

test('Telegram API: POST /api/telegram/send-request-notifications and Webhook', async () => {
  mockSentMessages.length = 0;
  const requesterId = uuidv4();
  const requester = {
    id: requesterId,
    email: 'requester_tg@test.org',
    role: 'requester',
    name: 'Emergency Requester'
  };
  localStore.users.push(requester);
  const token = makeAuthToken(requester);

  const unauthorizedUser = {
    id: uuidv4(),
    email: 'other_user@test.org',
    role: 'requester',
    name: 'Other Requester'
  };
  localStore.users.push(unauthorizedUser);
  const unauthorizedToken = makeAuthToken(unauthorizedUser);

  const donorId = uuidv4();
  const testChatId = 444333222;
  const donor = {
    id: donorId,
    user_id: uuidv4(),
    name: 'Nearby Emergency Donor',
    blood_group: 'AB-',
    city: 'Jaipur',
    latitude: 26.9124,
    longitude: 75.7873,
    availability_status: 'available',
    consent_to_contact: true,
    consent_status: 'consented',
    verification_status: 'verified',
    telegram_chat_id: testChatId,
    telegram_opt_in: true,
    telegram_opt_in_at: new Date().toISOString()
  };
  localStore.donors.push(donor);

  const bloodRequest = {
    id: uuidv4(),
    requester_id: requesterId,
    patient_name: 'Critical Patient',
    blood_group: 'AB-',
    hospital_name: 'Fortis Escorts Hospital',
    city: 'Jaipur',
    latitude: 26.8532,
    longitude: 75.8239,
    units_needed: 2,
    urgency: 'emergency',
    status: 'active'
  };
  localStore.blood_requests.push(bloodRequest);

  // 1. Missing request_id -> 400
  const badRes1 = await testRequest(
    'POST',
    '/api/telegram/send-request-notifications',
    {},
    { authorization: `Bearer ${token}` }
  );
  assert.strictEqual(badRes1.status, 400);

  // 2. Unauthorized user -> 403
  const unauthRes = await testRequest(
    'POST',
    '/api/telegram/send-request-notifications',
    { request_id: bloodRequest.id },
    { authorization: `Bearer ${unauthorizedToken}` }
  );
  assert.strictEqual(unauthRes.status, 403);

  // 3. Valid owner dispatches alerts -> 200
  const dispatchRes = await testRequest(
    'POST',
    '/api/telegram/send-request-notifications',
    { request_id: bloodRequest.id, radius_km: 30 },
    { authorization: `Bearer ${token}` }
  );
  assert.strictEqual(dispatchRes.status, 200);
  assert.strictEqual(dispatchRes.body.success, true);
  assert.ok(dispatchRes.body.sent_count >= 1);

  // 4. Webhook endpoint POST /api/telegram/webhook returns 200
  const webhookRes = await testRequest(
    'POST',
    '/api/telegram/webhook',
    {
      update_id: 999999,
      message: {
        chat: { id: testChatId },
        text: '/status'
      }
    }
  );
  assert.strictEqual(webhookRes.status, 200);
  assert.strictEqual(webhookRes.body.ok, true);
});

