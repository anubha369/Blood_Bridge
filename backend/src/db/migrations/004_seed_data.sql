-- ============================================================================
-- BloodBridge Vision-X Seed Data
-- Migration: 004_seed_data.sql
-- Description: Realistic initial data for testing, evaluation, and demos
-- ============================================================================

-- Default Users (password for all demo accounts: 'BloodBridge2026!')
-- bcrypt hash for 'BloodBridge2026!': $2b$10$sIhjgSBzboFPE59nYWXUWOzdU/4L78.GRZeGubRMxMAvF3do3/wH6
INSERT INTO users (id, email, password_hash, name, role, phone)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin@bloodbridge.org', '$2b$10$sIhjgSBzboFPE59nYWXUWOzdU/4L78.GRZeGubRMxMAvF3do3/wH6', 'System Administrator', 'admin', '+91 98765 00001'),
    ('b0000000-0000-0000-0000-000000000002', 'requester@bloodbridge.org', '$2b$10$sIhjgSBzboFPE59nYWXUWOzdU/4L78.GRZeGubRMxMAvF3do3/wH6', 'Priya Sharma (Requester)', 'requester', '+91 98765 00002'),
    ('c0000000-0000-0000-0000-000000000003', 'donor@bloodbridge.org', '$2b$10$sIhjgSBzboFPE59nYWXUWOzdU/4L78.GRZeGubRMxMAvF3do3/wH6', 'Rahul Verma (Donor)', 'donor', '+91 98765 00003')
ON CONFLICT (email) DO NOTHING;

-- Seed Donors with PostGIS geographic points (Sample cluster in Delhi/NCR / Jaipur)
INSERT INTO donors (id, user_id, name, blood_group, city, area, postal_code, latitude, longitude, availability_status, consent_to_contact, verification_status, last_donation_date, source)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Rahul Verma', 'B+', 'Jaipur', 'Malviya Nagar', '302017', 26.8532, 75.8239, 'available', true, 'verified', '2026-05-10', 'platform'),
    ('d0000000-0000-0000-0000-000000000002', NULL, 'Ananya Sen', 'B+', 'Jaipur', 'C-Scheme', '302001', 26.9089, 75.8012, 'available', true, 'verified', '2026-06-15', 'platform'),
    ('d0000000-0000-0000-0000-000000000003', NULL, 'Amit Patel', 'O-', 'Jaipur', 'Mansarovar', '302020', 26.8614, 75.7656, 'available', true, 'verified', '2026-04-20', 'platform'),
    ('d0000000-0000-0000-0000-000000000004', NULL, 'Vikram Rathore', 'O+', 'Jaipur', 'Vaishali Nagar', '302021', 26.9028, 75.7431, 'available', true, 'verified', '2026-07-01', 'google_forms'),
    ('d0000000-0000-0000-0000-000000000005', NULL, 'Kavita Joshi', 'A+', 'Jaipur', 'Raja Park', '302004', 26.8945, 75.8291, 'available', true, 'pending_verification', '2026-08-11', 'google_forms'),
    ('d0000000-0000-0000-0000-000000000006', NULL, 'Suresh Meena', 'AB+', 'Jaipur', 'Jagatpura', '302017', 26.8225, 75.8450, 'unavailable', true, 'verified', '2026-09-01', 'platform'),
    ('d0000000-0000-0000-0000-000000000007', NULL, 'Deepak Kumar', 'B+', 'Jaipur', 'Tonk Road', '302015', 26.8710, 75.8020, 'available', false, 'verified', '2026-03-12', 'platform'), -- Consent withdrawn
    ('d0000000-0000-0000-0000-000000000008', NULL, 'Rohit Sharma', 'B+', 'Ghaziabad', 'Indirapuram', '201014', 28.6415, 77.3714, 'available', true, 'verified', '2026-06-20', 'google_forms'),
    ('d0000000-0000-0000-0000-000000000009', NULL, 'Neha Gupta', 'O+', 'Ghaziabad', 'Vaishali', '201010', 28.6482, 77.3392, 'available', true, 'verified', '2026-07-15', 'platform'),
    ('d0000000-0000-0000-0000-000000000010', NULL, 'Mohd Tariq', 'B-', 'Ghaziabad', 'Raj Nagar Extension', '201017', 28.7042, 77.4418, 'available', true, 'verified', '2026-08-05', 'google_forms'),
    ('d0000000-0000-0000-0000-000000000011', NULL, 'Dr. Manish Trivedi', 'O-', 'Lucknow', 'Gomti Nagar', '226010', 26.8500, 80.9920, 'available', true, 'verified', '2026-06-10', 'platform'),
    ('d0000000-0000-0000-0000-000000000012', NULL, 'Siddharth Mishra', 'B+', 'Lucknow', 'Aliganj', '226024', 26.8920, 80.9410, 'available', true, 'verified', '2026-07-02', 'google_forms'),
    ('d0000000-0000-0000-0000-000000000013', NULL, 'Pooja Srivastava', 'A+', 'Kanpur', 'Swaroop Nagar', '208002', 26.4750, 80.3200, 'available', true, 'verified', '2026-05-18', 'platform'),
    ('d0000000-0000-0000-0000-000000000014', NULL, 'Abhishek Pandey', 'AB+', 'Varanasi', 'Sigra', '221002', 25.3120, 82.9860, 'available', true, 'verified', '2026-08-01', 'google_forms'),
    ('d0000000-0000-0000-0000-000000000015', NULL, 'Sunil Yadav', 'O+', 'Agra', 'Sanjay Place', '282002', 27.2020, 78.0060, 'available', true, 'verified', '2026-07-22', 'platform')
ON CONFLICT (id) DO NOTHING;

-- Seed Verified Blood Banks
INSERT INTO blood_banks (id, name, address, city, state, postal_code, phone, email, latitude, longitude, operating_hours, verification_status, inventory_summary)
VALUES
    ('bb000000-0000-0000-0000-000000000001', 'SMS Hospital Regional Blood Bank', 'JLN Marg, Ashok Nagar', 'Jaipur', 'Rajasthan', '302004', '+91 141 2518200', 'bloodbank@smshospital.org', 26.8978, 75.8167, '24/7 Emergency Service', 'verified', '{"A+": 18, "A-": 5, "B+": 24, "B-": 6, "AB+": 9, "AB-": 3, "O+": 32, "O-": 8}'::jsonb),
    ('bb000000-0000-0000-0000-000000000002', 'Jaipur Red Cross Blood Centre', 'Sawai Mansingh Road', 'Jaipur', 'Rajasthan', '302001', '+91 141 2372400', 'jaipur@redcrossblood.in', 26.9150, 75.8050, '8:00 AM - 8:00 PM', 'verified', '{"A+": 10, "A-": 2, "B+": 14, "B-": 4, "AB+": 5, "AB-": 1, "O+": 19, "O-": 4}'::jsonb),
    ('bb000000-0000-0000-0000-000000000003', 'Fortis Escorts Blood Bank', 'Jawaharlal Nehru Marg, Malviya Nagar', 'Jaipur', 'Rajasthan', '302017', '+91 141 2547000', 'bloodbank.jaipur@fortishealthcare.com', 26.8480, 75.8180, '24/7 Emergency Service', 'verified', '{"A+": 8, "A-": 1, "B+": 12, "B-": 2, "AB+": 4, "AB-": 1, "O+": 15, "O-": 3}'::jsonb),
    ('bb000000-0000-0000-0000-000000000004', 'Ghaziabad District Blood Centre', 'MMG District Hospital, GT Road', 'Ghaziabad', 'Uttar Pradesh', '201001', '+91 120 2850100', 'mmgbloodbank@up.gov.in', 28.6678, 77.4350, '24/7 Emergency Service', 'verified', '{"A+": 14, "A-": 3, "B+": 20, "B-": 4, "AB+": 7, "AB-": 2, "O+": 25, "O-": 6}'::jsonb),
    ('bb000000-0000-0000-0000-000000000005', 'KGMU Blood Bank (Centenary Hospital)', 'Shah Mina Road, Chowk', 'Lucknow', 'Uttar Pradesh', '226003', '+91 522 2258880', 'kgmubloodbank@up.gov.in', 26.8700, 80.9200, '24/7 Emergency Service', 'verified', '{"A+": 28, "A-": 6, "B+": 35, "B-": 8, "AB+": 14, "AB-": 4, "O+": 42, "O-": 10}'::jsonb),
    ('bb000000-0000-0000-0000-000000000006', 'SGPGI Transfusion Medicine Centre', 'Raebareli Road', 'Lucknow', 'Uttar Pradesh', '226014', '+91 522 2494000', 'sgpgiblood@up.gov.in', 26.7450, 80.9400, '24/7 Emergency Service', 'verified', '{"A+": 30, "A-": 8, "B+": 40, "B-": 9, "AB+": 16, "AB-": 5, "O+": 50, "O-": 12}'::jsonb),
    ('bb000000-0000-0000-0000-000000000007', 'GSVM Medical College Blood Centre', 'Swaroop Nagar', 'Kanpur', 'Uttar Pradesh', '208002', '+91 512 2535483', 'gsvmbloodcentre@up.gov.in', 26.4850, 80.3150, '24/7 Emergency Service', 'verified', '{"A+": 18, "A-": 4, "B+": 22, "B-": 5, "AB+": 9, "AB-": 3, "O+": 28, "O-": 7}'::jsonb),
    ('bb000000-0000-0000-0000-000000000008', 'IMS-BHU Sir Sunderlal Hospital Blood Centre', 'BHU Campus, Lanka', 'Varanasi', 'Uttar Pradesh', '221005', '+91 542 2369291', 'bhubloodbank@bhu.ac.in', 25.2750, 82.9980, '24/7 Emergency Service', 'verified', '{"A+": 22, "A-": 5, "B+": 28, "B-": 7, "AB+": 11, "AB-": 4, "O+": 34, "O-": 8}'::jsonb),
    ('bb000000-0000-0000-0000-000000000009', 'S.N. Medical College Blood Bank', 'Hospital Road, Near Raja Ki Mandi', 'Agra', 'Uttar Pradesh', '282002', '+91 562 2260353', 'snmcbloodcentre@up.gov.in', 27.1860, 78.0050, '24/7 Emergency Service', 'verified', '{"A+": 10, "A-": 2, "B+": 15, "B-": 3, "AB+": 5, "AB-": 1, "O+": 20, "O-": 4}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed RAG Approved Knowledge Documents
INSERT INTO rag_documents (id, title, source, category, status, content, chunk_count)
VALUES
    ('r0000000-0000-0000-0000-000000000001', 'General Blood Donation Eligibility Guidelines', 'National Blood Transfusion Council (NBTC) & WHO', 'eligibility', 'approved', 
     'Donors must be between 18 and 65 years of age and weigh at least 45 kg (50 kg for certain whole blood donations). Hemoglobin levels should not be less than 12.5 g/dL. The donation interval between whole blood donations must be at least 90 days (3 months) for male donors and 120 days (4 months) for female donors. Donors should have had adequate sleep (at least 6 hours), should not have consumed alcohol within 24 hours prior to donation, and should eat a light meal 2 to 3 hours beforehand. Persons with active infections, fever, untreated high blood pressure, jaundice, hepatitis B or C, HIV, or heart disease are temporarily or permanently deferred. Always consult healthcare professionals at authorized blood donation centers.', 3),
    ('r0000000-0000-0000-0000-000000000002', 'Blood Group Compatibility and Transfusion Science', 'Directorate General of Health Services (DGHS)', 'guidelines', 'approved',
     'Blood group compatibility is determined by ABO and Rh (Rhesus) antigens. Type O-negative is known as the universal red blood cell donor, meaning O-negative red blood cells can be administered to emergency patients of any blood group when group-specific blood is not immediately obtainable. Type AB-positive individuals are universal plasma recipients. However, BloodBridge is strictly a coordination and search navigation platform, NOT a medical authority. Blood group compatibility and matching algorithms on the platform indicate potential donor candidates, but NEVER constitute clinical confirmation of compatibility. Final cross-matching, antibody screening, and transfusion safety are strictly the clinical responsibility of licensed blood bank pathologists and attending physicians.', 3),
    ('r0000000-0000-0000-0000-000000000003', 'BloodBridge Platform Workflow and Emergency Coordination Guide', 'BloodBridge Vision-X Architecture Specification', 'workflow', 'approved',
     'When an emergency blood requirement arises, the requester submits the patient blood group, units needed, hospital name, location, and urgency level. The platform executes a deterministic spatial query using PostGIS ST_DWithin and ST_Distance to identify verified and available donors within the search radius who have given explicit consent to be contacted. Exact home addresses and GPS coordinates of donors are strictly protected and never displayed in public search results; only fuzzy distance bands such as "Within 2 km" or approximate city areas are shown. Requesters can contact potential donors or reach out directly to 24/7 verified regional blood banks.', 2)
ON CONFLICT (id) DO NOTHING;

-- Seed Active Blood Request
INSERT INTO blood_requests (id, requester_id, patient_name, blood_group, units_needed, hospital_name, hospital_address, city, latitude, longitude, urgency, description, contact_phone, status)
VALUES
    ('req00000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 'B+', 2, 'SMS Hospital Emergency Ward', 'JLN Marg, Jaipur', 'Jaipur', 26.8978, 75.8167, 'emergency', 'Urgent requirement for cardiac surgery scheduled tomorrow morning. 2 units of B+ required.', '+91 98765 00002', 'active')
ON CONFLICT (id) DO NOTHING;
