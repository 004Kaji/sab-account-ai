import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'

const AGENT_EMAIL_TO = 'sanjog.basnet02@gmail.com'
const AGENT_EMAIL_FROM = 'Basnet Agent <sanjog@sabaccountai.com.au>'

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
      `SANJOG_MASTER.md not found at ${filePath}. ` +
      `Create this file at the repo root. Error: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

// ── 2. Send agent notification via email ──────────────────────────────
// Replaces Telegram — sends to sanjog.basnet02@gmail.com via Resend.
// Urgency controls the subject prefix and email styling.

export async function sendTelegram(
  message: string,
  urgency: 'info' | 'warning' | 'urgent' = 'info',
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Agent notifications not configured — RESEND_API_KEY missing')
    return
  }

  const prefix = urgency === 'urgent' ? '🚨 URGENT' : urgency === 'warning' ? '⚠️ Warning' : 'ℹ️ Info'
  const subject = `[Basnet Agent] ${prefix}`

  const htmlBody = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:${urgency === 'urgent' ? '#fee2e2' : urgency === 'warning' ? '#fef9c3' : '#eff6ff'};
                  border-left:4px solid ${urgency === 'urgent' ? '#dc2626' : urgency === 'warning' ? '#ca8a04' : '#2563eb'};
                  padding:16px 20px;border-radius:6px;margin-bottom:16px">
        <p style="font-weight:700;margin:0 0 4px;color:${urgency === 'urgent' ? '#991b1b' : urgency === 'warning' ? '#854d0e' : '#1e40af'}">${prefix}</p>
      </div>
      <pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;margin:0">${message}</pre>
      <p style="margin-top:24px;font-size:12px;color:#9ca3af">Basnet Agent System · SAB Account AI</p>
    </div>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: AGENT_EMAIL_FROM,
      to: AGENT_EMAIL_TO,
      subject,
      html: htmlBody,
      text: `${prefix}\n\n${message}`,
    })
    if (error) console.error('Agent email send failed:', error)
  } catch (err) {
    console.error('Agent email error (non-fatal):', err)
  }
}

// ── 3. Log agent action ────────────────────────────────────────────────

export async function logAgentAction(params: LogAgentActionParams): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('agent_logs').insert({
      agent_name: params.agentName,
      trigger_type: params.triggerType,
      input_context: params.inputContext ?? null,
      decision: params.decision ?? null,
      actions_taken: params.actionsTaken ?? null,
      outcome: params.outcome ?? null,
      duration_ms: params.durationMs ?? null,
    })
    if (error) console.error('logAgentAction insert error:', error.message)
  } catch (err) {
    console.error('logAgentAction failed (non-fatal):', err)
  }
}

// ── 4. Call Claude ─────────────────────────────────────────────────────

export async function callClaude(params: {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  expectJson?: boolean
}): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async function attempt(): Promise<string> {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: params.maxTokens ?? 1000,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
    })

    const block = msg.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') {
      throw new Error('No text block in Claude response')
    }

    let text: string = block.text

    if (params.expectJson) {
      text = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim()
    }

    return text
  }

  try {
    return await attempt()
  } catch {
    try {
      return await attempt()
    } catch (err2) {
      throw new Error(
        `Claude API failed after 2 attempts: ${err2 instanceof Error ? err2.message : String(err2)}`
      )
    }
  }
}

// ── 5. Get SAB metrics ─────────────────────────────────────────────────

export async function getSABMetrics(): Promise<SABMetrics> {
  const defaults: SABMetrics = {
    newSignupsThisWeek: 0,
    totalUsers: 0,
    paidUsersThisWeek: 0,
    totalPaidUsers: 0,
    freeUsersAtLimit: 0,
    topFeatureUsed: 'Unknown',
  }

  try {
    const supabase = createServiceClient()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      newSignupsResult,
      totalUsersResult,
      paidThisWeekResult,
      totalPaidResult,
      invoiceCountResult,
      payslipCountResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('plan', 'free')
        .gte('updated_at', weekAgo),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('plan', 'free'),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabase
        .from('payslips')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
    ])

    const invoiceCount = invoiceCountResult.count ?? 0
    const payslipCount = payslipCountResult.count ?? 0

    return {
      newSignupsThisWeek: newSignupsResult.count ?? 0,
      totalUsers: totalUsersResult.count ?? 0,
      paidUsersThisWeek: paidThisWeekResult.count ?? 0,
      totalPaidUsers: totalPaidResult.count ?? 0,
      freeUsersAtLimit: 0,
      topFeatureUsed: invoiceCount >= payslipCount ? 'Invoice Generation' : 'Payslip Generation',
    }
  } catch (err) {
    console.error('getSABMetrics error:', err)
    return defaults
  }
}

// ── 6. Get Stripe metrics ──────────────────────────────────────────────

export async function getStripeMetrics(): Promise<StripeMetrics> {
  const defaults: StripeMetrics = {
    mrr: 0,
    newPaidThisWeek: 0,
    failedPaymentsThisWeek: 0,
    churnThisWeek: 0,
    mrrChange: 0,
  }

  if (!process.env.STRIPE_SECRET_KEY) return defaults

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
    const weekAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
    const prevWeekStart = Math.floor((Date.now() - 14 * 24 * 60 * 60 * 1000) / 1000)

    const [
      activeSubs,
      newSubsThisWeek,
      cancelledThisWeek,
      failedInvoices,
      prevWeekSubs,
    ] = await Promise.all([
      stripe.subscriptions.list({ status: 'active', limit: 100 }),
      stripe.subscriptions.list({ created: { gte: weekAgo }, limit: 100 }),
      stripe.subscriptions.list({
        status: 'canceled',
        created: { gte: weekAgo },
        limit: 100,
      }),
      stripe.invoices.list({ status: 'open', created: { gte: weekAgo }, limit: 100 }),
      stripe.subscriptions.list({
        created: { gte: prevWeekStart, lte: weekAgo },
        limit: 100,
      }),
    ])

    const mrr = activeSubs.data.reduce((sum, sub) => {
      const price = sub.items.data[0]?.price
      return sum + (price?.unit_amount ?? 0) / 100
    }, 0)

    const prevMRR = prevWeekSubs.data.reduce((sum, sub) => {
      const price = sub.items.data[0]?.price
      return sum + (price?.unit_amount ?? 0) / 100
    }, 0)

    return {
      mrr,
      newPaidThisWeek: newSubsThisWeek.data.length,
      failedPaymentsThisWeek: failedInvoices.data.length,
      churnThisWeek: cancelledThisWeek.data.length,
      mrrChange: mrr - prevMRR,
    }
  } catch (err) {
    console.error('getStripeMetrics error:', err)
    return defaults
  }
}

// ── 7. Check if briefing already sent today ────────────────────────────

export async function briefingAlreadySentToday(): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('agent_briefings')
      .select('id')
      .eq('briefing_date', today)
      .maybeSingle()
    return data !== null
  } catch (err) {
    console.error('briefingAlreadySentToday error:', err)
    return false
  }
}

// ── 8. Rate limit check ────────────────────────────────────────────────

export async function isRateLimited(agentName: string, maxPerDay: number): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('agent_logs')
      .select('*', { count: 'exact', head: true })
      .eq('agent_name', agentName)
      .gte('created_at', startOfDay.toISOString())

    return (count ?? 0) >= maxPerDay
  } catch (err) {
    console.error('isRateLimited error:', err)
    return false
  }
}

// ── Internal agent caller ──────────────────────────────────────────────

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}
