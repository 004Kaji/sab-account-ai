export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs every day at 9pm UTC (7am AEST / 8am AEDT).
// Calls the basnet morning trigger — all sub-agents run in parallel,
// world state is updated, and the daily briefing is sent via SMS/alert.
// If voice already triggered it today, the basnet route returns early (rate limited).

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'

  try {
    const res = await fetch(`${baseUrl}/api/agents/basnet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger: 'morning',
        secret: process.env.AGENT_WEBHOOK_SECRET,
      }),
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return NextResponse.json({ success: true, status: res.status, ...data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
