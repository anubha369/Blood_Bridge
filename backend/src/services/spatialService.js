/**
 * BloodBridge Vision-X: Spatial Service (PostGIS & Geo-Privacy)
 * 
 * Implements Section 9 Spatial Requirements:
 * - SRID 4326 PostGIS geography points
 * - ST_DWithin and ST_Distance calculations
 * - Spatial input validation and boundaries
 * - Geo-privacy masking (Fuzzy bands, no raw coordinates exposed publicly)
 */

const { searchNearbyDonors, searchNearbyBloodBanks, calculateHaversineDistanceKm, getPrivacySafeDistanceBand } = require('../db/db');
const config = require('../config');

/**
 * Validate latitude and longitude geographic bounds
 */
function validateCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Latitude and Longitude must be valid numbers.' };
  }

  if (lat < -90.0 || lat > 90.0) {
    return { valid: false, error: 'Latitude must be between -90.0 and +90.0 degrees.' };
  }

  if (lon < -180.0 || lon > 180.0) {
    return { valid: false, error: 'Longitude must be between -180.0 and +180.0 degrees.' };
  }

  return { valid: true, latitude: lat, longitude: lon };
}

/**
 * Validate and clamp search radius in kilometers
 */
function validateRadius(radiusKm) {
  const parsed = parseFloat(radiusKm);
  if (isNaN(parsed) || parsed <= 0) {
    return { valid: true, radius: config.defaultSearchRadiusKm };
  }
  const clamped = Math.min(Math.max(parsed, 1), config.maxSearchRadiusKm);
  return { valid: true, radius: clamped };
}

/**
 * Perform privacy-safe nearby donor search
 */
async function findNearbyDonors({ latitude, longitude, radiusKm, bloodGroup, limit = 20, offset = 0 }) {
  const coordCheck = validateCoordinates(latitude, longitude);
  if (!coordCheck.valid) {
    throw new Error(coordCheck.error);
  }

  const radiusCheck = validateRadius(radiusKm);

  const donors = await searchNearbyDonors({
    latitude: coordCheck.latitude,
    longitude: coordCheck.longitude,
    radiusKm: radiusCheck.radius,
    bloodGroup,
    limit,
    offset
  });

  // Guarantee that no exact coordinates leak out
  return donors.map((d) => ({
    donor_id: d.donor_id,
    name: d.name,
    blood_group: d.blood_group,
    city: d.city,
    area: d.area,
    availability_status: d.availability_status,
    consent_to_contact: true, // Only consenting donors are returned by searchNearbyDonors
    verification_status: d.verification_status,
    distance_km: d.distance_km,
    distance_band: d.distance_band || getPrivacySafeDistanceBand(d.distance_km),
    last_donation_date: d.last_donation_date,
    consent_disclaimer: 'Potential donor registered on BloodBridge. Contact is governed by donor consent policy.'
  }));
}

/**
 * Perform nearby blood banks search
 */
async function findNearbyBloodBanks({ latitude, longitude, radiusKm = 50, limit = 20 }) {
  let lat = null;
  let lon = null;

  if (latitude != null && longitude != null) {
    const coordCheck = validateCoordinates(latitude, longitude);
    if (coordCheck.valid) {
      lat = coordCheck.latitude;
      lon = coordCheck.longitude;
    }
  }

  const radiusCheck = validateRadius(radiusKm);

  return searchNearbyBloodBanks({
    latitude: lat,
    longitude: lon,
    radiusKm: radiusCheck.radius,
    limit
  });
}

/**
 * City-level coordinate lookup fallback table for instant usability
 */
const CITY_COORDINATES = {
  jaipur: { lat: 26.9124, lon: 75.7873, name: 'Jaipur, Rajasthan' },
  delhi: { lat: 28.6139, lon: 77.2090, name: 'New Delhi, Delhi' },
  ghaziabad: { lat: 28.6692, lon: 77.4538, name: 'Ghaziabad, Uttar Pradesh' },
  noida: { lat: 28.5355, lon: 77.3910, name: 'Noida, Uttar Pradesh' },
  gurugram: { lat: 28.4595, lon: 77.0266, name: 'Gurugram, Haryana' },
  mumbai: { lat: 19.0760, lon: 72.8777, name: 'Mumbai, Maharashtra' },
  bengaluru: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka' },
  bangalore: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka' },
  pune: { lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra' },
  hyderabad: { lat: 17.3850, lon: 78.4867, name: 'Hyderabad, Telangana' },
  chennai: { lat: 13.0827, lon: 80.2707, name: 'Chennai, Tamil Nadu' },
  kolkata: { lat: 22.5726, lon: 88.3639, name: 'Kolkata, West Bengal' },
  lucknow: { lat: 26.8467, lon: 80.9462, name: 'Lucknow, Uttar Pradesh' }
};

function resolveCityCoordinates(cityName) {
  if (!cityName) return null;
  const key = cityName.trim().toLowerCase();
  return CITY_COORDINATES[key] || null;
}

module.exports = {
  validateCoordinates,
  validateRadius,
  findNearbyDonors,
  findNearbyBloodBanks,
  resolveCityCoordinates,
  calculateHaversineDistanceKm,
  getPrivacySafeDistanceBand
};
