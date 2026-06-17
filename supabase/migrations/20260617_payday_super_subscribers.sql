-- Email subscribers from the /payday-super calculator page.
-- Inserted via public API route — no auth required.
-- UNIQUE on email so duplicate submissions are silently ignored.

CREATE TABLE IF NOT EXISTS payday_super_subscribers (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz DEFAULT now(),
  email        text        NOT NULL,
  subscribed   boolean     NOT NULL DEFAULT true,
  CONSTRAINT payday_super_subscribers_email_unique UNIQUE (email)
);

ALTER TABLE payday_super_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No user access" ON payday_super_subscribers;
CREATE POLICY "No user access" ON payday_super_subscribers FOR ALL USING (false);

CREATE INDEX IF NOT EXISTS payday_super_subscribers_email
  ON payday_super_subscribers (email);
