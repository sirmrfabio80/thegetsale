
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  maps_to TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active product_categories"
  ON public.product_categories FOR SELECT
  TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage product_categories"
  ON public.product_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.style_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.style_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active style_tags"
  ON public.style_tags FOR SELECT
  TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage style_tags"
  ON public.style_tags FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_style_tags_updated_at
  BEFORE UPDATE ON public.style_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.product_categories (slug, label, maps_to, sort_order) VALUES
  ('bags',          'Bags',          ARRAY['Accessories'],     10),
  ('shoes',         'Shoes',         ARRAY['Footwear'],        20),
  ('ready-to-wear', 'Ready-to-wear', ARRAY['Womens','Mens'],   30),
  ('outerwear',     'Outerwear',     ARRAY['Womens','Mens'],   40),
  ('jewellery',     'Jewellery',     ARRAY['Jewellery'],       50),
  ('accessories',   'Accessories',   ARRAY['Accessories'],     60);

INSERT INTO public.style_tags (slug, label, description, keywords, sort_order) VALUES
  ('quiet-luxury', 'Quiet luxury', 'Hushed, archival, considered.',     ARRAY['quiet','archival','tailoring','considered','hush'], 10),
  ('statement',    'Statement',    'Bold cuts, runway-led drama.',      ARRAY['bold','runway','statement','dramatic'],            20),
  ('editorial',    'Editorial',    'Magazine-ready, fashion-forward.',  ARRAY['editorial','magazine','fashion','forward'],        30),
  ('heritage',     'Heritage',     'Houses with deep histories.',       ARRAY['heritage','house','atelier','maison','archive'],   40),
  ('street',       'Street',       'Off-runway, downtown energy.',      ARRAY['street','downtown','casual','sport'],              50),
  ('contemporary', 'Contemporary', 'Modern, wearable, daily.',          ARRAY['contemporary','modern','daily','wearable','ready-to-wear'], 60);
