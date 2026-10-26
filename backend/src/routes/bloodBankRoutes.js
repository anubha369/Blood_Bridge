const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { localStore } = require('../db/db');
const { authenticateUser, requireRole, optionalAuth } = require('../middleware/auth');
const { findNearbyBloodBanks, resolveCityCoordinates } = require('../services/spatialService');

// GET /api/blood-banks
// List verified blood banks with spatial proximity
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { city, latitude, longitude, radius_km = 50, limit = 20 } = req.query;

    let searchLat = latitude;
    let searchLon = longitude;

    if ((!searchLat || !searchLon) && city) {
      const coords = resolveCityCoordinates(city);
      if (coords) {
        searchLat = coords.lat;
        searchLon = coords.lon;
      }
    }

    const bloodBanks = await findNearbyBloodBanks({
      latitude: searchLat,
      longitude: searchLon,
      radiusKm: parseFloat(radius_km),
      limit: parseInt(limit, 10)
    });

    let filtered = bloodBanks;
    if (city && (!searchLat || !searchLon)) {
      filtered = filtered.filter((b) => b.city.toLowerCase() === city.toLowerCase());
    }

    return res.json({
      success: true,
      count: filtered.length,
      blood_banks: filtered,
      disclaimer: 'Reported inventory reflects data last recorded from verified health authorities. Emergency requesters should call the blood bank directly to confirm live stock before traveling.'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/blood-banks/:id
router.get('/:id', (req, res) => {
  const bank = localStore.blood_banks.find((b) => b.id === req.params.id);
  if (!bank) {
    return res.status(404).json({ success: false, error: 'Blood bank record not found.' });
  }

  return res.json({
    success: true,
    blood_bank: bank
  });
});

// POST /api/blood-banks
// Admin-only add new blood bank
router.post('/', authenticateUser, requireRole(['admin']), (req, res, next) => {
  try {
    const {
      name,
      address,
      city,
      state,
      postal_code,
      phone,
      email,
      latitude,
      longitude,
      operating_hours = '24/7 Emergency Service',
      source_of_info = 'Health Authority Official Verification',
      inventory_summary
    } = req.body;

    if (!name || !address || !city) {
      return res.status(400).json({ success: false, error: 'Name, address, and city are required.' });
    }

    let lat = latitude ? parseFloat(latitude) : null;
    let lon = longitude ? parseFloat(longitude) : null;
    if (isNaN(lat) || isNaN(lon) || lat == null || lon == null) {
      const coords = resolveCityCoordinates(city);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
      }
    }

    const newBank = {
      id: uuidv4(),
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state ? state.trim() : null,
      postal_code: postal_code ? postal_code.trim() : null,
      phone: phone ? phone.trim() : null,
      email: email ? email.trim() : null,
      latitude: lat,
      longitude: lon,
      operating_hours,
      verification_status: 'verified',
      verified_by: req.user.id,
      source_of_info,
      inventory_summary: inventory_summary || { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 },
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    localStore.blood_banks.push(newBank);

    return res.status(201).json({
      success: true,
      message: 'Verified blood bank registered successfully.',
      blood_bank: newBank
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/blood-banks/:id
// Admin-only update blood bank & inventory
router.put('/:id', authenticateUser, requireRole(['admin']), (req, res, next) => {
  try {
    const bank = localStore.blood_banks.find((b) => b.id === req.params.id);
    if (!bank) {
      return res.status(404).json({ success: false, error: 'Blood bank not found.' });
    }

    const { name, address, city, phone, email, operating_hours, inventory_summary, verification_status } = req.body;

    if (name) bank.name = name.trim();
    if (address) bank.address = address.trim();
    if (city) bank.city = city.trim();
    if (phone) bank.phone = phone.trim();
    if (email) bank.email = email.trim();
    if (operating_hours) bank.operating_hours = operating_hours;
    if (inventory_summary) bank.inventory_summary = inventory_summary;
    if (verification_status && ['verified', 'pending', 'inactive'].includes(verification_status)) {
      bank.verification_status = verification_status;
    }

    bank.last_updated = new Date().toISOString();

    return res.json({
      success: true,
      message: 'Blood bank record updated successfully.',
      blood_bank: bank
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
