export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import {
  readMasterContext,
  sendTelegram,
  logAgentAction,
  callClaude,
  getBaseUrl,
} from '@/lib/agents/utils'

const SAB_PRODUCT_KEYWORDS = ['error', 'bug', 'stripe', 'supabase', 'sentry', 'payg', 'test', 'build', 'security', 'rls', 'webhook']
const SAB_MARKETING_KEYWORDS = ['content', 'tiktok', 'blog', 'accountant', 'email', 'signup', 'conversion', 'seo', 'social']

function classifyQuestion(question: string): 'product' | 'marketing' | 'general' {
  const q = question.toLowerCase()
  if (SAB_PRODUCT_KEYWORDS.some(k => q.includes(k))) return 'product'
  if (SAB_MARKETING_KEYWORDS.some(k => q.includes(k))) return 'marketing'
  return 'general'
}

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
      data?: Record<string, unknown>
    }
    const trigger = body.trigger ?? 'health_check'

    // ── TRIGGER: health_check ──────────────────────────────────────────
    if (trigger === 'health_check') {
      const result = await callSubAgent('/api/agents/sab/product-health', { trigger: 'scheduled' })
      await logAgentAction({
        agentName: 'sab',
        triggerType: trigger,
        outcome: (result.summary as string | undefined) ?? 'health check completed',
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ success: true, ...result })
    }

    // ── TRIGGER: marketing_run ─────────────────────────────────────────
    if (trigger === 'marketing_run') {
      const marketingTrigger = (body.data?.marketingTrigger as string | undefined) ?? 'weekly_brief'
      const result = await callSubAgent('/api/agents/sab/marketing', { trigger: marketingTrigger, data: body.data })
      await logAgentAction({
        agentName: 'sab',
        triggerType: trigger,
        actionsTaken: { marketingTrigger },
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ success: true, ...result })
    }

    // ── TRIGGER: full_report ───────────────────────────────────────────
    if (trigger === 'full_report') {
      const [healthResult, marketingResult] = await Promise.all([
        callSubAgent('/api/agents/sab/product-health', { trigger: 'manual' }),
        callSubAgent('/api/agents/sab/marketing', { trigger: 'content_brief' }),
      ])

      const masterContext = await readMasterContext()

      const synthesis = await callClaude({
        systemPrompt: masterContext.slice(0, 1500),
        userMessage: `Synthesise these two reports into one executive summary for Sanjog.
Max 150 words. What matters most right now?

Health Report: ${JSON.stringify(healthResult)}
Marketing Report: ${JSON.stringify(marketingResult)}`,
        maxTokens: 250,
      })

      await logAgentAction({
        agentName: 'sab',
        triggerType: trigger,
        outcome: synthesis.slice(0, 200),
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, synthesis, healthResult, marketingResult })
    }

    // ── TRIGGER: ask ───────────────────────────────────────────────────
    if (trigger === 'ask') {
      const question = body.question ?? ''
      const classification = classifyQuestion(question)

      let result: Record<string, unknown>

      if (classification === 'product') {
        result = await callSubAgent('/api/agents/sab/product-health', { trigger: 'manual' })
      } else if (classification === 'marketing') {
        result = await callSubAgent('/api/agents/sab/marketing', { trigger: 'content_brief' })
      } else {
        const masterContext = await readMasterContext()
        const answer = await callClaude({
          systemPrompt: `You are the SAB Account AI agent. Context: ${masterContext.slice(0, 1500)}`,
          userMessage: question,
          maxTokens: 500,
        })
        result = { success: true, answer }
      }

      await logAgentAction({
        agentName: 'sab',
        triggerType: trigger,
        inputContext: { question, classification },
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, ...result, classification })
    }

    return NextResponse.json({ success: false, error: `Unknown trigger: ${trigger}` })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'sab' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendTelegram(`SAB Agent error: ${msg}`, 'urgent').catch(() => {})
    return NextResponse.json({ success: false, error: msg })
  }
}
