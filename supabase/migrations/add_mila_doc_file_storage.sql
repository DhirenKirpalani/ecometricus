-- Add file_url column to mila_documents for original file storage
ALTER TABLE mila_documents
  ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Create storage bucket for Mila documents (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mila-documents', 'mila-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, authenticated write/delete
CREATE POLICY "Public read access for mila documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mila-documents');

CREATE POLICY "Authenticated users can upload mila documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'mila-documents');

CREATE POLICY "Authenticated users can delete mila documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'mila-documents');
