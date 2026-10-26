const test = require('node:test');
const assert = require('node:assert');
const { validateGoogleFormPayload, processGoogleFormSubmission } = require('../src/services/googleFormService');
const config = require('../src/config');
const { localStore } = require('../src/db/db');

test('Google Form Service: Payload Validation', () => {
  // Valid payload
  const valid = validateGoogleFormPayload({
    name: 'Aakash Verma',
    blood_group: 'O+',
    city: 'Jaipur',
    area: 'C-Scheme',
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
    city: 'Jaipur'
  });
  assert.strictEqual(badGroup.valid, false);
  assert.ok(badGroup.error.includes('Invalid blood group'));

  // Missing city
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
    city: 'Jaipur',
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
  assert.strictEqual(res.verification_status, 'pending_verification'); // Section 10: Initial status MUST be pending!

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
