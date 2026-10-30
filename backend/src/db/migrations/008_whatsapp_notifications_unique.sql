-- Migration 008: Unique constraint on (request_id, donor_id) for idempotent WhatsApp notifications
-- Prevents duplicate alert dispatches to the same donor for a single blood request.

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_notifications_unique_req_donor 
ON public.whatsapp_notifications (request_id, donor_id);

COMMENT ON INDEX public.idx_whatsapp_notifications_unique_req_donor IS
'Ensures a donor is never queued or notified more than once for the same blood request.';
