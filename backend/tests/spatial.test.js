const test = require('node:test');
const assert = require('node:assert');
const {
  validateCoordinates,
  validateRadius,
  findNearbyDonors,
  calculateHaversineDistanceKm,
  getPrivacySafeDistanceBand
} = require('../src/services/spatialService');

test('Spatial Service: Coordinate Boundary Validation', () => {
  // Valid coordinates
  const valid = validateCoordinates(26.9124, 75.7873);
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.latitude, 26.9124);
  assert.strictEqual(valid.longitude, 75.7873);

  // Out of range latitude
  const badLat = validateCoordinates(95.5, 75.0);
  assert.strictEqual(badLat.valid, false);
  assert.ok(badLat.error.includes('Latitude must be between -90.0 and +90.0'));

  // Out of range longitude
  const badLon = validateCoordinates(25.0, 195.0);
  assert.strictEqual(badLon.valid, false);
  assert.ok(badLon.error.includes('Longitude must be between -180.0 and +180.0'));

  // Non-numeric input
  const nonNum = validateCoordinates('not_a_num', 'abc');
  assert.strictEqual(nonNum.valid, false);
});

test('Spatial Service: Radius Validation & Clamping', () => {
  const normal = validateRadius(25);
  assert.strictEqual(normal.radius, 25);

  const excessive = validateRadius(500);
  assert.strictEqual(excessive.radius, 150); // Clamped to max

  const negative = validateRadius(-10);
  assert.strictEqual(negative.radius, 25); // Fallback to default
});

test('Spatial Service: Distance Calculation & Privacy Bands', () => {
  // Distance between Jaipur (26.9124, 75.7873) and Delhi (28.6139, 77.2090) is ~238 km
  const dist = calculateHaversineDistanceKm(26.9124, 75.7873, 28.6139, 77.2090);
  assert.ok(dist > 230 && dist < 250, `Expected ~238 km, got ${dist}`);

  // Test privacy bands
  assert.strictEqual(getPrivacySafeDistanceBand(1.2), 'Within 2 km');
  assert.strictEqual(getPrivacySafeDistanceBand(4.5), 'Within 5 km');
  assert.strictEqual(getPrivacySafeDistanceBand(8.9), 'Within 10 km');
  assert.strictEqual(getPrivacySafeDistanceBand(18.5), 'Within 25 km');
});

test('Spatial Service: Nearby Donors Search & Zero Coordinate Leakage', async () => {
  // Search near Jaipur center (Malviya Nagar is ~7 km away)
  const results = await findNearbyDonors({
    latitude: 26.9124,
    longitude: 75.7873,
    radiusKm: 15,
    bloodGroup: 'B+'
  });

  assert.ok(results.length > 0, 'Should find donors in Jaipur');

  for (const donor of results) {
    // Crucial Privacy Verification (Section 9.4):
    // Public responses must NEVER expose exact latitude or longitude!
    assert.strictEqual(donor.latitude, undefined, 'Exact latitude must not be exposed');
    assert.strictEqual(donor.longitude, undefined, 'Exact longitude must not be exposed');
    assert.strictEqual(donor.home_address, undefined, 'Exact home address must not be exposed');
    assert.ok(donor.distance_band, 'Should provide privacy-safe distance band');
    assert.strictEqual(donor.blood_group, 'B+');
  }
});
