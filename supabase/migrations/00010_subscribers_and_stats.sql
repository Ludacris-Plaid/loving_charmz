-- ============================================================
-- 00010: Subscribers + catalog stats view
--
-- 1. `subscribers` — every email captured by the site (the welcome
--    popup saves here). Public (anon) may INSERT only; only admins
--    may read, so the list can be viewed/exported in the admin area.
-- 2. `catalog_stats` view — counts of active collections and products
--    plus the lowest active price, so the homepage numbers compute
--    themselves instead of being edited by hand.
-- ============================================================

-- ------------------------------------------------------------
-- Subscribers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'popup',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscribers_email_source_key UNIQUE (email, source)
);

-- Case-insensitive uniqueness: 'Mom@Example.com' and 'mom@example.com'
-- are the same person. The unique constraint above is still the
-- fast path; this rules out case duplicates the constraint can't see.
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_lower_source_idx
  ON public.subscribers (lower(email), source);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone (even not signed in) may offer their email — insert only.
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe"
  ON public.subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins may read the list. is_admin() is the SECURITY DEFINER
-- helper created in migration 00006 (avoids RLS recursion).
DROP POLICY IF EXISTS "Admins read subscribers" ON public.subscribers;
CREATE POLICY "Admins read subscribers"
  ON public.subscribers FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Nobody updates or deletes through the API; cleanup happens with the
-- service role in the admin area only.
-- (No UPDATE/DELETE policies = denied by default.)

-- ------------------------------------------------------------
-- Catalog stats view
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.catalog_stats AS
SELECT
  (SELECT count(*) FROM public.collections WHERE is_active)      AS collections_count,
  (SELECT count(*) FROM public.products    WHERE is_active)      AS products_count,
  (SELECT COALESCE(min(base_price), 0)
     FROM public.products WHERE is_active)                       AS starting_price;

GRANT SELECT ON public.catalog_stats TO authenticated, anon;

-- ============================================================
-- Seed the welcome coupon so popup codes work out of the box.
-- No-op if the code already exists.
-- ============================================================
INSERT INTO public.discounts (code, discount_type, discount_value, is_active)
VALUES ('WELCOME10', 'percentage', 10, true)
ON CONFLICT (code) DO NOTHING;
