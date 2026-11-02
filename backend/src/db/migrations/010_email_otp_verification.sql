-- =============================================================================
-- Migration 010: Email OTP Verification for User Registration via Brevo
-- Adds is_verified to users and creates email_otp_verifications audit table
-- =============================================================================

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.email_otp_verifications (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  registration_data JSONB,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  consumed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_email ON public.email_otp_verifications (email);
CREATE INDEX IF NOT EXISTS idx_email_otp_expires ON public.email_otp_verifications (expires_at);
