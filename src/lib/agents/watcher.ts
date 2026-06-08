import fs from 'fs'
import path from 'path'
import Stripe from 'stripe'
import { calculatePAYG } from '@/lib/ato'
import { createServiceClient } from '@/lib/supabase'
import { callClaude, sendAlert, logAgentAction } from '@/lib/agents/utils'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'

// ── WatcherReport type (exported — used by sub-agents and routes) ──────

export interface WatcherReport {
  timestamp:      Date
  revenue: {
    newPaidUsers:   number
    failedPayments: number
    churnedUsers:   number
    mrr:            number
    mrrChange24h:   number
  }
  product: {
    newSignups:      number
    signupSources:   string[]
    usersAtLimit:    number
    activeNow:       number
    unresolvedErrors: number
  }
  codeHealth: {
    newErrorTypes:  string[]
    errorSpikes:    { type: string; count: number }[]
    allPaygPassing: boolean
    failingTests:   string[]
  }
  visaCompliance: {
    daysUntilExpiry:          number
    daysSinceMigAgent:        number
    daysSinceAccountantEmail: number
    warnings:                 string[]
  }
  growthSignals: {
    topSignupSource:  string
    onboardingGaps:   number
    upgradeSignals:   number
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function paygTests(): { passing: boolean; failures: string[] } {
  const cases = [
    { annualSalary: 26000,  ct: true,  mle: true,  expected: 44,   label: 'TC1' },
    { annualSalary: 66664,  ct: true,  mle: false, expected: 468,  label: 'TC2' },
    { annualSalary: 110240, ct: false, mle: false, expected: 1226, label: 'TC3' },
    { annualSalary: 95940,  ct: false, mle: true,  expected: 1106, label: 'TC4' },
    { annualSalary: 134992, ct: true,  mle: false, expected: 1310, label: 'TC5' },
  ]
  const failures: string[] = []
  for (const c of cases) {
    const r = calculatePAYG({ annualSalary: c.annualSalary, claimingThreshold: c.ct, hasHELP: false, medicareLevyExemption: c.mle, payCycle: 'fortnightly', residencyStatus: 'citizen_pr' })
    if (r.periodTotal !== c.expected) failures.push(`${c.label}: expected $${c.expected}, got $${r.periodTotal}`)
  }
  return { passing: failures.length === 0, failures }
}

function parseDateFromMaster(content: string, pattern: RegExp): string | null {
  const m = content.match(pattern)
  return m ? m[1] : null
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function daysSince(dateStr: string): number {
  return Math.ceil((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

// ── Individual system checks ───────────────────────────────────────────

async function checkRevenue(): Promise<WatcherReport['revenue']> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { newPaidUsers: 0, failedPayments: 0, churnedUsers: 0, mrr: 0, mrrChange24h: 0 }
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  const fiveMinsAgo = Math.floor((Date.now() - 5 * 60 * 1000) / 1000)
  const dayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)

  const [recent, cancelled, failed, active, prevActive] = await Promise.all([
    stripe.subscriptions.list({ created: { gte: fiveMinsAgo }, limit: 20 }),
    stripe.subscriptions.list({ status: 'canceled', created: { gte: fiveMinsAgo }, limit: 20 }),
    stripe.invoices.list({ status: 'open', created: { gte: fiveMinsAgo }, limit: 20 }),
    stripe.subscriptions.list({ status: 'active', limit: 100 }),
    stripe.subscriptions.list({ status: 'active', created: { lte: dayAgo }, limit: 100 }),
  ])

  const mrr = active.data.reduce((s, sub) => s + (sub.items.data[0]?.price?.unit_amount ?? 0) / 100, 0)
  const prevMrr = prevActive.data.reduce((s, sub) => s + (sub.items.data[0]?.price?.unit_amount ?? 0) / 100, 0)

  return {
    newPaidUsers: recent.data.length,
    failedPayments: failed.data.length,
    churnedUsers: cancelled.data.length,
    mrr,
    mrrChange24h: mrr - prevMrr,
  }
}

async function checkProduct(): Promise<WatcherReport['product']> {
  const supabase = createServiceClient()
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [newSignupsR, errorsR, recentActiveR] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', fiveMinsAgo),
    supabase.from('agent_error_log').select('*', { count: 'exact', head: true }).eq('resolved', false),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', fiveMinsAgo),
  ])

  return {
    newSignups: newSignupsR.count ?? 0,
    signupSources: [],
    usersAtLimit: 0,
    activeNow: recentActiveR.count ?? 0,
    unresolvedErrors: errorsR.count ?? 0,
  }
}

async function checkCodeHealth(): Promise<WatcherReport['codeHealth']> {
  const supabase = createServiceClient()
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const [newErrR, spikesR] = await Promise.all([
    supabase.from('agent_error_log').select('error_type').gte('created_at', tenMinsAgo).limit(20),
    supabase.from('agent_error_log').select('error_type, frequency').gte('frequency', 5).eq('resolved', false).limit(10),
  ])

  const payg = paygTests()

  return {
    newErrorTypes: (newErrR.data ?? []).map(e => e.error_type as string ?? 'unknown'),
    errorSpikes: (spikesR.data ?? []).map(e => ({ type: e.error_type as string ?? 'unknown', count: e.frequency as number ?? 0 })),
    allPaygPassing: payg.passing,
    failingTests: payg.failures,
  }
}

async function checkVisaCompliance(): Promise<WatcherReport['visaCompliance']> {
  const warnings: string[] = []
  let daysUntilExpiry = 999
  let daysSinceMigAgent = 0
  let daysSinceAccountantEmail = 0

  try {
    const masterPath = path.join(process.cwd(), 'SANJOG_MASTER.md')
    const content = fs.readFileSync(masterPath, 'utf-8')

    const visaDate = parseDateFromMaster(content, /Visa expiry[^:]*:\s*\[?(\d{4}-\d{2}-\d{2})/i)
      ?? parseDateFromMaster(content, /(\d{2})\/(\d{2})\/(\d{4})/)
    if (visaDate) {
      daysUntilExpiry = daysUntil(visaDate)
      if (daysUntilExpiry < 90)  warnings.push(`Visa expires in ${daysUntilExpiry} days — URGENT`)
      else if (daysUntilExpiry < 180) warnings.push(`Visa expires in ${daysUntilExpiry} days — start renewal prep`)
    }

    const migDate = parseDateFromMaster(content, /last consultation date[^:]*:\s*(\d{4}-\d{2}-\d{2})/i)
    if (migDate) {
      daysSinceMigAgent = daysSince(migDate)
      if (daysSinceMigAgent > 30) warnings.push(`${daysSinceMigAgent} days since migration agent consultation`)
    }

    const emailDate = parseDateFromMaster(content, /last accountant email[^:]*:\s*(\d{4}-\d{2}-\d{2})/i)
    if (emailDate) {
      daysSinceAccountantEmail = daysSince(emailDate)
      if (daysSinceAccountantEmail > 7) warnings.push(`${daysSinceAccountantEmail} days since last accountant email`)
    }
  } catch {
    warnings.push('Could not read SANJOG_MASTER.md for visa check')
  }

  return { daysUntilExpiry, daysSinceMigAgent, daysSinceAccountantEmail, warnings }
}

async function checkGrowthSignals(): Promise<WatcherReport['growthSignals']> {
  const supabase = createServiceClient()
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const [onboardingR] = await Promise.allSettled([
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .eq('plan', 'free').lt('created_at', twoDaysAgo),
  ])

  return {
    topSignupSource: 'direct',
    onboardingGaps: onboardingR.status === 'fulfilled' ? (onboardingR.value.count ?? 0) : 0,
    upgradeSignals: 0,
  }
}

// ── Main watcher cycle ─────────────────────────────────────────────────

export async function runWatcherCycle(): Promise<WatcherReport> {
  const [revenueR, productR, codeR, visaR, growthR] = await Promise.allSettled([
    checkRevenue(),
    checkProduct(),
    checkCodeHealth(),
    checkVisaCompliance(),
    checkGrowthSignals(),
  ])

  return {
    timestamp: new Date(),
    revenue: revenueR.status === 'fulfilled' ? revenueR.value : { newPaidUsers: 0, failedPayments: 0, churnedUsers: 0, mrr: 0, mrrChange24h: 0 },
    product: productR.status === 'fulfilled' ? productR.value : { newSignups: 0, signupSources: [], usersAtLimit: 0, activeNow: 0, unresolvedErrors: 0 },
    codeHealth: codeR.status === 'fulfilled' ? codeR.value : { newErrorTypes: [], errorSpikes: [], allPaygPassing: true, failingTests: [] },
    visaCompliance: visaR.status === 'fulfilled' ? visaR.value : { daysUntilExpiry: 999, daysSinceMigAgent: 0, daysSinceAccountantEmail: 0, warnings: [] },
    growthSignals: growthR.status === 'fulfilled' ? growthR.value : { topSignupSource: 'unknown', onboardingGaps: 0, upgradeSignals: 0 },
  }
}

// ── Evaluate and send alerts ───────────────────────────────────────────

export async function evaluateAndAlert(
  report: WatcherReport,
): Promise<number> {
  let alertsSent = 0

  // Priority 1: ATO test failures (critical)
  if (!report.codeHealth.allPaygPassing) {
    await sendAlert(
      `PAYG test failure — ATO compliance broken`,
      `Failing: ${report.codeHealth.failingTests.join(', ')}\n\nFix src/lib/ato.ts immediately.`,
      'urgent', 'watcher',
    )
    alertsSent++
  }

  // Priority 2: New error types
  if (report.codeHealth.newErrorTypes.length > 0) {
    await sendAlert(
      `New error type — ${report.codeHealth.newErrorTypes[0]}`,
      `${report.codeHealth.newErrorTypes.length} new error type(s) in last 10 mins.\n${report.codeHealth.newErrorTypes.join(', ')}`,
      'urgent', 'watcher',
    )
    alertsSent++
  }

  // Priority 3: Failed payments
  if (report.revenue.failedPayments > 0) {
    await sendAlert(
      `${report.revenue.failedPayments} payment failure`,
      `${report.revenue.failedPayments} failed payment(s) in the last 5 minutes. Check Stripe dashboard.`,
      'urgent', 'watcher',
    )
    alertsSent++
  }

  // Priority 4: New signups (always good news)
  if (report.product.newSignups > 0) {
    await sendAlert(
      `${report.product.newSignups} new signup`,
      `${report.product.newSignups} new user(s) just joined SAB Account AI.`,
      'info', 'watcher',
    )
    alertsSent++
  }

  // Priority 5: Churn
  if (report.revenue.churnedUsers > 0) {
    await sendAlert(
      `${report.revenue.churnedUsers} user cancelled`,
      `${report.revenue.churnedUsers} subscription(s) cancelled in the last 5 minutes. MRR is now $${report.revenue.mrr.toFixed(0)}.`,
      'warning', 'watcher',
    )
    alertsSent++
  }

  // Priority 6: Visa warnings
  for (const warning of report.visaCompliance.warnings) {
    const urgency = warning.includes('URGENT') ? 'urgent' : 'warning'
    await sendAlert(`Visa alert`, warning, urgency, 'watcher')
    alertsSent++
  }

  return alertsSent
}

// ── Proactive insight (once per hour) ─────────────────────────────────

export async function generateProactiveInsight(report: WatcherReport): Promise<string | null> {
  try {
    const summary = {
      mrr: report.revenue.mrr,
      newSignups: report.product.newSignups,
      failedPayments: report.revenue.failedPayments,
      unresolvedErrors: report.product.unresolvedErrors,
      paygPassing: report.codeHealth.allPaygPassing,
      visaWarnings: report.visaCompliance.warnings.length,
    }

    const insight = await callClaude({
      systemPrompt: BASNET_PERSONALITY,
      userMessage: `SAB Account AI live data: ${JSON.stringify(summary)}\n\nWhat is the single most important thing Sanjog should know right now? One sentence. Specific. Actionable. If nothing important, return exactly: null`,
      maxTokens: 100,
    })

    if (insight.trim().toLowerCase() === 'null') return null

    await sendAlert('Proactive insight from Basnet', insight, 'info', 'watcher')
    return insight
  } catch {
    return null
  }
}

// ── Save + load watcher reports ────────────────────────────────────────

export async function saveWatcherReport(report: WatcherReport, alertsSent: number): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('watcher_reports').insert({
      report: report as unknown as Record<string, unknown>,
      alerts_sent: alertsSent,
    })
  } catch (err) {
    console.error('saveWatcherReport failed:', err)
  }
}

export async function getLastWatcherReport(): Promise<WatcherReport | null> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('watcher_reports').select('report').order('created_at', { ascending: false }).limit(1).maybeSingle()
    return data ? (data.report as unknown as WatcherReport) : null
  } catch { return null }
}

export async function getLastProactiveInsightTime(): Promise<Date | null> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('alert_history').select('created_at')
      .eq('alert_key', 'proactive_insight_from_basnet').order('created_at', { ascending: false }).limit(1).maybeSingle()
    return data ? new Date(data.created_at as string) : null
  } catch { return null }
}

export async function logWatcherRun(durationMs: number, alertsSent: number): Promise<void> {
  await logAgentAction({
    agentName: 'watcher',
    triggerType: 'watch',
    actionsTaken: { alertsSent },
    outcome: `cycle complete`,
    durationMs,
  })
}
