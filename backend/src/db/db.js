const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let pool = null;
let supabase = null;
let isPostgres = false;

// In-Memory store for resilient local development / testing fallback
const localStore = {
  users: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'admin@bloodbridge.org',
      password_hash: '$2b$10$sIhjgSBzboFPE59nYWXUWOzdU/4L78.GRZeGubRMxMAvF3do3/wH6', // BloodBridge2026!
      name: 'System Administrator',
      role: 'admin',
      phone: '+91 98765 00001',
      created_at: new Date('2026-01-01').toISOString()
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      email: 'requester@bloodbridge.org',
      password_hash: '$2b$10$sIhjgSBzboFPE59nYWXUWOzdU/4L78.GRZeGubRMxMAvF3do3/wH6',
      name: 'Priya Sharma (Requester)',
      role: 'requester',
      phone: '+91 98765 00002',
      created_at: new Date('2026-01-01').toISOString()
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      email: 'donor@bloodbridge.org',
      password_hash: '$2b$10$sIhjgSBzboFPE59nYWXUWOzdU/4L78.GRZeGubRMxMAvF3do3/wH6',
      name: 'Rahul Verma (Donor)',
      role: 'donor',
      phone: '+91 98765 00003',
      created_at: new Date('2026-01-01').toISOString()
    }
  ],
  donors: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      user_id: 'c0000000-0000-0000-0000-000000000003',
      name: 'Rahul Verma',
      blood_group: 'B+',
      city: 'Jaipur',
      area: 'Malviya Nagar',
      postal_code: '302017',
      latitude: 26.8532,
      longitude: 75.8239,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-05-10',
      source: 'platform',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      user_id: null,
      name: 'Ananya Sen',
      blood_group: 'B+',
      city: 'Jaipur',
      area: 'C-Scheme',
      postal_code: '302001',
      latitude: 26.9089,
      longitude: 75.8012,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-06-15',
      source: 'platform',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000003',
      user_id: null,
      name: 'Amit Patel',
      blood_group: 'O-',
      city: 'Jaipur',
      area: 'Mansarovar',
      postal_code: '302020',
      latitude: 26.8614,
      longitude: 75.7656,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-04-20',
      source: 'platform',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000004',
      user_id: null,
      name: 'Vikram Rathore',
      blood_group: 'O+',
      city: 'Jaipur',
      area: 'Vaishali Nagar',
      postal_code: '302021',
      latitude: 26.9028,
      longitude: 75.7431,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-07-01',
      source: 'google_forms',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000005',
      user_id: null,
      name: 'Kavita Joshi',
      blood_group: 'A+',
      city: 'Jaipur',
      area: 'Raja Park',
      postal_code: '302004',
      latitude: 26.8945,
      longitude: 75.8291,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'pending_verification',
      last_donation_date: '2026-08-11',
      source: 'google_forms',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000006',
      user_id: null,
      name: 'Suresh Meena',
      blood_group: 'AB+',
      city: 'Jaipur',
      area: 'Jagatpura',
      postal_code: '302017',
      latitude: 26.8225,
      longitude: 75.8450,
      availability_status: 'unavailable',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-09-01',
      source: 'platform',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000007',
      user_id: null,
      name: 'Deepak Kumar',
      blood_group: 'B+',
      city: 'Jaipur',
      area: 'Tonk Road',
      postal_code: '302015',
      latitude: 26.8710,
      longitude: 75.8020,
      availability_status: 'available',
      consent_to_contact: false, // Consent withdrawn!
      verification_status: 'verified',
      last_donation_date: '2026-03-12',
      source: 'platform',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000008',
      user_id: null,
      name: 'Rohit Sharma',
      blood_group: 'B+',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      area: 'Indirapuram',
      postal_code: '201014',
      latitude: 28.6415,
      longitude: 77.3714,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-06-20',
      source: 'google_forms',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000009',
      user_id: null,
      name: 'Neha Gupta',
      blood_group: 'O+',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      area: 'Vaishali',
      postal_code: '201010',
      latitude: 28.6482,
      longitude: 77.3392,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-07-15',
      source: 'platform',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000010',
      user_id: null,
      name: 'Mohd Tariq',
      blood_group: 'B-',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      area: 'Raj Nagar Extension',
      postal_code: '201017',
      latitude: 28.7042,
      longitude: 77.4418,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-08-05',
      source: 'google_forms',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000011',
      user_id: null,
      name: 'Aditya Srivastava',
      blood_group: 'O+',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      area: 'Hazratganj',
      postal_code: '226001',
      latitude: 26.8500,
      longitude: 80.9400,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-05-18',
      source: 'platform',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000012',
      user_id: null,
      name: 'Fatima Zaidi',
      blood_group: 'A+',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      area: 'Gomti Nagar',
      postal_code: '226010',
      latitude: 26.8530,
      longitude: 80.9980,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-07-22',
      source: 'platform',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000013',
      user_id: null,
      name: 'Vikas Shukla',
      blood_group: 'B+',
      city: 'Kanpur',
      state: 'Uttar Pradesh',
      area: 'Swaroop Nagar',
      postal_code: '208002',
      latitude: 26.4780,
      longitude: 80.3250,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-06-11',
      source: 'google_forms',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000014',
      user_id: null,
      name: 'Shivam Pandey',
      blood_group: 'O-',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      area: 'Lanka (BHU)',
      postal_code: '221005',
      latitude: 25.2800,
      longitude: 82.9900,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-04-14',
      source: 'platform',
      created_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000015',
      user_id: null,
      name: 'Manish Yadav',
      blood_group: 'AB+',
      city: 'Prayagraj',
      state: 'Uttar Pradesh',
      area: 'Civil Lines',
      postal_code: '211001',
      latitude: 25.4500,
      longitude: 81.8340,
      availability_status: 'available',
      consent_to_contact: true,
      verification_status: 'verified',
      last_donation_date: '2026-08-01',
      source: 'google_forms',
      created_at: new Date().toISOString()
    }
  ],
  blood_banks: [
    // Uttar Pradesh Verified Centres
    {
      id: 'bb-up-001',
      name: "King George's Medical University (KGMU) Blood Bank",
      address: 'Shah Mina Road, Chowk',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      postal_code: '226003',
      phone: '+91 522 2257450',
      email: 'transfusionmedicine@kgmcindia.edu',
      latitude: 26.8687,
      longitude: 80.9157,
      operating_hours: '24/7 Emergency Transfusion Service',
      verification_status: 'verified',
      source_of_info: 'UP State Blood Transfusion Council / e-RaktKosh',
      inventory_summary: { 'A+': 18, 'A-': 4, 'B+': 26, 'B-': 6, 'AB+': 8, 'AB-': 2, 'O+': 34, 'O-': 7 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-002',
      name: 'Sanjay Gandhi Postgraduate Institute (SGPGI) Blood Centre',
      address: 'Raebareli Road',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      postal_code: '226014',
      phone: '+91 522 2494000',
      email: 'bloodbank@sgpgi.ac.in',
      latitude: 26.7490,
      longitude: 80.9388,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'Autonomous Super-Specialty Medical Institute',
      inventory_summary: { 'A+': 14, 'A-': 3, 'B+': 20, 'B-': 4, 'AB+': 6, 'AB-': 2, 'O+': 25, 'O-': 5 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-003',
      name: 'Dr. Ram Manohar Lohia Institute of Medical Sciences (RMLIMS)',
      address: 'Vibhuti Khand, Gomti Nagar',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      postal_code: '226010',
      phone: '+91 522 6692000',
      email: 'bloodbank@drrmlims.ac.in',
      latitude: 26.8620,
      longitude: 81.0120,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'State Government Medical Institute',
      inventory_summary: { 'A+': 11, 'A-': 2, 'B+': 16, 'B-': 3, 'AB+': 5, 'AB-': 1, 'O+': 19, 'O-': 4 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-004',
      name: 'L.L.R. Hospital & GSVM Medical College Blood Centre',
      address: 'Swaroop Nagar',
      city: 'Kanpur',
      state: 'Uttar Pradesh',
      postal_code: '208002',
      phone: '+91 512 2535483',
      email: 'gsvmbloodcentre@up.gov.in',
      latitude: 26.4785,
      longitude: 80.3248,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'Government Medical College Hospital',
      inventory_summary: { 'A+': 15, 'A-': 3, 'B+': 22, 'B-': 5, 'AB+': 7, 'AB-': 2, 'O+': 28, 'O-': 6 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-005',
      name: 'Sir Sunderlal Hospital (IMS-BHU) Regional Blood Centre',
      address: 'Banaras Hindu University Campus, Lanka',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      postal_code: '221005',
      phone: '+91 542 2369291',
      email: 'bloodbank@bhu.ac.in',
      latitude: 25.2750,
      longitude: 82.9960,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'Central University Teaching Hospital',
      inventory_summary: { 'A+': 16, 'A-': 4, 'B+': 24, 'B-': 5, 'AB+': 8, 'AB-': 3, 'O+': 30, 'O-': 6 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-006',
      name: 'Swaroop Rani Nehru (SRN) Hospital & MLN Medical College',
      address: 'MG Marg, George Town',
      city: 'Prayagraj',
      state: 'Uttar Pradesh',
      postal_code: '211001',
      phone: '+91 532 2256058',
      email: 'mlnbloodcentre@up.gov.in',
      latitude: 25.4410,
      longitude: 81.8530,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'Government Medical College Hospital',
      inventory_summary: { 'A+': 12, 'A-': 3, 'B+': 18, 'B-': 4, 'AB+': 6, 'AB-': 2, 'O+': 22, 'O-': 5 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-007',
      name: 'S.N. Medical College Blood Bank',
      address: 'Hospital Road, Near Raja Ki Mandi',
      city: 'Agra',
      state: 'Uttar Pradesh',
      postal_code: '282002',
      phone: '+91 562 2260353',
      email: 'snmcbloodcentre@up.gov.in',
      latitude: 27.1860,
      longitude: 78.0050,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'Government Medical College Hospital',
      inventory_summary: { 'A+': 10, 'A-': 2, 'B+': 15, 'B-': 3, 'AB+': 5, 'AB-': 1, 'O+': 20, 'O-': 4 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-008',
      name: 'MMG District Hospital Blood Centre',
      address: 'GT Road, Model Town',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      postal_code: '201001',
      phone: '+91 120 2850100',
      email: 'mmgbloodbank@up.gov.in',
      latitude: 28.6678,
      longitude: 77.4350,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'District Health Administration',
      inventory_summary: { 'A+': 14, 'A-': 3, 'B+': 20, 'B-': 4, 'AB+': 7, 'AB-': 2, 'O+': 25, 'O-': 6 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-009',
      name: 'District Hospital Blood Bank (Sector 39)',
      address: 'Sector 39',
      city: 'Noida',
      state: 'Uttar Pradesh',
      postal_code: '201301',
      phone: '+91 120 2444300',
      email: 'noidadistricthospital@up.gov.in',
      latitude: 28.5680,
      longitude: 77.3480,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'Department of Health & Family Welfare UP',
      inventory_summary: { 'A+': 12, 'A-': 3, 'B+': 17, 'B-': 3, 'AB+': 5, 'AB-': 1, 'O+': 21, 'O-': 5 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-010',
      name: 'LLRM Medical College Blood Centre',
      address: 'Garh Road',
      city: 'Meerut',
      state: 'Uttar Pradesh',
      postal_code: '250004',
      phone: '+91 121 2760888',
      email: 'llrmbloodcentre@up.gov.in',
      latitude: 28.9740,
      longitude: 77.7380,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'Government Medical College Hospital',
      inventory_summary: { 'A+': 11, 'A-': 2, 'B+': 16, 'B-': 3, 'AB+': 6, 'AB-': 2, 'O+': 19, 'O-': 4 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-011',
      name: 'B.R.D. Medical College Blood Bank',
      address: 'Medical College Campus',
      city: 'Gorakhpur',
      state: 'Uttar Pradesh',
      postal_code: '273013',
      phone: '+91 551 2310115',
      email: 'brdbloodbank@up.gov.in',
      latitude: 26.7900,
      longitude: 83.3980,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'Government Medical College Hospital',
      inventory_summary: { 'A+': 13, 'A-': 3, 'B+': 19, 'B-': 4, 'AB+': 6, 'AB-': 2, 'O+': 24, 'O-': 5 },
      last_updated: new Date().toISOString()
    },
    {
      id: 'bb-up-012',
      name: 'SMS Hospital Regional Blood Bank',
      address: 'JLN Marg, Ashok Nagar',
      city: 'Jaipur',
      state: 'Rajasthan',
      postal_code: '302004',
      phone: '+91 141 2518200',
      email: 'bloodbank@smshospital.org',
      latitude: 26.8978,
      longitude: 75.8167,
      operating_hours: '24/7 Emergency Service',
      verification_status: 'verified',
      source_of_info: 'Government Health Authority',
      inventory_summary: { 'A+': 18, 'A-': 5, 'B+': 24, 'B-': 6, 'AB+': 9, 'AB-': 3, 'O+': 32, 'O-': 8 },
      last_updated: new Date().toISOString()
    }
  ],
  blood_requests: [
    {
      id: 'req00000-0000-0000-0000-000000000001',
      requester_id: 'b0000000-0000-0000-0000-000000000002',
      patient_name: 'Sunita Sharma',
      blood_group: 'B+',
      units_needed: 2,
      hospital_name: 'SMS Hospital Emergency Ward',
      hospital_address: 'JLN Marg, Jaipur',
      city: 'Jaipur',
      latitude: 26.8978,
      longitude: 75.8167,
      urgency: 'emergency',
      needed_by: new Date(Date.now() + 86400000).toISOString(),
      description: 'Urgent requirement for cardiac surgery scheduled tomorrow morning. 2 units of B+ required.',
      contact_phone: '+91 98765 00002',
      contact_preference: 'phone',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  rag_documents: [
    {
      id: 'r0000000-0000-0000-0000-000000000001',
      title: 'General Blood Donation Eligibility Guidelines',
      source: 'National Blood Transfusion Council (NBTC) & WHO',
      category: 'eligibility',
      status: 'approved',
      content: 'Donors must be between 18 and 65 years of age and weigh at least 45 kg (50 kg for certain whole blood donations). Hemoglobin levels should not be less than 12.5 g/dL. The donation interval between whole blood donations must be at least 90 days (3 months) for male donors and 120 days (4 months) for female donors. Donors should have had adequate sleep (at least 6 hours), should not have consumed alcohol within 24 hours prior to donation, and should eat a light meal 2 to 3 hours beforehand. Persons with active infections, fever, untreated high blood pressure, jaundice, hepatitis B or C, HIV, or heart disease are temporarily or permanently deferred. Always consult healthcare professionals at authorized blood donation centers.',
      chunk_count: 3,
      created_at: new Date().toISOString()
    },
    {
      id: 'r0000000-0000-0000-0000-000000000002',
      title: 'Blood Group Compatibility and Transfusion Science',
      source: 'Directorate General of Health Services (DGHS)',
      category: 'guidelines',
      status: 'approved',
      content: 'Blood group compatibility is determined by ABO and Rh (Rhesus) antigens. Type O-negative is known as the universal red blood cell donor, meaning O-negative red blood cells can be administered to emergency patients of any blood group when group-specific blood is not immediately obtainable. Type AB-positive individuals are universal plasma recipients. However, BloodBridge is strictly a coordination and search navigation platform, NOT a medical authority. Blood group compatibility and matching algorithms on the platform indicate potential donor candidates, but NEVER constitute clinical confirmation of compatibility. Final cross-matching, antibody screening, and transfusion safety are strictly the clinical responsibility of licensed blood bank pathologists and attending physicians.',
      chunk_count: 3,
      created_at: new Date().toISOString()
    },
    {
      id: 'r0000000-0000-0000-0000-000000000003',
      title: 'BloodBridge Platform Workflow and Emergency Coordination Guide',
      source: 'BloodBridge Vision-X Architecture Specification',
      category: 'workflow',
      status: 'approved',
      content: 'When an emergency blood requirement arises, the requester submits the patient blood group, units needed, hospital name, location, and urgency level. The platform executes a deterministic spatial query using PostGIS ST_DWithin and ST_Distance to identify verified and available donors within the search radius who have given explicit consent to be contacted. Exact home addresses and GPS coordinates of donors are strictly protected and never displayed in public search results; only fuzzy distance bands such as "Within 2 km" or approximate city areas are shown. Requesters can contact potential donors or reach out directly to 24/7 verified regional blood banks.',
      chunk_count: 2,
      created_at: new Date().toISOString()
    }
  ],
  rag_chunks: [],
  integration_logs: [],
  audit_events: [],
  password_resets: [],
  credit_ledger: [
    {
      id: 'cl-00000000-0000-0000-0000-000000000001',
      user_id: 'c0000000-0000-0000-0000-000000000003',
      donor_id: 'd0000000-0000-0000-0000-000000000001',
      event_type: 'profile_completion',
      points: 50,
      timestamp: new Date('2026-01-02').toISOString(),
      idempotency_key: 'seed_profile_c00000000003',
      verification_status: 'verified',
      reason: 'Profile Completion & Voluntary Consent',
      metadata: {}
    },
    {
      id: 'cl-00000000-0000-0000-0000-000000000002',
      user_id: 'c0000000-0000-0000-0000-000000000003',
      donor_id: 'd0000000-0000-0000-0000-000000000001',
      event_type: 'availability_update',
      points: 10,
      timestamp: new Date('2026-02-01').toISOString(),
      idempotency_key: 'seed_avail_c00000000003',
      verification_status: 'verified',
      reason: 'Monthly Availability Confirmation',
      metadata: {}
    }
  ],
  whatsapp_notifications: []
};

// Precise Haversine distance in kilometers (exact spherical match to PostGIS ST_Distance)
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format privacy-safe distance band
function getPrivacySafeDistanceBand(distanceKm) {
  if (distanceKm <= 2) return 'Within 2 km';
  if (distanceKm <= 5) return 'Within 5 km';
  if (distanceKm <= 10) return 'Within 10 km';
  if (distanceKm <= 25) return 'Within 25 km';
  return `Within ${Math.round(distanceKm)} km`;
}

// Initialize Database connection with PostGIS & schema verification
async function initDb() {
  if (config.databaseUrl) {
    try {
      // Connect to external PostgreSQL (e.g. Supabase)
      pool = new Pool({ connectionString: config.databaseUrl, ssl: { rejectUnauthorized: false } });
      const client = await pool.connect();
      console.log('PostgreSQL connection established successfully.');
      isPostgres = true;

      // 1. Check PostGIS extension
      try {
        const postgisRes = await client.query('SELECT PostGIS_Version();');
        console.log(`PostGIS Extension Active: Version ${postgisRes.rows[0].postgis_version}`);
      } catch (pgErr) {
        console.warn('PostGIS Extension Notice: Not detected or not yet enabled. Run "CREATE EXTENSION IF NOT EXISTS postgis;" in Supabase SQL editor.');
      }

      // 2. Check GiST Spatial Index
      try {
        const idxRes = await client.query(`
          SELECT indexname FROM pg_indexes 
          WHERE tablename = 'donors' AND indexname = 'donors_location_gist_idx';
        `);
        if (idxRes.rows.length > 0) {
          console.log('Spatial GiST Index verified on donors(location).');
        } else {
          console.log('Notice: Spatial index "donors_location_gist_idx" not yet present in database. Run migration 002_postgis_spatial.sql.');
        }
      } catch (idxErr) {
        // Table may not exist yet
      }

      client.release();
    } catch (err) {
      console.warn('Could not connect to external PostgreSQL, falling back to embedded resilient local store:', err.message);
      isPostgres = false;
    }
  } else {
    console.log('No DATABASE_URL configured. Operating in embedded resilient store mode (with full PostGIS mathematics and seeded records).');
    isPostgres = false;
  }

  if (config.supabaseUrl && config.supabaseKey) {
    try {
      supabase = createClient(config.supabaseUrl, config.supabaseKey);
      console.log('Supabase Client initialized successfully.');
    } catch (err) {
      console.warn('Supabase Client init notice:', err.message);
    }
  }
}

// Spatial search for donors using PostGIS ST_DWithin and ST_Distance or Haversine fallback
async function searchNearbyDonors({
  latitude,
  longitude,
  radiusKm = 25,
  bloodGroup = null,
  limit = 20,
  offset = 0
}) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const radius = parseFloat(radiusKm);

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error('Invalid latitude or longitude supplied for spatial search.');
  }

  if (isPostgres && pool) {
    const query = `
      SELECT * FROM search_nearby_donors($1, $2, $3, $4, $5, $6);
    `;
    const res = await pool.query(query, [lat, lon, radius, bloodGroup || null, limit, offset]);
    return res.rows;
  }

  // Local fallback with exact spherical PostGIS logic
  return localStore.donors
    .filter((d) => {
      if (!d.consent_to_contact) return false;
      if (d.availability_status !== 'available') return false;
      if (d.verification_status !== 'verified' && d.verification_status !== 'pending_verification') return false;
      if (bloodGroup && d.blood_group !== bloodGroup) return false;
      if (d.latitude == null || d.longitude == null) return false;

      const dist = calculateHaversineDistanceKm(lat, lon, d.latitude, d.longitude);
      return dist <= radius;
    })
    .map((d) => {
      const dist = calculateHaversineDistanceKm(lat, lon, d.latitude, d.longitude);
      return {
        donor_id: d.id,
        name: d.name,
        blood_group: d.blood_group,
        city: d.city,
        area: d.area,
        availability_status: d.availability_status,
        verification_status: d.verification_status,
        distance_km: Math.round(dist * 10) / 10,
        distance_band: getPrivacySafeDistanceBand(dist),
        last_donation_date: d.last_donation_date
        // Notice: Exact latitude and longitude are OMITTED for privacy protection!
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(offset, offset + limit);
}





// Private donor search specifically for WhatsApp notifications.
// This function returns phone numbers only to the trusted backend.
async function searchNearbyWhatsAppDonors({
  latitude,
  longitude,
  radiusKm = 25,
  bloodGroup = null,
  limit = 20
}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const radius = Number(radiusKm);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error('Invalid latitude for WhatsApp donor search.');
  }

  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new Error('Invalid longitude for WhatsApp donor search.');
  }

  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error('Invalid radius for WhatsApp donor search.');
  }

  if (bloodGroup && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) {
    throw new Error('Invalid blood group for WhatsApp donor search.');
  }

  if (isPostgres && pool) {
    const query = `
      SELECT *
      FROM public.search_nearby_whatsapp_donors($1, $2, $3, $4, $5);
    `;

    const result = await pool.query(query, [
      lat,
      lon,
      radius,
      bloodGroup || null,
      safeLimit
    ]);

    return result.rows.map((r) => ({
      ...r,
      id: r.donor_id,
      donor_id: r.donor_id,
      whatsapp_opt_in: true,
      consent_to_contact: true,
      consent_status: 'consented',
      availability_status: 'available'
    }));
  }

  // Local fallback: apply the same consent and availability checks.
  const now = new Date();

  return (localStore.donors || [])
    .filter((d) => {
      if (d.whatsapp_opt_in !== true) return false;
      if (!d.whatsapp_opt_in_at) return false;

      if (
        d.whatsapp_opt_out_at &&
        new Date(d.whatsapp_opt_in_at) <= new Date(d.whatsapp_opt_out_at)
      ) return false;

      if (d.consent_to_contact !== true) return false;
      if (d.consent_status !== 'consented') return false;
      if (d.availability_status !== 'available') return false;

      if (
        d.verification_status !== 'verified' &&
        d.verification_status !== 'pending_verification'
      ) return false;

      if (!d.phone || !d.location && (d.latitude == null || d.longitude == null)) {
        return false;
      }

      if (d.cooldown_until && new Date(d.cooldown_until) > now) return false;

      if (d.donated_last_3_months === true && !d.cooldown_until) {
        return false;
      }

      if (bloodGroup && d.blood_group !== bloodGroup) return false;
      if (d.latitude == null || d.longitude == null) return false;

      return calculateHaversineDistanceKm(
        lat, lon, d.latitude, d.longitude
      ) <= radius;
    })
    .map((d) => {
      const distance = calculateHaversineDistanceKm(
        lat, lon, d.latitude, d.longitude
      );

      return {
        id: d.id,
        donor_id: d.id,
        name: d.name,
        phone: d.phone,
        blood_group: d.blood_group,
        city: d.city,
        area: d.area,
        verification_status: d.verification_status,
        distance_km: distance,
        distance_band: getPrivacySafeDistanceBand(distance),
        whatsapp_opt_in: true,
        consent_to_contact: true,
        consent_status: 'consented',
        availability_status: 'available'
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, safeLimit);
}

// Spatial search for Blood Banks
async function searchNearbyBloodBanks({ latitude, longitude, radiusKm = 50, limit = 20 }) {
  const lat = latitude ? parseFloat(latitude) : null;
  const lon = longitude ? parseFloat(longitude) : null;

  return localStore.blood_banks
    .filter((bb) => bb.verification_status === 'verified')
    .map((bb) => {
      let distance_km = null;
      let distance_band = 'Distance not available';
      if (lat != null && lon != null && bb.latitude && bb.longitude) {
        const dist = calculateHaversineDistanceKm(lat, lon, bb.latitude, bb.longitude);
        distance_km = Math.round(dist * 10) / 10;
        distance_band = getPrivacySafeDistanceBand(dist);
      }
      return {
        ...bb,
        distance_km,
        distance_band
      };
    })
    .filter((bb) => {
      if (radiusKm && bb.distance_km != null) {
        return bb.distance_km <= radiusKm;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.distance_km != null && b.distance_km != null) {
        return a.distance_km - b.distance_km;
      }
      return 0;
    })
    .slice(0, limit);
}


// WhatsApp notification persistence
async function saveWhatsAppNotification(job) {
  if (!isPostgres || !pool) {
    throw new Error('PostgreSQL is not connected. Cannot persist WhatsApp notification.');
  }

  const query = `
    INSERT INTO whatsapp_notifications (
      request_id,
      donor_id,
      recipient_phone,
      template_name,
      message_body,
      status,
      provider_message_id,
      action_token,
      error_message
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    job.request_id,
    job.donor_id,
    job.recipient_phone,
    job.template_name || 'emergency_blood_request_v1',
    job.message_body,
    job.status || 'queued',
    job.provider_message_id || null,
    job.action_token,
    job.error_message || null
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getWhatsAppNotificationByToken(token) {
  if (!isPostgres || !pool) {
    throw new Error('PostgreSQL is not connected.');
  }

  const result = await pool.query(
    'SELECT * FROM whatsapp_notifications WHERE action_token = $1 LIMIT 1',
    [token]
  );

  return result.rows[0] || null;
}

async function updateWhatsAppNotification(id, updates) {
  if (!isPostgres || !pool) {
    throw new Error('PostgreSQL is not connected.');
  }

  const allowedFields = [
    'status',
    'provider_message_id',
    'delivery_status',
    'donor_response',
    'responded_at',
    'error_message'
  ];

  const entries = Object.entries(updates).filter(([key]) =>
    allowedFields.includes(key)
  );

  if (!entries.length) {
    throw new Error('No valid notification fields supplied.');
  }

  const setClause = entries
    .map(([key], index) => `${key} = $${index + 2}`)
    .join(', ');

  const values = entries.map(([, value]) => value);

  const result = await pool.query(
    `UPDATE whatsapp_notifications
     SET ${setClause}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, ...values]
  );

  return result.rows[0] || null;
}

module.exports = {
  initDb,
  searchNearbyDonors,
  searchNearbyBloodBanks,
  localStore,
  calculateHaversineDistanceKm,
  getPrivacySafeDistanceBand,
  isPostgresConnected: () => isPostgres,
  getPool: () => pool,
  getSupabase: () => supabase,
  saveWhatsAppNotification,
  getWhatsAppNotificationByToken,
  updateWhatsAppNotification,
  searchNearbyWhatsAppDonors,
};
