export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import {
  sendTelegram,
  logAgentAction,
  getBaseUrl,
} from '@/lib/agents/utils'

async function callSubAgent(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const baseUrl = getBaseUrl()
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return await res.json() as Record<string, unknown>
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      trigger?: string
      question?: string
    }
    const trigger = body.trigger ?? 'ask'

    // ── TRIGGER: morning ───────────────────────────────────────────────
    if (trigger === 'morning') {
      const result = await callSubAgent('/api/agents/personal/daily', { trigger: 'morning_briefing' })
      await logAgentAction({
        agentName: 'personal',
        triggerType: trigger,
        outcome: (result.briefing as string | undefined)?.slice(0, 200) ?? 'briefing completed',
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ success: true, ...result })
    }

    // ── TRIGGER: ask ───────────────────────────────────────────────────
    if (trigger === 'ask') {
      const result = await callSubAgent('/api/agents/personal/inquiries', {
        question: body.question ?? '',
      })
      await logAgentAction({
        agentName: 'personal',
        triggerType: trigger,
        inputContext: { question: body.question },
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ success: true, ...result })
    }

    // ── TRIGGER: visa ──────────────────────────────────────────────────
    if (trigger === 'visa') {
      const result = await callSubAgent('/api/agents/personal/daily', { trigger: 'visa_check' })
      await logAgentAction({
        agentName: 'personal',
        triggerType: trigger,
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ success: true, ...result })
    }

    // ── TRIGGER: goals ─────────────────────────────────────────────────
    if (trigger === 'goals') {
      const result = await callSubAgent('/api/agents/personal/daily', { trigger: 'goal_check' })
      await logAgentAction({
        agentName: 'personal',
        triggerType: trigger,
        outcome: (result.assessment as string | undefined)?.slice(0, 200),
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ success: false, error: `Unknown trigger: ${trigger}` })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'personal' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendTelegram(`Personal Agent error: ${msg}`, 'urgent').catch(() => {})
    return NextResponse.json({ success: false, error: msg })
  }
}
