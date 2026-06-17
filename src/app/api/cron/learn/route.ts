export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs every Sunday at 8pm AEST (10:00 UTC).
// Calls the learn agent — reviews the week, saves to agent_learnings table,
// sends a summary email to Sanjog. Runs after Lift (11:00 UTC) so all
// weekly agent activity is captured before the learning runs.

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'

  try {
    const res = await fetch(`${baseUrl}/api/agents/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return NextResponse.json({ success: true, status: res.status, ...data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
