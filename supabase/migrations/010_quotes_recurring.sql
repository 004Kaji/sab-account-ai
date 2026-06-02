-- Migration 010: Quotes, recurring invoices, overdue reminder tracking

-- document_type distinguishes quotes from invoices in the same table
alter table public.invoices
  add column if not exists document_type text not null default 'invoice';

-- Recurring invoice fields
alter table public.invoices
  add column if not exists recurring_interval text,        -- 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
  add column if not exists recurring_next_date date,       -- date the next copy should be generated
  add column if not exists recurring_active boolean not null default false;

-- Prevent duplicate overdue reminder emails
alter table public.invoices
  add column if not exists overdue_reminder_sent_at timestamptz;

-- Index for the recurring cron query
create index if not exists invoices_recurring_idx
  on public.invoices(recurring_next_date)
  where recurring_active = true;
