-- ============================================================================
-- Migration: Supabase Storage buckets for media uploads
-- ============================================================================

-- Create the media bucket for photo/video uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,  -- public URLs for image serving (RLS controls who can upload/delete)
  52428800,  -- 50MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime']
);

-- Storage RLS: photographers can upload to their own folder
CREATE POLICY "Photographers can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: photographers can view their own files
CREATE POLICY "Photographers can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: anyone can view files in public buckets (for gallery)
CREATE POLICY "Public read for media bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Storage RLS: photographers can delete their own files
CREATE POLICY "Photographers can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
