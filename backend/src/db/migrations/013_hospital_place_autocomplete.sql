-- Migration 013: Add place_id and hospital metadata to blood_requests
-- Supports dynamic location-based hospital autocomplete and Google Places integration

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'blood_requests' 
          AND column_name = 'place_id'
    ) THEN
        ALTER TABLE public.blood_requests ADD COLUMN place_id VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'blood_requests' 
          AND column_name = 'hospital_place_metadata'
    ) THEN
        ALTER TABLE public.blood_requests ADD COLUMN hospital_place_metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_blood_requests_place_id ON public.blood_requests(place_id) WHERE place_id IS NOT NULL;
