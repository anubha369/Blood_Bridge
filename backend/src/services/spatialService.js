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
 * Comprehensive Indian city coordinate lookup table, with deep coverage across Uttar Pradesh
 */
const CITY_COORDINATES = {
  // Uttar Pradesh Focus Districts & Cities
  lucknow: { lat: 26.8467, lon: 80.9462, name: 'Lucknow, Uttar Pradesh', state: 'Uttar Pradesh' },
  kanpur: { lat: 26.4499, lon: 80.3319, name: 'Kanpur, Uttar Pradesh', state: 'Uttar Pradesh' },
  varanasi: { lat: 25.3176, lon: 82.9739, name: 'Varanasi, Uttar Pradesh', state: 'Uttar Pradesh' },
  prayagraj: { lat: 25.4358, lon: 81.8463, name: 'Prayagraj (Allahabad), Uttar Pradesh', state: 'Uttar Pradesh' },
  allahabad: { lat: 25.4358, lon: 81.8463, name: 'Prayagraj (Allahabad), Uttar Pradesh', state: 'Uttar Pradesh' },
  agra: { lat: 27.1767, lon: 78.0081, name: 'Agra, Uttar Pradesh', state: 'Uttar Pradesh' },
  ghaziabad: { lat: 28.6692, lon: 77.4538, name: 'Ghaziabad, Uttar Pradesh', state: 'Uttar Pradesh' },
  noida: { lat: 28.5355, lon: 77.3910, name: 'Noida, Uttar Pradesh', state: 'Uttar Pradesh' },
  'greater noida': { lat: 28.4744, lon: 77.5040, name: 'Greater Noida, Uttar Pradesh', state: 'Uttar Pradesh' },
  meerut: { lat: 28.9845, lon: 77.7064, name: 'Meerut, Uttar Pradesh', state: 'Uttar Pradesh' },
  bareilly: { lat: 28.3670, lon: 79.4304, name: 'Bareilly, Uttar Pradesh', state: 'Uttar Pradesh' },
  aligarh: { lat: 27.8974, lon: 78.0880, name: 'Aligarh, Uttar Pradesh', state: 'Uttar Pradesh' },
  moradabad: { lat: 28.8386, lon: 78.7733, name: 'Moradabad, Uttar Pradesh', state: 'Uttar Pradesh' },
  saharanpur: { lat: 29.9671, lon: 77.5510, name: 'Saharanpur, Uttar Pradesh', state: 'Uttar Pradesh' },
  gorakhpur: { lat: 26.7606, lon: 83.3732, name: 'Gorakhpur, Uttar Pradesh', state: 'Uttar Pradesh' },
  firozabad: { lat: 27.1591, lon: 78.3957, name: 'Firozabad, Uttar Pradesh', state: 'Uttar Pradesh' },
  jhansi: { lat: 25.4484, lon: 78.5685, name: 'Jhansi, Uttar Pradesh', state: 'Uttar Pradesh' },
  muzaffarnagar: { lat: 29.4727, lon: 77.7085, name: 'Muzaffarnagar, Uttar Pradesh', state: 'Uttar Pradesh' },
  mathura: { lat: 27.4924, lon: 77.6737, name: 'Mathura, Uttar Pradesh', state: 'Uttar Pradesh' },
  ayodhya: { lat: 26.7922, lon: 82.1998, name: 'Ayodhya, Uttar Pradesh', state: 'Uttar Pradesh' },
  faizabad: { lat: 26.7922, lon: 82.1998, name: 'Ayodhya (Faizabad), Uttar Pradesh', state: 'Uttar Pradesh' },
  sultanpur: { lat: 26.2648, lon: 82.0727, name: 'Sultanpur, Uttar Pradesh', state: 'Uttar Pradesh' },
  sitapur: { lat: 27.5647, lon: 80.6828, name: 'Sitapur, Uttar Pradesh', state: 'Uttar Pradesh' },
  mirzapur: { lat: 25.1337, lon: 82.5644, name: 'Mirzapur, Uttar Pradesh', state: 'Uttar Pradesh' },
  jaunpur: { lat: 25.7464, lon: 82.6837, name: 'Jaunpur, Uttar Pradesh', state: 'Uttar Pradesh' },
  azamgarh: { lat: 26.0688, lon: 83.1834, name: 'Azamgarh, Uttar Pradesh', state: 'Uttar Pradesh' },
  banda: { lat: 25.4754, lon: 80.3346, name: 'Banda, Uttar Pradesh', state: 'Uttar Pradesh' },
  shahjahanpur: { lat: 27.8805, lon: 79.9120, name: 'Shahjahanpur, Uttar Pradesh', state: 'Uttar Pradesh' },

  // Key Inter-State Hubs for Border Coordination
  delhi: { lat: 28.6139, lon: 77.2090, name: 'New Delhi, Delhi', state: 'Delhi' },
  'new delhi': { lat: 28.6139, lon: 77.2090, name: 'New Delhi, Delhi', state: 'Delhi' },
  gurugram: { lat: 28.4595, lon: 77.0266, name: 'Gurugram, Haryana', state: 'Haryana' },
  faridabad: { lat: 28.4089, lon: 77.3178, name: 'Faridabad, Haryana', state: 'Haryana' },
  jaipur: { lat: 26.9124, lon: 75.7873, name: 'Jaipur, Rajasthan', state: 'Rajasthan' },
  patna: { lat: 25.5941, lon: 85.1376, name: 'Patna, Bihar', state: 'Bihar' },
  gwalior: { lat: 26.2183, lon: 78.1828, name: 'Gwalior, Madhya Pradesh', state: 'Madhya Pradesh' },
  mumbai: { lat: 19.0760, lon: 72.8777, name: 'Mumbai, Maharashtra', state: 'Maharashtra' },
  bengaluru: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka', state: 'Karnataka' },
  bangalore: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka', state: 'Karnataka' },
  pune: { lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra', state: 'Maharashtra' },
  hyderabad: { lat: 17.3850, lon: 78.4867, name: 'Hyderabad, Telangana', state: 'Telangana' },
  chennai: { lat: 13.0827, lon: 80.2707, name: 'Chennai, Tamil Nadu', state: 'Tamil Nadu' },
  kolkata: { lat: 22.5726, lon: 88.3639, name: 'Kolkata, West Bengal', state: 'West Bengal' }
};

function resolveCityCoordinates(cityName) {
  if (!cityName) return null;
  const key = cityName.trim().toLowerCase().replace(/[.,]/g, '');
  return CITY_COORDINATES[key] || null;
}

function getAllSupportedCities() {
  return Object.values(CITY_COORDINATES).reduce((acc, curr) => {
    if (!acc.some((c) => c.name === curr.name)) {
      acc.push(curr);
    }
    return acc;
  }, []);
}

module.exports = {
  validateCoordinates,
  validateRadius,
  findNearbyDonors,
  findNearbyBloodBanks,
  resolveCityCoordinates,
  getAllSupportedCities,
  calculateHaversineDistanceKm,
  getPrivacySafeDistanceBand
};
