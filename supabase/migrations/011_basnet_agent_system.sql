-- Basnet Agent System — all agent tables
-- Service role only access. No user can read or write these tables.

CREATE TABLE IF NOT EXISTS agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  agent_name text NOT NULL,
  trigger_type text NOT NULL,
  input_context jsonb,
  decision text,
  actions_taken jsonb,
  outcome text,
  duration_ms integer
);

CREATE TABLE IF NOT EXISTS agent_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  briefing_date date NOT NULL UNIQUE,
  metrics jsonb,
  content text NOT NULL,
  sent_to_telegram boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  agent_name text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  context_used jsonb
);

CREATE TABLE IF NOT EXISTS agent_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  week_start date NOT NULL,
  what_worked text,
  what_failed text,
  decision_rules_updated text,
  raw_content text NOT NULL
);

CREATE TABLE IF NOT EXISTS accountant_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  practice_type text,
  location text,
  emailed_at timestamptz,
  email_subject text,
  email_body text,
  opened boolean DEFAULT false,
  replied boolean DEFAULT false,
  follow_up_due date,
  status text DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS content_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  week_start date NOT NULL,
  focus_this_week text,
  blog_post_title text,
  blog_post_outline jsonb,
  tiktok_hooks jsonb,
  accountant_email_angle text,
  weekly_summary text,
  published boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS agent_error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  error_type text,
  error_message text,
  file_name text,
  frequency integer DEFAULT 1,
  users_affected integer DEFAULT 0,
  severity text,
  alerted boolean DEFAULT false,
  resolved boolean DEFAULT false
);

-- Enable RLS on all agent tables
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountant_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_error_log ENABLE ROW LEVEL SECURITY;

-- No user access — service role bypasses RLS entirely
-- These policies block all non-service-role access
CREATE POLICY "No user access" ON agent_logs FOR ALL USING (false);
CREATE POLICY "No user access" ON agent_briefings FOR ALL USING (false);
CREATE POLICY "No user access" ON agent_conversations FOR ALL USING (false);
CREATE POLICY "No user access" ON agent_learnings FOR ALL USING (false);
CREATE POLICY "No user access" ON accountant_outreach FOR ALL USING (false);
CREATE POLICY "No user access" ON content_briefs FOR ALL USING (false);
CREATE POLICY "No user access" ON agent_error_log FOR ALL USING (false);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS agent_logs_agent_name_created ON agent_logs (agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_briefings_date ON agent_briefings (briefing_date DESC);
CREATE INDEX IF NOT EXISTS agent_conversations_created ON agent_conversations (created_at DESC);
CREATE INDEX IF NOT EXISTS accountant_outreach_status ON accountant_outreach (status, follow_up_due);
CREATE INDEX IF NOT EXISTS content_briefs_week ON content_briefs (week_start DESC);
CREATE INDEX IF NOT EXISTS agent_error_log_resolved ON agent_error_log (resolved, created_at DESC);
