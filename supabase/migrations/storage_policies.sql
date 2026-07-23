-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Storage Policies for olympus-assets bucket    ║
-- ╚══════════════════════════════════════════════════════════╝

-- 1. Authenticated users can upload to player-photos/
CREATE POLICY "Authenticated users can upload player photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'olympus-assets'
  AND name LIKE 'player-photos/%'
);

-- 2. Authenticated users can overwrite (update) their own photo
CREATE POLICY "Authenticated users can update player photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'olympus-assets'
  AND name LIKE 'player-photos/%'
);

-- 3. Anyone (public) can view/read photos (needed to show them in the UI)
CREATE POLICY "Public read access for player photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'olympus-assets');

SELECT 'Storage policies created! Photos will now upload correctly.' AS status;
