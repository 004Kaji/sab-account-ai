-- Migration: SAB Chat — chat message history and daily rate limiting
-- Employees table already exists (migration 008). Only new tables here.

-- ── chat_messages ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages'
    AND policyname = 'Users see own chat messages'
  ) THEN
    CREATE POLICY "Users see own chat messages" ON public.chat_messages
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created
  ON public.chat_messages(user_id, created_at DESC);

-- ── chat_usage ────────────────────────────────────────────────────────
-- Tracks daily message count per user for rate limiting (30 msg/day)
CREATE TABLE IF NOT EXISTS public.chat_usage (
  id            UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID  REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date          DATE  DEFAULT CURRENT_DATE NOT NULL,
  message_count INT   DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_usage'
    AND policyname = 'Users see own chat usage'
  ) THEN
    CREATE POLICY "Users see own chat usage" ON public.chat_usage
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_usage_user_date
  ON public.chat_usage(user_id, date);
