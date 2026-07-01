
-- Admin-only writes on marketing-media bucket; reads are handled via signed URLs from a server function.
CREATE POLICY "Admins manage marketing-media objects"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'));
