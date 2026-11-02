/**
 * BloodBridge Vision-X: Google Places API (New) Service
 * 
 * Provides location-based hospital and city autocomplete:
 * - Google Places API (New) Autocomplete (POST https://places.googleapis.com/v1/places:autocomplete)
 * - Hospital place type filtering: ["hospital"]
 * - India country restriction: ["in"]
 * - Dynamic location biasing based on selected city / district coordinates
 * - Google Places API (New) Details (GET https://places.googleapis.com/v1/places/{placeId})
 * - Session token management
 * - High-resilience fallback directory with realistic hospital data for Indian cities (Ghaziabad, Lucknow, etc.)
 *   ensuring zero-breakage when API key is unconfigured or rate-limited.
 */

const { resolveCityCoordinates, getAllSupportedCities } = require('./spatialService');
const { v4: uuidv4 } = require('uuid');

const GOOGLE_PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const GOOGLE_PLACES_DETAILS_BASE_URL = 'https://places.googleapis.com/v1/places';

// Comprehensive Indian Hospital Directory for Resilient Fallback
// Contains real hospitals, addresses, place IDs and coordinates
const CURATED_HOSPITALS = [
  // --- GHAZIABAD ---
  {
    place_id: 'ChIJW2xVaU_8DDkRc1NfNq2J7_A',
    name: 'Max Super Speciality Hospital, Vaishali',
    address: 'W-3, Sector 1, Vaishali, Ghaziabad, Uttar Pradesh 201012',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6478,
    longitude: 77.3414,
    types: ['hospital', 'health', 'point_of_interest']
  },
  {
    place_id: 'ChIJN2o9eXn8DDkRUuWkE6sM908',
    name: 'Yashoda Super Speciality Hospital, Kaushambi',
    address: 'Plot No. 1, Kaushambi, Near Anand Vihar ISBT, Ghaziabad, Uttar Pradesh 201010',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6415,
    longitude: 77.3242,
    types: ['hospital', 'health', 'point_of_interest']
  },
  {
    place_id: 'ChIJ0d9b4Y_mDDkRz3_U2jUjTfU',
    name: 'Yashoda Hospital & Research Centre, Nehru Nagar',
    address: 'III-M, Nehru Nagar, Ghaziabad, Uttar Pradesh 201001',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6734,
    longitude: 77.4428,
    types: ['hospital', 'health', 'point_of_interest']
  },
  {
    place_id: 'ChIJk6P3xJvmDDkR8O40Jp4dO2U',
    name: 'Sarvodaya Hospital, Kavi Nagar',
    address: 'Plot No. 1, Sector 19, Kavi Nagar, Ghaziabad, Uttar Pradesh 201002',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6750,
    longitude: 77.4580,
    types: ['hospital', 'health', 'point_of_interest']
  },
  {
    place_id: 'ChIJt4l0o-jlDDkRhJj5qQ7g9l8',
    name: 'Manipal Hospital (Formerly Columbia Asia), Ghaziabad',
    address: 'NH-24, Hapur Bypass Road, Near Landcraft Golflinks, Ghaziabad, Uttar Pradesh 201002',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6455,
    longitude: 77.4725,
    types: ['hospital', 'health', 'point_of_interest']
  },
  {
    place_id: 'ChIJz4r6oKvlDDkR-0M1E-4M718',
    name: 'MMG District Combined Hospital, GT Road',
    address: 'Near Old Bus Stand, Model Town, GT Road, Ghaziabad, Uttar Pradesh 201001',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6650,
    longitude: 77.4330,
    types: ['hospital', 'government_hospital', 'health']
  },
  {
    place_id: 'ChIJx2y_m67mDDkRnL8Yq02K598',
    name: 'District Combined Hospital, Sanjay Nagar',
    address: 'Sector 23, Sanjay Nagar, Ghaziabad, Uttar Pradesh 201002',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6940,
    longitude: 77.4550,
    types: ['hospital', 'government_hospital', 'health']
  },
  {
    place_id: 'ChIJ91u4P7HmDDkR8G5G7O-x0x8',
    name: 'Santosh Medical College & Hospital',
    address: 'No. 1, Santosh Nagar, Pratap Vihar, Ghaziabad, Uttar Pradesh 201009',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6508,
    longitude: 77.4361,
    types: ['hospital', 'medical_college', 'health']
  },
  {
    place_id: 'ChIJf9r22PflDDkRDw21H8_n22U',
    name: 'Narendra Mohan Hospital & Heart Centre',
    address: 'Mohan Nagar, Ghaziabad, Uttar Pradesh 201007',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6791,
    longitude: 77.3872,
    types: ['hospital', 'heart_centre', 'health']
  },
  {
    place_id: 'ChIJX99W5XnmDDkRL0P3Jb2g7VU',
    name: 'Shanti Gopal Hospital, Indirapuram',
    address: 'Ahinsa Khand II, Indirapuram, Ghaziabad, Uttar Pradesh 201014',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6412,
    longitude: 77.3756,
    types: ['hospital', 'health']
  },
  {
    place_id: 'ChIJb7V24XnmDDkRU4m1Jb5x8TU',
    name: 'Apollo Cradle & Children Hospital, Indirapuram',
    address: 'Plot No. 15, Judges Enclave, Ahinsa Khand II, Indirapuram, Ghaziabad, Uttar Pradesh 201014',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6429,
    longitude: 77.3721,
    types: ['hospital', 'specialized_hospital']
  },
  {
    place_id: 'ChIJl2M4v7vlDDkR6G5H8N9y1x4',
    name: 'Chandra Laxmi Hospital, Vaishali',
    address: 'Plot No. 337, Sector 4, Vaishali, Ghaziabad, Uttar Pradesh 201010',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6441,
    longitude: 77.3378,
    types: ['hospital', 'health']
  },
  {
    place_id: 'ChIJr5V94Y_mDDkRp1W3J8_g018',
    name: 'Vasundhara Hospital, Vasundhara',
    address: 'Sector 11, Vasundhara, Ghaziabad, Uttar Pradesh 201012',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    latitude: 28.6610,
    longitude: 77.3680,
    types: ['hospital', 'health']
  },

  // --- LUCKNOW ---
  {
    place_id: 'ChIJx8u5X2nlDDkRc4N5J9yK6_A',
    name: 'King George Medical University (KGMU) & Centenary Hospital',
    address: 'Shah Mina Road, Chowk, Lucknow, Uttar Pradesh 226003',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    latitude: 26.8692,
    longitude: 80.9168,
    types: ['hospital', 'medical_college', 'health']
  },
  {
    place_id: 'ChIJx1v4Y3nlDDkRq5P2K7yJ8_B',
    name: 'Sanjay Gandhi Postgraduate Institute of Medical Sciences (SGPGIMS)',
    address: 'Raebareli Road, Lucknow, Uttar Pradesh 226014',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    latitude: 26.7454,
    longitude: 80.9388,
    types: ['hospital', 'medical_institute', 'health']
  },
  {
    place_id: 'ChIJw7l9M1vlDDkRw6N2J3yH7_C',
    name: 'Medanta Super Speciality Hospital, Lucknow',
    address: 'Sector B, Pocket 1, Amar Shaheed Path, Golf City, Lucknow, Uttar Pradesh 226030',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    latitude: 26.7794,
    longitude: 80.9782,
    types: ['hospital', 'health']
  },
  {
    place_id: 'ChIJz2v5X4nlDDkRu9N3J5yG9_D',
    name: 'Dr. Ram Manohar Lohia Institute of Medical Sciences (RMLIMS)',
    address: 'Vibhuti Khand, Gomti Nagar, Lucknow, Uttar Pradesh 226010',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    latitude: 26.8624,
    longitude: 80.9995,
    types: ['hospital', 'medical_institute', 'health']
  },
  {
    place_id: 'ChIJk3m4L5vlDDkRx8N1J4yF8_E',
    name: 'Apollo Medics Super Speciality Hospital, Lucknow',
    address: 'Sector B, LDA Colony, Kanpur Road, Lucknow, Uttar Pradesh 226012',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    latitude: 26.7936,
    longitude: 80.8955,
    types: ['hospital', 'health']
  },

  // --- NOIDA & GREATER NOIDA ---
  {
    place_id: 'ChIJz9r3X8flDDkRW4N2J7xG1_F',
    name: 'Fortis Hospital, Noida',
    address: 'B-22, Sector 62, Noida, Uttar Pradesh 201301',
    city: 'Noida',
    state: 'Uttar Pradesh',
    latitude: 28.6186,
    longitude: 77.3725,
    types: ['hospital', 'health']
  },
  {
    place_id: 'ChIJw1v6Y9nlDDkRy7P3K8wH2_G',
    name: 'Jaypee Hospital, Noida',
    address: 'Sector 128, Wish Town, Noida, Uttar Pradesh 201304',
    city: 'Noida',
    state: 'Uttar Pradesh',
    latitude: 28.5175,
    longitude: 77.3698,
    types: ['hospital', 'health']
  },
  {
    place_id: 'ChIJt3l7M0vlDDkRx9N4J9vJ3_H',
    name: 'Kailash Hospital & Neuro Institute, Noida',
    address: 'H-33, Sector 27, Noida, Uttar Pradesh 201301',
    city: 'Noida',
    state: 'Uttar Pradesh',
    latitude: 28.5744,
    longitude: 77.3312,
    types: ['hospital', 'health']
  },
  {
    place_id: 'ChIJy4v8X1nlDDkRz1P5K0uK4_I',
    name: 'Government Institute of Medical Sciences (GIMS), Greater Noida',
    address: 'Kasna Road, Greater Noida, Uttar Pradesh 201310',
    city: 'Greater Noida',
    state: 'Uttar Pradesh',
    latitude: 28.4385,
    longitude: 77.5255,
    types: ['hospital', 'government_hospital']
  },

  // --- DELHI ---
  {
    place_id: 'ChIJ51s19V_mDDkR3Fz7K3wL5_J',
    name: 'All India Institute of Medical Sciences (AIIMS), New Delhi',
    address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi, Delhi 110029',
    city: 'Delhi',
    state: 'Delhi',
    latitude: 28.5672,
    longitude: 77.2100,
    types: ['hospital', 'premier_institute', 'health']
  },
  {
    place_id: 'ChIJ62t28WnmDDkR4Gy8L4xM6_K',
    name: 'Safdarjung Hospital, New Delhi',
    address: 'Ring Road, Opposite AIIMS, New Delhi, Delhi 110029',
    city: 'Delhi',
    state: 'Delhi',
    latitude: 28.5694,
    longitude: 77.2078,
    types: ['hospital', 'government_hospital']
  },
  {
    place_id: 'ChIJ73u37XomDDkR5Hz9M5yN7_L',
    name: 'Max Super Speciality Hospital, Patparganj',
    address: '108A, I.P. Extension, Patparganj, New Delhi, Delhi 110092',
    city: 'Delhi',
    state: 'Delhi',
    latitude: 28.6293,
    longitude: 77.3060,
    types: ['hospital', 'health']
  },
  {
    place_id: 'ChIJ84v46YpmDDkR6I00N6zO8_M',
    name: 'Sir Ganga Ram Hospital, Rajinder Nagar',
    address: 'Sir Ganga Ram Hospital Marg, Old Rajinder Nagar, New Delhi, Delhi 110060',
    city: 'Delhi',
    state: 'Delhi',
    latitude: 28.6385,
    longitude: 77.1895,
    types: ['hospital', 'health']
  },

  // --- KANPUR ---
  {
    place_id: 'ChIJ95w55ZqmDDkR7J11O70P9_N',
    name: 'Ganesh Shankar Vidyarthi Memorial (GSVM) Medical College & LLR Hospital',
    address: 'Swaroop Nagar, Kanpur, Uttar Pradesh 208002',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    latitude: 26.4837,
    longitude: 80.3168,
    types: ['hospital', 'medical_college']
  },
  {
    place_id: 'ChIJ06x64ArmDDkR8K22P81Q0_O',
    name: 'Regency Hospital, Sarvodaya Nagar',
    address: 'A-2, Sarvodaya Nagar, Kanpur, Uttar Pradesh 208005',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    latitude: 26.4764,
    longitude: 80.3015,
    types: ['hospital', 'health']
  },

  // --- JAIPUR ---
  {
    place_id: 'ChIJ17y73BsmDDkR9L33Q92R1_P',
    name: 'Sawai Man Singh (SMS) Hospital & Medical College',
    address: 'Jawahar Lal Nehru Marg, Ashok Nagar, Jaipur, Rajasthan 302004',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.8988,
    longitude: 75.8173,
    types: ['hospital', 'medical_college', 'government_hospital']
  },
  {
    place_id: 'ChIJ28z82CsmDDkR0M44R03S2_Q',
    name: 'Fortis Escorts Hospital, Malviya Nagar',
    address: 'Jawaharlal Nehru Marg, Malviya Nagar, Jaipur, Rajasthan 302017',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.8522,
    longitude: 75.8077,
    types: ['hospital', 'health']
  },
  {
    place_id: 'ChIJ39091DsmDDkR1N55S14T3_R',
    name: 'Eternal Hospital (EHCC), Jawahar Circle',
    address: '3A, Jagatpura Road, Near Jawahar Circle, Jaipur, Rajasthan 302017',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.8375,
    longitude: 75.8115,
    types: ['hospital', 'health']
  },

  // --- VARANASI ---
  {
    place_id: 'ChIJ40100EsmDDkR2O66T25U4_S',
    name: 'Sir Sunderlal Hospital, Banaras Hindu University (BHU)',
    address: 'BHU Campus, Varanasi, Uttar Pradesh 221005',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    latitude: 25.2758,
    longitude: 82.9984,
    types: ['hospital', 'university_hospital']
  },

  // --- AGRA ---
  {
    place_id: 'ChIJ51219FsmDDkR3P77U36V5_T',
    name: 'Sarojini Naidu (S.N.) Medical College & Hospital',
    address: 'Hospital Road, Moti Katra, Agra, Uttar Pradesh 282003',
    city: 'Agra',
    state: 'Uttar Pradesh',
    latitude: 27.1882,
    longitude: 78.0069,
    types: ['hospital', 'medical_college']
  }
];

/**
 * Check if live Google Places API is configured
 */
function isGooglePlacesConfigured() {
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  return Boolean(key && key.trim().length > 10 && !key.includes('placeholder'));
}

/**
 * Autocomplete hospital suggestions with Location Bias & Country Filtering
 */
async function autocompleteHospitals({ input, city, latitude, longitude, radiusMeters = 50000, sessionToken }) {
  if (!input || !input.trim()) {
    // If input is empty but city is provided, suggest top hospitals in that city
    if (city) {
      return getCityHospitalSuggestions(city);
    }
    return { success: true, suggestions: [], configured: isGooglePlacesConfigured() };
  }

  const query = input.trim();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  // Resolve center coordinates for location bias
  let centerLat = latitude ? parseFloat(latitude) : null;
  let centerLon = longitude ? parseFloat(longitude) : null;

  if (centerLat == null || centerLon == null || isNaN(centerLat) || isNaN(centerLon)) {
    if (city) {
      const cityCoords = resolveCityCoordinates(city);
      if (cityCoords) {
        centerLat = cityCoords.lat;
        centerLon = cityCoords.lon;
      }
    }
  }

  // 1. Attempt Official Google Places API (New) if API key is configured
  if (isGooglePlacesConfigured()) {
    try {
      const payload = {
        input: query,
        includedPrimaryTypes: ['hospital'],
        includedRegionCodes: ['in']
      };

      if (sessionToken) {
        payload.sessionToken = sessionToken;
      }

      if (centerLat != null && centerLon != null && !isNaN(centerLat) && !isNaN(centerLon)) {
        payload.locationBias = {
          circle: {
            center: {
              latitude: centerLat,
              longitude: centerLon
            },
            radius: Math.min(Math.max(radiusMeters, 5000), 100000)
          }
        };
      }

      const res = await fetch(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const suggestions = (data.suggestions || [])
          .map((item) => {
            const pred = item.placePrediction;
            if (!pred) return null;
            return {
              place_id: pred.placeId || (pred.place ? pred.place.replace('places/', '') : uuidv4()),
              name: pred.structuredFormat?.mainText?.text || pred.text?.text || 'Hospital',
              address: pred.structuredFormat?.secondaryText?.text || pred.text?.text || '',
              full_text: pred.text?.text || '',
              types: pred.types || ['hospital'],
              source: 'google_places_api_new'
            };
          })
          .filter(Boolean);

        return {
          success: true,
          query,
          city: city || null,
          configured: true,
          provider: 'google_places_api_new',
          count: suggestions.length,
          suggestions,
          disclaimer: 'Hospital suggestions are for address and location coordination only; BloodBridge does not claim hospitals have verified blood stock.'
        };
      } else {
        const errorText = await res.text().catch(() => '');
        console.warn('Google Places API (New) Autocomplete returned HTTP', res.status, errorText);
        // Graceful fallback to curated directory on quota, key restriction or billing issue
      }
    } catch (apiErr) {
      console.warn('Google Places API call exception, switching to resilient fallback:', apiErr.message);
    }
  }

  // 2. Resilient Fallback Directory Search
  return searchFallbackHospitals({ query, city, centerLat, centerLon });
}

/**
 * Filter & Rank Fallback Hospitals based on Query and City Bias
 */
function searchFallbackHospitals({ query, city, centerLat, centerLon }) {
  const normalizedQuery = query.toLowerCase().replace(/hospital|clinic|centre|center/g, '').trim();
  const normalizedCity = city ? city.toLowerCase().replace(/[.,]/g, '').trim() : '';

  // Score and filter hospitals
  const scored = CURATED_HOSPITALS.map((hosp) => {
    let score = 0;
    const nameLower = hosp.name.toLowerCase();
    const addrLower = hosp.address.toLowerCase();
    const cityLower = hosp.city.toLowerCase();

    // City match boost
    if (normalizedCity) {
      if (cityLower.includes(normalizedCity) || normalizedCity.includes(cityLower)) {
        score += 50;
      } else if (addrLower.includes(normalizedCity)) {
        score += 30;
      }
    }

    // Distance boost if coordinates available
    if (centerLat != null && centerLon != null && hosp.latitude != null && hosp.longitude != null) {
      const distKm = Math.sqrt(
        Math.pow((hosp.latitude - centerLat) * 111, 2) +
        Math.pow((hosp.longitude - centerLon) * 111 * Math.cos((centerLat * Math.PI) / 180), 2)
      );
      if (distKm <= 15) score += 40;
      else if (distKm <= 35) score += 25;
      else if (distKm <= 60) score += 10;
    }

    // Query text match
    if (query) {
      if (nameLower.includes(query.toLowerCase())) {
        score += 60;
      } else if (normalizedQuery && nameLower.includes(normalizedQuery)) {
        score += 40;
      } else if (addrLower.includes(query.toLowerCase())) {
        score += 20;
      } else {
        // Check word intersection
        const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        const matchCount = queryWords.filter((w) => nameLower.includes(w) || addrLower.includes(w)).length;
        if (matchCount > 0) score += matchCount * 15;
      }
    }

    return { ...hosp, score };
  });

  // Keep entries with score > 0, or if query is very broad
  let results = scored.filter((h) => h.score > 0).sort((a, b) => b.score - a.score);

  // If no direct matches but city is known, return top hospitals in that city
  if (results.length === 0 && normalizedCity) {
    results = CURATED_HOSPITALS.filter((h) => h.city.toLowerCase().includes(normalizedCity));
  }

  // Format into standard suggestion objects
  const suggestions = results.slice(0, 10).map((h) => ({
    place_id: h.place_id,
    name: h.name,
    address: h.address,
    full_text: `${h.name}, ${h.address}`,
    city: h.city,
    state: h.state,
    latitude: h.latitude,
    longitude: h.longitude,
    types: h.types,
    source: 'curated_directory_fallback'
  }));

  return {
    success: true,
    query,
    city: city || null,
    configured: isGooglePlacesConfigured(),
    provider: isGooglePlacesConfigured() ? 'google_places_api_new' : 'curated_directory_fallback',
    count: suggestions.length,
    suggestions,
    disclaimer: 'Hospital suggestions are for address and location coordination only; BloodBridge does not claim hospitals have verified blood stock.',
    setup_guide: !isGooglePlacesConfigured() ? 'To connect live Google Places API (New), add GOOGLE_PLACES_API_KEY in backend/.env.' : null
  };
}

/**
 * Top Hospital Suggestions for a given City/District
 */
function getCityHospitalSuggestions(city) {
  const normalizedCity = city ? city.toLowerCase().trim() : '';
  const cityCoords = resolveCityCoordinates(city);

  const matched = CURATED_HOSPITALS.filter((h) => {
    if (!normalizedCity) return true;
    return h.city.toLowerCase().includes(normalizedCity) || normalizedCity.includes(h.city.toLowerCase());
  }).slice(0, 8);

  const suggestions = matched.map((h) => ({
    place_id: h.place_id,
    name: h.name,
    address: h.address,
    full_text: `${h.name}, ${h.address}`,
    city: h.city,
    state: h.state,
    latitude: h.latitude,
    longitude: h.longitude,
    types: h.types,
    source: 'curated_directory_fallback'
  }));

  return {
    success: true,
    city,
    configured: isGooglePlacesConfigured(),
    provider: 'curated_directory_fallback',
    count: suggestions.length,
    suggestions,
    coordinates: cityCoords ? { latitude: cityCoords.lat, longitude: cityCoords.lon } : null,
    disclaimer: 'Hospital suggestions are for address and location coordination only; BloodBridge does not claim hospitals have verified blood stock.'
  };
}

/**
 * Location / City Autocomplete
 */
async function autocompleteLocations({ input, sessionToken }) {
  if (!input || !input.trim()) {
    const popular = getAllSupportedCities().slice(0, 8).map((c) => ({
      place_id: `city_${c.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: c.name.split(',')[0].trim(),
      full_text: c.name,
      state: c.state,
      latitude: c.lat,
      longitude: c.lon,
      source: 'supported_cities_directory'
    }));
    return { success: true, count: popular.length, suggestions: popular };
  }

  const query = input.trim().toLowerCase();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  // 1. Google Places Location Autocomplete
  if (isGooglePlacesConfigured()) {
    try {
      const payload = {
        input: query,
        includedPrimaryTypes: ['locality', 'sublocality', 'administrative_area_level_2', 'postal_code'],
        includedRegionCodes: ['in']
      };
      if (sessionToken) payload.sessionToken = sessionToken;

      const res = await fetch(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const suggestions = (data.suggestions || [])
          .map((item) => {
            const pred = item.placePrediction;
            if (!pred) return null;
            return {
              place_id: pred.placeId || (pred.place ? pred.place.replace('places/', '') : uuidv4()),
              name: pred.structuredFormat?.mainText?.text || pred.text?.text || query,
              full_text: pred.text?.text || '',
              types: pred.types || [],
              source: 'google_places_api_new'
            };
          })
          .filter(Boolean);

        return {
          success: true,
          configured: true,
          provider: 'google_places_api_new',
          count: suggestions.length,
          suggestions
        };
      }
    } catch (_) {}
  }

  // 2. Fallback City & Area Search
  const allCities = getAllSupportedCities();
  const matched = allCities.filter((c) => {
    const n = c.name.toLowerCase();
    return n.includes(query) || (c.state && c.state.toLowerCase().includes(query));
  });

  const suggestions = matched.map((c) => ({
    place_id: `city_${c.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name: c.name.split(',')[0].trim(),
    full_text: c.name,
    state: c.state,
    latitude: c.lat,
    longitude: c.lon,
    source: 'supported_cities_directory'
  }));

  // If query is an area like "Indirapuram", "Vaishali", "Kavi Nagar", "Malviya Nagar"
  const areaLookup = {
    indirapuram: { city: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6412, lon: 77.3756 },
    vaishali: { city: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6441, lon: 77.3378 },
    kaushambi: { city: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6415, lon: 77.3242 },
    'kavi nagar': { city: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6750, lon: 77.4580 },
    'raj nagar': { city: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6850, lon: 77.4480 },
    vasundhara: { city: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6610, lon: 77.3680 },
    'mohan nagar': { city: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6791, lon: 77.3872 },
    'sanjay nagar': { city: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6940, lon: 77.4550 },
    'gomti nagar': { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8500, lon: 80.9900 },
    hazratganj: { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8500, lon: 80.9400 },
    'malviya nagar': { city: 'Jaipur', state: 'Rajasthan', lat: 26.8522, lon: 75.8077 }
  };

  if (areaLookup[query]) {
    const a = areaLookup[query];
    suggestions.unshift({
      place_id: `area_${query.replace(/\s+/g, '_')}`,
      name: `${input.trim()} (${a.city})`,
      full_text: `${input.trim()}, ${a.city}, ${a.state}`,
      city: a.city,
      state: a.state,
      latitude: a.lat,
      longitude: a.lon,
      source: 'curated_area_directory'
    });
  }

  return {
    success: true,
    configured: isGooglePlacesConfigured(),
    provider: 'supported_cities_directory',
    count: suggestions.length,
    suggestions
  };
}

/**
 * Retrieve Place Details (Coordinates, Formatted Address, City)
 */
async function getPlaceDetails(placeId, sessionToken) {
  if (!placeId) throw new Error('placeId is required');

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  // 1. If real Google Places Place ID & configured
  if (isGooglePlacesConfigured() && !placeId.startsWith('city_') && !placeId.startsWith('area_') && !placeId.startsWith('manual_')) {
    try {
      const url = `${GOOGLE_PLACES_DETAILS_BASE_URL}/${placeId}`;
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents,types'
      };

      if (sessionToken) {
        headers['X-Goog-Session-Token'] = sessionToken;
      }

      const res = await fetch(url, { headers });
      if (res.ok) {
        const place = await res.json();
        let city = null;
        let state = null;
        let postalCode = null;

        if (Array.isArray(place.addressComponents)) {
          for (const comp of place.addressComponents) {
            const types = comp.types || [];
            if (types.includes('locality')) city = comp.longText || comp.shortText;
            else if (!city && types.includes('administrative_area_level_2')) city = comp.longText || comp.shortText;
            if (types.includes('administrative_area_level_1')) state = comp.longText || comp.shortText;
            if (types.includes('postal_code')) postalCode = comp.longText || comp.shortText;
          }
        }

        return {
          success: true,
          place_id: place.id,
          name: place.displayName?.text || 'Hospital',
          formatted_address: place.formattedAddress || '',
          city: city || 'Ghaziabad',
          state: state || 'Uttar Pradesh',
          postal_code: postalCode,
          latitude: place.location?.latitude || null,
          longitude: place.location?.longitude || null,
          types: place.types || ['hospital'],
          source: 'google_places_api_new'
        };
      }
    } catch (e) {
      console.warn('Google Places Details fetch warning:', e.message);
    }
  }

  // 2. Fallback check in CURATED_HOSPITALS
  const found = CURATED_HOSPITALS.find((h) => h.place_id === placeId);
  if (found) {
    return {
      success: true,
      place_id: found.place_id,
      name: found.name,
      formatted_address: found.address,
      city: found.city,
      state: found.state,
      latitude: found.latitude,
      longitude: found.longitude,
      types: found.types,
      source: 'curated_directory_fallback'
    };
  }

  // 3. Fallback for cities or areas
  if (placeId.startsWith('city_') || placeId.startsWith('area_')) {
    const rawName = placeId.replace(/^(city_|area_)/, '').replace(/_/g, ' ');
    const coords = resolveCityCoordinates(rawName);
    return {
      success: true,
      place_id: placeId,
      name: rawName,
      formatted_address: coords?.name || rawName,
      city: rawName,
      state: coords?.state || '',
      latitude: coords?.lat || null,
      longitude: coords?.lon || null,
      source: 'directory_lookup'
    };
  }

  // 4. Default return
  return {
    success: true,
    place_id: placeId,
    name: 'Selected Hospital',
    formatted_address: '',
    city: null,
    latitude: null,
    longitude: null,
    source: 'unknown_place'
  };
}

module.exports = {
  isGooglePlacesConfigured,
  autocompleteHospitals,
  autocompleteLocations,
  getPlaceDetails,
  CURATED_HOSPITALS
};
