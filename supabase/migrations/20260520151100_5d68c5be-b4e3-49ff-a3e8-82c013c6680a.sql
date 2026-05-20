
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS editorial_copy text;

ALTER TABLE public.sale_predictions
  ADD COLUMN IF NOT EXISTS signal text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sale_predictions_signal_check'
  ) THEN
    ALTER TABLE public.sale_predictions
      ADD CONSTRAINT sale_predictions_signal_check
      CHECK (signal IS NULL OR signal IN ('buy','soon','hold','low'));
  END IF;
END $$;

INSERT INTO public.brands (slug, name, tagline, category, is_active)
VALUES
  ('maison-ardoise','Maison Ardoise','Parisian ready-to-wear, archival cuts.','Womens', true),
  ('north-room','North Room','Quiet tailoring from Copenhagen.','Mens', true),
  ('verre-atelier','Verre Atelier','Hand-finished leather, Florence.','Accessories', true),
  ('halden','Halden','British shoemaking, modern last.','Footwear', true),
  ('ostra','Östra','Stockholm minimalism, considered fabrics.','Womens', true),
  ('ferrum-co','Ferrum & Co.','Solid-gold essentials, made to order.','Jewellery', true),
  ('branwell','Branwell','Heritage knitwear, Scottish mills.','Mens', true),
  ('lune-prive','Lune Privé','Silk scarves and small leather goods.','Accessories', true)
ON CONFLICT (slug) DO NOTHING;

WITH src(slug, start_date, label, dmin, dmax) AS (
  VALUES
  ('maison-ardoise','2026-03-04'::date,'Spring Preview',     NULL::int, 30),
  ('maison-ardoise','2025-12-27'::date,'Winter Archive',     NULL::int, 40),
  ('maison-ardoise','2025-09-15'::date,'Mid-Season Edit',    NULL::int, 25),
  ('north-room',    '2026-04-28'::date,'End of Season',      NULL, 20),
  ('north-room',    '2026-01-09'::date,'January Archive',    NULL, 30),
  ('north-room',    '2025-08-21'::date,'Summer Edit',        NULL, 15),
  ('verre-atelier', '2026-05-05'::date,'Spring Window',      NULL, 15),
  ('verre-atelier', '2025-11-30'::date,'Private Sale',       NULL, 20),
  ('verre-atelier', '2025-06-02'::date,'Spring Window',      NULL, 15),
  ('halden',        '2026-03-10'::date,'Quarterly Edit',     NULL, 25),
  ('halden',        '2025-12-12'::date,'Winter Sale',        NULL, 30),
  ('halden',        '2025-09-29'::date,'Autumn Edit',        NULL, 20),
  ('ostra',         '2026-02-18'::date,'Members Preview',    NULL, 20),
  ('ostra',         '2025-10-04'::date,'Autumn Archive',     NULL, 25),
  ('ostra',         '2025-05-11'::date,'Spring Edit',        NULL, 15),
  ('ferrum-co',     '2025-11-21'::date,'Friends & Family',   NULL, 10),
  ('ferrum-co',     '2025-05-02'::date,'Atelier Preview',    NULL, 10),
  ('ferrum-co',     '2024-11-15'::date,'Friends & Family',   NULL, 10),
  ('branwell',      '2026-03-20'::date,'Mid-Season',         NULL, 35),
  ('branwell',      '2025-12-30'::date,'Winter Sale',        NULL, 40),
  ('branwell',      '2025-07-17'::date,'Summer Sale',        NULL, 30),
  ('lune-prive',    '2026-04-15'::date,'Members Event',      NULL, 25),
  ('lune-prive',    '2026-01-22'::date,'Winter Edit',        NULL, 20),
  ('lune-prive',    '2025-10-09'::date,'Autumn Preview',     NULL, 15)
)
INSERT INTO public.sale_events
  (brand_id, start_date, sale_type, discount_min, discount_max, status, source_type, admin_notes)
SELECT b.id, s.start_date, 'other', s.dmin, s.dmax, 'published', 'admin_confirmed', s.label
FROM src s
JOIN public.brands b ON b.slug = s.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.sale_events e
  WHERE e.brand_id = b.id AND e.start_date = s.start_date AND e.admin_notes = s.label
);

WITH src(slug, signal, confidence, window_days, headline, sample_size) AS (
  VALUES
  ('maison-ardoise','soon', 0.82, 12,  'Wait — a markdown window is likely within two weeks.', 3),
  ('north-room',    'hold', 0.54, 34,  'Hold. No clear signal in the next month.',              3),
  ('verre-atelier', 'buy',  0.91, 120, 'Buy now — this item rarely discounts.',                 3),
  ('halden',        'soon', 0.73, 21,  'A discreet sale is likely within the month.',           3),
  ('ostra',         'low',  0.38, 60,  'No strong signal. Watching quietly.',                   3),
  ('ferrum-co',     'buy',  0.88, 180, 'Buy now — pricing tied to materials, not season.',      3),
  ('branwell',      'soon', 0.77, 18,  'An end-of-season cut is likely within three weeks.',    3),
  ('lune-prive',    'hold', 0.49, 40,  'Hold. Signals are mixed for the next month.',           3)
)
INSERT INTO public.sale_predictions
  (brand_id, sale_type, predicted_start_date, confidence_score, confidence_label,
   sample_size, algorithm_version, reasoning_summary, status, signal)
SELECT b.id, 'other',
       (current_date + s.window_days),
       s.confidence,
       CASE WHEN s.confidence >= 0.75 THEN 'high'
            WHEN s.confidence >= 0.50 THEN 'medium'
            ELSE 'low' END,
       s.sample_size,
       'seed-v1',
       s.headline,
       'published',
       s.signal
FROM src s
JOIN public.brands b ON b.slug = s.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.sale_predictions p
  WHERE p.brand_id = b.id AND p.algorithm_version = 'seed-v1'
);
