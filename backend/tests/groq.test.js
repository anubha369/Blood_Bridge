const test = require('node:test');
const assert = require('node:assert');
const { parseRequestDeterministically, extractBloodRequestWithGroq } = require('../src/services/groqService');

test('Groq Service: Natural-Language Blood Request Extraction (Deterministic Parser)', () => {
  const query = 'I urgently need 2 units of B positive blood near Ghaziabad tomorrow morning for surgery';
  const parsed = parseRequestDeterministically(query);

  assert.strictEqual(parsed.blood_group, 'B+');
  assert.strictEqual(parsed.units_needed, 2);
  assert.strictEqual(parsed.urgency, 'emergency');
  assert.ok(parsed.location);
  assert.strictEqual(parsed.location.city, 'Ghaziabad');
  assert.ok(parsed.location.latitude !== null);
  assert.ok(parsed.location.longitude !== null);
  assert.strictEqual(parsed.missing_fields.length, 0);
  assert.ok(parsed.confidence >= 0.8);
});

test('Groq Service: Missing Fields Detection', () => {
  const query = 'Looking for blood urgently for emergency patient';
  const parsed = parseRequestDeterministically(query);

  // Missing blood group and location
  assert.strictEqual(parsed.blood_group, null);
  assert.ok(parsed.missing_fields.includes('blood_group'));
  assert.ok(parsed.missing_fields.includes('location'));
  assert.ok(parsed.confidence < 0.6);
});

test('Groq Service: End-to-end extraction wrapper handles input safely', async () => {
  const res = await extractBloodRequestWithGroq('Need O- blood near Jaipur');
  assert.strictEqual(res.blood_group, 'O-');
  assert.ok(res.location);
  assert.strictEqual(res.location.city, 'Jaipur');
});
