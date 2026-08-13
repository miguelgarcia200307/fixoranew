-- FIXORA - Harden owner boundaries for public branding buckets.

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id IN ('business-logo', 'avatars');

DROP POLICY IF EXISTS "Public access for logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own logo" ON storage.objects;
DROP POLICY IF EXISTS "Public access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

CREATE POLICY "Public access for logo" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-logo');

CREATE POLICY "Users can upload own logo" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'business-logo'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users can update own logo" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'business-logo'
    AND split_part(name, '/', 1) = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'business-logo'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users can delete own logo" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'business-logo'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Public access for avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

