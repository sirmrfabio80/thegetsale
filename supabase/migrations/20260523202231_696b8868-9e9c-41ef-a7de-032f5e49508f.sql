
-- 1. Multi-category on brands
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';

UPDATE public.brands
SET categories = ARRAY[category]
WHERE (categories IS NULL OR array_length(categories, 1) IS NULL)
  AND category IS NOT NULL
  AND category <> '';

CREATE INDEX IF NOT EXISTS brands_categories_gin
  ON public.brands USING gin (categories);

-- 2. brand_links: per-country URL overrides
CREATE TABLE IF NOT EXISTS public.brand_links (
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, country_code),
  CONSTRAINT brand_links_country_code_format
    CHECK (country_code ~ '^[a-z]{2}$'),
  CONSTRAINT brand_links_url_format
    CHECK (url ~* '^https?://')
);

ALTER TABLE public.brand_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read brand_links"
  ON public.brand_links
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage brand_links"
  ON public.brand_links
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER brand_links_set_updated_at
  BEFORE UPDATE ON public.brand_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
