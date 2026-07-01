CREATE POLICY "Public read marketing-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketing-media');

CREATE POLICY "Admins insert marketing-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update marketing-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete marketing-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'));