-- ============================================================
-- 00015 — Platform hardening: guest checkout, tracking, monitoring
--
-- 1. carts become guest-capable: user_id is already nullable; a
--    `cookie_token` identifies an anonymous visitor's cart. On
--    sign-in the guest cart is merged into the member cart.
-- 2. orders gain tracking_number / tracking_carrier so the admin
--    "shipped" state carries the customer-facing tracking reference.
-- 3. error_events + page_views power the self-hosted monitoring
--    page (no third-party dependency; PII-free aggregates only).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Guest carts
-- ------------------------------------------------------------
ALTER TABLE public.carts
  ADD COLUMN IF NOT EXISTS cookie_token TEXT;

-- One cart per anonymous token; NULLs (member carts) are exempt
-- from uniqueness automatically.
CREATE UNIQUE INDEX IF NOT EXISTS carts_cookie_token_key
  ON public.carts (cookie_token)
  WHERE cookie_token IS NOT NULL;

-- ------------------------------------------------------------
-- 2. Order tracking
-- ------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_carrier TEXT;

-- ------------------------------------------------------------
-- 3. Error monitoring (DB-backed, env-gated by nothing — small)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('server', 'client')),
  message TEXT NOT NULL,
  stack TEXT,
  digest TEXT,
  path TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_events_created_at_idx
  ON public.error_events (created_at DESC);

REVOKE ALL ON public.error_events FROM anon, authenticated;

-- ------------------------------------------------------------
-- 4. Visitor analytics (privacy-friendly: no cookies, no PII)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  device TEXT CHECK (device IN ('mobile', 'desktop', 'tablet', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_views_created_at_idx
  ON public.page_views (created_at DESC);

REVOKE ALL ON public.page_views FROM anon, authenticated;
