-- Super rate is now derived automatically from the payment date (ATO mandate: 12% from 1 July 2025).
-- The super_rate_new column is no longer read by the application — remove it to prevent confusion.
ALTER TABLE business_profiles
  DROP COLUMN IF EXISTS super_rate_new;
