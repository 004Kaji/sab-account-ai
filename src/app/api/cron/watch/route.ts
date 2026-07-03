export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Runs every 6 hours (0:00, 6:00, 12:00, 18:00 UTC).
// Calls the watcher agent — checks revenue, signups, PAYG health, visa status,
// and sends an alert only if something has changed vs the previous run.
// The watch agent has its own rate limit (300/day) and diff-based alerting.

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'

  try {
    const res = await fetch(`${baseUrl}/api/agents/watch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-secret': process.env.AGENT_WEBHOOK_SECRET ?? '',
      },
      body: JSON.stringify({}),
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return NextResponse.json({ success: true, status: res.status, ...data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
