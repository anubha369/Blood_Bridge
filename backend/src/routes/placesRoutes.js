const express = require('express');
const router = express.Router();
const {
  isGooglePlacesConfigured,
  autocompleteHospitals,
  autocompleteLocations,
  getPlaceDetails
} = require('../services/placesService');

// GET /api/places/config
// Status of Google Places API configuration
router.get('/config', (req, res) => {
  const isConfigured = isGooglePlacesConfigured();
  return res.json({
    success: true,
    configured: isConfigured,
    provider: isConfigured ? 'google_places_api_new' : 'curated_directory_fallback',
    country_restriction: 'IN',
    place_types: ['hospital'],
    disclaimer: 'Hospital suggestions are for address and location coordination only; BloodBridge does not claim hospitals have verified blood stock.'
  });
});

// GET /api/places/hospitals
// Search and autocomplete hospitals near selected city/location
router.get('/hospitals', async (req, res, next) => {
  try {
    const {
      input = '',
      city = '',
      latitude,
      longitude,
      radius_meters,
      session_token
    } = req.query;

    const result = await autocompleteHospitals({
      input,
      city,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      radiusMeters: radius_meters ? parseInt(radius_meters, 10) : 50000,
      sessionToken: session_token
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/places/locations
// Search and autocomplete Indian cities/areas
router.get('/locations', async (req, res, next) => {
  try {
    const { input = '', session_token } = req.query;

    const result = await autocompleteLocations({
      input,
      sessionToken: session_token
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/places/details/:placeId
// Fetch formatted address, coordinates, and city for chosen place
router.get('/details/:placeId', async (req, res, next) => {
  try {
    const { placeId } = req.params;
    const { session_token } = req.query;

    const details = await getPlaceDetails(placeId, session_token);
    return res.json(details);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
