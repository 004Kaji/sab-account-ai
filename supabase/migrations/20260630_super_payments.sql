-- Payday Super: track per-payrun super payment status (Beam clearing house)
-- From 1 July 2026, employers must pay super within 7 business days of each payday.

-- Add USI to employees (needed for SuperStream submissions)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS usi text;

-- Add beam_employer_id to business_profiles (SAB is a SaaS partner — each customer has their own Beam employer ID)
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS beam_employer_id text;

-- Track each super payment per employee per payrun
CREATE TABLE IF NOT EXISTS super_payments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payslip_id      uuid        REFERENCES payslips(id) ON DELETE SET NULL,
  employee_name   text        NOT NULL,
  super_fund_name text,
  member_number   text,
  usi             text,
  amount          numeric(12,2) NOT NULL DEFAULT 0,
  payment_date    date        NOT NULL,   -- the payrun date (wages paid)
  deadline        date        NOT NULL,   -- 7 business days after payment_date
  status          text        NOT NULL DEFAULT 'pending',
    -- pending | submitted | processing | settled | failed | manually_paid
  beam_reference  text,                  -- Beam transaction reference
  failure_reason  text,
  submitted_at    timestamptz,
  settled_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE super_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_super_payments_select" ON super_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_own_super_payments_insert" ON super_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_super_payments_update" ON super_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS super_payments_user_id_idx    ON super_payments(user_id);
CREATE INDEX IF NOT EXISTS super_payments_payment_date_idx ON super_payments(payment_date);
CREATE INDEX IF NOT EXISTS super_payments_status_idx     ON super_payments(status);
