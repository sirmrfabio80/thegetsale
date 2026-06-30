
-- 1. Table
CREATE TABLE public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one row can be is_active = true
CREATE UNIQUE INDEX themes_only_one_active
  ON public.themes (is_active)
  WHERE is_active = true;

-- 2. Grants
GRANT SELECT ON public.themes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.themes TO authenticated;
GRANT ALL ON public.themes TO service_role;

-- 3. RLS
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "themes are readable by everyone"
  ON public.themes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admins can insert themes"
  ON public.themes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can update themes"
  ON public.themes
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete themes"
  ON public.themes
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER update_themes_updated_at
  BEFORE UPDATE ON public.themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. setActiveTheme RPC — flips is_active atomically so the partial unique
-- index never trips mid-statement.
CREATE OR REPLACE FUNCTION public.set_active_theme(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.themes WHERE key = _key) THEN
    RAISE EXCEPTION 'Theme not found: %', _key;
  END IF;

  UPDATE public.themes SET is_active = false WHERE is_active = true AND key <> _key;
  UPDATE public.themes SET is_active = true  WHERE key = _key;
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_theme(text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_active_theme(text) TO authenticated;

-- 6. Seed themes
INSERT INTO public.themes (key, name, is_active, tokens) VALUES
(
  'editorial',
  'Editorial',
  true,
  jsonb_build_object(
    '--radius', '0.25rem',
    '--background', 'oklch(0.975 0.008 80)',
    '--foreground', 'oklch(0.19 0.015 65)',
    '--card', 'oklch(0.99 0.006 80)',
    '--card-foreground', 'oklch(0.19 0.015 65)',
    '--popover', 'oklch(0.99 0.006 80)',
    '--popover-foreground', 'oklch(0.19 0.015 65)',
    '--primary', 'oklch(0.19 0.015 65)',
    '--primary-foreground', 'oklch(0.975 0.008 80)',
    '--secondary', 'oklch(0.94 0.01 75)',
    '--secondary-foreground', 'oklch(0.19 0.015 65)',
    '--muted', 'oklch(0.94 0.01 75)',
    '--muted-foreground', 'oklch(0.48 0.02 65)',
    '--accent', 'oklch(0.72 0.055 68)',
    '--accent-foreground', 'oklch(0.19 0.015 65)',
    '--destructive', 'oklch(0.55 0.18 28)',
    '--destructive-foreground', 'oklch(0.975 0.008 80)',
    '--border', 'oklch(0.88 0.012 75)',
    '--input', 'oklch(0.88 0.012 75)',
    '--ring', 'oklch(0.55 0.04 70)',
    '--signal-soon', 'oklch(0.55 0.10 70)',
    '--signal-hold', 'oklch(0.48 0.045 250)',
    '--signal-buy', 'oklch(0.42 0.09 145)',
    '--signal-low', 'oklch(0.60 0.008 75)',
    '--signal-soon-wash', 'oklch(0.965 0.028 75)',
    '--signal-hold-wash', 'oklch(0.96 0.012 240)',
    '--signal-buy-wash', 'oklch(0.96 0.025 140)',
    '--shadow-1', '0 1px 0 0 oklch(0 0 0 / 0.04)',
    '--shadow-2', '0 2px 12px -6px oklch(0 0 0 / 0.08)',
    '--shadow-3', '0 12px 40px -16px oklch(0 0 0 / 0.12)',
    '--font-serif', '"Instrument Serif", ui-serif, Georgia, serif',
    '--font-sans', '"Inter", ui-sans-serif, system-ui, sans-serif',
    '--radius-card', '0',
    '--radius-button', '0',
    '--radius-badge', '0',
    '--border-width', '1px',
    '--label-transform', 'uppercase',
    '--label-tracking', '0.18em'
  )
),
(
  'playful',
  'Playful',
  false,
  jsonb_build_object(
    '--radius', '0.75rem',
    '--background', 'oklch(0.985 0.012 95)',
    '--foreground', 'oklch(0.22 0.04 285)',
    '--card', 'oklch(1 0 0)',
    '--card-foreground', 'oklch(0.22 0.04 285)',
    '--popover', 'oklch(1 0 0)',
    '--popover-foreground', 'oklch(0.22 0.04 285)',
    '--primary', 'oklch(0.58 0.22 295)',
    '--primary-foreground', 'oklch(0.985 0.012 95)',
    '--secondary', 'oklch(0.93 0.05 95)',
    '--secondary-foreground', 'oklch(0.22 0.04 285)',
    '--muted', 'oklch(0.95 0.025 95)',
    '--muted-foreground', 'oklch(0.45 0.04 285)',
    '--accent', 'oklch(0.78 0.16 55)',
    '--accent-foreground', 'oklch(0.22 0.04 285)',
    '--destructive', 'oklch(0.62 0.22 25)',
    '--destructive-foreground', 'oklch(0.985 0.012 95)',
    '--border', 'oklch(0.88 0.03 285)',
    '--input', 'oklch(0.88 0.03 285)',
    '--ring', 'oklch(0.58 0.22 295)',
    '--signal-soon', 'oklch(0.68 0.18 55)',
    '--signal-hold', 'oklch(0.58 0.16 250)',
    '--signal-buy', 'oklch(0.62 0.18 145)',
    '--signal-low', 'oklch(0.65 0.02 285)',
    '--signal-soon-wash', 'oklch(0.96 0.05 55)',
    '--signal-hold-wash', 'oklch(0.96 0.04 250)',
    '--signal-buy-wash', 'oklch(0.96 0.05 145)',
    '--shadow-1', '0 1px 2px 0 oklch(0 0 0 / 0.06)',
    '--shadow-2', '0 8px 24px -8px oklch(0 0 0 / 0.14)',
    '--shadow-3', '0 24px 60px -20px oklch(0 0 0 / 0.20)',
    '--font-serif', '"Instrument Serif", ui-serif, Georgia, serif',
    '--font-sans', '"Inter", ui-sans-serif, system-ui, sans-serif',
    '--radius-card', '1rem',
    '--radius-button', '9999px',
    '--radius-badge', '9999px',
    '--border-width', '1px',
    '--label-transform', 'none',
    '--label-tracking', '0'
  )
);
