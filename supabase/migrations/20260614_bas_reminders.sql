CREATE TABLE IF NOT EXISTS public.bas_reminders (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quarter       TEXT NOT NULL,
  reminder_type TEXT CHECK (reminder_type IN ('28_day', '7_day')) NOT NULL,
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quarter, reminder_type)
);

ALTER TABLE public.bas_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own bas_reminders" ON public.bas_reminders
  FOR ALL USING (auth.uid() = user_id);
