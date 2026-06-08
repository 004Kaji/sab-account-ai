export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { calculatePAYG } from '@/lib/ato'
import { createServiceClient } from '@/lib/supabase'
import {
  readMasterContext,
  sendTelegram,
  logAgentAction,
  callClaude,
  getStripeMetrics,
  isRateLimited,
} from '@/lib/agents/utils'

type HealthIssue = {
  type: string
  severity: string
  description: string
  action: string
}

type HealthResponse = {
  overall_status: 'healthy' | 'warning' | 'critical'
  issues: HealthIssue[]
  payg_tests: 'all_passing' | 'failing'
  summary: string
  send_telegram: boolean
  telegram_message: string
}

function runPAYGTests(): { passing: boolean; failures: string[] } {
  const failures: string[] = []

  // TC1: $1000 fortnightly Scale 5 → $44
  const tc1 = calculatePAYG({
    annualSalary: 1000 * 26,
    claimingThreshold: true,
    hasHELP: false,
    medicareLevyExemption: true,
    payCycle: 'fortnightly',
    residencyStatus: 'student',
  })
  if (tc1.periodTotal !== 44) {
    failures.push(`TC1: $1000 fortnightly Scale 5 — expected $44, got $${tc1.periodTotal}`)
  }

  // TC2: $2564 fortnightly Scale 2 → $468
  const tc2 = calculatePAYG({
    annualSalary: 2564 * 26,
    claimingThreshold: true,
    hasHELP: false,
    medicareLevyExemption: false,
    payCycle: 'fortnightly',
    residencyStatus: 'citizen_pr',
  })
  if (tc2.periodTotal !== 468) {
    failures.push(`TC2: $2564 fortnightly Scale 2 — expected $468, got $${tc2.periodTotal}`)
  }

  // TC3: $4240 fortnightly Scale 1 → $1226
  const tc3 = calculatePAYG({
    annualSalary: 4240 * 26,
    claimingThreshold: false,
    hasHELP: false,
    medicareLevyExemption: false,
    payCycle: 'fortnightly',
    residencyStatus: 'citizen_pr',
  })
  if (tc3.periodTotal !== 1226) {
    failures.push(`TC3: $4240 fortnightly Scale 1 — expected $1226, got $${tc3.periodTotal}`)
  }

  // TC4: $3690 fortnightly Scale 3 → $1106
  const tc4 = calculatePAYG({
    annualSalary: 3690 * 26,
    claimingThreshold: false,
    hasHELP: false,
    medicareLevyExemption: true,
    payCycle: 'fortnightly',
    residencyStatus: 'citizen_pr',
  })
  if (tc4.periodTotal !== 1106) {
    failures.push(`TC4: $3690 fortnightly Scale 3 — expected $1106, got $${tc4.periodTotal}`)
  }

  // TC5: $5192 fortnightly Scale 2 → $1310
  const tc5 = calculatePAYG({
    annualSalary: 5192 * 26,
    claimingThreshold: true,
    hasHELP: false,
    medicareLevyExemption: false,
    payCycle: 'fortnightly',
    residencyStatus: 'citizen_pr',
  })
  if (tc5.periodTotal !== 1310) {
    failures.push(`TC5: $5192 fortnightly Scale 2 — expected $1310, got $${tc5.periodTotal}`)
  }

  return { passing: failures.length === 0, failures }
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    if (await isRateLimited('product-health', 48)) {
      return NextResponse.json({ success: false, error: 'Rate limited — max 48/day' })
    }

    const body = (await req.json().catch(() => ({}))) as { trigger?: string }
    const trigger = body.trigger ?? 'manual'

    const masterContext = await readMasterContext()
    const supabase = createServiceClient()
    const weekAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // ── Collect health data ──
    const [
      unresolvedErrorsResult,
      newSignups24hResult,
      stripeMetrics,
    ] = await Promise.all([
      supabase
        .from('agent_error_log')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      getStripeMetrics(),
    ])

    // Check RLS on core tables
    const coreTable = 'invoices'
    const { error: rlsCheckErr } = await supabase
      .from(coreTable)
      .select('id')
      .limit(1)

    const rlsStatus = rlsCheckErr ? 'check_failed' : 'accessible_via_service_role'

    // Run PAYG tests
    const paygTests = runPAYGTests()

    if (!paygTests.passing) {
      await sendTelegram(
        `PAYG calculation failures detected!\n${paygTests.failures.join('\n')}\n\nCheck src/lib/ato.ts immediately.`,
        'urgent',
      )
    }

    const healthData = {
      unresolvedErrors: unresolvedErrorsResult.count ?? 0,
      newSignups24h: newSignups24hResult.count ?? 0,
      failedPayments24h: stripeMetrics.failedPaymentsThisWeek,
      churnThisWeek: stripeMetrics.churnThisWeek,
      mrr: stripeMetrics.mrr,
      rlsStatus,
      paygTests: paygTests.passing ? 'all_passing' : `failing: ${paygTests.failures.join(', ')}`,
      paygFailures: paygTests.failures,
    }

    // ── Ask Claude ──
    const claudeResponse = await callClaude({
      systemPrompt: `You are the Product Health Agent for SAB Account AI.
You monitor technical and business health.
Sanjog is an international student in Sydney on a student visa building this as a solo founder.
Be direct. Flag only real issues. Never cry wolf.
If everything is fine, say so clearly.
Master context: ${masterContext.slice(0, 2000)}`,
      userMessage: `Health data as of ${new Date().toISOString()}:
${JSON.stringify(healthData, null, 2)}

Return ONLY valid JSON (no markdown):
{
  "overall_status": "healthy|warning|critical",
  "issues": [{"type": "string", "severity": "string", "description": "string", "action": "string"}],
  "payg_tests": "all_passing|failing",
  "summary": "one sentence plain English",
  "send_telegram": boolean,
  "telegram_message": "string"
}`,
      maxTokens: 800,
      expectJson: true,
    })

    let parsed: HealthResponse
    try {
      parsed = JSON.parse(claudeResponse) as HealthResponse
    } catch {
      parsed = {
        overall_status: 'warning',
        issues: [],
        payg_tests: paygTests.passing ? 'all_passing' : 'failing',
        summary: 'Health check completed — JSON parse failed, data collected successfully.',
        send_telegram: false,
        telegram_message: '',
      }
    }

    if (parsed.send_telegram && parsed.telegram_message) {
      const urgency = parsed.overall_status === 'critical' ? 'urgent'
        : parsed.overall_status === 'warning' ? 'warning' : 'info'
      await sendTelegram(parsed.telegram_message, urgency)
    }

    await logAgentAction({
      agentName: 'product-health',
      triggerType: trigger,
      inputContext: healthData,
      decision: parsed.overall_status,
      actionsTaken: { sentTelegram: parsed.send_telegram, paygTests: healthData.paygTests },
      outcome: parsed.summary,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ success: true, ...parsed, healthData })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'product-health' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendTelegram(`Product Health Agent error: ${msg}`, 'urgent').catch(() => {})
    return NextResponse.json({ success: false, error: msg })
  }
}
