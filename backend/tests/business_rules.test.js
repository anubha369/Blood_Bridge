const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { localStore } = require('../src/db/db');
const { calculateCooldownDate, isDonorEligibleForNotification, recordCompletedDonation, checkAndUpdateCooldownExpiry } = require('../src/services/cooldownService');
const { awardCreditPoints, getUserCreditBalance } = require('../src/services/creditService');
const { processGoogleFormSubmission, validateGoogleFormPayload } = require('../src/services/googleFormService');
const { dispatchRequestNotifications, handleDonorActionToken, generateManualWhatsAppLink } = require('../src/services/whatsappService');
const { parseRequestDeterministically } = require('../src/services/groqService');
const config = require('../src/config');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Helper to make lightweight in-memory HTTP requests to Express app
async function testRequest(method, path, body = null, headers = {}) {
  const http = require('http');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const url = `http://127.0.0.1:${port}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const json = await res.json();
  await new Promise((resolve) => server.close(resolve));
  return { status: res.status, body: json };
}

// 1. Valid and Invalid Donor Registration
test('Rule 1: Valid and Invalid Donor Registration', async () => {
  // Invalid blood group
  const invalidPayload = {
    name: 'Test Donor',
    blood_group: 'Z+',
    city: 'Lucknow',
    consent_to_contact: true
  };
  const valRes = validateGoogleFormPayload(invalidPayload);
  assert.strictEqual(valRes.valid, false);
  assert.ok(valRes.error.includes('Invalid blood group'));

  // Valid registration
  const validPayload = {
    name: 'Alok Nath',
    blood_group: 'O+',
    city: 'Kanpur',
    consent_to_contact: true
  };
  const valSuccess = validateGoogleFormPayload(validPayload);
  assert.strictEqual(valSuccess.valid, true);
  assert.strictEqual(valSuccess.data.blood_group, 'O+');
});

// 2. Google Form Duplicate Submissions (Idempotency)
test('Rule 2: Google Form Duplicate Submissions handled idempotently', async () => {
  const subId = `test_sub_${Date.now()}`;
  const payload = {
    name: 'Kavita Singh',
    blood_group: 'A+',
    city: 'Varanasi',
    phone: '+91 98765 11111',
    consent_to_contact: true,
    submission_id: subId
  };

  // First submission
  const firstRes = await processGoogleFormSubmission(payload, config.googleFormWebhookSecret);
  assert.strictEqual(firstRes.success, true);
  assert.strictEqual(firstRes.action, 'created');

  // Retry with same submission_id
  const duplicateRes = await processGoogleFormSubmission(payload, config.googleFormWebhookSecret);
  assert.strictEqual(duplicateRes.success, true);
  assert.strictEqual(duplicateRes.action, 'skipped_duplicate');
});

// 3. Consent Withdrawal & Immediate Search Suppression
test('Rule 3: Consent Withdrawal suppresses donor from matching', async () => {
  const testDonor = {
    id: uuidv4(),
    name: 'Consent Test Donor',
    blood_group: 'B+',
    city: 'Lucknow',
    availability_status: 'available',
    consent_to_contact: true,
    consent_status: 'consented',
    verification_status: 'verified'
  };

  assert.strictEqual(isDonorEligibleForNotification(testDonor), true);

  // Withdraw consent
  testDonor.consent_to_contact = false;
  testDonor.consent_status = 'withdrawn';
  assert.strictEqual(isDonorEligibleForNotification(testDonor), false);
});

// 4. Recent Donation and 3-Month Cooldown Suppression
test('Rule 4: Recent donation triggers 3-month cooldown suppression', () => {
  // Test month-end rollover: Nov 30 + 3 months -> Feb 28
  const novDate = '2025-11-30';
  const novCooldown = calculateCooldownDate(novDate, 3);
  assert.strictEqual(novCooldown.getUTCMonth(), 1); // February (0-indexed: 1)
  assert.strictEqual(novCooldown.getUTCDate(), 28); // 2026 is non-leap year

  // Test standard date: May 10 + 3 months -> Aug 10
  const mayDate = '2026-05-10';
  const mayCooldown = calculateCooldownDate(mayDate, 3);
  assert.strictEqual(mayCooldown.getUTCMonth(), 7); // August (0-indexed: 7)
  assert.strictEqual(mayCooldown.getUTCDate(), 10);

  // Donor with active future cooldown must be suppressed
  const activeCooldownDonor = {
    id: uuidv4(),
    name: 'Cooldown Donor',
    blood_group: 'B+',
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified',
    cooldown_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days in future
  };

  assert.strictEqual(isDonorEligibleForNotification(activeCooldownDonor), false);
});

// 5. Missing Donation Date Handling (No Fabricated Dates)
test('Rule 5: Missing donation date does not invent expiration date', async () => {
  const payload = {
    name: 'Rohan Mehra',
    blood_group: 'O-',
    city: 'Agra',
    consent_to_contact: true,
    donated_last_3_months: true, // Confirms donating recently
    last_donation_date: null,     // But date is unknown
    submission_id: `gform_missing_date_${Date.now()}`
  };

  const res = await processGoogleFormSubmission(payload, config.googleFormWebhookSecret);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.cooldown_until, null); // Zero fabricated dates!
  assert.strictEqual(res.availability_status, 'unavailable'); // Suppressed until confirmed

  const donor = localStore.donors.find((d) => d.id === res.donor_id);
  assert.strictEqual(isDonorEligibleForNotification(donor), false);
});

// 6. Cooldown Expiry and Eligibility Recovery
test('Rule 6: Cooldown expiry restores notification eligibility', () => {
  const pastCooldownDonor = {
    id: uuidv4(),
    name: 'Recovered Donor',
    blood_group: 'AB+',
    availability_status: 'recently_donated',
    consent_to_contact: true,
    verification_status: 'verified',
    donated_last_3_months: true,
    cooldown_until: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  };

  checkAndUpdateCooldownExpiry(pastCooldownDonor);
  assert.strictEqual(pastCooldownDonor.availability_status, 'available');
  assert.strictEqual(pastCooldownDonor.donated_last_3_months, false);
  assert.strictEqual(isDonorEligibleForNotification(pastCooldownDonor), true);
});

// 7. Donor Becoming Unavailable after Notification Creation
test('Rule 7: Donor can toggle status to unavailable via action token', () => {
  const donorId = uuidv4();
  const testDonor = {
    id: donorId,
    name: 'Dynamic Status Donor',
    blood_group: 'A+',
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified'
  };
  localStore.donors.push(testDonor);

  const testToken = `test_action_${Date.now()}`;
  localStore.whatsapp_notifications.push({
    id: uuidv4(),
    request_id: uuidv4(),
    donor_id: donorId,
    action_token: testToken,
    status: 'sent',
    donor_response: null
  });

  const result = handleDonorActionToken(testToken, 'unavailable');
  assert.strictEqual(result.success, true);
  assert.strictEqual(testDonor.availability_status, 'unavailable');
  assert.strictEqual(isDonorEligibleForNotification(testDonor), false);
});

// 8. Duplicate Notification Prevention
test('Rule 8: Notification dispatch does not queue duplicate alerts to same donor', async () => {
  const reqId = uuidv4();
  const request = {
    id: reqId,
    patient_name: 'Patient A',
    blood_group: 'B+',
    units_needed: 1,
    hospital_name: 'KGMU Lucknow',
    city: 'Lucknow',
    status: 'searching'
  };

  const donor = {
    id: uuidv4(),
    name: 'Alert Target Donor',
    blood_group: 'B+',
    phone: '+919876599999',
    city: 'Lucknow',
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified'
  };

  // Dispatch 1st time
  const batch1 = await dispatchRequestNotifications({
    request,
    eligibleDonors: [donor],
    maxRecipients: 5
  });
  assert.strictEqual(batch1.dispatched_count, 1);

  // Dispatch 2nd time
  const batch2 = await dispatchRequestNotifications({
    request,
    eligibleDonors: [donor],
    maxRecipients: 5
  });
  // Should skip duplicate send
  assert.strictEqual(batch2.jobs[0].action_token, batch1.jobs[0].action_token);
});

// 9. Unauthorized Request Mutation Rejected (403)
test('Rule 9: Unauthorized user cannot modify request status', async () => {
  // Login as Donor (not owner of request)
  const loginRes = await testRequest('POST', '/api/auth/login', {
    email: 'donor@bloodbridge.org',
    password: 'BloodBridge2026!'
  });
  const token = loginRes.body.token;

  // Attempt to cancel admin or requester's request
  const existingReq = localStore.blood_requests[0];
  const patchRes = await testRequest(
    'PATCH',
    `/api/requests/${existingReq.id}/status`,
    { status: 'cancelled' },
    { Authorization: `Bearer ${token}` }
  );

  assert.strictEqual(patchRes.status, 403);
  assert.strictEqual(patchRes.body.success, false);
});

// 10. Credit Points Ledger Idempotency & Balance
test('Rule 10: Credit points prevent duplicate awards and calculate accurate balance', () => {
  const userId = uuidv4();
  const key = `test_earn_milestone_${Date.now()}`;

  // Award 50 points
  const res1 = awardCreditPoints({
    userId,
    eventType: 'profile_completion',
    idempotencyKey: key
  });
  assert.strictEqual(res1.action, 'awarded');
  assert.strictEqual(res1.balance, 50);

  // Retry with same key
  const res2 = awardCreditPoints({
    userId,
    eventType: 'profile_completion',
    idempotencyKey: key
  });
  assert.strictEqual(res2.action, 'idempotent_skip');
  assert.strictEqual(res2.balance, 50); // Balance unchanged!
  assert.strictEqual(getUserCreditBalance(userId), 50);
});

// 11. Request Creation and Cancellation Lifecycle
test('Rule 11: Request lifecycle tracking from active to cancelled', async () => {
  const loginRes = await testRequest('POST', '/api/auth/login', {
    email: 'requester@bloodbridge.org',
    password: 'BloodBridge2026!'
  });
  const token = loginRes.body.token;

  // Create request
  const createRes = await testRequest(
    'POST',
    '/api/requests',
    {
      patient_name: 'Lifecycle Patient',
      blood_group: 'AB-',
      units_needed: 1,
      hospital_name: 'SGPGI Lucknow',
      city: 'Lucknow',
      urgency: 'urgent'
    },
    { Authorization: `Bearer ${token}` }
  );
  assert.strictEqual(createRes.status, 201);
  const reqId = createRes.body.request.id;

  // Cancel request
  const cancelRes = await testRequest(
    'PATCH',
    `/api/requests/${reqId}/status`,
    { status: 'cancelled' },
    { Authorization: `Bearer ${token}` }
  );
  assert.strictEqual(cancelRes.status, 200);
  assert.strictEqual(cancelRes.body.request.status, 'cancelled');
});

// 12. Blood Bank and Donor Search with Empty Results
test('Rule 12: Empty search returns graceful structure with zero crashes', async () => {
  const res = await testRequest('GET', '/api/donors/nearby?city=Lucknow&blood_group=AB-&radius_km=1');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.count, 0);
  assert.ok(Array.isArray(res.body.results));
});

// 13. Manual WhatsApp Deep Link Generator
test('Rule 13: Manual WhatsApp deep link generator formats prefilled URL safely', () => {
  const link = generateManualWhatsAppLink('+91 98765 43210', 'Urgent B+ blood required at KGMU');
  assert.ok(link.startsWith('https://wa.me/919876543210?text='));
  assert.ok(link.includes('Urgent%20B%2B%20blood%20required'));
});

// 14. Confirmed Donation Outcome Triggers Immediate Cooldown & Points
test('Rule 14: Confirmed donation outcome triggers 3-month cooldown and fulfills request', () => {
  const donorId = uuidv4();
  const reqId = uuidv4();

  const testDonor = {
    id: donorId,
    name: 'Generous Donor',
    blood_group: 'O+',
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified'
  };
  localStore.donors.push(testDonor);

  const testRequestRecord = {
    id: reqId,
    patient_name: 'Transfusion Recipient',
    blood_group: 'O+',
    status: 'coordination_in_progress'
  };
  localStore.blood_requests.push(testRequestRecord);

  const token = `token_donation_done_${Date.now()}`;
  localStore.whatsapp_notifications.push({
    id: uuidv4(),
    request_id: reqId,
    donor_id: donorId,
    action_token: token,
    status: 'delivered'
  });

  const outcomeRes = handleDonorActionToken(token, 'completed_donation');
  assert.strictEqual(outcomeRes.success, true);
  assert.strictEqual(testDonor.availability_status, 'recently_donated');
  assert.strictEqual(testDonor.donated_last_3_months, true);
  assert.ok(testDonor.cooldown_until);
  assert.strictEqual(testRequestRecord.status, 'fulfilled');
});

// 15. LLM Fallback Heuristic Parser
test('Rule 15: Natural language parser succeeds without Groq API key', async () => {
  const prompt = 'Need 3 units of O- blood urgently at S.N. Medical College Agra tomorrow morning';
  const parsed = parseRequestDeterministically(prompt);
  assert.strictEqual(parsed.blood_group, 'O-');
  assert.strictEqual(parsed.units_needed, 3);
  assert.strictEqual(parsed.urgency, 'emergency');
  assert.ok(parsed.hospital_name.toLowerCase().includes('medical college') || parsed.hospital_name.toLowerCase().includes('s.n.'));
});

// 16. Accepted Donors Only and Privacy Masking
test('Rule 16: Accepted donors only appear to requester with contact masking until selected', async () => {
  const reqId = uuidv4();
  const donor1Id = uuidv4();
  const donor2Id = uuidv4();

  const requesterUser = localStore.users.find((u) => u.role === 'requester');
  const token = jwt.sign({ id: requesterUser.id, role: requesterUser.role }, config.jwtSecret);

  // Setup request
  localStore.blood_requests.push({
    id: reqId,
    requester_id: requesterUser.id,
    patient_name: 'Patient Acceptance Test',
    blood_group: 'A+',
    status: 'notifications_queued'
  });

  // Setup 2 donors
  localStore.donors.push({
    id: donor1Id,
    name: 'Accepting Donor One',
    blood_group: 'A+',
    phone: '9876500001',
    city: 'Lucknow'
  });

  localStore.donors.push({
    id: donor2Id,
    name: 'Declining Donor Two',
    blood_group: 'A+',
    phone: '9876500002',
    city: 'Lucknow'
  });

  // Add 2 notification jobs
  const token1 = `token_accept_${Date.now()}`;
  const token2 = `token_decline_${Date.now()}`;

  localStore.whatsapp_notifications.push({
    id: uuidv4(),
    request_id: reqId,
    donor_id: donor1Id,
    donor_name: 'Accepting Donor One',
    action_token: token1,
    status: 'sent'
  });

  localStore.whatsapp_notifications.push({
    id: uuidv4(),
    request_id: reqId,
    donor_id: donor2Id,
    donor_name: 'Declining Donor Two',
    action_token: token2,
    status: 'sent'
  });

  // Donor 1 accepts, Donor 2 declines
  handleDonorActionToken(token1, 'accepted');
  handleDonorActionToken(token2, 'declined');

  // Query accepted donors
  const getRes = await testRequest('GET', `/api/requests/${reqId}/accepted-donors`, null, {
    authorization: `Bearer ${token}`
  });

  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getRes.body.count, 1);
  assert.strictEqual(getRes.body.donors[0].donor_id, donor1Id);
  // Privacy rule: phone is masked (undefined) before selection
  assert.strictEqual(getRes.body.donors[0].phone, undefined);

  // Attempting to select unaccepted Donor 2 should be rejected with 400
  const badSelect = await testRequest('POST', `/api/requests/${reqId}/select-donor`, { donor_id: donor2Id }, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(badSelect.status, 400);
});

// 17. Donor Selection reveals phone and fulfillment triggers cooldown
test('Rule 17: Selecting accepted donor reveals contact info and fulfillment triggers cooldown', async () => {
  const reqId = uuidv4();
  const donorId = uuidv4();

  const requesterUser = localStore.users.find((u) => u.role === 'requester');
  const token = jwt.sign({ id: requesterUser.id, role: requesterUser.role }, config.jwtSecret);

  localStore.blood_requests.push({
    id: reqId,
    requester_id: requesterUser.id,
    patient_name: 'Coordination Test',
    blood_group: 'B+',
    status: 'responses_received'
  });

  const testDonor = {
    id: donorId,
    name: 'Matched Hero',
    blood_group: 'B+',
    phone: '9876512345',
    city: 'Kanpur',
    availability_status: 'available',
    consent_to_contact: true,
    verification_status: 'verified'
  };
  localStore.donors.push(testDonor);

  const actionToken = `token_select_${Date.now()}`;
  localStore.whatsapp_notifications.push({
    id: uuidv4(),
    request_id: reqId,
    donor_id: donorId,
    donor_name: 'Matched Hero',
    action_token: actionToken,
    donor_response: 'accepted',
    status: 'sent'
  });

  // 1. Select the donor
  const selectRes = await testRequest('POST', `/api/requests/${reqId}/select-donor`, { donor_id: donorId }, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(selectRes.status, 200);
  assert.strictEqual(selectRes.body.request.status, 'donor_selected');
  assert.strictEqual(selectRes.body.selected_donor.phone, '9876512345'); // Contact action enabled!

  // 2. Query accepted donors - phone is now revealed for selected donor
  const getRes = await testRequest('GET', `/api/requests/${reqId}/accepted-donors`, null, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getRes.body.donors[0].is_selected, true);
  assert.strictEqual(getRes.body.donors[0].phone, '9876512345');

  // 3. Mark request fulfilled
  const fulfillRes = await testRequest('PATCH', `/api/requests/${reqId}/status`, { status: 'fulfilled' }, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(fulfillRes.status, 200);
  assert.strictEqual(fulfillRes.body.request.status, 'fulfilled');

  // 4. Check that 3-month cooldown was automatically triggered on the selected donor
  assert.strictEqual(testDonor.donated_last_3_months, true);
  assert.strictEqual(testDonor.availability_status, 'recently_donated');
  assert.ok(testDonor.cooldown_until);
});
