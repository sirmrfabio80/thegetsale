ALTER TABLE public.profiles ADD COLUMN market text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_market_format CHECK (market IS NULL OR market ~ '^[a-z]{2}$');