
CREATE TABLE public.user_watchlist (
  user_id uuid NOT NULL,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brand_id)
);

CREATE INDEX idx_user_watchlist_user ON public.user_watchlist (user_id, added_at DESC);

ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own watchlist"
  ON public.user_watchlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own watchlist"
  ON public.user_watchlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own watchlist"
  ON public.user_watchlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
