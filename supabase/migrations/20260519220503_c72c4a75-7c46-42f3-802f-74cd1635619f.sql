
-- 1. Role infrastructure
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. brands
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  house_group text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX brands_is_active_idx ON public.brands(is_active);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active brands" ON public.brands
  FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage brands" ON public.brands
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. sale_events
CREATE TABLE public.sale_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  category text,
  sale_type text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  discount_min integer,
  discount_max integer,
  source_type text NOT NULL DEFAULT 'admin_confirmed'
    CHECK (source_type IN ('admin_confirmed','admin_observed','imported')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),
  admin_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sale_events_brand_idx ON public.sale_events(brand_id);
CREATE INDEX sale_events_status_start_idx ON public.sale_events(status, start_date);

ALTER TABLE public.sale_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read published sale_events" ON public.sale_events
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage sale_events" ON public.sale_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sale_events_updated_at BEFORE UPDATE ON public.sale_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. sale_predictions
CREATE TABLE public.sale_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  category text,
  sale_type text NOT NULL,
  predicted_start_date date NOT NULL,
  predicted_end_date date,
  confidence_score numeric NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_label text NOT NULL,
  basis_years integer[],
  sample_size integer NOT NULL DEFAULT 0,
  algorithm_version text NOT NULL,
  reasoning_summary text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz
);
CREATE INDEX sale_predictions_brand_idx ON public.sale_predictions(brand_id);
CREATE INDEX sale_predictions_status_start_idx ON public.sale_predictions(status, predicted_start_date);

ALTER TABLE public.sale_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read published sale_predictions" ON public.sale_predictions
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage sale_predictions" ON public.sale_predictions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. prediction_runs
CREATE TABLE public.prediction_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running','succeeded','failed')),
  brands_processed integer NOT NULL DEFAULT 0,
  predictions_created integer NOT NULL DEFAULT 0,
  predictions_updated integer NOT NULL DEFAULT 0,
  errors jsonb,
  algorithm_version text NOT NULL
);

ALTER TABLE public.prediction_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read prediction_runs" ON public.prediction_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
