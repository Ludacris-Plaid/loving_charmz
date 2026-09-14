-- Storage bucket for customer reference photos on custom-order requests.
-- Public read so admins (and the order page) can view the reference without
-- signed URLs; writes go through the upload server action which runs with the
-- shopper's own session, so each user can only write inside their own folder.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reference-images',
  'reference-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone (incl. admins) can view reference photos.
DROP POLICY IF EXISTS "Public reference image read" ON storage.objects;
CREATE POLICY "Public reference image read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reference-images');

-- Signed-in shoppers may add files, but only inside their own user-id folder.
-- Authenticated admins are allowed to manage the whole bucket (cleanup).
DROP POLICY IF EXISTS "Users upload own reference images" ON storage.objects;
CREATE POLICY "Users upload own reference images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reference-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users manage own reference images" ON storage.objects;
CREATE POLICY "Users manage own reference images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reference-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
