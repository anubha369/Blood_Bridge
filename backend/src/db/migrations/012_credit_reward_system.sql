-- =============================================================================
-- Migration 012: BloodBridge Credit & Reward System
-- =============================================================================

-- 1. Update credit_ledger event_type check constraint
ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS credit_ledger_event_type_check;
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_event_type_check 
CHECK (((event_type)::text = ANY ((ARRAY[
  'registration_reward'::character varying,
  'successful_donation_reward'::character varying,
  'monthly_availability_reward'::character varying,
  'credit_redemption'::character varying,
  'admin_adjustment'::character varying,
  'profile_completion'::character varying,
  'availability_update'::character varying,
  'directory_verification'::character varying,
  'referral_registered'::character varying,
  'awareness_campaign'::character varying
])::text[])));

-- 2. Add columns to credit_ledger
ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS balance_after INTEGER;
ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS related_request_id UUID REFERENCES public.blood_requests(id) ON DELETE SET NULL;

-- 3. Add columns to donors
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS available_since TIMESTAMPTZ;
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS last_monthly_reward_at TIMESTAMPTZ;

-- 4. Create donor_availability_periods table
CREATE TABLE IF NOT EXISTS public.donor_availability_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donor_avail_donor_status ON public.donor_availability_periods(donor_id, status);

-- 5. Create credit_redemptions table
CREATE TABLE IF NOT EXISTS public.credit_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  benefit_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  credits_spent INTEGER NOT NULL,
  voucher_code VARCHAR(100) UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_redemptions_user ON public.credit_redemptions(user_id);
