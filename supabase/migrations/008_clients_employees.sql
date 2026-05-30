-- Migration 008: Document clients and employees tables
-- These tables were created manually in Supabase dashboard.
-- This migration records the schema for version control.
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.

-- ── clients table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name    TEXT NOT NULL DEFAULT '',
  contact_name     TEXT,
  email            TEXT,
  phone            TEXT,
  address          TEXT,
  abn              TEXT,
  website          TEXT,
  notes            TEXT,
  total_invoiced   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  invoice_count    INTEGER NOT NULL DEFAULT 0,
  last_invoiced_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clients'
    AND policyname = 'Users CRUD own clients'
  ) THEN
    CREATE POLICY "Users CRUD own clients" ON public.clients
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── employees table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name                 TEXT NOT NULL DEFAULT '',
  email                TEXT,
  phone                TEXT,
  tfn                  TEXT,
  abn                  TEXT,
  employment_type      TEXT NOT NULL DEFAULT 'casual',
  pay_cycle            TEXT NOT NULL DEFAULT 'fortnightly',
  pay_basis            TEXT NOT NULL DEFAULT 'salary',
  annual_salary        NUMERIC(12, 2),
  hourly_rate          NUMERIC(8, 2),
  ordinary_hours       NUMERIC(6, 2),
  super_fund_name      TEXT,
  member_number        TEXT,
  residency_status     TEXT NOT NULL DEFAULT 'citizen_pr',
  notes                TEXT,
  annual_leave_hours   NUMERIC(8, 2),
  personal_leave_hours NUMERIC(8, 2),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employees'
    AND policyname = 'Users CRUD own employees'
  ) THEN
    CREATE POLICY "Users CRUD own employees" ON public.employees
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Indexes ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_user_id       ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_name ON public.clients(user_id, business_name);
CREATE INDEX IF NOT EXISTS idx_employees_user_id     ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_name        ON public.employees(user_id, name);
