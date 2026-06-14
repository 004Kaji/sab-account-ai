-- Atomic increment for chat_usage to avoid race conditions and double-writes
CREATE OR REPLACE FUNCTION public.increment_chat_usage(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.chat_usage (user_id, date, message_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET message_count = chat_usage.message_count + 1;
END;
$$;
