ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS sat_rate_mult   NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS sun_rate_mult   NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS ph_rate_mult    NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS evening_rate_mult NUMERIC(5, 4);
