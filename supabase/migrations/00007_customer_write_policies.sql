-- Loving Charmz — customer write policies + SECURITY DEFINER hardening
-- Migration 00007
--
-- Context: migrations 00001–00006 never granted customers INSERT rights on the
-- tables their own server actions write to. Every admin policy is `FOR ALL`
-- gated on is_admin(), so a signed-in customer hitting checkout or the custom
-- order form gets "new row violates row-level security policy" from Postgres.
--
-- Also grants users SELECT on their own profile row: 00001 only exposes
-- is_public = true, so a member who unticks "public" can no longer read the
-- row that /account/profile renders.
--
-- This migration is idempotent: every policy is dropped-if-exists first.

-- ============================================================
-- 1. profiles — a user can always read their own row
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- ============================================================
-- 2. orders — a customer may create an order for themselves only
-- ============================================================
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. order_items — insertable only into an order the caller owns
-- ============================================================
DROP POLICY IF EXISTS "Users can create own order items" ON public.order_items;
CREATE POLICY "Users can create own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. personalization_requests — a customer may submit their own
-- ============================================================
DROP POLICY IF EXISTS "Users can create own requests" ON public.personalization_requests;
CREATE POLICY "Users can create own requests"
  ON public.personalization_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. user_roles — remove the open INSERT policy (privilege escalation)
-- 00001 created:
--   CREATE POLICY "Service role manages roles" ON user_roles FOR INSERT
--     WITH CHECK (true);  -- "service_role bypasses RLS entirely"
-- That rationale is backwards. service_role bypasses RLS, so it needs no
-- policy; the policy that was added instead lets ANY authenticated caller
-- insert any row — e.g. {user_id: <self>, role: 'admin'} — which is a full
-- admin compromise (AdminGuard and every /admin data path trust user_roles).
-- The RLS smoke test (scripts/migrate/sql/rls-smoke.sql, check 10) reproduces
-- the escalation before this migration is applied.
-- ============================================================
DROP POLICY IF EXISTS "Service role manages roles" ON public.user_roles;

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 6. SECURITY DEFINER hardening
-- These run with the definer's privileges, so an unqualified name could be
-- resolved through a caller-controlled search_path. Pin search_path and
-- fully qualify every reference.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_first_user_to_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 7. Storage — avatars bucket must allow the owning user to replace
--    their own object (00002 did this; re-asserted so a project built
--    from migrations alone is complete).
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
