-- Loving Charmz — Phase 2 fixes
-- Migration 00002: first-user admin trigger, storage bucket, missing constraints,
-- and profile email preferences.

-- ============================================================
-- 1. Trigger: promote_first_user_to_admin
-- The function exists in 00001 but no trigger ever calls it.
-- ============================================================
CREATE TRIGGER on_auth_user_created_promote_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION promote_first_user_to_admin();

-- ============================================================
-- 2. Storage bucket: avatars (public read, owner write)
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

-- Anyone can read avatar objects
DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Authenticated users can update their own avatar
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Authenticated users can delete their own avatar
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 3. Cart uniqueness (one cart per user)
-- ============================================================
ALTER TABLE carts
  ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);

-- ============================================================
-- 4. Email preferences on profile
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS order_updates BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 5. Wishlist RLS fix — original 00001 uses the wrong syntax
-- (it relied on subqueries that don't work for the per-row policy
-- correctly). Re-assert for clarity.
-- ============================================================
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON wishlists;
CREATE POLICY "Users can manage their own wishlist"
  ON wishlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
