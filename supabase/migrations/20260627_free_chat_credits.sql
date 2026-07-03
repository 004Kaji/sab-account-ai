-- Add chat credit columns to profiles (5 credits/month for all non-autopilot plans)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_credits_remaining INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS chat_credits_reset_at  TIMESTAMPTZ NOT NULL DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month');

-- Existing autopilot users get a sentinel value (credits not used for them)
UPDATE public.profiles
SET chat_credits_remaining = 9999
WHERE plan = 'autopilot';

-- Atomically check & consume one credit. Returns (allowed, remaining).
-- For autopilot users, always returns (true, 9999) without touching credits.
CREATE OR REPLACE FUNCTION public.check_and_use_chat_credit(p_user_id UUID)
RETURNS TABLE (allowed BOOLEAN, remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan      TEXT;
  v_remaining INT;
  v_reset_at  TIMESTAMPTZ;
BEGIN
  SELECT plan, chat_credits_remaining, chat_credits_reset_at
  INTO v_plan, v_remaining, v_reset_at
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Autopilot = unlimited
  IF v_plan = 'autopilot' THEN
    RETURN QUERY SELECT TRUE, 9999;
    RETURN;
  END IF;

  -- Reset credits if the reset date has passed
  IF NOW() >= v_reset_at THEN
    v_remaining := 5;
    UPDATE public.profiles
    SET chat_credits_remaining = 5,
        chat_credits_reset_at  = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    WHERE id = p_user_id;
  END IF;

  IF v_remaining < 1 THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET chat_credits_remaining = v_remaining - 1
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, v_remaining - 1;
END;
$$;
