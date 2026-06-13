import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'

const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL ?? 'sanjog.basnet02@gmail.com'
const AGENT_EMAIL_FROM = 'Basnet <basnet@sabaccountai.com>'

// ── Types ──────────────────────────────────────────────────────────────

export type SABMetrics = {
  newSignupsThisWeek: number
  totalUsers: number
  paidUsersThisWeek: number
  totalPaidUsers: number
  freeUsersAtLimit: number
  topFeatureUsed: string
}

export type StripeMetrics = {
  mrr: number
  newPaidThisWeek: number
  failedPaymentsThisWeek: number
  churnThisWeek: number
  mrrChange: number
}

export type LogAgentActionParams = {
  agentName: string
  triggerType: string
  inputContext?: Record<string, unknown>
  decision?: string
  actionsTaken?: Record<string, unknown>
  outcome?: string
  durationMs?: number
}

// ── 1. Read master context ─────────────────────────────────────────────

export async function readMasterContext(): Promise<string> {
  const filePath = path.join(process.cwd(), 'SANJOG_MASTER.md')
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (err) {
    throw new Error(
      `SANJOG_MASTER.md not found at ${filePath}. Error: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

// ── 2. Agent schedule enforcement ────────────────────────────────────
// Returns agents that missed their expected run window.

const AGENT_SCHEDULES: { name: string; windowHours: number }[] = [
  { name: 'flux',  windowHours: 26 },
  { name: 'scout', windowHours: 26 },
  { name: 'lift',  windowHours: 26 },
  { name: 'spark', windowHours: 8 * 24 },
  { name: 'atlas', windowHours: 8 * 24 },
]

export async function checkAgentSchedules(): Promise<{ missed: string[] }> {
  try {
    const supabase = createServiceClient()
    const missed: string[] = []

    const checks = await Promise.allSettled(
      AGENT_SCHEDULES.map(({ name, windowHours }) => {
        const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()
        return supabase
          .from('sub_agent_logs')
          .select('agent_name', { count: 'exact', head: true })
          .eq('agent_name', name)
          .eq('success', true)
          .gte('created_at', since)
      })
    )

    checks.forEach((result, i) => {
      const { name } = AGENT_SCHEDULES[i]
      const count = result.status === 'fulfilled' ? (result.value.count ?? 0) : 0
      if (count === 0) missed.push(name)
    })

    return { missed }
  } catch {
    return { missed: [] }
  }
}

// ── 2b. Cross-agent signal reads ──────────────────────────────────────

export async function getLatestAtlasIntel(): Promise<string> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('agent_conversations')
      .select('answer')
      .eq('agent_name', 'atlas')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data?.answer as string | null)?.slice(0, 400) ?? ''
  } catch { return '' }
}

export async function getLatestLiftSignal(): Promise<{ atRiskCount: number; upgradeSignals: number }> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('agent_logs')
      .select('actions_taken')
      .eq('agent_name', 'lift')
      .eq('trigger_type', 'daily_scan')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const a = (data?.actions_taken ?? {}) as { atRiskCount?: number; upgradeSignals?: number }
    return { atRiskCount: a.atRiskCount ?? 0, upgradeSignals: a.upgradeSignals ?? 0 }
  } catch { return { atRiskCount: 0, upgradeSignals: 0 } }
}

// ── 2c. Read agent learnings (last N weeks) ───────────────────────────

export async function readAgentLearnings(limit = 3): Promise<string> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('agent_learnings')
      .select('week_start, what_worked, what_failed, decision_rules_updated')
      .order('week_start', { ascending: false })
      .limit(limit)
    if (!data || data.length === 0) return ''
    return (data as { week_start: string; what_worked: string; what_failed: string; decision_rules_updated: string }[])
      .map(l => `Week ${l.week_start}:\n- Worked: ${l.what_worked}\n- Failed: ${l.what_failed}\n- Rules: ${l.decision_rules_updated}`)
      .join('\n\n')
  } catch { return '' }
}

// ── 2b. Send alert email (replaces sendTelegram) ───────────────────────

function aestTimestamp(): string {
  return new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function urgencyColor(urgency: 'info' | 'warning' | 'urgent'): string {
  if (urgency === 'urgent')  return '#C0392B'
  if (urgency === 'warning') return '#C0550A'
  return '#2E75B6'
}

function urgencyEmoji(urgency: 'info' | 'warning' | 'urgent'): string {
  if (urgency === 'urgent')  return '🚨'
  if (urgency === 'warning') return '⚠️'
  return 'ℹ️'
}

function alertKey(subject: string, urgency?: string): string {
  return (subject.slice(0, 40) + (urgency ?? '')).toLowerCase().replace(/[^a-z0-9]/g, '_')
}

async function wasAlertSentRecently(key: string, withinMinutes = 30): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const since = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('alert_history')
      .select('*', { count: 'exact', head: true })
      .eq('alert_key', key)
      .gte('created_at', since)
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

export async function sendAlert(
  subject: string,
  body: string,
  urgency: 'info' | 'warning' | 'urgent' = 'info',
  agentName?: string,
  dedupMinutes = 30,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('sendAlert: RESEND_API_KEY missing')
    return
  }

  const key = alertKey(subject, urgency)
  if (await wasAlertSentRecently(key, dedupMinutes)) {
    console.log(`sendAlert: skipping duplicate — ${subject}`)
    return
  }

  const emoji = urgencyEmoji(urgency)
  const color = urgencyColor(urgency)
  const fullSubject = `${emoji} ${subject}`
  const timestamp = aestTimestamp()

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="border-left:4px solid ${color};padding:16px 20px;background:${urgency === 'urgent' ? '#fff5f5' : urgency === 'warning' ? '#fffbeb' : '#eff6ff'};border-radius:0 6px 6px 0;margin-bottom:20px">
        <p style="font-weight:700;color:${color};margin:0 0 4px;font-size:16px">${emoji} ${subject}</p>
        ${agentName ? `<p style="margin:0;font-size:12px;color:#6b7280">via ${agentName}</p>` : ''}
      </div>
      <div style="font-family:monospace;font-size:14px;line-height:1.7;color:#1f2937;white-space:pre-wrap">${body}</div>
      <p style="margin-top:24px;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:12px">${timestamp} AEST · Basnet Agent · SAB Account AI</p>
    </div>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: AGENT_EMAIL_FROM,
      to: FOUNDER_EMAIL,
      subject: fullSubject,
      html,
      text: `${emoji} ${subject}\n\n${body}\n\n${timestamp} AEST`,
    })
    if (error) {
      console.error('sendAlert email error:', error)
      return
    }

    const supabase = createServiceClient()
    await supabase.from('alert_history').insert({ alert_key: key, subject: fullSubject, urgency })
  } catch (err) {
    console.error('sendAlert failed (non-fatal):', err)
  }
}

// Keep sendTelegram as alias so existing agents don't break
export async function sendTelegram(
  message: string,
  urgency: 'info' | 'warning' | 'urgent' = 'info',
): Promise<void> {
  const prefix = urgency === 'urgent' ? '🚨 Alert' : urgency === 'warning' ? '⚠️ Warning' : 'ℹ️ Update'
  await sendAlert(prefix, message, urgency)
}

// ── 3. Daily digest ────────────────────────────────────────────────────

export async function sendDailyDigest(
  sections: { title: string; content: string }[],
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const date = new Date().toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const cards = sections.map(s => `
    <div style="margin-bottom:20px;padding:16px 20px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
      <p style="font-weight:700;color:#111827;margin:0 0 8px;font-size:13px;letter-spacing:0.05em;text-transform:uppercase">${s.title}</p>
      <div style="font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap">${s.content}</div>
    </div>
  `).join('')

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 4px">Basnet Morning</h1>
      <p style="color:#6b7280;font-size:13px;margin:0 0 24px">${date}</p>
      ${cards}
      <p style="margin-top:24px;font-size:11px;color:#9ca3af">${aestTimestamp()} AEST · Basnet Agent</p>
    </div>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: AGENT_EMAIL_FROM,
      to: FOUNDER_EMAIL,
      subject: `Basnet Morning — ${date}`,
      html,
      text: sections.map(s => `${s.title}\n${s.content}`).join('\n\n'),
    })
  } catch (err) {
    console.error('sendDailyDigest failed:', err)
  }
}

// ── 4. Weekly report ───────────────────────────────────────────────────

export async function sendWeeklyReport(content: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const weekOf = new Date().toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 4px">Basnet Weekly</h1>
      <p style="color:#6b7280;font-size:13px;margin:0 0 24px">Week of ${weekOf}</p>
      <div style="font-size:14px;line-height:1.8;color:#374151;white-space:pre-wrap">${content}</div>
      <p style="margin-top:24px;font-size:11px;color:#9ca3af">${aestTimestamp()} AEST · Basnet Agent</p>
    </div>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: AGENT_EMAIL_FROM,
      to: FOUNDER_EMAIL,
      subject: `Basnet Weekly — week of ${weekOf}`,
      html,
      text: content,
    })
  } catch (err) {
    console.error('sendWeeklyReport failed:', err)
  }
}

// ── 5. Log agent action ────────────────────────────────────────────────

export async function logAgentAction(params: LogAgentActionParams): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('agent_logs').insert({
      agent_name:    params.agentName,
      trigger_type:  params.triggerType,
      input_context: params.inputContext ?? null,
      decision:      params.decision ?? null,
      actions_taken: params.actionsTaken ?? null,
      outcome:       params.outcome ?? null,
      duration_ms:   params.durationMs ?? null,
    })
  } catch (err) {
    console.error('logAgentAction failed (non-fatal):', err)
  }
}

export async function logSubAgent(
  agentName: string,
  triggerType: string,
  input: string,
  output: string,
  durationMs: number,
  success: boolean,
): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('sub_agent_logs').insert({
      agent_name: agentName, trigger_type: triggerType,
      input, output, duration_ms: durationMs, success,
    })
  } catch (err) {
    console.error('logSubAgent failed (non-fatal):', err)
  }
}

// ── 6. Call Claude ─────────────────────────────────────────────────────

export async function callClaude(params: {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  expectJson?: boolean
}): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async function attempt(): Promise<string> {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: params.maxTokens ?? 1000,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
    })
    const block = msg.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text block in Claude response')
    let text: string = block.text
    if (params.expectJson) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    }
    return text
  }

  try {
    return await attempt()
  } catch {
    try { return await attempt() } catch (err2) {
      throw new Error(`Claude API failed after 2 attempts: ${err2 instanceof Error ? err2.message : String(err2)}`)
    }
  }
}

// ── 7. Get SAB metrics ─────────────────────────────────────────────────

export async function getSABMetrics(): Promise<SABMetrics> {
  const defaults: SABMetrics = {
    newSignupsThisWeek: 0, totalUsers: 0, paidUsersThisWeek: 0,
    totalPaidUsers: 0, freeUsersAtLimit: 0, topFeatureUsed: 'Unknown',
  }
  try {
    const supabase = createServiceClient()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [newSR, totalR, paidWR, totalPR, invR, payR] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('plan', 'free').gte('updated_at', weekAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('plan', 'free'),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('payslips').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    ])
    return {
      newSignupsThisWeek: newSR.count ?? 0,
      totalUsers: totalR.count ?? 0,
      paidUsersThisWeek: paidWR.count ?? 0,
      totalPaidUsers: totalPR.count ?? 0,
      freeUsersAtLimit: 0,
      topFeatureUsed: (invR.count ?? 0) >= (payR.count ?? 0) ? 'Invoice Generation' : 'Payslip Generation',
    }
  } catch (err) {
    console.error('getSABMetrics error:', err)
    return defaults
  }
}

// ── 8. Get Stripe metrics ──────────────────────────────────────────────

export async function getStripeMetrics(): Promise<StripeMetrics> {
  const defaults: StripeMetrics = { mrr: 0, newPaidThisWeek: 0, failedPaymentsThisWeek: 0, churnThisWeek: 0, mrrChange: 0 }
  if (!process.env.STRIPE_SECRET_KEY) return defaults
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
    const weekAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
    const prevWeek = Math.floor((Date.now() - 14 * 24 * 60 * 60 * 1000) / 1000)
    const [active, newSubs, cancelled, failed, prevSubs] = await Promise.all([
      stripe.subscriptions.list({ status: 'active', limit: 100 }),
      stripe.subscriptions.list({ created: { gte: weekAgo }, limit: 100 }),
      stripe.subscriptions.list({ status: 'canceled', created: { gte: weekAgo }, limit: 100 }),
      stripe.invoices.list({ status: 'open', created: { gte: weekAgo }, limit: 100 }),
      stripe.subscriptions.list({ created: { gte: prevWeek, lte: weekAgo }, limit: 100 }),
    ])
    const mrr = active.data.reduce((s, sub) => s + (sub.items.data[0]?.price?.unit_amount ?? 0) / 100, 0)
    const prevMRR = prevSubs.data.reduce((s, sub) => s + (sub.items.data[0]?.price?.unit_amount ?? 0) / 100, 0)
    return {
      mrr,
      newPaidThisWeek: newSubs.data.length,
      failedPaymentsThisWeek: failed.data.length,
      churnThisWeek: cancelled.data.length,
      mrrChange: mrr - prevMRR,
    }
  } catch (err) {
    console.error('getStripeMetrics error:', err)
    return defaults
  }
}

// ── 9. Briefing already sent today ────────────────────────────────────

export async function briefingAlreadySentToday(): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('agent_briefings').select('id').eq('briefing_date', today).maybeSingle()
    return data !== null
  } catch { return false }
}

// ── 10. Rate limit ─────────────────────────────────────────────────────

export async function isRateLimited(agentName: string, maxPerDay: number): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const { count } = await supabase.from('agent_logs').select('*', { count: 'exact', head: true })
      .eq('agent_name', agentName).gte('created_at', startOfDay.toISOString())
    return (count ?? 0) >= maxPerDay
  } catch { return false }
}

// ── 11. Base URL ───────────────────────────────────────────────────────

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

// ── 11b. Spark email status — answers "did you send emails?" ──────────
// Checks agent_logs for last Spark run + accountant/business outreach tables.

export async function getSparkEmailStatus(): Promise<string> {
  try {
    const supabase = createServiceClient()
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [accR, bizR, logR] = await Promise.allSettled([
      supabase.from('accountant_outreach')
        .select('name, emailed_at')
        .not('emailed_at', 'is', null)
        .gte('emailed_at', since)
        .order('emailed_at', { ascending: false })
        .limit(5),
      supabase.from('business_outreach')
        .select('name, emailed_at')
        .not('emailed_at', 'is', null)
        .gte('emailed_at', since)
        .order('emailed_at', { ascending: false })
        .limit(5),
      supabase.from('agent_logs')
        .select('created_at, actions_taken')
        .eq('agent_name', 'cron')
        .eq('trigger_type', 'spark_weekly')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const accountants = accR.status === 'fulfilled' ? (accR.value.data ?? []) : []
    const businesses  = bizR.status === 'fulfilled' ? (bizR.value.data ?? []) : []
    const lastSparkRun = logR.status === 'fulfilled' ? logR.value.data : null

    const fmt = (d: string) => new Date(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

    const parts: string[] = []

    if (accountants.length > 0) {
      const names = accountants.map((a: { name: string; emailed_at: string }) => `${a.name} (${fmt(a.emailed_at)})`).join(', ')
      parts.push(`Accountant emails sent this week: ${names}`)
    } else {
      parts.push('No accountant emails sent in the last 7 days')
    }

    if (businesses.length > 0) {
      const names = businesses.map((b: { name: string; emailed_at: string }) => `${b.name} (${fmt(b.emailed_at)})`).join(', ')
      parts.push(`Business emails sent this week: ${names}`)
    } else {
      parts.push('No business emails sent in the last 7 days')
    }

    if (lastSparkRun) {
      parts.push(`Last Spark cron ran: ${fmt(lastSparkRun.created_at)}`)
    }

    return parts.join('. ')
  } catch {
    return 'Could not check email logs right now'
  }
}

// ── 12. Agentic tool-use loop ──────────────────────────────────────────
// Claude calls tools, sees results, decides next step — up to maxIterations.

export type AgentTool = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties?: Record<string, { type: string; description?: string }>
    required?: string[]
  }
}

export async function callClaudeWithTools(params: {
  systemPrompt: string
  userMessage: string
  tools: AgentTool[]
  toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>>
  maxTokens?: number
  maxIterations?: number
}): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const { systemPrompt, userMessage, tools, toolHandlers, maxTokens = 2000, maxIterations = 6 } = params

  // Use unknown content so we can mix text, tool_use, and tool_result shapes
  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [
    { role: 'user', content: userMessage },
  ]

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      tools: tools as Anthropic.Tool[],
      messages: messages as Anthropic.MessageParam[],
    })

    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find(b => b.type === 'text')
      return (textBlock && textBlock.type === 'text') ? textBlock.text : ''
    }

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    const toolResults = await Promise.all(
      toolUseBlocks.map(async block => {
        const handler = toolHandlers[block.name]
        let result: unknown
        try {
          result = handler
            ? await handler(block.input as Record<string, unknown>)
            : `Tool '${block.name}' not configured`
        } catch (err) {
          result = `Error running ${block.name}: ${err instanceof Error ? err.message : String(err)}`
        }
        return {
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        }
      })
    )

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })
  }

  return 'Analysis complete.'
}
