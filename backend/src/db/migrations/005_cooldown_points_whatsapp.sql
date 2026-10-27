-- ============================================================================
-- BloodBridge Vision-X Database Schema Migration
-- Migration: 005_cooldown_points_whatsapp.sql
-- Description: Adds 3-month cooldown rules, credit ledger, and WhatsApp notifications
-- ============================================================================

-- 1. Extend Donors Table with Contact, Cooldown and Consent Tracking
ALTER TABLE donors
ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS donated_last_3_months BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_availability_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS consent_status VARCHAR(30) DEFAULT 'consented' CHECK (consent_status IN ('consented', 'withdrawn', 'unconfirmed')),
ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS donation_history_status VARCHAR(30) DEFAULT 'unconfirmed' CHECK (donation_history_status IN ('unconfirmed', 'reported_recent', 'verified_recent', 'eligible')),
ADD COLUMN IF NOT EXISTS cooldown_policy_months INTEGER DEFAULT 3;

-- Indexes for fast donor deduplication, lookup and cooldown queries
CREATE INDEX IF NOT EXISTS idx_donors_phone ON donors(phone);
CREATE INDEX IF NOT EXISTS idx_donors_email ON donors(email);
CREATE INDEX IF NOT EXISTS idx_donors_gform_sub ON donors(google_form_submission_id);
CREATE INDEX IF NOT EXISTS idx_donors_cooldown ON donors(cooldown_until, availability_status, consent_status);

-- 2. Extend Blood Requests Status Check and Add Donor Selection Tracking
ALTER TABLE blood_requests
ADD COLUMN IF NOT EXISTS selected_donor_id UUID REFERENCES donors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS selected_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_requests_selected_donor ON blood_requests(selected_donor_id);

ALTER TABLE blood_requests 
DROP CONSTRAINT IF EXISTS blood_requests_status_check;

ALTER TABLE blood_requests
ADD CONSTRAINT blood_requests_status_check 
CHECK (status IN (
    'draft', 
    'submitted', 
    'validating', 
    'searching', 
    'notifications_queued', 
    'responses_received', 
    'donor_selected',
    'coordination_in_progress', 
    'active',
    'fulfilled', 
    'cancelled', 
    'expired', 
    'closed'
));

-- 3. Credit Points Ledger Table (Non-monetary, strictly non-cash recognition)
CREATE TABLE IF NOT EXISTS credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES donors(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'profile_completion',
        'availability_update',
        'directory_verification',
        'referral_registered',
        'awareness_campaign',
        'admin_adjustment'
    )),
    points INTEGER NOT NULL CHECK (points != 0),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    idempotency_key VARCHAR(150) UNIQUE NOT NULL,
    verification_status VARCHAR(30) DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'reversed')),
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_idempotency ON credit_ledger(idempotency_key);

-- 4. WhatsApp Notification Jobs & Response Tracking Table
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    recipient_phone VARCHAR(30) NOT NULL,
    template_name VARCHAR(100) DEFAULT 'emergency_blood_request_v1',
    message_body TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued', 
        'sent', 
        'delivered', 
        'failed', 
        'simulated_sent', 
        'cancelled'
    )),
    provider_message_id VARCHAR(100),
    delivery_status VARCHAR(50),
    action_token VARCHAR(100) UNIQUE NOT NULL,
    donor_response VARCHAR(30) CHECK (donor_response IN (
        'accepted', 
        'declined', 
        'unavailable', 
        'withdrawn_consent', 
        'completed_donation'
    )),
    responded_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_req_donor ON whatsapp_notifications(request_id, donor_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_token ON whatsapp_notifications(action_token);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status ON whatsapp_notifications(status);
