-- Setup Supabase Storage Buckets
-- Run this script in Supabase SQL Editor or via psql

-- Create 'documents' bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true, -- Set to true for simpler access via service role
  10485760, -- 10MB in bytes
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Create 'property-photos' bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for documents bucket
-- Note: Since we're using service_role key in backend, RLS is bypassed
-- But we'll add policies for future direct access if needed

-- Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own documents
CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Service role has full access (used by backend)
CREATE POLICY "Service role has full access"
ON storage.objects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS Policies for property-photos bucket (public read)
CREATE POLICY "Anyone can view property photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-photos');

CREATE POLICY "Users can delete property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos');
