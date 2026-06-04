-- Performance indexes added 2026-06-02
-- Drop exact duplicate single-column user_id indexes
DROP INDEX IF EXISTS public.invoices_user_id_idx;
DROP INDEX IF EXISTS public.payslips_user_id_idx;
DROP INDEX IF EXISTS public.idx_clients_user_business;

-- invoices: date-range queries for BAS (Tax & Super page, dashboard)
CREATE INDEX IF NOT EXISTS idx_invoices_user_issue_date
  ON public.invoices (user_id, issue_date);

-- invoices: partial index for overdue scan (WHERE status='sent' AND due_date < now())
CREATE INDEX IF NOT EXISTS idx_invoices_sent_due_date
  ON public.invoices (due_date)
  WHERE status = 'sent';

-- records: filtered by type + date range (Tax & Super page, Records page)
CREATE INDEX IF NOT EXISTS idx_records_user_type_date
  ON public.records (user_id, type, date);

-- payslips: pay period date range queries (Tax & Super page)
CREATE INDEX IF NOT EXISTS idx_payslips_user_period_end
  ON public.payslips (user_id, pay_period_end);
