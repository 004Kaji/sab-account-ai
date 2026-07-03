-- Security fix: enable Row Level Security on server-only tables that were
-- created without it. Without RLS, every row is readable/writable through the
-- public anon key via Supabase's auto-generated REST API.
--
-- These four tables are ONLY accessed by server code using the service-role
-- client, which bypasses RLS. Enabling RLS with no policies therefore denies
-- all public (anon/authenticated) access while leaving server code unaffected.
--
--   email_queue        — customer email addresses + Resend delivery status
--   dunning_jobs        — QStash message ids for scheduled dunning emails
--   basnet_world_state  — internal agent state (single-row truth table)
--   agent_signals       — internal cross-agent communication bus

ALTER TABLE email_queue         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_jobs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE basnet_world_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_signals       ENABLE ROW LEVEL SECURITY;

-- FORCE RLS so the table owner is subject to policies too; service-role
-- connections still bypass RLS as intended.
ALTER TABLE email_queue         FORCE ROW LEVEL SECURITY;
ALTER TABLE dunning_jobs        FORCE ROW LEVEL SECURITY;
ALTER TABLE basnet_world_state  FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_signals       FORCE ROW LEVEL SECURITY;
