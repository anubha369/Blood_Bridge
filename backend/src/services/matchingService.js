/**
 * BloodBridge Vision-X: Deterministic Donor Matching & Ranking Engine
 * 
 * Clinical Safety Disclaimer:
 * This compatibility mapping is strictly for preliminary red blood cell donor discovery only.
 * BloodBridge coordinates voluntary availability and does not confirm clinical compatibility
 * or donor medical eligibility. Final compatibility, cross-matching, and donor suitability
 * must be verified exclusively by authorized blood bank personnel and healthcare providers.
 */

const { isDonorEligibleForNotification } = require('./cooldownService');

const MEDICAL_SAFETY_DISCLAIMER =
  'Preliminary red blood cell donor discovery only. This matching does not confirm clinical compatibility or donor eligibility. Final compatibility, cross-matching, and donor suitability must be confirmed by authorized blood bank personnel.';

/**
 * 1. Forward Table: Donor-to-Recipient Red Blood Cell Compatibility
 * Describes which recipient blood groups can receive RBCs from a given donor blood group.
 */
const DONOR_TO_RECIPIENT_MATRIX = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal RBC donor
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+']
};

/**
 * 2. Inverse Table: Requester-to-Donor Compatibility Lookup
 * When a requester creates a blood request, this inverse lookup returns
 * only the donor blood groups compatible with the recipient:
 * - O- request  → O- donors only.
 * - O+ request  → O-, O+ donors.
 * - A- request  → O-, A- donors.
 * - A+ request  → O-, O+, A-, A+ donors.
 * - B- request  → O-, B- donors.
 * - B+ request  → O-, O+, B-, B+ donors.
 * - AB- request → O-, A-, B-, AB- donors.
 * - AB+ request → all eight blood groups.
 */
const REQUESTER_TO_DONOR_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

// Maintained for backward compatibility with existing tests
const RBC_COMPATIBILITY_MATRIX = REQUESTER_TO_DONOR_COMPATIBILITY;

/**
 * Returns all compatible donor blood groups for a given requester/recipient group.
 */
function getCompatibleDonorGroups(recipientGroup) {
  if (!recipientGroup || typeof recipientGroup !== 'string') return [];
  const clean = recipientGroup.trim().toUpperCase();
  return REQUESTER_TO_DONOR_COMPATIBILITY[clean] || [];
}

/**
 * Checks whether a donor blood group is compatible for a recipient blood request.
 */
function isGroupCompatible(recipientGroup, donorGroup) {
  if (!recipientGroup || !donorGroup) return false;
  const compatibleDonors = getCompatibleDonorGroups(recipientGroup);
  return compatibleDonors.includes(donorGroup.trim().toUpperCase());
}

/**
 * Deterministic multi-tier comparator for donor ranking (Section 2):
 * Priority:
 * 1. Exact blood group match (must appear first).
 * 2. Other compatible blood groups (appear afterward; incompatible never appear).
 * 3. Donor availability ('available' > other).
 * 4. Donor consent (active consent > unconsented).
 * 5. Approximate geographical proximity (closer distance_km first).
 * 6. Verification status ('verified' / 'verified_by_authorized_personnel' > 'self_reported' / 'pending_verification').
 */
function compareDonorsForRequest(a, b, request) {
  const reqGroup = request.blood_group ? request.blood_group.trim().toUpperCase() : '';

  // 1 & 2: Blood Group Match Tier (Exact match must always appear first)
  const isExactA = (a.blood_group || '').trim().toUpperCase() === reqGroup;
  const isExactB = (b.blood_group || '').trim().toUpperCase() === reqGroup;
  if (isExactA !== isExactB) {
    return isExactA ? -1 : 1;
  }

  // 3: Donor Availability Status
  const isAvailA = a.availability_status === 'available';
  const isAvailB = b.availability_status === 'available';
  if (isAvailA !== isAvailB) {
    return isAvailA ? -1 : 1;
  }

  // 4: Donor Consent
  const hasConsentA = a.consent_to_contact === true && a.consent_status !== 'withdrawn';
  const hasConsentB = b.consent_to_contact === true && b.consent_status !== 'withdrawn';
  if (hasConsentA !== hasConsentB) {
    return hasConsentA ? -1 : 1;
  }

  // 5: Approximate Geographical Proximity (Distance ascending: closest donors first)
  const distA = a.distance_km != null && !isNaN(Number(a.distance_km)) ? Number(a.distance_km) : 9999;
  const distB = b.distance_km != null && !isNaN(Number(b.distance_km)) ? Number(b.distance_km) : 9999;
  if (Math.abs(distA - distB) > 0.05) {
    return distA - distB;
  }

  // 6: Verification Status (Clinically verified before self-reported)
  const verifiedStatuses = ['verified', 'verified_by_authorized_personnel'];
  const isVerifiedA = verifiedStatuses.includes(a.verification_status);
  const isVerifiedB = verifiedStatuses.includes(b.verification_status);
  if (isVerifiedA !== isVerifiedB) {
    return isVerifiedA ? -1 : 1;
  }

  // Deterministic tie-breaker by donor ID to maintain stable ordering
  const idA = String(a.donor_id || a.id || '');
  const idB = String(b.donor_id || b.id || '');
  return idA.localeCompare(idB);
}

/**
 * Compute deterministic match score and detailed explanation reasons.
 * Exact matches receive a base score of 0.85-1.00.
 * Compatible alternative matches receive a base score of 0.60-0.80.
 * Incompatible matches return 0 score and isCompatible: false.
 */
function evaluateDonorMatch(donor, request, distanceKm, maxRadiusKm = 50) {
  const reasons = [];
  const reqGroup = request.blood_group ? request.blood_group.trim().toUpperCase() : '';
  const donGroup = donor.blood_group ? donor.blood_group.trim().toUpperCase() : '';

  let baseScore = 0.0;

  // 1. Group factor
  if (donGroup === reqGroup) {
    baseScore = 0.70;
    reasons.push(`Exact blood group match (${donGroup})`);
  } else if (isGroupCompatible(reqGroup, donGroup)) {
    baseScore = 0.50;
    reasons.push(`Compatible donor blood group (${donGroup} for ${reqGroup})`);
  } else {
    // Incompatible: zero score, excluded completely
    return {
      matchScore: 0,
      isCompatible: false,
      reasons: [`Incompatible blood group: ${donGroup} cannot provide red blood cells to ${reqGroup}.`],
      disclaimer: MEDICAL_SAFETY_DISCLAIMER
    };
  }

  // 2. Spatial proximity factor (up to 0.15)
  const effectiveDist = Math.max(0, distanceKm || 0);
  const proximityRatio = Math.max(0, 1 - (effectiveDist / maxRadiusKm));
  const proximityPoints = 0.15 * proximityRatio;
  baseScore += proximityPoints;

  if (effectiveDist <= 5) {
    reasons.push(`Very close proximity (${Math.round(effectiveDist * 10) / 10} km)`);
  } else if (effectiveDist <= 15) {
    reasons.push(`Close proximity (${Math.round(effectiveDist * 10) / 10} km)`);
  } else {
    reasons.push(`Within configured search radius (${Math.round(effectiveDist * 10) / 10} km)`);
  }

  // 3. Verification status factor (up to 0.10)
  if (['verified', 'verified_by_authorized_personnel'].includes(donor.verification_status)) {
    baseScore += 0.10;
    reasons.push('Verified donor profile');
  } else if (['pending_verification', 'self_reported'].includes(donor.verification_status) || !donor.verification_status) {
    baseScore += 0.05;
    reasons.push('Self-reported profile (pending administrative verification)');
  } else {
    return {
      matchScore: 0,
      isCompatible: false,
      reasons: ['Donor profile is not active or verified'],
      disclaimer: MEDICAL_SAFETY_DISCLAIMER
    };
  }

  // 4. Donation freshness factor (up to 0.05)
  if (donor.last_donation_date) {
    const lastDate = new Date(donor.last_donation_date);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 90) {
      baseScore += 0.05;
      reasons.push(`Eligible donation interval (${daysSince} days since last donation)`);
    } else {
      baseScore += 0.01;
      reasons.push(`Recent donation (${daysSince} days ago; subject to clinical interval screening)`);
    }
  } else {
    baseScore += 0.03;
    reasons.push('First-time or unrecorded donation date; requires routine blood bank screening');
  }

  const finalScore = Math.round(baseScore * 100) / 100;

  return {
    matchScore: finalScore,
    isCompatible: true,
    reasons,
    disclaimer: MEDICAL_SAFETY_DISCLAIMER
  };
}

/**
 * Filter and deterministically rank candidate donors for a blood request.
 * - Incompatible blood groups are completely eliminated.
 * - Unavailable donors are eliminated.
 * - Non-consenting donors are eliminated.
 * - Cooldown donors (< 90 days since donation) are eliminated.
 * - Exact blood group matches are sorted first.
 * - Other compatible blood groups appear afterward.
 * - Within tiers, donors are sorted by distance ascending, then verification status.
 * - Deduplication is enforced by donor ID.
 */
function rankCandidateDonors(donorsList, request, maxRadiusKm = 50) {
  if (!donorsList || !Array.isArray(donorsList) || !request) return [];

  const candidateMap = new Map();

  for (const donor of donorsList) {
    const donorId = donor.donor_id || donor.id;
    if (!donorId || candidateMap.has(donorId)) continue; // Prevent duplicates

    // Availability filter: do not show unavailable donors
    if (donor.availability_status && donor.availability_status !== 'available') continue;

    // Consent filter: respect donor consent
    if (donor.consent_to_contact === false || donor.consent_status === 'withdrawn') continue;

    // Cooldown filter: 3-month medical cooldown
    if (!isDonorEligibleForNotification(donor)) continue;

    // Blood group compatibility: incompatible groups must NEVER appear
    if (!isGroupCompatible(request.blood_group, donor.blood_group)) continue;

    const evaluation = evaluateDonorMatch(donor, request, donor.distance_km, maxRadiusKm);
    if (!evaluation.isCompatible || evaluation.matchScore <= 0) continue;

    // Human-readable verification label
    const isVerified = ['verified', 'verified_by_authorized_personnel'].includes(donor.verification_status);
    const verificationLabel = isVerified ? 'Verified Donor' : 'Self-Reported Volunteer';

    candidateMap.set(donorId, {
      donor_id: donorId,
      name: donor.name || 'Voluntary Donor',
      blood_group: donor.blood_group,
      city: donor.city,
      area: donor.area,
      distance_km: donor.distance_km != null ? Number(donor.distance_km) : null,
      distance_band: donor.distance_band || 'Proximity verified',
      verification_status: donor.verification_status || 'self_reported',
      verification_label: verificationLabel,
      availability_status: donor.availability_status || 'available',
      last_donation_date: donor.last_donation_date || null,
      telegram_chat_id: donor.telegram_chat_id || null,
      telegram_opt_in: donor.telegram_opt_in === true,
      match_score: evaluation.matchScore,
      match_reasons: evaluation.reasons,
      disclaimer: MEDICAL_SAFETY_DISCLAIMER
    });
  }

  const candidateArray = Array.from(candidateMap.values());

  // Apply deterministic multi-tier ranking
  return candidateArray.sort((a, b) => compareDonorsForRequest(a, b, request));
}

module.exports = {
  isGroupCompatible,
  getCompatibleDonorGroups,
  evaluateDonorMatch,
  compareDonorsForRequest,
  rankCandidateDonors,
  DONOR_TO_RECIPIENT_MATRIX,
  REQUESTER_TO_DONOR_COMPATIBILITY,
  RBC_COMPATIBILITY_MATRIX,
  MEDICAL_SAFETY_DISCLAIMER
};
