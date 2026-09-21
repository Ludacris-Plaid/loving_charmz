-- ============================================================
-- 00016 — Abandoned cart email recovery
--
-- Tracks which carts have received an abandoned-cart email so
-- we never spam the same cart more than once per day, and
-- provides an unsubscribe token so recipients can opt out.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.abandoned_cart_emails (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id       UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  unsubscribed_at   TIMESTAMPTZ
);

-- One index to find recent sends per cart (rate-limit check),
-- one to look up by unsubscribe token.
CREATE INDEX IF NOT EXISTS abandoned_cart_emails_cart_id_idx
  ON public.abandoned_cart_emails (cart_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS abandoned_cart_emails_unsub_token_idx
  ON public.abandoned_cart_emails (unsubscribe_token)
  WHERE unsubscribed_at IS NULL;

-- Only the service-role (admin) client touches this table.
REVOKE ALL ON public.abandoned_cart_emails FROM anon, authenticated;
