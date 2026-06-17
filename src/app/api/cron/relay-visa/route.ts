export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Runs every Monday 9am AEST (Sunday 11pm UTC).
// Proactively checks visa expiry and fires warning (<180 days) or urgent (<90 days) alert.

import { NextRequest, NextResponse } from 'next/server'
import { relayVisaCheck } from '@/lib/agents/sub/relay'
import { logAgentAction } from '@/lib/agents/utils'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const result = await relayVisaCheck()

  await logAgentAction({
    agentName:   'cron',
    triggerType: 'relay_visa_check',
    outcome:     result.recommendation,
    durationMs:  Date.now() - start,
  })

  return NextResponse.json({ success: true, ...result, durationMs: Date.now() - start })
}
