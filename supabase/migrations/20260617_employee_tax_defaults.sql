-- Add per-employee tax preference fields so payslip wizard and Autopilot
-- can auto-fill PAYG settings without asking the user every time.
--
-- claiming_threshold: whether this employee claims the tax-free threshold (Scale 2).
--   true  = main/only job, AU resident — most common.
--   false = second job or Scale 1 rate applies.
--
-- has_help: whether this employee has a HELP/HECS repayment obligation.
--   Used to apply the ATO's HELP repayment thresholds to PAYG withholding.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS claiming_threshold BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_help           BOOLEAN NOT NULL DEFAULT false;
