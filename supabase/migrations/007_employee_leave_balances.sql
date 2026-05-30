-- Add leave balance tracking to employees table.
-- annual_leave_hours and personal_leave_hours store the running balance
-- after each payslip is saved, so the next payslip can pre-fill the updated value.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS annual_leave_hours   NUMERIC(8, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS personal_leave_hours NUMERIC(8, 2) DEFAULT NULL;
