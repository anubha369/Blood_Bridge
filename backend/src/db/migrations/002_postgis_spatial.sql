-- ============================================================================
-- BloodBridge Vision-X Spatial Schema & PostGIS Setup
-- Migration: 002_postgis_spatial.sql
-- Description: Enables PostGIS extension, spatial columns, and GiST indexes
-- ============================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Donors Table with PostGIS Geography Point (SRID 4326)
CREATE TABLE IF NOT EXISTS donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    blood_group VARCHAR(10) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    city VARCHAR(100) NOT NULL,
    area VARCHAR(150),
    postal_code VARCHAR(20),
    -- PostGIS geography column: SRID 4326 (WGS 84 GPS coordinates)
    location geography(Point, 4326),
    latitude DOUBLE PRECISION CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION CHECK (longitude >= -180.0 AND longitude <= 180.0),
    availability_status VARCHAR(30) NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'unavailable', 'recently_donated')),
    consent_to_contact BOOLEAN NOT NULL DEFAULT TRUE,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'pending_verification' CHECK (verification_status IN ('pending_verification', 'verified', 'rejected', 'inactive')),
    last_donation_date DATE,
    source VARCHAR(50) NOT NULL DEFAULT 'platform' CHECK (source IN ('platform', 'google_forms', 'admin_import')),
    google_form_submission_id VARCHAR(100),
    notification_preferences JSONB DEFAULT '{"sms": false, "email": true, "push": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger or function to automatically synchronize latitude/longitude into location geography column
CREATE OR REPLACE FUNCTION sync_donor_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_donor_location ON donors;
CREATE TRIGGER trg_sync_donor_location
BEFORE INSERT OR UPDATE ON donors
FOR EACH ROW
EXECUTE FUNCTION sync_donor_location();

-- 3. GiST Spatial Index on Donors Table (Section 9 requirement)
CREATE INDEX IF NOT EXISTS donors_location_gist_idx
ON donors
USING GIST (location);

-- Standard attribute indexes for multi-column filtering
CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_filters ON donors(availability_status, consent_to_contact, verification_status);
CREATE INDEX IF NOT EXISTS idx_donors_user_id ON donors(user_id);

-- 4. Blood Banks Table with PostGIS Geography Point
CREATE TABLE IF NOT EXISTS blood_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(30),
    email VARCHAR(100),
    location geography(Point, 4326),
    latitude DOUBLE PRECISION CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION CHECK (longitude >= -180.0 AND longitude <= 180.0),
    operating_hours VARCHAR(150) DEFAULT '24/7 Emergency Service',
    verification_status VARCHAR(30) NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'pending', 'inactive')),
    verified_by UUID REFERENCES users(id),
    source_of_info VARCHAR(150) DEFAULT 'Government Health Authority / Red Cross',
    inventory_summary JSONB DEFAULT '{"A+": 12, "A-": 4, "B+": 15, "B-": 3, "AB+": 6, "AB-": 2, "O+": 20, "O-": 5}'::jsonb,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for blood bank coordinates
CREATE OR REPLACE FUNCTION sync_blood_bank_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    NEW.last_updated := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_blood_bank_location ON blood_banks;
CREATE TRIGGER trg_sync_blood_bank_location
BEFORE INSERT OR UPDATE ON blood_banks
FOR EACH ROW
EXECUTE FUNCTION sync_blood_bank_location();

-- GiST Spatial Index on Blood Banks
CREATE INDEX IF NOT EXISTS blood_banks_location_gist_idx
ON blood_banks
USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_blood_banks_city ON blood_banks(city);

-- 5. Request Matches Table
CREATE TABLE IF NOT EXISTS request_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    match_score NUMERIC(5,2) NOT NULL,
    distance_km NUMERIC(7,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'potential' CHECK (status IN ('potential', 'contacted', 'accepted', 'declined', 'fulfilled')),
    match_reasons JSONB DEFAULT '[]'::jsonb,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_request ON request_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_matches_donor ON request_matches(donor_id);

-- 6. Spatial Query Helper Function for Nearby Donors (ST_DWithin & ST_Distance)
-- Returns privacy-safe donor details (Fuzzy distance, NO exact coordinates)
CREATE OR REPLACE FUNCTION search_nearby_donors(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION,
    p_blood_group VARCHAR(10) DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    donor_id UUID,
    name VARCHAR(150),
    blood_group VARCHAR(10),
    city VARCHAR(100),
    area VARCHAR(150),
    availability_status VARCHAR(30),
    verification_status VARCHAR(30),
    distance_km DOUBLE PRECISION,
    distance_band VARCHAR(50),
    last_donation_date DATE
) AS $$
DECLARE
    center_point geography;
    radius_meters DOUBLE PRECISION;
BEGIN
    center_point := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography;
    radius_meters := p_radius_km * 1000.0;

    RETURN QUERY
    SELECT 
        d.id AS donor_id,
        d.name,
        d.blood_group,
        d.city,
        d.area,
        d.availability_status,
        d.verification_status,
        ROUND((ST_Distance(d.location, center_point) / 1000.0)::numeric, 1)::double precision AS distance_km,
        (CASE 
            WHEN ST_Distance(d.location, center_point) <= 2000 THEN 'Within 2 km'
            WHEN ST_Distance(d.location, center_point) <= 5000 THEN 'Within 5 km'
            WHEN ST_Distance(d.location, center_point) <= 10000 THEN 'Within 10 km'
            ELSE 'Within ' || ROUND((ST_Distance(d.location, center_point) / 1000.0)::numeric, 0) || ' km'
        END)::varchar(50) AS distance_band,
        d.last_donation_date
    FROM donors d
    WHERE 
        d.location IS NOT NULL
        AND d.consent_to_contact = TRUE
        AND d.availability_status = 'available'
        AND d.verification_status IN ('verified', 'pending_verification')
        AND (p_blood_group IS NULL OR d.blood_group = p_blood_group)
        -- Uses PostGIS GiST index for spatial bounding box filter
        AND ST_DWithin(d.location, center_point, radius_meters)
    ORDER BY ST_Distance(d.location, center_point) ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
