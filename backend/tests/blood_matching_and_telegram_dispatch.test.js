process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const {
  localStore,
  getTelegramNotificationByRequestAndDonor,
  saveTelegramNotification,
  updateTelegramNotificationResponse
} = require('../src/db/db');
const {
  isGroupCompatible,
  getCompatibleDonorGroups,
  evaluateDonorMatch,
  compareDonorsForRequest,
  rankCandidateDonors,
  DONOR_TO_RECIPIENT_MATRIX,
  REQUESTER_TO_DONOR_COMPATIBILITY
} = require('../src/services/matchingService');
const {
  sendEmergencyBloodRequestNotification,
  handleCallbackQuery
} = require('../src/services/telegramService');

// HTTP helper for testing API endpoints
function testRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const payload = body ? JSON.stringify(body) : null;
      const reqHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      };
      if (payload) {
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
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
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            server.close();
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve({ status: res.statusCode, body: parsed });
            } catch (_) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        }
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (payload) req.write(payload);
      req.end();
    });
  });
}

// =========================================================================
// PART 1: COMPREHENSIVE RED BLOOD CELL COMPATIBILITY FOR ALL 8 BLOOD GROUPS
// =========================================================================
test('Part 1: Red Blood Cell Compatibility for All 8 Blood Groups (Inverse Lookup)', () => {
  const allGroups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  // Expected matching mapping per specifications:
  const expectedMatches = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
  };

  for (const recipientGroup of allGroups) {
    const expected = expectedMatches[recipientGroup];
    const actual = getCompatibleDonorGroups(recipientGroup);

    // Verify compatible groups match expected exactly
    assert.deepStrictEqual(
      actual.sort(),
      [...expected].sort(),
      `Mismatch for recipient group ${recipientGroup}`
    );

    // Verify isGroupCompatible for every single blood group
    for (const donorGroup of allGroups) {
      const isCompat = isGroupCompatible(recipientGroup, donorGroup);
      if (expected.includes(donorGroup)) {
        assert.strictEqual(
          isCompat,
          true,
          `Expected donor ${donorGroup} to be compatible for recipient ${recipientGroup}`
        );
      } else {
        assert.strictEqual(
          isCompat,
          false,
          `Expected donor ${donorGroup} to be INCOMPATIBLE for recipient ${recipientGroup}`
        );
      }
    }
  }

  // Verify Forward Donor-to-Recipient Table
  assert.strictEqual(DONOR_TO_RECIPIENT_MATRIX['O-'].length, 8, 'O- must be universal donor');
  assert.strictEqual(DONOR_TO_RECIPIENT_MATRIX['AB+'].length, 1, 'AB+ can only donate RBCs to AB+');
});

// =========================================================================
// PART 2: DETERMINISTIC RANKING SYSTEM & INCOMPATIBLE EXCLUSION
// =========================================================================
test('Part 2: Deterministic Donor Ranking (Exact match first, compatible next, incompatible never)', () => {
  const requestBPlus = { blood_group: 'B+', units_needed: 1 };

  const testDonors = [
    {
      id: 'd-o-neg-close',
      name: 'O- Close Donor',
      blood_group: 'O-',
      distance_km: 1.0,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified'
    },
    {
      id: 'd-b-pos-far',
      name: 'B+ Far Exact Match Donor',
      blood_group: 'B+',
      distance_km: 15.0,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'self_reported'
    },
    {
      id: 'd-b-pos-close',
      name: 'B+ Close Exact Match Donor',
      blood_group: 'B+',
      distance_km: 3.0,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified'
    },
    {
      id: 'd-a-pos-incompatible',
      name: 'A+ Incompatible Donor',
      blood_group: 'A+',
      distance_km: 0.5,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified'
    },
    {
      id: 'd-ab-pos-incompatible',
      name: 'AB+ Incompatible Donor',
      blood_group: 'AB+',
      distance_km: 1.2,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified'
    }
  ];

  const ranked = rankCandidateDonors(testDonors, requestBPlus, 50);

  // 1. Incompatible groups (A+, AB+) must NEVER appear
  const returnedGroups = ranked.map((d) => d.blood_group);
  assert.ok(!returnedGroups.includes('A+'), 'A+ must never appear for B+ request');
  assert.ok(!returnedGroups.includes('AB+'), 'AB+ must never appear for B+ request');
  assert.strictEqual(ranked.length, 3, 'Only 3 compatible donors should be returned');

  // 2. Exact blood group matches (B+) must appear FIRST
  assert.strictEqual(ranked[0].blood_group, 'B+');
  assert.strictEqual(ranked[0].donor_id, 'd-b-pos-close'); // B+ close (3km) comes first
  assert.strictEqual(ranked[1].blood_group, 'B+');
  assert.strictEqual(ranked[1].donor_id, 'd-b-pos-far');   // B+ far (15km) comes second

  // 3. Other compatible groups (O-) appear afterward
  assert.strictEqual(ranked[2].blood_group, 'O-');
  assert.strictEqual(ranked[2].donor_id, 'd-o-neg-close');

  // 4. Medical disclaimer must be present
  assert.ok(ranked[0].disclaimer.includes('Preliminary red blood cell donor discovery only'));
  assert.ok(ranked[0].disclaimer.includes('authorized blood bank personnel'));
});

// =========================================================================
// PART 3: AVAILABILITY, CONSENT, COOLDOWN & DUPLICATE FILTERING
// =========================================================================
test('Part 2/3: Filtering for Availability, Consent, Cooldown & Deduplication', () => {
  const requestAPos = { blood_group: 'A+', units_needed: 2 };

  const mixedDonors = [
    {
      id: 'dup-1',
      name: 'Available A+ Donor',
      blood_group: 'A+',
      distance_km: 5.0,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified'
    },
    {
      id: 'dup-1', // Duplicate ID
      name: 'Duplicate Available A+ Donor',
      blood_group: 'A+',
      distance_km: 5.0,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified'
    },
    {
      id: 'unavailable-donor',
      name: 'Unavailable A+ Donor',
      blood_group: 'A+',
      distance_km: 2.0,
      availability_status: 'unavailable', // MUST BE EXCLUDED
      consent_to_contact: true,
      verification_status: 'verified'
    },
    {
      id: 'paused-donor',
      name: 'Paused A+ Donor',
      blood_group: 'A+',
      distance_km: 3.0,
      availability_status: 'paused', // MUST BE EXCLUDED
      consent_to_contact: true,
      verification_status: 'verified'
    },
    {
      id: 'withdrawn-donor',
      name: 'Consent Withdrawn A+ Donor',
      blood_group: 'A+',
      distance_km: 1.0,
      availability_status: 'available',
      consent_to_contact: false, // MUST BE EXCLUDED
      consent_status: 'withdrawn',
      verification_status: 'verified'
    },
    {
      id: 'cooldown-donor',
      name: 'Cooldown A+ Donor',
      blood_group: 'A+',
      distance_km: 2.5,
      availability_status: 'available',
      consent_to_contact: true,
      cooldown_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // In cooldown, MUST BE EXCLUDED
      verification_status: 'verified'
    },
    {
      id: 'self-reported-donor',
      name: 'Self-Reported A+ Volunteer',
      blood_group: 'A+',
      distance_km: 8.0,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'self_reported' // Must NOT be removed, but labeled accurately
    }
  ];

  const ranked = rankCandidateDonors(mixedDonors, requestAPos, 50);

  // Only the 2 valid donors (Available A+ Donor and Self-Reported A+ Volunteer) should remain
  assert.strictEqual(ranked.length, 2);
  assert.strictEqual(ranked[0].donor_id, 'dup-1');
  assert.strictEqual(ranked[0].verification_label, 'Verified Donor');

  assert.strictEqual(ranked[1].donor_id, 'self-reported-donor');
  assert.strictEqual(ranked[1].verification_status, 'self_reported');
  assert.strictEqual(ranked[1].verification_label, 'Self-Reported Volunteer');
});

// =========================================================================
// PART 4: TELEGRAM ERROR 1 & 2 REPAIR AND DISPATCH WORKFLOW
// =========================================================================
test('Part 4/5: Telegram Dispatch Endpoint & Error Repairs (/api/requests/:id/send-donor-request)', async () => {
  // Verify function export existence
  assert.strictEqual(typeof getTelegramNotificationByRequestAndDonor, 'function');
  assert.strictEqual(typeof saveTelegramNotification, 'function');

  // Setup test requester in localStore
  const requesterId = `test-requester-${Date.now()}`;
  const requesterUser = {
    id: requesterId,
    email: `requester_${Date.now()}@test.org`,
    name: 'Test Requester MD',
    role: 'requester',
    phone: '+91 99887 76655'
  };
  localStore.users = localStore.users || [];
  localStore.users.push(requesterUser);

  const requesterToken = jwt.sign(
    { id: requesterUser.id, role: requesterUser.role },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  // Setup test blood request
  const requestId = `test-req-${Date.now()}`;
  const testBloodRequest = {
    id: requestId,
    requester_id: requesterId,
    patient_name: 'Anita Verma',
    blood_group: 'B+',
    units_needed: 2,
    hospital_name: 'City Care Hospital',
    city: 'Lucknow',
    latitude: 26.8467,
    longitude: 80.9462,
    status: 'active',
    created_at: new Date().toISOString()
  };
  localStore.blood_requests = localStore.blood_requests || [];
  localStore.blood_requests.push(testBloodRequest);

  // Setup donor with linked Telegram
  const donorWithTgId = `donor-tg-${Date.now()}`;
  const donorWithTg = {
    id: donorWithTgId,
    name: 'Rohan Sharma',
    blood_group: 'B+',
    city: 'Lucknow',
    latitude: 26.8500,
    longitude: 80.9500,
    availability_status: 'available',
    consent_to_contact: true,
    telegram_chat_id: 123456789,
    telegram_opt_in: true,
    verification_status: 'verified'
  };
  localStore.donors = localStore.donors || [];
  localStore.donors.push(donorWithTg);

  // Donor with unlinked Telegram
  const donorNoTgId = `donor-no-tg-${Date.now()}`;
  const donorNoTg = {
    id: donorNoTgId,
    name: 'Vikram Singh',
    blood_group: 'B+',
    city: 'Lucknow',
    latitude: 26.8400,
    longitude: 80.9400,
    availability_status: 'available',
    consent_to_contact: true,
    telegram_chat_id: null, // Not linked
    telegram_opt_in: false,
    verification_status: 'verified'
  };
  localStore.donors.push(donorNoTg);

  // Incompatible donor
  const donorIncompatibleId = `donor-incompat-${Date.now()}`;
  const donorIncompatible = {
    id: donorIncompatibleId,
    name: 'Aman Patel',
    blood_group: 'A+', // Incompatible with B+
    city: 'Lucknow',
    latitude: 26.8450,
    longitude: 80.9450,
    availability_status: 'available',
    consent_to_contact: true,
    telegram_chat_id: 987654321,
    telegram_opt_in: true,
    verification_status: 'verified'
  };
  localStore.donors.push(donorIncompatible);

  // 1. Missing Token -> 401
  const resNoAuth = await testRequest('POST', `/api/requests/${requestId}/send-donor-request`, {
    donor_id: donorWithTgId
  });
  assert.strictEqual(resNoAuth.status, 401);
  assert.ok(resNoAuth.body.error.includes('Authentication required'));

  // 2. Incompatible Blood Group -> 400
  const resIncompat = await testRequest(
    'POST',
    `/api/requests/${requestId}/send-donor-request`,
    { donor_id: donorIncompatibleId },
    { Authorization: `Bearer ${requesterToken}` }
  );
  assert.strictEqual(resIncompat.status, 400);
  assert.ok(resIncompat.body.error.includes('not compatible'));

  // 3. Telegram Not Linked -> 400
  const resNoTg = await testRequest(
    'POST',
    `/api/requests/${requestId}/send-donor-request`,
    { donor_id: donorNoTgId },
    { Authorization: `Bearer ${requesterToken}` }
  );
  assert.strictEqual(resNoTg.status, 400);
  assert.ok(resNoTg.body.error.includes('Donor has not linked their Telegram account yet'));

  // 4. Other user request ownership check -> 403
  const otherUserToken = jwt.sign(
    { id: 'random-other-user', role: 'requester' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
  localStore.users.push({ id: 'random-other-user', name: 'Other Requester', role: 'requester' });
  const resUnauthOwner = await testRequest(
    'POST',
    `/api/requests/${requestId}/send-donor-request`,
    { donor_id: donorWithTgId },
    { Authorization: `Bearer ${otherUserToken}` }
  );
  assert.strictEqual(resUnauthOwner.status, 403);
  assert.ok(resUnauthOwner.body.error.includes('Unauthorized to manage this blood request'));

  // 5. Successful Dispatch to legitimate matched donor with linked Telegram
  const resSuccess = await testRequest(
    'POST',
    `/api/requests/${requestId}/send-donor-request`,
    { donor_id: donorWithTgId },
    { Authorization: `Bearer ${requesterToken}` }
  );
  assert.strictEqual(resSuccess.status, 200);
  assert.strictEqual(resSuccess.body.success, true);
  assert.ok(resSuccess.body.message.includes('Telegram request sent successfully'));

  // 6. Duplicate dispatch check -> 400
  const resDuplicate = await testRequest(
    'POST',
    `/api/requests/${requestId}/send-donor-request`,
    { donor_id: donorWithTgId },
    { Authorization: `Bearer ${requesterToken}` }
  );
  assert.strictEqual(resDuplicate.status, 400);
  assert.ok(resDuplicate.body.error.includes('A coordination request has already been sent'));
});

// =========================================================================
// PART 5: TELEGRAM ACCEPT & DECLINE CALLBACK QUERY HANDLING
// =========================================================================
test('Part 5: Telegram Callback Query (Accept & Decline Lifecycle)', async () => {
  const reqId = `tg-cb-req-${Date.now()}`;
  const dId = `tg-cb-donor-${Date.now()}`;
  const chatId = 88990011;

  localStore.blood_requests = localStore.blood_requests || [];
  localStore.blood_requests.push({
    id: reqId,
    patient_name: 'Rohit Gupta',
    blood_group: 'O+',
    status: 'active'
  });

  localStore.donors = localStore.donors || [];
  localStore.donors.push({
    id: dId,
    name: 'Suresh Kumar',
    blood_group: 'O+',
    telegram_chat_id: chatId,
    availability_status: 'available',
    consent_to_contact: true
  });

  // Save initial pending notification
  await saveTelegramNotification({
    request_id: reqId,
    donor_id: dId,
    telegram_chat_id: chatId,
    message_text: 'Urgent blood request',
    status: 'sent'
  });

  // 1. Process Accept Callback Query
  const acceptUpdate = {
    callback_query: {
      id: 'cb-101',
      from: { id: chatId, first_name: 'Suresh' },
      message: { message_id: 501, chat: { id: chatId }, text: 'Urgent blood request' },
      data: `accept_req_${reqId}`
    }
  };

  await handleCallbackQuery(acceptUpdate.callback_query);

  // Verify notification was marked accepted
  const notifAfterAccept = await getTelegramNotificationByRequestAndDonor(reqId, dId);
  assert.strictEqual(notifAfterAccept.donor_response, 'accepted');

  // Verify blood request status updated to 'responses_received'
  const br = localStore.blood_requests.find((r) => r.id === reqId);
  assert.strictEqual(br.status, 'responses_received');

  // 2. Duplicate callback query rejected
  let duplicateRejectedMsg = null;
  const duplicateUpdate = {
    callback_query: {
      id: 'cb-102',
      from: { id: chatId, first_name: 'Suresh' },
      message: { message_id: 501, chat: { id: chatId }, text: 'Urgent blood request' },
      data: `accept_req_${reqId}`
    }
  };
  // Calling duplicate callback query should be gracefully handled without crashing
  await handleCallbackQuery(duplicateUpdate.callback_query);
  const notifAfterDup = await getTelegramNotificationByRequestAndDonor(reqId, dId);
  assert.strictEqual(notifAfterDup.donor_response, 'accepted');
});
