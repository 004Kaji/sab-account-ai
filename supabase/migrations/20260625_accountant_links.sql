CREATE TABLE IF NOT EXISTS public.accountant_links (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       uuid        UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  label       text,
  expires_at  timestamptz NOT NULL DEFAULT now() + INTERVAL '90 days',
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accountant_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_accountant_links"
  ON public.accountant_links
  FOR ALL
  USING (auth.uid() = user_id);

-- Fast token lookup for public /accountant/[token] page
CREATE UNIQUE INDEX IF NOT EXISTS accountant_links_token_idx
  ON public.accountant_links (token);

-- User's own links listing
CREATE INDEX IF NOT EXISTS accountant_links_user_id_idx
  ON public.accountant_links (user_id, created_at DESC);
