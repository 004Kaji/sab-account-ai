-- Migration 012: Agent access control tables
-- Adds github_prs (tracks PRs opened by Flux) and marketing_approvals (approval queue for Spark social posts)

-- ── github_prs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS github_prs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL    DEFAULT now(),
  pr_url        text        NOT NULL,
  pr_title      text        NOT NULL,
  branch_name   text        NOT NULL,
  status        text        NOT NULL    DEFAULT 'pending_review',
  agent_name    text        NOT NULL    DEFAULT 'flux',
  trigger_type  text        NOT NULL,
  CONSTRAINT github_prs_status_check CHECK (status IN ('pending_review', 'merged', 'closed'))
);

CREATE INDEX IF NOT EXISTS github_prs_status_idx ON github_prs (status, created_at DESC);

ALTER TABLE github_prs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No user access" ON github_prs FOR ALL USING (false);

-- ── marketing_approvals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_approvals (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL    DEFAULT now(),
  platform     text        NOT NULL,
  content      text        NOT NULL,
  media_urls   jsonb                   DEFAULT '[]',
  status       text        NOT NULL    DEFAULT 'pending',
  approved_at  timestamptz,
  posted_at    timestamptz,
  post_url     text,
  week_start   date,
  CONSTRAINT marketing_approvals_platform_check CHECK (platform IN ('twitter', 'linkedin', 'instagram', 'tiktok')),
  CONSTRAINT marketing_approvals_status_check   CHECK (status IN ('pending', 'approved', 'rejected', 'posted', 'failed'))
);

CREATE INDEX IF NOT EXISTS marketing_approvals_status_idx    ON marketing_approvals (status, created_at ASC);
CREATE INDEX IF NOT EXISTS marketing_approvals_week_start_idx ON marketing_approvals (week_start DESC);

ALTER TABLE marketing_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No user access" ON marketing_approvals FOR ALL USING (false);
