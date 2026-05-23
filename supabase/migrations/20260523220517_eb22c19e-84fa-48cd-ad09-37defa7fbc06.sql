ALTER TABLE public.sale_events
  ADD COLUMN country_code text;

ALTER TABLE public.sale_events
  ADD CONSTRAINT sale_events_country_code_check
  CHECK (country_code IS NULL OR country_code ~ '^[a-z]{2}$');

CREATE INDEX sale_events_brand_country_start_idx
  ON public.sale_events (brand_id, country_code, start_date);

ALTER TABLE public.sale_predictions
  ADD COLUMN country_code text;

ALTER TABLE public.sale_predictions
  ADD CONSTRAINT sale_predictions_country_code_check
  CHECK (country_code IS NULL OR country_code ~ '^[a-z]{2}$');

CREATE INDEX sale_predictions_brand_country_start_idx
  ON public.sale_predictions (brand_id, country_code, predicted_start_date);