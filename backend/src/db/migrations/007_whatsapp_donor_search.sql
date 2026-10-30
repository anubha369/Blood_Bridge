
-- Migration: 007_whatsapp_donor_search.sql
-- Purpose: Private, consent-aware donor lookup for WhatsApp notifications.

CREATE OR REPLACE FUNCTION public.search_nearby_whatsapp_donors(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION,
    p_blood_group VARCHAR(10) DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    donor_id UUID,
    name VARCHAR(150),
    phone VARCHAR(30),
    blood_group VARCHAR(10),
    city VARCHAR(100),
    area VARCHAR(150),
    verification_status VARCHAR(30),
    distance_km DOUBLE PRECISION,
    distance_band VARCHAR(50)
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        d.id AS donor_id,
        d.name,
        d.phone,
        d.blood_group,
        d.city,
        d.area,
        d.verification_status,
        ST_Distance(
            d.location,
            ST_SetSRID(
                ST_MakePoint(p_lon, p_lat),
                4326
            )::geography
        ) / 1000.0 AS distance_km,
        CASE
            WHEN ST_Distance(
                d.location,
                ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
            ) / 1000.0 <= 5 THEN '0-5 km'
            WHEN ST_Distance(
                d.location,
                ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
            ) / 1000.0 <= 10 THEN '5-10 km'
            WHEN ST_Distance(
                d.location,
                ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
            ) / 1000.0 <= 25 THEN '10-25 km'
            ELSE '25+ km'
        END AS distance_band
    FROM public.donors d
    WHERE
        p_lat BETWEEN -90 AND 90
        AND p_lon BETWEEN -180 AND 180
        AND p_radius_km > 0
        AND d.location IS NOT NULL
        AND d.phone IS NOT NULL
        AND d.phone <> ''

        -- General donor contact consent
        AND d.consent_to_contact = TRUE
        AND d.consent_status = 'consented'

        -- Explicit WhatsApp opt-in is mandatory
        AND d.whatsapp_opt_in = TRUE
        AND d.whatsapp_opt_in_at IS NOT NULL
        AND (
            d.whatsapp_opt_out_at IS NULL
            OR d.whatsapp_opt_in_at > d.whatsapp_opt_out_at
        )

        -- Donor must currently be available
        AND d.availability_status = 'available'

        -- Keep verification status visible to backend
        AND d.verification_status IN (
            'verified',
            'pending_verification'
        )

        -- Cooldown protection
        AND (
            d.cooldown_until IS NULL
            OR d.cooldown_until <= NOW()
        )
        AND (
            d.donated_last_3_months IS DISTINCT FROM TRUE
            OR d.cooldown_until IS NOT NULL
        )

        -- Optional exact blood group filter
        AND (
            p_blood_group IS NULL
            OR d.blood_group = p_blood_group
        )

        -- Approximate geographic radius
        AND ST_DWithin(
            d.location,
            ST_SetSRID(
                ST_MakePoint(p_lon, p_lat),
                4326
            )::geography,
            p_radius_km * 1000
        )

    ORDER BY distance_km ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
$$;

-- Only the trusted backend service role can call this function.
REVOKE ALL ON FUNCTION public.search_nearby_whatsapp_donors(
    DOUBLE PRECISION,
    DOUBLE PRECISION,
    DOUBLE PRECISION,
    VARCHAR,
    INTEGER
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.search_nearby_whatsapp_donors(
    DOUBLE PRECISION,
    DOUBLE PRECISION,
    DOUBLE PRECISION,
    VARCHAR,
    INTEGER
) TO service_role;
