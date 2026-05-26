ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read brand-logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-logos');

CREATE POLICY "Admins insert brand-logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update brand-logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete brand-logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-logos' AND public.has_role(auth.uid(), 'admin'));