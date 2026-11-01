-- ============================================================================
-- BloodBridge Vision-X Database Migration: 009_google_form_submission_index.sql
-- Description: Adds B-Tree index on donors(google_form_submission_id)
-- for high-performance deduplication checks during missed-record sync
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_donors_google_form_submission_id 
ON public.donors (google_form_submission_id);
