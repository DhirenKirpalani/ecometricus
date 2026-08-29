-- ─────────────────────────────────────────────────────────────
-- Fix: Storage bucket and policies for waste-images
-- ─────────────────────────────────────────────────────────────

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('waste-images', 'waste-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies (they may have failed or be duplicates)
DROP POLICY IF EXISTS "Public read access for waste images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload waste images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own waste images" ON storage.objects;
DROP POLICY IF EXISTS "waste_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "waste_images_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "waste_images_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "waste_images_auth_delete" ON storage.objects;

-- 3. Create clean policies
-- Public read: anyone can view waste images
CREATE POLICY "waste_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'waste-images');

-- Authenticated upload: any authenticated user can upload
CREATE POLICY "waste_images_auth_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'waste-images');

-- Authenticated update: any authenticated user can update
CREATE POLICY "waste_images_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'waste-images')
  WITH CHECK (bucket_id = 'waste-images');

-- Authenticated delete: any authenticated user can delete
CREATE POLICY "waste_images_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'waste-images');
