export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { fluxHandleScoutIncident } from '@/lib/agents/sub/flux'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const secret = process.env.AGENT_WEBHOOK_SECRET ?? ''
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { trigger, test_name, error_message, severity } = body as {
    trigger:       string
    test_name?:    string
    error_message?: string
    severity?:     'critical' | 'warning'
  }

  if (trigger === 'scout_incident') {
    if (!test_name || !error_message) {
      return NextResponse.json({ error: 'Missing test_name or error_message' }, { status: 400 })
    }
    await fluxHandleScoutIncident({
      test_name,
      error_message,
      severity: severity ?? 'warning',
    })
    return NextResponse.json({ ok: true, trigger: 'scout_incident' })
  }

  return NextResponse.json({ error: `Unknown trigger: ${trigger}` }, { status: 400 })
}
