-- Add image columns to food_waste_logs table
ALTER TABLE food_waste_logs
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS images JSONB;

-- Create storage bucket for waste images (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('waste-images', 'waste-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload, public can read
CREATE POLICY "Public read access for waste images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'waste-images');

CREATE POLICY "Authenticated users can upload waste images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'waste-images');

CREATE POLICY "Users can delete their own waste images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'waste-images' AND owner = auth.uid());
