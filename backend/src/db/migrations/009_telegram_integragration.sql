-- BloodBridge Vision-X
-- Migration 009: Telegram account linking and consent

ALTER TABLE public.donors
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE;

ALTER TABLE public.donors
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100);

ALTER TABLE public.donors
ADD COLUMN IF NOT EXISTS telegram_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.donors
ADD COLUMN IF NOT EXISTS telegram_opt_in_at TIMESTAMPTZ;

ALTER TABLE public.donors
ADD COLUMN IF NOT EXISTS telegram_opt_out_at TIMESTAMPTZ;

ALTER TABLE public.donors
ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;

-- Only donors who explicitly opted in
CREATE INDEX IF NOT EXISTS idx_donors_telegram_opt_in
ON public.donors (telegram_opt_in)
WHERE telegram_opt_in = TRUE;

-- Secure one-time linking codes
CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    donor_id UUID NOT NULL
        REFERENCES public.donors(id)
        ON DELETE CASCADE,

    code_hash VARCHAR(64) NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_donor
ON public.telegram_link_codes(donor_id);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expiry
ON public.telegram_link_codes(expires_at);

COMMENT ON COLUMN public.donors.telegram_opt_in IS
'Explicit donor consent for Telegram notifications. Defaults to false.';

COMMENT ON COLUMN public.donors.telegram_chat_id IS
'Telegram private chat ID linked to the donor account.';

COMMENT ON TABLE public.telegram_link_codes IS
'Short-lived, single-use Telegram account linking codes. Only SHA-256 hashes are stored.';

-- Telegram emergency notification tracking with unique constraint per request and donor
CREATE TABLE IF NOT EXISTS public.telegram_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
    telegram_chat_id BIGINT NOT NULL,
    message_text TEXT,
    telegram_message_id BIGINT,
    status VARCHAR(30) NOT NULL DEFAULT 'sent',
    donor_response VARCHAR(30), -- 'accepted', 'declined'
    responded_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_telegram_notifications_request_donor UNIQUE (request_id, donor_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_notif_request ON public.telegram_notifications(request_id);
CREATE INDEX IF NOT EXISTS idx_telegram_notif_donor ON public.telegram_notifications(donor_id);
