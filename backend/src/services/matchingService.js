/**
 * BloodBridge Vision-X: Deterministic Donor Matching & Ranking Engine
 * 
 * Clinical Boundary Notice:
 * BloodBridge is a coordination platform, NOT a medical authority.
 * Blood group and location matching must never be presented as clinical confirmation
 * of compatibility. Final eligibility, testing, and transfusion decisions belong to
 * authorized blood bank pathologists and attending clinicians.
 */

const { isDonorEligibleForNotification } = require('./cooldownService');

// Medically grounded ABO/Rh compatibility rules for whole blood / red blood cells
const RBC_COMPATIBILITY_MATRIX = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-']
};

/**
 * Check if a donor blood group is compatible for a patient request
 */
function isGroupCompatible(patientGroup, donorGroup) {
  if (!patientGroup || !donorGroup) return false;
  const compatibleDonors = RBC_COMPATIBILITY_MATRIX[patientGroup.trim().toUpperCase()];
  if (!compatibleDonors) return false;
  return compatibleDonors.includes(donorGroup.trim().toUpperCase());
}

/**
 * Compute deterministic match score and detailed explanation reasons
 * 
 * Factors:
 * 1. Blood group exact match vs universal compatible donor (Weight: 35%)
 * 2. Spatial proximity within radius (Weight: 35%)
 * 3. Verification status: verified vs pending (Weight: 20%)
 * 4. Donation freshness / interval (Weight: 10%)
 */
function evaluateDonorMatch(donor, request, distanceKm, maxRadiusKm = 50) {
  const reasons = [];
  let score = 0.0;

  // 1. Group factor
  if (donor.blood_group === request.blood_group) {
    score += 0.35;
    reasons.push(`Exact blood group match (${donor.blood_group})`);
  } else if (isGroupCompatible(request.blood_group, donor.blood_group)) {
    score += 0.25;
    reasons.push(`Compatible donor blood group (${donor.blood_group} for ${request.blood_group})`);
  } else {
    // Incompatible: zero score
    return {
      matchScore: 0,
      isCompatible: false,
      reasons: ['Incompatible blood group according to standard ABO/Rh rules']
    };
  }

  // 2. Spatial proximity factor
  const effectiveDist = Math.max(0, distanceKm || 0);
  const proximityRatio = Math.max(0, 1 - (effectiveDist / maxRadiusKm));
  const proximityPoints = 0.35 * proximityRatio;
  score += proximityPoints;
  
  if (effectiveDist <= 5) {
    reasons.push(`Very close proximity (${Math.round(effectiveDist * 10) / 10} km)`);
  } else if (effectiveDist <= 15) {
    reasons.push(`Close proximity (${Math.round(effectiveDist * 10) / 10} km)`);
  } else {
    reasons.push(`Within configured search radius (${Math.round(effectiveDist * 10) / 10} km)`);
  }

  // 3. Verification status factor
  if (donor.verification_status === 'verified') {
    score += 0.20;
    reasons.push('Verified donor profile');
  } else if (donor.verification_status === 'pending_verification') {
    score += 0.10;
    reasons.push('Registration pending administrative verification');
  } else {
    // Inactive or rejected
    return {
      matchScore: 0,
      isCompatible: false,
      reasons: ['Donor profile is not active or verified']
    };
  }

  // 4. Donation freshness factor
  if (donor.last_donation_date) {
    const lastDate = new Date(donor.last_donation_date);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 90) {
      score += 0.10;
      reasons.push(`Eligible donation interval (${daysSince} days since last donation)`);
    } else {
      score += 0.02;
      reasons.push(`Recent donation (${daysSince} days ago; subject to clinical interval screening)`);
    }
  } else {
    score += 0.08;
    reasons.push('First-time or unrecorded donation date; will require routine screening');
  }

  const finalScore = Math.round(score * 100) / 100;

  return {
    matchScore: finalScore,
    isCompatible: true,
    reasons,
    disclaimer: 'Potential donor based on the selected blood group and location. Confirm eligibility and compatibility with the authorized blood bank or healthcare professional.'
  };
}

/**
 * Filter and rank donors for a given blood request
 */
function rankCandidateDonors(donorsList, request, maxRadiusKm = 50) {
  const ranked = [];

  for (const donor of donorsList) {
    // Hard consent, availability, and 3-month cooldown checks
    if (!isDonorEligibleForNotification(donor)) continue;

    // Check ABO compatibility
    if (!isGroupCompatible(request.blood_group, donor.blood_group)) continue;

    const evaluation = evaluateDonorMatch(donor, request, donor.distance_km, maxRadiusKm);
    if (!evaluation.isCompatible || evaluation.matchScore <= 0) continue;

    ranked.push({
      donor_id: donor.donor_id || donor.id,
      name: donor.name,
      blood_group: donor.blood_group,
      city: donor.city,
      area: donor.area,
      distance_km: donor.distance_km,
      distance_band: donor.distance_band,
      verification_status: donor.verification_status,
      availability_status: donor.availability_status,
      last_donation_date: donor.last_donation_date,
      match_score: evaluation.matchScore,
      match_reasons: evaluation.reasons,
      disclaimer: evaluation.disclaimer
    });
  }

  // Sort descending by match_score, then ascending by distance
  return ranked.sort((a, b) => {
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score;
    }
    return (a.distance_km || 0) - (b.distance_km || 0);
  });
}

module.exports = {
  isGroupCompatible,
  evaluateDonorMatch,
  rankCandidateDonors,
  RBC_COMPATIBILITY_MATRIX
};
