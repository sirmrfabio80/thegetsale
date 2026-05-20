
CREATE TABLE public.user_setup (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  departments TEXT[] NOT NULL DEFAULT '{}',
  houses TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  styles TEXT[] NOT NULL DEFAULT '{}',
  email_signals BOOLEAN NOT NULL DEFAULT true,
  sms_drops BOOLEAN NOT NULL DEFAULT false,
  weekly_digest BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_setup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own setup"
  ON public.user_setup FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own setup"
  ON public.user_setup FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own setup"
  ON public.user_setup FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own setup"
  ON public.user_setup FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_setup_updated_at
  BEFORE UPDATE ON public.user_setup
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
