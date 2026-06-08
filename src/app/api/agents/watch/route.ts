export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import {
  runWatcherCycle,
  evaluateAndAlert,
  generateProactiveInsight,
  saveWatcherReport,
  getLastProactiveInsightTime,
  logWatcherRun,
} from '@/lib/agents/watcher'
import { isRateLimited, sendAlert } from '@/lib/agents/utils'

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    // Validate secret from header
    const secret = req.headers.get('x-agent-secret') ?? ''
    const expected = process.env.AGENT_WEBHOOK_SECRET ?? ''
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Rate limit: max 288/day (every 5 mins)
    if (await isRateLimited('watcher', 288)) {
      return NextResponse.json({ success: false, message: 'Rate limited' }, { status: 429 })
    }

    // Run all 6 system checks
    const report = await runWatcherCycle()

    // Send alerts for any new findings
    const alertsSent = await evaluateAndAlert(report)

    // Once per hour: generate proactive insight
    const lastInsight = await getLastProactiveInsightTime()
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (!lastInsight || lastInsight < hourAgo) {
      await generateProactiveInsight(report).catch(() => null)
    }

    // Save report
    await saveWatcherReport(report, alertsSent)
    await logWatcherRun(Date.now() - start, alertsSent)

    return NextResponse.json({
      success: true,
      alertsSent,
      systemsChecked: 6,
      timestamp: report.timestamp.toISOString(),
      summary: {
        mrr: report.revenue.mrr,
        newSignups: report.product.newSignups,
        paygPassing: report.codeHealth.allPaygPassing,
        visaWarnings: report.visaCompliance.warnings.length,
      },
    })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'watcher' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendAlert('Watcher cycle failed', msg, 'urgent', 'watcher').catch(() => null)
    // Always return 200 — watcher must never crash n8n
    return NextResponse.json({ success: false, error: msg })
  }
}
