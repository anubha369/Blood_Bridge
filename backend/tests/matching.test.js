const test = require('node:test');
const assert = require('node:assert');
const { isGroupCompatible, evaluateDonorMatch, rankCandidateDonors, RBC_COMPATIBILITY_MATRIX } = require('../src/services/matchingService');

test('Matching Service: Blood Group Compatibility Matrix', () => {
  // O- is universal donor
  assert.strictEqual(isGroupCompatible('A+', 'O-'), true);
  assert.strictEqual(isGroupCompatible('B+', 'O-'), true);
  assert.strictEqual(isGroupCompatible('AB+', 'O-'), true);
  assert.strictEqual(isGroupCompatible('O+', 'O-'), true);

  // Exact group matches
  assert.strictEqual(isGroupCompatible('B+', 'B+'), true);
  assert.strictEqual(isGroupCompatible('A-', 'A-'), true);
  assert.strictEqual(isGroupCompatible('AB+', 'AB+'), true);

  // Incompatible matches
  assert.strictEqual(isGroupCompatible('O-', 'B+'), false);
  assert.strictEqual(isGroupCompatible('A+', 'B+'), false);
  assert.strictEqual(isGroupCompatible('B-', 'B+'), false);
});

test('Matching Service: Deterministic Scoring & Reasons', () => {
  const request = { blood_group: 'B+', units_needed: 2 };
  const donor = {
    id: 'test-donor-1',
    name: 'Test Donor',
    blood_group: 'B+',
    verification_status: 'verified',
    last_donation_date: '2026-01-01'
  };

  const evalClose = evaluateDonorMatch(donor, request, 3.5, 50);
  assert.strictEqual(evalClose.isCompatible, true);
  assert.ok(evalClose.matchScore > 0.8, 'Expected high match score for close verified donor');
  assert.ok(evalClose.reasons.some((r) => r.includes('Exact blood group match')));
  assert.ok(evalClose.reasons.some((r) => r.includes('Very close proximity')));
  assert.ok(evalClose.reasons.some((r) => r.includes('Verified donor profile')));
  assert.ok(evalClose.disclaimer.includes('Confirm eligibility and compatibility with the authorized blood bank'));

  // Incompatible blood group
  const incompatibleDonor = { ...donor, blood_group: 'A+' };
  const evalIncompatible = evaluateDonorMatch(incompatibleDonor, request, 3.5, 50);
  assert.strictEqual(evalIncompatible.isCompatible, false);
  assert.strictEqual(evalIncompatible.matchScore, 0);
});

test('Matching Service: Consent Enforcement in Candidate Ranking', () => {
  const request = { blood_group: 'B+', units_needed: 1 };
  const donors = [
    {
      id: 'd1',
      name: 'Consenting Donor',
      blood_group: 'B+',
      distance_km: 4.0,
      distance_band: 'Within 5 km',
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified'
    },
    {
      id: 'd2',
      name: 'Withdrawn Consent Donor',
      blood_group: 'B+',
      distance_km: 2.0,
      distance_band: 'Within 2 km',
      availability_status: 'available',
      consent_to_contact: false, // Must be excluded!
      verification_status: 'verified'
    },
    {
      id: 'd3',
      name: 'Unavailable Donor',
      blood_group: 'B+',
      distance_km: 3.0,
      distance_band: 'Within 5 km',
      availability_status: 'unavailable', // Must be excluded!
      consent_to_contact: true,
      verification_status: 'verified'
    }
  ];

  const ranked = rankCandidateDonors(donors, request, 50);

  // Only the consenting and available donor must be returned
  assert.strictEqual(ranked.length, 1);
  assert.strictEqual(ranked[0].donor_id, 'd1');
  assert.strictEqual(ranked[0].name, 'Consenting Donor');
});
