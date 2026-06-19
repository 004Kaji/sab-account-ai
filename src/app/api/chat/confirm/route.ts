import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { executeToolCall } from '@/lib/chat/tool-handlers'

// Allowlist — only send-type actions can be confirmed directly
const ALLOWED_ACTIONS = new Set(['send_payslip', 'send_invoice', 'send_all_payslips'])

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let action: string
  let action_payload: Record<string, unknown>
  try {
    const body = await req.json() as { action: string; action_payload: Record<string, unknown> }
    action = body.action
    action_payload = body.action_payload
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Action not allowed via direct confirm' }, { status: 400 })
  }

  try {
    const result = await executeToolCall(action, action_payload, user.id, supabase, token)
    return NextResponse.json(result)
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'chat_confirm' } })
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
