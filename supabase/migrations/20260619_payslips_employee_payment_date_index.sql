-- Composite index for YTD payslip queries (employee_name + payment_date range)
-- Covers: WHERE user_id = X AND employee_name = Y AND payment_date BETWEEN a AND b
-- Used by send_payslip, send_all_payslips, and payslip-history YTD calculations
CREATE INDEX IF NOT EXISTS idx_payslips_user_employee_payment_date
  ON payslips (user_id, employee_name, payment_date);
