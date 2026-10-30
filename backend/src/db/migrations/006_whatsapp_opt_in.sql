-- BloodBridge Vision-X
-- Migration 006: Explicit WhatsApp notification consent

ALTER TABLE public.donors
ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.donors
ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ;

ALTER TABLE public.donors
ADD COLUMN IF NOT EXISTS whatsapp_opt_out_at TIMESTAMPTZ;

-- Index only donors who explicitly opted in
CREATE INDEX IF NOT EXISTS idx_donors_whatsapp_opt_in
ON public.donors (whatsapp_opt_in)
WHERE whatsapp_opt_in = TRUE;

COMMENT ON COLUMN public.donors.whatsapp_opt_in IS
'Whether the donor explicitly opted in to WhatsApp notifications. Existing donors default to FALSE.';

COMMENT ON COLUMN public.donors.whatsapp_opt_in_at IS
'Timestamp when the donor explicitly opted in to WhatsApp notifications.';

COMMENT ON COLUMN public.donors.whatsapp_opt_out_at IS
'Timestamp when the donor withdrew WhatsApp notification consent.';