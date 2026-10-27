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
