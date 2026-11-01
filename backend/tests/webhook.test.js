const test = require('node:test');
const assert = require('node:assert');
const {
  validateGoogleFormPayload,
  processGoogleFormSubmission,
  syncRecentRecords
} = require('../src/services/googleFormService');
const config = require('../src/config');
const { localStore } = require('../src/db/db');
const app = require('../src/app');
const http = require('http');

// Helper to make lightweight in-memory HTTP requests to Express app
async function testRequest(method, path, body = null, headers = {}) {
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

test('Google Form Service: Payload Validation', () => {
  // Valid payload
  const valid = validateGoogleFormPayload({
    name: 'Aakash Verma',
    blood_group: 'O+',
    city: 'Lucknow',
    area: 'Hazratganj',
    phone: '9876543210',
    consent_to_contact: true,
    last_donation_date: '2026-02-14'
  });

  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.data.blood_group, 'O+');
  assert.strictEqual(valid.data.consent_to_contact, true);

  // Invalid blood group
  const badGroup = validateGoogleFormPayload({
    name: 'Aakash Verma',
    blood_group: 'Z+', // Invalid!
    city: 'Lucknow'
  });
  assert.strictEqual(badGroup.valid, false);
  assert.ok(badGroup.error.includes('Invalid blood group'));

  // Minimal 4-field form without explicit city defaults gracefully to state capital
  const minimalForm = validateGoogleFormPayload({
    name: 'Pooja Singh',
    blood_group: 'AB-',
    consent_to_contact: true,
    donated_last_3_months: false
  });
  assert.strictEqual(minimalForm.valid, true);
  assert.strictEqual(minimalForm.data.city, 'Lucknow');

  // Explicit empty string city should be rejected
  const missingCity = validateGoogleFormPayload({
    name: 'Aakash Verma',
    blood_group: 'O+',
    city: ''
  });
  assert.strictEqual(missingCity.valid, false);
});

test('Google Form Service: Webhook Security & Initial Pending Status', async () => {
  const payload = {
    name: 'Sunil Chawla',
    blood_group: 'A+',
    city: 'Lucknow',
    phone: '9876543211',
    consent_to_contact: true,
    submission_id: 'test_sub_unique_999'
  };

  // 1. Rejected if wrong secret
  await assert.rejects(
    async () => {
      await processGoogleFormSubmission(payload, 'wrong-secret');
    },
    (err) => err.status === 401
  );

  // 2. Accepted with correct secret
  const res = await processGoogleFormSubmission(payload, config.googleFormWebhookSecret);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.verification_status, 'pending_verification'); // Initial status MUST be pending

  // Check donor in store
  const savedDonor = localStore.donors.find((d) => d.id === res.donor_id);
  assert.ok(savedDonor);
  assert.strictEqual(savedDonor.name, 'Sunil Chawla');
  assert.strictEqual(savedDonor.verification_status, 'pending_verification');
  assert.strictEqual(savedDonor.source, 'google_forms');

  // 3. Deduplication: Repeating same submission_id
  const duplicateRes = await processGoogleFormSubmission(payload, config.googleFormWebhookSecret);
  assert.strictEqual(duplicateRes.action, 'skipped_duplicate');
});

test('Google Form Service: Idempotent Phone Upsert & Cooldown Rule Enforcement', async () => {
  const phone = '9876543299';
  
  // First submission: Donor reports recent donation but no exact date
  const sub1 = {
    name: 'Deepak Joshi',
    blood_group: 'B+',
    city: 'Varanasi',
    phone: phone,
    email: 'deepak.j@example.com',
    consent_to_contact: true,
    donated_last_3_months: true, // Donated recently!
    last_donation_date: null, // Date missing!
    submission_id: 'gform_deepak_001'
  };

  const res1 = await processGoogleFormSubmission(sub1, config.googleFormWebhookSecret);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.action, 'created');
  assert.strictEqual(res1.availability_status, 'unavailable'); // Suppressed!

  const donor1 = localStore.donors.find((d) => d.id === res1.donor_id);
  assert.strictEqual(donor1.donation_history_status, 'reported_recent');
  assert.strictEqual(donor1.cooldown_until, null); // Rule: No invented date!

  // Second submission with same phone: updates profile safely without creating duplicate
  const sub2 = {
    name: 'Deepak Joshi',
    blood_group: 'B+',
    city: 'Varanasi',
    area: 'Sigra',
    phone: phone,
    email: 'deepak.j@example.com',
    consent_to_contact: true,
    donated_last_3_months: true,
    last_donation_date: '2026-04-15', // Exact date provided in follow-up!
    submission_id: 'gform_deepak_002'
  };

  const res2 = await processGoogleFormSubmission(sub2, config.googleFormWebhookSecret);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.action, 'updated');
  assert.strictEqual(res2.donor_id, res1.donor_id); // Stable identifier preserved!
  assert.ok(res2.cooldown_until); // Cooldown calculated!

  const donor2 = localStore.donors.find((d) => d.id === res2.donor_id);
  assert.strictEqual(donor2.area, 'Sigra');
  assert.strictEqual(donor2.availability_status, 'recently_donated');
});

test('Google Form Service: syncRecentRecords recovers missed responses and prevents duplicates', async () => {
  // Mock missed form responses from spreadsheet
  const missedRows = [
    // Header
    ['Timestamp', 'NAME', 'WHATSAPP CONTACT NUMBER', 'BLOOD GROUP', 'HAVE YOU DONATED BLOOD IN THE PAST THREE MONTHS ?', 'WOULD BE WILLING TO DONATE A BLOOD AND HELP SAFE A LIFE?', 'BloodBridge Sync Status'],
    // Row 2: Missed donor A
    ['2026-10-31 10:15:00', 'Amitabh Sanyal', '9876501111', 'O+', 'No', 'Yes', ''],
    // Row 3: Missed donor B
    ['2026-10-31 11:30:00', 'Pooja Kashyap', '9876502222', 'A-', 'Yes', 'Yes', ''],
    // Row 4: Missed donor C
    ['2026-10-31 12:45:00', 'Farhan Ali', '9876503333', 'B+', 'No', 'Willing to help', '']
  ];

  // 1. First sync run: should fetch 3, insert 3, skip 0
  const sync1 = await syncRecentRecords({ rows: missedRows });
  assert.strictEqual(sync1.success, true);
  assert.strictEqual(sync1.fetched, 3);
  assert.strictEqual(sync1.inserted, 3);
  assert.strictEqual(sync1.skipped_duplicates, 0);
  assert.strictEqual(sync1.failed, 0);

  // Verify donor A exists in localStore with correct pending verification and google_forms source
  const donorA = localStore.donors.find((d) => d.phone === '919876501111');
  assert.ok(donorA);
  assert.strictEqual(donorA.name, 'Amitabh Sanyal');
  assert.strictEqual(donorA.blood_group, 'O+');
  assert.strictEqual(donorA.source, 'google_forms');
  assert.strictEqual(donorA.verification_status, 'pending_verification');
  assert.strictEqual(donorA.whatsapp_opt_in, true);
  assert.ok(donorA.google_form_submission_id.includes('gform_row_2_'));

  // 2. Second sync run with identical rows: should skip all 3 as duplicates without modifying records
  const sync2 = await syncRecentRecords({ rows: missedRows });
  assert.strictEqual(sync2.success, true);
  assert.strictEqual(sync2.fetched, 3);
  assert.strictEqual(sync2.inserted, 0);
  assert.strictEqual(sync2.skipped_duplicates, 3);
  assert.strictEqual(sync2.failed, 0);
});

test('Google Form Service: syncRecentRecords handles pagination and failures', async () => {
  const rowsWithInvalid = [
    ['Timestamp', 'NAME', 'WHATSAPP CONTACT NUMBER', 'BLOOD GROUP', 'HAVE YOU DONATED BLOOD IN THE PAST THREE MONTHS ?', 'WOULD BE WILLING TO DONATE A BLOOD AND HELP SAFE A LIFE?'],
    // Valid donor 1
    ['2026-10-31 14:00:00', 'Valid Donor One', '9876504444', 'AB+', 'No', 'Yes'],
    // Invalid donor 2: invalid blood group 'Z+'
    ['2026-10-31 14:10:00', 'Invalid Donor Two', '9876505555', 'Z+', 'No', 'Yes'],
    // Valid donor 3
    ['2026-10-31 14:20:00', 'Valid Donor Three', '9876506666', 'O-', 'No', 'Yes']
  ];

  // Test pagination offset=0, limit=2 (evaluates row 1 and row 2)
  const pagedSync = await syncRecentRecords({
    rows: rowsWithInvalid,
    offset: 0,
    limit: 2,
    syncAll: false
  });

  assert.strictEqual(pagedSync.success, true);
  assert.strictEqual(pagedSync.fetched, 3);
  // Valid donor 1 and 3 inserted, Invalid donor 2 failed
  assert.strictEqual(pagedSync.failed, 1);
  assert.strictEqual(pagedSync.failures.length, 1);
  assert.ok(pagedSync.failures[0].reason.includes('Invalid blood group'));
});

test('Google Form Service: syncRecentRecords returns instructions when unconfigured', async () => {
  // Save original config
  const origKey = config.googleSheetsApiKey;
  const origUrl = config.googleAppsScriptWebAppUrl;
  const origEmail = config.googleServiceAccountEmail;

  config.googleSheetsApiKey = '';
  config.googleAppsScriptWebAppUrl = '';
  config.googleServiceAccountEmail = '';

  const res = await syncRecentRecords({});
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.configured, false);
  assert.ok(res.instructions);
  assert.ok(res.instructions.setup_options.length >= 3);

  // Restore config
  config.googleSheetsApiKey = origKey;
  config.googleAppsScriptWebAppUrl = origUrl;
  config.googleServiceAccountEmail = origEmail;
});

test('Integration API: POST /api/integrations/google-forms/sync-recent-records endpoint security & sync', async () => {
  // 1. Unauthenticated request without JWT or secret is rejected (401)
  const unauthRes = await testRequest('POST', '/api/integrations/google-forms/sync-recent-records', {});
  assert.strictEqual(unauthRes.status, 401);

  // 2. Request with valid x-webhook-secret header is accepted
  const validSecret = config.googleFormWebhookSecret;
  const sampleRecords = [
    {
      name: 'HTTP Synced Volunteer',
      blood_group: 'B+',
      city: 'Lucknow',
      phone: '9876507777',
      consent_to_contact: true,
      donated_last_3_months: false,
      timestamp: new Date().toISOString()
    }
  ];

  const syncHttpRes = await testRequest(
    'POST',
    '/api/integrations/google-forms/sync-recent-records',
    { records: sampleRecords },
    { 'x-webhook-secret': validSecret }
  );

  assert.strictEqual(syncHttpRes.status, 200);
  assert.strictEqual(syncHttpRes.body.success, true);
  assert.strictEqual(syncHttpRes.body.inserted, 1);

  // 3. Repeating request is recognized as duplicate
  const repeatHttpRes = await testRequest(
    'POST',
    '/api/integrations/sync-recent-records',
    { records: sampleRecords },
    { 'x-webhook-secret': validSecret }
  );

  assert.strictEqual(repeatHttpRes.status, 200);
  assert.strictEqual(repeatHttpRes.body.inserted, 0);
  assert.strictEqual(repeatHttpRes.body.skipped_duplicates, 1);
});
