-- Add paid_at and deleted_at to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_at    timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Unique invoice number per user (partial — ignores soft-deleted rows)
CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_invoice_number_unique
  ON public.invoices (user_id, invoice_number)
  WHERE deleted_at IS NULL;

-- Index to speed up paginated list queries
CREATE INDEX IF NOT EXISTS invoices_user_created_active_idx
  ON public.invoices (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for filter queries (status + doc type)
CREATE INDEX IF NOT EXISTS invoices_user_status_active_idx
  ON public.invoices (user_id, status, document_type)
  WHERE deleted_at IS NULL;
