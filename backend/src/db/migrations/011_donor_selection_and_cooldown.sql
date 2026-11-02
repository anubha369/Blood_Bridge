-- =============================================================================
-- Migration 011: Donor Selection, Reconfirmation Workflow & Cooldown Tracking
-- =============================================================================

-- 1. Extend blood_requests with confirmation and fulfillment tracking
ALTER TABLE public.blood_requests 
  ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reconfirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

-- 2. Extend donors with explicit cooldown start timestamp
ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS cooldown_start TIMESTAMPTZ;

-- 3. Dedicated audit table for donor cooldown history
CREATE TABLE IF NOT EXISTS public.donor_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  reason VARCHAR(100) NOT NULL DEFAULT 'request_fulfilled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donor_cooldowns_donor ON public.donor_cooldowns(donor_id);
CREATE INDEX IF NOT EXISTS idx_donor_cooldowns_dates ON public.donor_cooldowns(start_date, end_date);

-- Update blood_requests_status_check constraint to include 5-stage workflow statuses
ALTER TABLE public.blood_requests DROP CONSTRAINT IF EXISTS blood_requests_status_check;
ALTER TABLE public.blood_requests ADD CONSTRAINT blood_requests_status_check 
CHECK (((status)::text = ANY ((ARRAY[
  'registered'::character varying, 'submitted'::character varying, 'draft'::character varying, 
  'validating'::character varying, 'searching'::character varying, 
  'alerting_donors'::character varying, 'notifications_queued'::character varying, 
  'donors_responded'::character varying, 'responses_received'::character varying, 
  'donor_selected'::character varying, 'coordination_in_progress'::character varying, 
  'active'::character varying, 'fulfilled'::character varying, 'cancelled'::character varying, 
  'expired'::character varying, 'closed'::character varying
])::text[])));
