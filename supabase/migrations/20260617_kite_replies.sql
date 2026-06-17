-- Draft reply queue for Kite agent.
-- Kite finds intent signals on Reddit/LinkedIn/Facebook and drafts replies.
-- status is always 'draft' — nothing is auto-posted. Manual review required.

CREATE TABLE IF NOT EXISTS kite_replies (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz DEFAULT now(),
  source_url            text        NOT NULL,
  source_platform       text        NOT NULL,   -- reddit | linkedin | facebook | other
  original_post_snippet text,
  draft_reply           text        NOT NULL,
  status                text        DEFAULT 'draft',  -- draft | posted | dismissed
  posted_at             timestamptz             -- null until manually posted
);

ALTER TABLE kite_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No user access" ON kite_replies;
CREATE POLICY "No user access" ON kite_replies FOR ALL USING (false);

CREATE INDEX IF NOT EXISTS kite_replies_status_created
  ON kite_replies (status, created_at DESC);
