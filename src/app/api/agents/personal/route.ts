export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { sendAlert, logAgentAction } from '@/lib/agents/toolkits/personal-toolkit'
import { relayAnswer, relayVisaCheck, relayGoalCheck } from '@/lib/agents/sub/relay'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const secret = process.env.AGENT_WEBHOOK_SECRET ?? ''
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const start = Date.now()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      trigger?: string
      question?: string
    }
    const trigger = body.trigger ?? 'ask'

    // ── TRIGGER: morning ───────────────────────────────────────────────
    if (trigger === 'morning') {
      const [visa, goals] = await Promise.all([relayVisaCheck(), relayGoalCheck()])
      await logAgentAction({ agentName: 'personal', triggerType: trigger, outcome: visa.recommendation, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, visa, goals })
    }

    // ── TRIGGER: ask ───────────────────────────────────────────────────
    if (trigger === 'ask') {
      const question = body.question ?? ''
      if (!question) return NextResponse.json({ success: false, error: 'question required' })
      const result = await relayAnswer(question)
      await logAgentAction({ agentName: 'personal', triggerType: trigger, inputContext: { question }, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, answer: result.answer, url: result.url })
    }

    // ── TRIGGER: visa ──────────────────────────────────────────────────
    if (trigger === 'visa') {
      const result = await relayVisaCheck()
      await logAgentAction({ agentName: 'personal', triggerType: trigger, outcome: result.recommendation, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, ...result })
    }

    // ── TRIGGER: goals ─────────────────────────────────────────────────
    if (trigger === 'goals') {
      const assessment = await relayGoalCheck()
      await logAgentAction({ agentName: 'personal', triggerType: trigger, outcome: assessment.slice(0, 200), durationMs: Date.now() - start })
      return NextResponse.json({ success: true, assessment })
    }

    return NextResponse.json({ success: false, error: `Unknown trigger: ${trigger}` })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'personal' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendAlert('Personal agent error', msg, 'urgent', 'personal').catch(() => {})
    return NextResponse.json({ success: false, error: msg })
  }
}
