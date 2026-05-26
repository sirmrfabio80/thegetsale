DROP POLICY IF EXISTS "Public read brand-logos" ON storage.objects;

CREATE POLICY "Admins list brand-logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'brand-logos' AND public.has_role(auth.uid(), 'admin'));