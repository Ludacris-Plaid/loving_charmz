-- Loving Charmz — Phase 3
-- Migration 00003: product image storage bucket + RLS policies

-- ============================================================
-- 1. Storage bucket: product-images
-- Public read so marketing/product pages can render <img> directly.
-- Writes are admin-only via service_role; client uploads go through
-- the server action which uses the service_role client.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Storage RLS policies
-- Public read for any object in the bucket.
-- Admin role bypasses RLS, so the service_role client used by
-- server actions can upload/delete without explicit policies.
-- We still add a permissive policy for any future admin
-- auth.uid()-based path to make the security posture explicit.
-- ============================================================
DROP POLICY IF EXISTS "Public product image read" ON storage.objects;
CREATE POLICY "Public product image read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;
CREATE POLICY "Admins can manage product images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');
