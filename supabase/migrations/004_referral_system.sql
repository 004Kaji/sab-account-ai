-- Referral system tables
-- Run in Supabase SQL Editor or via: supabase db push

-- Referral codes: one per user, generated on first login
CREATE TABLE IF NOT EXISTS referral_codes (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  user_id              UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code                 TEXT UNIQUE NOT NULL,
  total_referrals      INTEGER DEFAULT 0,
  converted_referrals  INTEGER DEFAULT 0,
  free_months_earned   INTEGER DEFAULT 0,
  free_months_used     INTEGER DEFAULT 0,
  lifetime_pro         BOOLEAN DEFAULT FALSE
);

-- Referral tracking: one row per referred signup
CREATE TABLE IF NOT EXISTS referrals (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  referral_code     TEXT REFERENCES referral_codes(code),
  referrer_id       UUID REFERENCES profiles(id),
  referred_user_id  UUID REFERENCES profiles(id),
  referred_email    TEXT,
  status            TEXT DEFAULT 'signed_up', -- signed_up | converted | expired
  converted_at      TIMESTAMPTZ,
  reward_applied    BOOLEAN DEFAULT FALSE
);

-- RLS policies
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referral code"
  ON referral_codes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users read own referrals"
  ON referrals FOR ALL USING (auth.uid() = referrer_id);
