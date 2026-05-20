-- Performance indexes for common queries
-- Run in Supabase SQL Editor

-- Invoices: most queried by user_id, also filtered by status and sorted by created_at
CREATE INDEX IF NOT EXISTS idx_invoices_user_id        ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status    ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_created   ON invoices(user_id, created_at DESC);

-- Clients: queried by user_id, searched by business_name
CREATE INDEX IF NOT EXISTS idx_clients_user_id         ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_business   ON clients(user_id, business_name);

-- Payslips: queried by user_id, sorted by created_at
CREATE INDEX IF NOT EXISTS idx_payslips_user_id        ON payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_payslips_user_created   ON payslips(user_id, created_at DESC);

-- Profiles: looked up by stripe IDs during webhook processing
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer    ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_sub         ON profiles(stripe_subscription_id);

-- Referral codes: looked up by user_id and code
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id  ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code     ON referral_codes(code);

-- Referrals: queried by referrer and referred user
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id       ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id  ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code     ON referrals(referral_code);
