const express = require('express');
const router = express.Router();
const { localStore } = require('../db/db');
const { authenticateUser, requireRole } = require('../middleware/auth');

// All admin routes strictly require 'admin' role verified on server
router.use(authenticateUser, requireRole(['admin']));

// GET /api/admin/summary
// Platform analytics
router.get('/summary', (req, res) => {
  const totalDonors = localStore.donors.length;
  const verifiedDonors = localStore.donors.filter((d) => d.verification_status === 'verified').length;
  const pendingDonors = localStore.donors.filter((d) => d.verification_status === 'pending_verification').length;
  const availableDonors = localStore.donors.filter((d) => d.availability_status === 'available' && d.consent_to_contact).length;

  const totalRequests = localStore.blood_requests.length;
  const activeRequests = localStore.blood_requests.filter((r) => r.status === 'active').length;
  const fulfilledRequests = localStore.blood_requests.filter((r) => r.status === 'fulfilled').length;

  // Group breakdown
  const bloodGroupDistribution = {};
  localStore.donors.forEach((d) => {
    bloodGroupDistribution[d.blood_group] = (bloodGroupDistribution[d.blood_group] || 0) + 1;
  });

  // Source breakdown
  const sourceDistribution = {
    platform: localStore.donors.filter((d) => d.source === 'platform').length,
    google_forms: localStore.donors.filter((d) => d.source === 'google_forms').length
  };

  const ragApprovedCount = localStore.rag_documents.filter((d) => d.status === 'approved').length;
  const ragPendingCount = localStore.rag_documents.filter((d) => d.status === 'pending').length;
  const integrationLogsCount = localStore.integration_logs.length;

  return res.json({
    success: true,
    metrics: {
      donors: {
        total: totalDonors,
        verified: verifiedDonors,
        pending: pendingDonors,
        available_with_consent: availableDonors,
        group_distribution: bloodGroupDistribution,
        source_distribution: sourceDistribution
      },
      requests: {
        total: totalRequests,
        active: activeRequests,
        fulfilled: fulfilledRequests
      },
      blood_banks: {
        total: localStore.blood_banks.length,
        verified: localStore.blood_banks.filter((b) => b.verification_status === 'verified').length
      },
      rag_pipeline: {
        approved_documents: ragApprovedCount,
        pending_documents: ragPendingCount,
        total_chunks: localStore.rag_chunks.length
      },
      integrations: {
        total_logs: integrationLogsCount,
        recent_status: localStore.integration_logs.slice(-5)
      }
    }
  });
});

// GET /api/admin/donors
router.get('/donors', (req, res) => {
  const { status, group, source } = req.query;

  let donors = [...localStore.donors];

  if (status) {
    donors = donors.filter((d) => d.verification_status === status);
  }
  if (group) {
    donors = donors.filter((d) => d.blood_group === group.toUpperCase());
  }
  if (source) {
    donors = donors.filter((d) => d.source === source);
  }

  // Admin view can see verification status and source, but raw exact coordinates are masked
  return res.json({
    success: true,
    count: donors.length,
    donors: donors.map((d) => ({
      id: d.id,
      name: d.name,
      blood_group: d.blood_group,
      city: d.city,
      area: d.area,
      availability_status: d.availability_status,
      consent_to_contact: d.consent_to_contact,
      verification_status: d.verification_status,
      last_donation_date: d.last_donation_date,
      source: d.source,
      created_at: d.created_at
    }))
  });
});

// PATCH /api/admin/donors/:id/verify
// Verify, reject, or mark donor inactive
router.patch('/donors/:id/verify', (req, res) => {
  const { verification_status } = req.body;
  const validStatuses = ['pending_verification', 'verified', 'rejected', 'inactive'];

  if (!validStatuses.includes(verification_status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid verification status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const donor = localStore.donors.find((d) => d.id === req.params.id);
  if (!donor) {
    return res.status(404).json({ success: false, error: 'Donor record not found.' });
  }

  donor.verification_status = verification_status;
  donor.updated_at = new Date().toISOString();

  // Audit event
  localStore.audit_events.push({
    id: String(Date.now()),
    actor_id: req.user.id,
    actor_role: req.user.role,
    action: `donor_verification_${verification_status}`,
    entity_type: 'donor',
    entity_id: donor.id,
    timestamp: new Date().toISOString()
  });

  return res.json({
    success: true,
    message: `Donor verification status changed to "${verification_status}".`,
    donor: {
      id: donor.id,
      name: donor.name,
      verification_status: donor.verification_status
    }
  });
});

// GET /api/admin/audit-logs
router.get('/audit-logs', (req, res) => {
  return res.json({
    success: true,
    count: localStore.audit_events.length,
    logs: [...localStore.audit_events].reverse().slice(0, 50)
  });
});

module.exports = router;
