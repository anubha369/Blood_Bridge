const test = require('node:test');
const assert = require('node:assert/strict');
const {
  localStore,
  findUnclaimedGoogleFormDonor,
  claimDonorRecord,
  getDonorByUserId
} = require('../src/db/db');

test('Google Forms Donor Account Linking Workflow', async (t) => {
  // Setup: Add mock Google Form donor record with user_id = null and valid Indian mobile
  const mockGfDonorId = 'gf-donor-test-101';
  const mockGfDonor = {
    id: mockGfDonorId,
    name: 'Rohan Sharma',
    blood_group: 'O+',
    phone: '9876543210',
    email: null,
    source: 'google_forms',
    verification_status: 'pending_verification',
    availability_status: 'available',
    consent_to_contact: true,
    user_id: null,
    created_at: new Date().toISOString()
  };

  localStore.donors = localStore.donors || [];
  localStore.donors.push(mockGfDonor);

  await t.test('1. Unclaimed Google Form record is found by matching verified phone number', async () => {
    const candidate = await findUnclaimedGoogleFormDonor({ phone: '+91 98765 43210', email: 'rohan.sharma@gmail.com' });
    assert.ok(candidate, 'Candidate should be found');
    assert.equal(candidate.id, mockGfDonorId);
    assert.equal(candidate.source, 'google_forms');
    assert.equal(candidate.user_id, null);
  });

  await t.test('2. Searching by name alone does not link or return donor record', async () => {
    const candidate = await findUnclaimedGoogleFormDonor({ name: 'Rohan Sharma', phone: '', email: '' });
    assert.equal(candidate, null, 'Must reject matching without verified phone or email');
  });

  await t.test('3. Portal user claims the record atomically', async () => {
    const portalUserId = 'portal-user-uuid-888';
    const claimResult = await claimDonorRecord(mockGfDonorId, portalUserId);

    assert.ok(claimResult.success, 'Claim must succeed');
    assert.equal(claimResult.donor.user_id, portalUserId);

    const linked = await getDonorByUserId(portalUserId);
    assert.ok(linked, 'Linked donor must be retrievable by portal user_id');
    assert.equal(linked.id, mockGfDonorId);
    assert.equal(linked.blood_group, 'O+');
    assert.equal(linked.source, 'google_forms');
  });

  await t.test('4. Second portal user cannot claim an already claimed record', async () => {
    const secondUserId = 'portal-user-uuid-999';
    const secondClaim = await claimDonorRecord(mockGfDonorId, secondUserId);

    assert.equal(secondClaim.success, false, 'Second claim must fail');
    assert.equal(secondClaim.reason, 'already_claimed');
  });
});
