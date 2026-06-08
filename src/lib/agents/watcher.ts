import fs from 'fs'
import path from 'path'
import Stripe from 'stripe'
import { calculatePAYG } from '@/lib/ato'
import { createServiceClient } from '@/lib/supabase'
import { callClaude, sendAlert, logAgentAction } from '@/lib/agents/utils'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'
import { runScout } from '@/lib/agents/sub/scout'
import { runLift } from '@/lib/agents/sub/lift'

// ── WatcherReport ──────────────────────────────────────────────────────

export interface WatcherReport {
  timestamp: Date
  revenue: {
    mrr:              number
    newPaidThisCheck: number
    failedPayments:   number
    churn:            number
  }
  product: {
    newSignups:    number
    signupSources: string[]
    usersAtLimit:  number
  }
  codeHealth: {
    newErrors:      string[]
    allPaygPassing: boolean
  }
  visa: {
    daysUntilExpiry: number
    warnings:        string[]
  }
  growth: {
    upgradeSignals:  number
    onboardingGaps:  number
  }
  scout?: {
    allPassing:   boolean
    criticalFail: boolean
    failedTests:  string[]
  }
  lift?: {
    atRiskCount:    number
    upgradeSignals: number
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function paygTests(): { passing: boolean; failures: string[] } {
  const cases = [
    { annualSalary: 26000,  ct: true,  mle: true,  residency: 'student'    as const, expected: 44,   label: 'TC1' },
    { annualSalary: 66664,  ct: true,  mle: false, residency: 'citizen_pr' as const, expected: 468,  label: 'TC2' },
    { annualSalary: 110240, ct: false, mle: false, residency: 'citizen_pr' as const, expected: 1226, label: 'TC3' },
    { annualSalary: 95940,  ct: false, mle: true,  residency: 'citizen_pr' as const, expected: 1106, label: 'TC4' },
    { annualSalary: 134992, ct: true,  mle: false, residency: 'citizen_pr' as const, expected: 1310, label: 'TC5' },
  ]
  const failures: string[] = []
  for (const c of cases) {
    const r = calculatePAYG({ annualSalary: c.annualSalary, claimingThreshold: c.ct, hasHELP: false, medicareLevyExemption: c.mle, payCycle: 'fortnightly', residencyStatus: c.residency })
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

// ── Individual checks ──────────────────────────────────────────────────

async function checkRevenue(): Promise<WatcherReport['revenue']> {
  const defaults = { mrr: 0, newPaidThisCheck: 0, failedPayments: 0, churn: 0 }
  if (!process.env.STRIPE_SECRET_KEY) return defaults
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
    const fiveMinsAgo = Math.floor((Date.now() - 5 * 60 * 1000) / 1000)

    const [recent, cancelled, failed, active] = await Promise.all([
      stripe.subscriptions.list({ created: { gte: fiveMinsAgo }, limit: 20 }),
      stripe.subscriptions.list({ status: 'canceled', created: { gte: fiveMinsAgo }, limit: 20 }),
      stripe.invoices.list({ status: 'open', created: { gte: fiveMinsAgo }, limit: 20 }),
      stripe.subscriptions.list({ status: 'active', limit: 100 }),
    ])

    const mrr = active.data.reduce((s, sub) => s + (sub.items.data[0]?.price?.unit_amount ?? 0) / 100, 0)
    return { mrr, newPaidThisCheck: recent.data.length, failedPayments: failed.data.length, churn: cancelled.data.length }
  } catch (err) {
    console.error('checkRevenue error:', err)
    return defaults
  }
}

async function checkProduct(): Promise<WatcherReport['product']> {
  try {
    const supabase = createServiceClient()
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const [newSignupsR, atLimitR] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', fiveMinsAgo),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'free').lt('created_at', twoDaysAgo),
    ])

    return {
      newSignups: newSignupsR.count ?? 0,
      signupSources: [],
      usersAtLimit: atLimitR.count ?? 0,
    }
  } catch {
    return { newSignups: 0, signupSources: [], usersAtLimit: 0 }
  }
}

async function checkCodeHealth(): Promise<WatcherReport['codeHealth']> {
  try {
    const supabase = createServiceClient()
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const { data: newErrData } = await supabase.from('agent_error_log')
      .select('error_type').gte('created_at', tenMinsAgo).limit(20)

    const payg = paygTests()
    return {
      newErrors: (newErrData ?? []).map(e => e.error_type as string ?? 'unknown').filter(Boolean),
      allPaygPassing: payg.passing,
    }
  } catch {
    return { newErrors: [], allPaygPassing: true }
  }
}

async function checkVisa(): Promise<WatcherReport['visa']> {
  const warnings: string[] = []
  let daysUntilExpiry = 999
  try {
    const masterPath = path.join(process.cwd(), 'SANJOG_MASTER.md')
    const content = fs.readFileSync(masterPath, 'utf-8')
    const visaDate = parseDateFromMaster(content, /Visa expiry[^:]*:\s*\[?(\d{4}-\d{2}-\d{2})/i)
    if (visaDate) {
      daysUntilExpiry = daysUntil(visaDate)
      if (daysUntilExpiry < 90)  warnings.push(`Visa expires in ${daysUntilExpiry} days — URGENT`)
      else if (daysUntilExpiry < 180) warnings.push(`Visa expires in ${daysUntilExpiry} days`)
    }
  } catch {
    warnings.push('Could not read SANJOG_MASTER.md for visa check')
  }
  return { daysUntilExpiry, warnings }
}

async function checkGrowth(): Promise<WatcherReport['growth']> {
  try {
    const supabase = createServiceClient()
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

    const [onboardR, upgradeR] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'free').lt('created_at', twoDaysAgo),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('plan', 'free').lt('updated_at', tenDaysAgo),
    ])

    return { onboardingGaps: onboardR.count ?? 0, upgradeSignals: upgradeR.count ?? 0 }
  } catch {
    return { onboardingGaps: 0, upgradeSignals: 0 }
  }
}

// ── Main watcher cycle ─────────────────────────────────────────────────

export async function runWatcherCycle(): Promise<WatcherReport> {
  const [revenueR, productR, codeR, visaR, growthR, scoutR, liftR] = await Promise.allSettled([
    checkRevenue(),
    checkProduct(),
    checkCodeHealth(),
    checkVisa(),
    checkGrowth(),
    runScout(),
    runLift(),
  ])

  const scoutReport = scoutR.status === 'fulfilled' ? scoutR.value : null
  const liftReport  = liftR.status  === 'fulfilled' ? liftR.value  : null

  return {
    timestamp:  new Date(),
    revenue:    revenueR.status === 'fulfilled' ? revenueR.value   : { mrr: 0, newPaidThisCheck: 0, failedPayments: 0, churn: 0 },
    product:    productR.status === 'fulfilled' ? productR.value   : { newSignups: 0, signupSources: [], usersAtLimit: 0 },
    codeHealth: codeR.status === 'fulfilled'   ? codeR.value      : { newErrors: [], allPaygPassing: true },
    visa:       visaR.status === 'fulfilled'   ? visaR.value      : { daysUntilExpiry: 999, warnings: [] },
    growth:     growthR.status === 'fulfilled' ? growthR.value    : { upgradeSignals: 0, onboardingGaps: 0 },
    scout: scoutReport ? {
      allPassing:   scoutReport.allPassing,
      criticalFail: scoutReport.criticalFail,
      failedTests:  scoutReport.tests.filter(t => !t.pass).map(t => t.name),
    } : undefined,
    lift: liftReport ? {
      atRiskCount:    liftReport.atRiskUsers.length,
      upgradeSignals: liftReport.upgradeSignals,
    } : undefined,
  }
}

// ── Evaluate and alert (diff vs previous) ─────────────────────────────

export async function evaluateAndAlert(
  current:  WatcherReport,
  previous: WatcherReport | null,
): Promise<number> {
  let alertsSent = 0

  // PAYG — critical: alert if newly failing
  if (!current.codeHealth.allPaygPassing) {
    const wasOk = previous?.codeHealth.allPaygPassing !== false
    if (wasOk) {
      await sendAlert('CRITICAL: PAYG calculation broken', 'PAYG tests failing. Fix src/lib/ato.ts immediately.', 'urgent', 'watcher')
      alertsSent++
    }
  }

  // New paid user
  if (current.revenue.newPaidThisCheck > 0) {
    await sendAlert(`${current.revenue.newPaidThisCheck} new paid user`, `${current.revenue.newPaidThisCheck} new subscription(s). MRR now $${current.revenue.mrr.toFixed(0)}.`, 'info', 'watcher')
    alertsSent++
  }

  // Failed payment (new)
  if (current.revenue.failedPayments > 0 && (previous?.revenue.failedPayments ?? 0) === 0) {
    await sendAlert(`${current.revenue.failedPayments} payment failed`, `${current.revenue.failedPayments} failed payment(s). Check Stripe dashboard.`, 'urgent', 'watcher')
    alertsSent++
  }

  // Churn (new)
  if (current.revenue.churn > 0 && (previous?.revenue.churn ?? 0) === 0) {
    await sendAlert(`${current.revenue.churn} user churned`, `${current.revenue.churn} cancellation(s). MRR now $${current.revenue.mrr.toFixed(0)}.`, 'warning', 'watcher')
    alertsSent++
  }

  // New signup
  if (current.product.newSignups > 0) {
    await sendAlert(`${current.product.newSignups} new signup`, `${current.product.newSignups} new user(s) joined SAB Account AI.`, 'info', 'watcher')
    alertsSent++
  }

  // New error type
  if (current.codeHealth.newErrors.length > 0 && (previous?.codeHealth.newErrors.length ?? 0) === 0) {
    await sendAlert(`New error — ${current.codeHealth.newErrors[0]}`, `${current.codeHealth.newErrors.length} new error type(s) in last 10 mins.`, 'warning', 'watcher')
    alertsSent++
  }

  // Visa warning (first crossing under 90 days)
  for (const warning of current.visa.warnings) {
    const urgency = warning.includes('URGENT') ? 'urgent' : 'warning'
    await sendAlert('Visa alert', warning, urgency, 'watcher')
    alertsSent++
  }

  // Scout: critical product failure (new)
  if (current.scout?.criticalFail && !previous?.scout?.criticalFail) {
    const failedList = current.scout.failedTests.join(', ')
    await sendAlert('Scout: critical product failure', `Critical tests failing: ${failedList}`, 'urgent', 'scout')
    alertsSent++
  } else if (
    (current.scout?.failedTests.length ?? 0) > 0 &&
    (previous?.scout?.failedTests.length ?? 0) === 0
  ) {
    const failedList = current.scout!.failedTests.join(', ')
    await sendAlert('Scout: product issue found', `Tests failing: ${failedList}`, 'warning', 'scout')
    alertsSent++
  }

  // Lift: new at-risk users
  const prevAtRisk = previous?.lift?.atRiskCount ?? 0
  const currAtRisk = current.lift?.atRiskCount ?? 0
  if (currAtRisk > prevAtRisk) {
    await sendAlert(
      `Lift: ${currAtRisk - prevAtRisk} new at-risk users`,
      `Total at-risk: ${currAtRisk}. Check email for breakdown and recommended actions.`,
      'warning',
      'lift',
    )
    alertsSent++
  }

  // Lift: upgrade signals (new)
  const prevUpgrade = previous?.lift?.upgradeSignals ?? 0
  const currUpgrade = current.lift?.upgradeSignals ?? 0
  if (currUpgrade > prevUpgrade) {
    await sendAlert(
      `Lift: ${currUpgrade} users ready to upgrade`,
      'Free users at invoice limit — upgrade prompt opportunity.',
      'info',
      'lift',
    )
    alertsSent++
  }

  return alertsSent
}

// ── Proactive insight (once per hour) ─────────────────────────────────

export async function proactiveInsight(report: WatcherReport): Promise<void> {
  try {
    const summary = {
      mrr: report.revenue.mrr,
      newSignups: report.product.newSignups,
      failedPayments: report.revenue.failedPayments,
      paygPassing: report.codeHealth.allPaygPassing,
      visaWarnings: report.visa.warnings.length,
    }

    const insight = await callClaude({
      systemPrompt: BASNET_PERSONALITY,
      userMessage: `SAB Account AI live data: ${JSON.stringify(summary)}\n\nWhat is the single most important thing Sanjog should know right now? One sentence. Specific. Actionable. If nothing important, return exactly: NULL`,
      maxTokens: 100,
    })

    if (insight.trim().toUpperCase() === 'NULL') return
    await sendAlert('Basnet insight', insight, 'info', 'watcher')
  } catch { /* non-fatal */ }
}

// Keep for backward compat (called by watch/route.ts)
export async function generateProactiveInsight(report: WatcherReport): Promise<string | null> {
  await proactiveInsight(report)
  return null
}

// ── Persistence ────────────────────────────────────────────────────────

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
      .eq('alert_key', 'basnet_insight').order('created_at', { ascending: false }).limit(1).maybeSingle()
    return data ? new Date(data.created_at as string) : null
  } catch { return null }
}

export async function logWatcherRun(durationMs: number, alertsSent: number): Promise<void> {
  await logAgentAction({ agentName: 'watcher', triggerType: 'watch', actionsTaken: { alertsSent }, outcome: 'cycle complete', durationMs })
}
