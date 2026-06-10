-- basnet_world_state: single-row truth table that all agents read and write.
-- Column names match the {{variable}} placeholders used in agent prompts.

CREATE TABLE IF NOT EXISTS basnet_world_state (
  id integer PRIMARY KEY DEFAULT 1,
  CONSTRAINT single_row CHECK (id = 1),

  -- Business health
  mrr_current          numeric        NOT NULL DEFAULT 0,
  mrr_trend            numeric        NOT NULL DEFAULT 0,
  signups_today        integer        NOT NULL DEFAULT 0,
  signups_baseline     integer        NOT NULL DEFAULT 2,
  churn_risk_score     numeric        NOT NULL DEFAULT 0,
  failed_payments_count integer       NOT NULL DEFAULT 0,
  inactive_paid_count  integer        NOT NULL DEFAULT 0,

  -- Product health
  flux_code_score      numeric        NOT NULL DEFAULT 8,
  scout_last_status    text           NOT NULL DEFAULT 'unknown',
  sentry_open_count    integer        NOT NULL DEFAULT 0,
  payg_test_status     text           NOT NULL DEFAULT 'unknown',
  sentry_last_error    text           NOT NULL DEFAULT '',

  -- Market intel
  atlas_last_finding   text           NOT NULL DEFAULT '',
  atlas_last_run       timestamptz,
  brand_mentions_count integer        NOT NULL DEFAULT 0,

  -- User signals
  upgrade_candidates      integer     NOT NULL DEFAULT 0,
  reengagement_candidates integer     NOT NULL DEFAULT 0,
  onboarding_gap_count    integer     NOT NULL DEFAULT 0,
  lift_outcome_summary    text        NOT NULL DEFAULT '',

  -- Content state
  spark_last_topic       text         NOT NULL DEFAULT '',
  approval_queue_depth   integer      NOT NULL DEFAULT 0,
  accountant_emails_sent integer      NOT NULL DEFAULT 0,
  spark_winning_subject  text         NOT NULL DEFAULT '',

  -- Founder context
  visa_days_remaining    integer      NOT NULL DEFAULT 0,
  relay_current_goal     text         NOT NULL DEFAULT '',
  july1_countdown        integer      NOT NULL DEFAULT 0,

  -- Basnet head agent output
  basnet_last_reasoning  text         NOT NULL DEFAULT '',
  last_updated_by        text         NOT NULL DEFAULT '',
  updated_at             timestamptz  NOT NULL DEFAULT now()
);

-- Seed the single row
INSERT INTO basnet_world_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- agent_signals: the cross-agent communication bus.
-- Agents publish structured signals here; other agents read before acting.

CREATE TABLE IF NOT EXISTS agent_signals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent      text        NOT NULL,
  signal_type     text        NOT NULL CHECK (signal_type IN ('finding','action_taken','risk_detected','recommendation','outcome')),
  severity        text        NOT NULL CHECK (severity IN ('info','warning','urgent')),
  summary         text        NOT NULL,
  data            jsonb       NOT NULL DEFAULT '{}',
  suggested_reactions text    NOT NULL DEFAULT '',
  expires_after_hours integer NOT NULL DEFAULT 24,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_signals_created_at_idx ON agent_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS agent_signals_from_agent_idx ON agent_signals (from_agent);
CREATE INDEX IF NOT EXISTS agent_signals_severity_idx    ON agent_signals (severity);
