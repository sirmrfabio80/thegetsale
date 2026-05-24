DO $$
DECLARE
  c text;
BEGIN
  -- sale_events.status
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.sale_events'::regclass
     AND pg_get_constraintdef(oid) ILIKE '%status%archived%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.sale_events DROP CONSTRAINT %I', c);
  END IF;

  -- sale_predictions.status
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.sale_predictions'::regclass
     AND pg_get_constraintdef(oid) ILIKE '%status%archived%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.sale_predictions DROP CONSTRAINT %I', c);
  END IF;

  -- sale_events.source_type
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.sale_events'::regclass
     AND pg_get_constraintdef(oid) ILIKE '%source_type%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.sale_events DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE public.sale_events
  ADD CONSTRAINT sale_events_status_check
  CHECK (status IN ('draft','published','hidden'));

ALTER TABLE public.sale_predictions
  ADD CONSTRAINT sale_predictions_status_check
  CHECK (status IN ('draft','published','hidden'));

ALTER TABLE public.sale_events
  ADD CONSTRAINT sale_events_source_type_check
  CHECK (source_type IN (
    'admin_confirmed','brand_site','email_archive','wayback',
    'retailer','press','price_tracker','manual_research'
  ));