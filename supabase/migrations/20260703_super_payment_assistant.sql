-- Super Payment Assistant — Payday Super compliance layer
--
-- SAB Account AI calculates, prepares and TRACKS super. It never moves money.
-- This migration extends the employee super-fund profile, enriches
-- super_payments with confirmation details, and adds an immutable audit log
-- for the PCG 2026/1 risk-based compliance record.

-- ── 1. Employee super-fund profile ────────────────────────────────────
-- employees.usi and employees.super_fund_name / member_number already exist.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fund_abn         text; -- APRA fund or SMSF ABN
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_smsf          boolean NOT NULL DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS smsf_esa         text;  -- Electronic Service Address (SMSF messaging alias)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS smsf_bank_name   text;  -- display only — SAB never initiates payment
ALTER TABLE employees ADD COLUMN IF NOT EXISTS smsf_bank_bsb    text;  -- display only
ALTER TABLE employees ADD COLUMN IF NOT EXISTS smsf_bank_acct   text;  -- display only

-- ── 2. super_payments: confirmation + reference details ───────────────
-- Existing columns: status, deadline, payment_date (payday), amount, beam_reference…
ALTER TABLE super_payments ADD COLUMN IF NOT EXISTS fund_abn       text;
ALTER TABLE super_payments ADD COLUMN IF NOT EXISTS paid_date      date;   -- date the employer actually paid
ALTER TABLE super_payments ADD COLUMN IF NOT EXISTS paid_method    text;   -- e.g. 'bank_transfer', 'fund_portal', 'bpay'
ALTER TABLE super_payments ADD COLUMN IF NOT EXISTS paid_reference text;   -- employer's own payment reference
ALTER TABLE super_payments ADD COLUMN IF NOT EXISTS payment_ref    text;   -- SAB-suggested reference shown on the instruction sheet

-- ── 3. Immutable audit log (PCG 2026/1 record-keeping) ────────────────
-- Append-only: RLS grants SELECT + INSERT for the owner, and deliberately
-- NO update/delete policies, so rows cannot be altered once written.
CREATE TABLE IF NOT EXISTS super_audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payday        date        NOT NULL,           -- the payrun payday this event relates to
  event         text        NOT NULL,           -- calculated | instructions_generated | marked_paid | corrected | reminder_sent
  detail        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  deadline      date,                            -- snapshot of the deadline at the time of the event
  total_amount  numeric(12,2),                   -- snapshot of total super for the payrun
  on_time       boolean,                         -- for marked_paid: was it on or before the deadline
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE super_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_super_audit_select" ON super_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_own_super_audit_insert" ON super_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No UPDATE or DELETE policies: the log is immutable under RLS.

CREATE INDEX IF NOT EXISTS super_audit_log_user_id_idx ON super_audit_log(user_id);
CREATE INDEX IF NOT EXISTS super_audit_log_payday_idx   ON super_audit_log(user_id, payday);
