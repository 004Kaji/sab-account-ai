export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs every Sunday 9pm AEST (11:00 UTC).
// Scans for at-risk users, sends retention emails, logs churn signals.

import { NextRequest, NextResponse } from 'next/server'
import { runLift } from '@/lib/agents/sub/lift'
import { logAgentAction } from '@/lib/agents/utils'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    const report = await runLift()

    await logAgentAction({
      agentName:    'cron',
      triggerType:  'lift_weekly',
      actionsTaken: report as unknown as Record<string, unknown>,
      durationMs:   Date.now() - start,
    })

    return NextResponse.json({ success: true, ...report, durationMs: Date.now() - start })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)

    await logAgentAction({
      agentName:    'cron',
      triggerType:  'lift_weekly',
      actionsTaken: { error },
      durationMs:   Date.now() - start,
    })

    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
