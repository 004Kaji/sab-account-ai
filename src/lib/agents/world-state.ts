// World state and signal bus — the shared memory layer for the Basnet agent system.
// All agents read from here before acting and write back after completing tasks.

import { createServiceClient } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────

export interface WorldState {
  mrr_current: number
  mrr_trend: number
  signups_today: number
  signups_baseline: number
  churn_risk_score: number
  failed_payments_count: number
  inactive_paid_count: number
  flux_code_score: number
  scout_last_status: string
  sentry_open_count: number
  payg_test_status: string
  sentry_last_error: string
  atlas_last_finding: string
  atlas_last_run: string | null
  brand_mentions_count: number
  upgrade_candidates: number
  reengagement_candidates: number
  onboarding_gap_count: number
  lift_outcome_summary: string
  spark_last_topic: string
  approval_queue_depth: number
  accountant_emails_sent: number
  spark_winning_subject: string
  visa_days_remaining: number
  relay_current_goal: string
  july1_countdown: number
  basnet_last_reasoning: string
  updated_at: string
}

export interface AgentSignal {
  id?: string
  from_agent: string
  signal_type: 'finding' | 'action_taken' | 'risk_detected' | 'recommendation' | 'outcome'
  severity: 'info' | 'warning' | 'urgent'
  summary: string
  data?: Record<string, unknown>
  suggested_reactions?: string
  expires_after_hours?: number
  created_at?: string
}

const DEFAULT_WORLD_STATE: WorldState = {
  mrr_current: 0,
  mrr_trend: 0,
  signups_today: 0,
  signups_baseline: 2,
  churn_risk_score: 0,
  failed_payments_count: 0,
  inactive_paid_count: 0,
  flux_code_score: 8,
  scout_last_status: 'unknown',
  sentry_open_count: 0,
  payg_test_status: 'unknown',
  sentry_last_error: '',
  atlas_last_finding: '',
  atlas_last_run: null,
  brand_mentions_count: 0,
  upgrade_candidates: 0,
  reengagement_candidates: 0,
  onboarding_gap_count: 0,
  lift_outcome_summary: '',
  spark_last_topic: '',
  approval_queue_depth: 0,
  accountant_emails_sent: 0,
  spark_winning_subject: '',
  visa_days_remaining: 0,
  relay_current_goal: '',
  july1_countdown: 0,
  basnet_last_reasoning: '',
  updated_at: new Date().toISOString(),
}

// ── World state read/write ─────────────────────────────────────────────

export async function getWorldState(): Promise<WorldState> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('basnet_world_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    return (data as WorldState | null) ?? DEFAULT_WORLD_STATE
  } catch {
    return DEFAULT_WORLD_STATE
  }
}

export async function updateWorldState(updates: Partial<WorldState> & { last_updated_by?: string }): Promise<void> {
  try {
    const supabase = createServiceClient()
    const july1Countdown = Math.max(0, Math.ceil((new Date('2026-07-01').getTime() - Date.now()) / 86400000))
    await supabase
      .from('basnet_world_state')
      .update({ ...updates, july1_countdown: july1Countdown, updated_at: new Date().toISOString() })
      .eq('id', 1)
  } catch (err) {
    console.error('[world-state] updateWorldState failed:', err)
  }
}

// ── Signal bus ────────────────────────────────────────────────────────

export async function getRecentSignals(hours = 6): Promise<AgentSignal[]> {
  try {
    const supabase = createServiceClient()
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()
    const { data } = await supabase
      .from('agent_signals')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)
    return (data as AgentSignal[]) ?? []
  } catch {
    return []
  }
}

export async function publishSignal(signal: AgentSignal): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('agent_signals').insert({
      from_agent: signal.from_agent,
      signal_type: signal.signal_type,
      severity: signal.severity,
      summary: signal.summary,
      data: signal.data ?? {},
      suggested_reactions: signal.suggested_reactions ?? '',
      expires_after_hours: signal.expires_after_hours ?? 24,
    })
  } catch (err) {
    console.error('[world-state] publishSignal failed:', err)
  }
}

// Formats recent signals as one line per signal for prompt injection
export function formatSignalsForPrompt(signals: AgentSignal[]): string {
  if (signals.length === 0) return 'No agent signals in the last 6 hours.'
  return signals
    .map(s => {
      const time = s.created_at?.slice(11, 16) ?? '??:??'
      return `[${s.severity.toUpperCase()}] ${s.from_agent} @ ${time} UTC: ${s.summary}`
    })
    .join('\n')
}

// Parses AGENT_SIGNAL...AGENT_SIGNAL_END blocks out of a Claude response
export function parseSignalBlocks(text: string): AgentSignal[] {
  const signals: AgentSignal[] = []
  const regex = /AGENT_SIGNAL\s*([\s\S]*?)\s*AGENT_SIGNAL_END/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const block = match[1]
    const get = (key: string): string => {
      const m = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
      return m ? m[1].trim() : ''
    }

    const fromAgent   = get('from')
    const signalType  = get('signal_type') as AgentSignal['signal_type']
    const severity    = get('severity') as AgentSignal['severity']
    const summary     = get('summary')

    if (!fromAgent || !signalType || !severity || !summary) continue

    let data: Record<string, unknown> = {}
    try {
      const dataLine = get('data')
      if (dataLine.startsWith('{')) data = JSON.parse(dataLine) as Record<string, unknown>
      else if (dataLine) data = { raw: dataLine }
    } catch { /* non-fatal */ }

    const expiresStr = get('expires_after_hours')
    signals.push({
      from_agent: fromAgent,
      signal_type: signalType,
      severity,
      summary,
      data,
      suggested_reactions: get('suggested_reactions'),
      expires_after_hours: expiresStr ? parseInt(expiresStr) || 24 : 24,
    })
  }

  return signals
}

// Replaces {{key}} placeholders in a prompt template with real values
export function injectVars(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key as keyof typeof vars]
    return val !== null && val !== undefined ? String(val) : `[${key} unavailable]`
  })
}

// ── Tab 1: Basnet head agent prompt template ──────────────────────────
// Variables are injected via injectVars() before calling Claude.

export const BASNET_HEAD_PROMPT_TEMPLATE = `You are Basnet, the head agent and central intelligence of Sanjog's personal operating system. You are not a scheduled task runner. You are an always-on reasoning brain that perceives the current state of Sanjog's world and decides what to do about it.

IDENTITY
You manage SAB Account AI (sabaccountai.com), an Australian invoicing and payslip SaaS. You also manage Sanjog's personal goals, visa situation, and daily priorities. You have six sub-agents: Flux (engineering), Scout (product health), Spark (marketing), Atlas (intelligence), Lift (retention), Relay (personal ops).

YOUR JOB IS NOT TO EXECUTE TASKS. Your job is to:
1. Read the current world state and understand what is actually happening right now
2. Decide which situation is most urgent and why
3. Activate the right sub-agent with the right context
4. Publish your reasoning and decisions back to world state so all agents stay aligned
5. Escalate to Sanjog only when a human decision is genuinely required

CURRENT WORLD STATE

Business health:
- Current MRR: {{mrr_current}} AUD
- MRR 7-day trend: {{mrr_trend}}% (negative = declining)
- New signups today: {{signups_today}} (baseline: {{signups_baseline}}/day)
- Churn risk score: {{churn_risk_score}}/10 (7+ = activate Lift immediately)
- Failed payments: {{failed_payments_count}}
- Paid users inactive 7+ days: {{inactive_paid_count}}

Product health:
- Flux code quality score: {{flux_code_score}}/10
- Scout last check: {{scout_last_status}}
- Open Sentry errors: {{sentry_open_count}}
- PAYG test status: {{payg_test_status}} (CRITICAL before July 1)
- Last Sentry error: {{sentry_last_error}}

Market intel (from Atlas):
- Last competitor move: {{atlas_last_finding}}
- Atlas last run: {{atlas_last_run}}
- Brand mentions today: {{brand_mentions_count}}

User signals (from Lift):
- Users at upgrade threshold (8 invoices): {{upgrade_candidates}}
- Users at 30-day re-engagement window: {{reengagement_candidates}}
- Onboarding gap users: {{onboarding_gap_count}}
- Retention email outcomes this week: {{lift_outcome_summary}}

Content state (from Spark):
- Last brief topic: {{spark_last_topic}}
- Approval queue depth: {{approval_queue_depth}}
- Accountant emails sent this week: {{accountant_emails_sent}}
- Business emails sent this week: {{business_emails_sent}}
- Winning subject line pattern: {{spark_winning_subject}}
- Published blog posts (ALREADY LIVE — do not suggest creating these): {{published_blog_posts}}

Founder context (from Relay):
- Visa days remaining: {{visa_days_remaining}}
- Current top goal: {{relay_current_goal}}
- Days until July 1 Payday Super deadline: {{july1_countdown}}

RECENT LEARNINGS (last 4 weeks)
{{learnings_last_4_weeks}}

RECENT AGENT SIGNALS (last 6 hours)
{{agent_signals_recent}}

DECISION FRAMEWORK

Step 1 — Anomaly check. Does anything in the world state represent a meaningful deviation from normal? Normal = MRR trend positive or flat, Scout passing, Sentry errors below 3, churn risk below 5, signups at baseline. Flag anything outside these bounds.

Step 2 — Priority ranking. Of all anomalies and pending items, rank by impact on Sanjog's most important goal right now: reaching paying customers before July 1 Payday Super deadline.

Step 3 — Agent activation decision. For each priority item, decide: which sub-agent should handle it, what context does that agent need, and what outcome do you expect? Do not activate an agent if the situation is already being handled (check recent signals).

Step 4 — Escalation decision. Escalate only for: decisions with irreversible consequences, situations outside agent capability, or anything requiring Sanjog's legal/personal authority.

Step 5 — Publish to world state. Write a brief summary of your reasoning so all sub-agents can read it before their next action.

OUTPUT FORMAT

SITUATION SUMMARY
[2-3 sentences on what is actually happening right now]

TOP PRIORITY
[The single most important thing and why]

AGENT ACTIVATIONS
[Each sub-agent you are activating, what to do, what context to pass]

ESCALATE TO SANJOG
[Only what genuinely needs his decision — be ruthless]

WORLD STATE UPDATE
[What you are writing back so other agents stay aligned]

BASNET REASONING
[Your internal chain of thought — what you considered and rejected]`

// ── Signal bus block for sub-agents (Tab 2 prefix) ────────────────────
// Prepended to each sub-agent's user message so they see world state + recent signals.

export function buildSignalBusContext(worldStateJson: string, recentSignals: string): string {
  return `SHARED WORLD STATE (read before acting)
${worldStateJson}

RECENT AGENT SIGNALS (last 6 hours — do not repeat work already done)
${recentSignals}

`
}
