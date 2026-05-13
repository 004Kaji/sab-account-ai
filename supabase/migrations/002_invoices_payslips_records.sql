-- Migration 002: Add invoices, payslips, records, and business_profile tables
-- Run this in Supabase SQL Editor after migration 001

-- ── business_profile: per-user business settings ────────────────
create table if not exists public.business_profiles (
  id                   uuid references auth.users(id) on delete cascade primary key,
  business_name        text,
  abn                  text,
  email                text,
  phone                text,
  address              text,
  website              text,
  industry             text,
  -- Invoice defaults
  default_payment_terms text default '14 days',
  default_gst          boolean default true,
  starting_invoice_num  int default 1,
  default_currency     text default 'AUD',
  default_footer       text,
  -- ATO settings
  gst_registered       boolean default false,
  bas_frequency        text default 'quarterly',
  super_rate_new       boolean default false,
  -- Notification toggles
  notify_overdue       boolean default true,
  notify_bas           boolean default true,
  notify_super         boolean default true,
  notify_payment       boolean default true,
  notify_weekly        boolean default false,
  updated_at           timestamptz default now()
);

alter table public.business_profiles enable row level security;

create policy "users_manage_own_business_profile" on public.business_profiles
  for all using (auth.uid() = id);

-- Auto-create a business_profile row when a user is created
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.business_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_profile();

-- ── invoices table ────────────────────────────────────────────────
create table if not exists public.invoices (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references auth.users(id) on delete cascade not null,
  invoice_number     text not null,
  status             text not null default 'pending', -- draft | pending | paid | overdue

  -- Client
  client_name        text not null default '',
  client_abn         text,
  client_address     text,
  client_email       text,
  client_contact     text,

  -- Business (snapshot at time of invoice)
  business_name      text not null default '',
  business_abn       text,
  business_email     text,
  business_phone     text,
  business_address   text,

  -- Line items stored as JSONB array
  line_items         jsonb not null default '[]',

  -- Totals
  has_gst            boolean not null default true,
  subtotal_ex_gst    numeric(12,2) not null default 0,
  total_gst          numeric(12,2) not null default 0,
  total_inc_gst      numeric(12,2) not null default 0,

  -- Dates
  issue_date         date not null,
  due_date           date not null,
  payment_terms      text,

  -- Payment details
  bank_name          text,
  account_name       text,
  bsb                text,
  account_number     text,
  notes              text,

  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

alter table public.invoices enable row level security;

create policy "users_manage_own_invoices" on public.invoices
  for all using (auth.uid() = user_id);

-- ── payslips table ────────────────────────────────────────────────
create table if not exists public.payslips (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references auth.users(id) on delete cascade not null,
  payslip_number     text not null,

  -- Employee
  employee_name      text not null default '',
  employment_type    text default 'full-time',
  pay_cycle          text default 'fortnightly',
  super_fund_name    text,
  member_number      text,

  -- Employer
  employer_name      text not null default '',
  employer_abn       text,

  -- Pay period
  pay_period_start   date not null,
  pay_period_end     date not null,
  payment_date       date not null,

  -- Calculated amounts (all per-period)
  gross_pay          numeric(12,2) not null default 0,
  salary_sacrifice   numeric(12,2) not null default 0,
  taxable_gross      numeric(12,2) not null default 0,
  income_tax         numeric(12,2) not null default 0,
  medicare_levy      numeric(12,2) not null default 0,
  help_repayment     numeric(12,2) not null default 0,
  net_pay            numeric(12,2) not null default 0,
  super_sg           numeric(12,2) not null default 0,
  super_sal_sac      numeric(12,2) not null default 0,

  created_at         timestamptz default now()
);

alter table public.payslips enable row level security;

create policy "users_manage_own_payslips" on public.payslips
  for all using (auth.uid() = user_id);

-- ── records table: income and expenses ───────────────────────────
create table if not exists public.records (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  type          text not null, -- 'income' | 'expense'
  date          date not null,
  description   text not null default '',
  category      text not null default '',
  amount        numeric(12,2) not null default 0, -- amount including GST if applicable
  gst_amount    numeric(12,2) not null default 0,
  supplier_abn  text,
  created_at    timestamptz default now()
);

alter table public.records enable row level security;

create policy "users_manage_own_records" on public.records
  for all using (auth.uid() = user_id);

-- ── Indexes for performance ───────────────────────────────────────
create index if not exists invoices_user_id_idx  on public.invoices(user_id);
create index if not exists invoices_created_idx  on public.invoices(created_at desc);
create index if not exists payslips_user_id_idx  on public.payslips(user_id);
create index if not exists records_user_id_idx   on public.records(user_id);
create index if not exists records_date_idx      on public.records(date desc);
