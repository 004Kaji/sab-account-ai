-- Migration: Proactive nudges — de-dup table for SAB's proactive chat reminders.
-- Reminders themselves are written into chat_messages (flagged via the existing
-- tool_calls JSONB column: {"kind":"reminder"}). This table only prevents the
-- same reminder being sent twice for the same pay run / period.

CREATE TABLE IF NOT EXISTS public.proactive_nudges (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nudge_type  TEXT        NOT NULL,           -- e.g. 'payday_super'
  period_key  TEXT        NOT NULL,           -- e.g. the latest pay_period_end date
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, nudge_type, period_key)
);

ALTER TABLE public.proactive_nudges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proactive_nudges'
    AND policyname = 'Users see own nudges'
  ) THEN
    CREATE POLICY "Users see own nudges" ON public.proactive_nudges
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proactive_nudges_user
  ON public.proactive_nudges(user_id, nudge_type);
