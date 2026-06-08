export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import {
  runWatcherCycle, evaluateAndAlert, proactiveInsight,
  saveWatcherReport, getLastWatcherReport, getLastProactiveInsightTime, logWatcherRun,
} from '@/lib/agents/watcher'
import { isRateLimited, sendAlert } from '@/lib/agents/utils'

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    // Validate secret from header
    const secret   = req.headers.get('x-agent-secret') ?? ''
    const expected = process.env.AGENT_WEBHOOK_SECRET ?? ''
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Rate limit: max 300/day (every 5 mins = 288/day)
    if (await isRateLimited('watcher', 300)) {
      return NextResponse.json({ success: false, message: 'Rate limited' }, { status: 429 })
    }

    // Get previous report for diff-based alerting
    const previous = await getLastWatcherReport()

    // Run all checks
    const report = await runWatcherCycle()

    // Alert only on changes vs previous
    const alertsSent = await evaluateAndAlert(report, previous)

    // Once per hour: generate proactive insight
    const lastInsight = await getLastProactiveInsightTime()
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (!lastInsight || lastInsight < hourAgo) {
      await proactiveInsight(report).catch(() => null)
    }

    // Save report and log
    await saveWatcherReport(report, alertsSent)
    await logWatcherRun(Date.now() - start, alertsSent)

    return NextResponse.json({
      success: true,
      alertsSent,
      timestamp: report.timestamp.toISOString(),
      summary: {
        mrr:           report.revenue.mrr,
        newSignups:    report.product.newSignups,
        paygPassing:   report.codeHealth.allPaygPassing,
        visaWarnings:  report.visa.warnings.length,
      },
    })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'watcher' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendAlert('Watcher cycle failed', msg, 'urgent', 'watcher').catch(() => null)
    // Always 200 — watcher must never crash n8n
    return NextResponse.json({ success: false, error: msg })
  }
}
