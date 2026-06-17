-- Track which touch in the 3-step sequence has been sent to each accountant.
-- 1 = touch 1 sent (day 0), 2 = touch 2 sent (day 4), 3 = touch 3 sent (day 8, sequence done)
-- NULL = not yet contacted (pending rows).

ALTER TABLE accountant_outreach
  ADD COLUMN IF NOT EXISTS sequence_step INTEGER;
