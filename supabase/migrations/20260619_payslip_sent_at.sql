-- Track when a payslip was last emailed to the employee so send_payslip can
-- detect accidental double-sends from the AI agent loop.
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
