export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import {
  readMasterContext,
  sendTelegram,
  logAgentAction,
  callClaude,
  getBaseUrl,
  isRateLimited,
} from '@/lib/agents/utils'

type QuestionClass = 'SAB_PRODUCT' | 'SAB_MARKETING' | 'PERSONAL' | 'GENERAL'

const CLASSIFICATION_KEYWORDS: Record<QuestionClass, string[]> = {
  SAB_PRODUCT: ['sab', 'app', 'code', 'bug', 'stripe', 'supabase', 'sentry', 'payg', 'build', 'error', 'rls', 'webhook', 'fix', 'crash', 'deploy'],
  SAB_MARKETING: ['content', 'tiktok', 'blog', 'accountant', 'email', 'signup', 'conversion', 'seo', 'social', 'marketing', 'outreach'],
  PERSONAL: ['visa', 'pr', 'university', 'uni', 'mac', 'life', 'goal', 'dream', 'money', 'budget', 'personal', 'migration', 'student'],
  GENERAL: [],
}

function classifyQuestion(question: string): QuestionClass {
  const q = question.toLowerCase()
  for (const cls of ['SAB_PRODUCT', 'SAB_MARKETING', 'PERSONAL'] as const) {
    if (CLASSIFICATION_KEYWORDS[cls].some(k => q.includes(k))) return cls
  }
  return 'GENERAL'
}

async function callAgent(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
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
      payload?: Record<string, unknown>
    }
    const trigger = body.trigger ?? 'manual'

    // ── TRIGGER: morning ───────────────────────────────────────────────
    if (trigger === 'morning') {
      if (await isRateLimited('basnet-morning', 2)) {
        return NextResponse.json({ success: true, message: 'Rate limited — morning briefing already ran today' })
      }

      const [personalResult, healthResult] = await Promise.all([
        callAgent('/api/agents/personal', { trigger: 'morning' }),
        callAgent('/api/agents/sab', { trigger: 'health_check' }),
      ])

      const combined = {
        briefing: personalResult.briefing ?? personalResult.content,
        health: healthResult.summary ?? healthResult.overall_status,
        personalResult,
        healthResult,
      }

      await logAgentAction({
        agentName: 'basnet',
        triggerType: trigger,
        actionsTaken: { calledPersonal: true, calledSAB: true },
        outcome: 'morning briefing completed',
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, ...combined })
    }

    // ── TRIGGER: weekly ────────────────────────────────────────────────
    if (trigger === 'weekly') {
      const [marketingResult, goalsResult] = await Promise.all([
        callAgent('/api/agents/sab', { trigger: 'marketing_run', data: { marketingTrigger: 'weekly_brief' } }),
        callAgent('/api/agents/personal', { trigger: 'goals' }),
      ])

      const focus = (marketingResult.brief as Record<string, unknown> | undefined)?.focus_this_week as string | undefined
      const summary = (marketingResult.brief as Record<string, unknown> | undefined)?.weekly_summary as string | undefined
      const assessment = goalsResult.assessment as string | undefined

      const weeklyMsg = `WEEKLY BRIEF — ${new Date().toISOString().split('T')[0]}
${summary ?? 'Week brief generated.'}

GOALS CHECK: ${assessment ?? 'See goals assessment.'}
${focus ? `This week: ${focus}` : ''}`

      await sendTelegram(weeklyMsg, 'info')

      await logAgentAction({
        agentName: 'basnet',
        triggerType: trigger,
        actionsTaken: { calledMarketing: true, calledGoals: true },
        outcome: focus ?? 'weekly brief sent',
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, weeklyMsg, marketingResult, goalsResult })
    }

    // ── TRIGGER: ask / manual ──────────────────────────────────────────
    if (trigger === 'ask' || trigger === 'manual') {
      const question = body.question ?? (body.payload?.question as string | undefined) ?? ''
      if (!question) {
        return NextResponse.json({ success: false, error: 'question is required for ask trigger' })
      }

      const classification = classifyQuestion(question)

      let result: Record<string, unknown>

      if (classification === 'SAB_PRODUCT') {
        result = await callAgent('/api/agents/sab', { trigger: 'ask', question })
      } else if (classification === 'SAB_MARKETING') {
        result = await callAgent('/api/agents/sab', { trigger: 'ask', question })
      } else if (classification === 'PERSONAL') {
        result = await callAgent('/api/agents/personal', { trigger: 'ask', question })
      } else {
        const masterContext = await readMasterContext()
        const answer = await callClaude({
          systemPrompt: `You are the Basnet Agent — Sanjog's master AI. Context: ${masterContext.slice(0, 2000)}`,
          userMessage: question,
          maxTokens: 600,
        })
        result = { success: true, answer }
      }

      await logAgentAction({
        agentName: 'basnet',
        triggerType: trigger,
        inputContext: { question, classification },
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, classification, ...result })
    }

    // ── TRIGGER: sentry_alert ──────────────────────────────────────────
    if (trigger === 'sentry_alert') {
      const payload = body.payload ?? {}
      const errorType = payload.error as string | undefined
      const fileName = payload.file as string | undefined
      const message = payload.message as string | undefined
      const count = (payload.count as number | undefined) ?? 1

      const supabase = createServiceClient()

      const severity = count > 10 ? 'critical' : 'warning'

      // Check if we've seen this error before
      const { data: existing } = await supabase
        .from('agent_error_log')
        .select('id, frequency')
        .eq('error_type', errorType ?? '')
        .eq('resolved', false)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('agent_error_log')
          .update({ frequency: (existing.frequency as number) + count })
          .eq('id', existing.id)
      } else {
        await supabase.from('agent_error_log').insert({
          error_type: errorType ?? 'unknown',
          error_message: message ?? '',
          file_name: fileName ?? '',
          frequency: count,
          severity,
          alerted: true,
          resolved: false,
        })
      }

      if (severity === 'critical') {
        await sendTelegram(
          `CRITICAL ERROR: ${errorType}\nFile: ${fileName}\n${message}\nOccurrences: ${count}`,
          'urgent',
        )
        await callAgent('/api/agents/sab/product-health', { trigger: 'sentry_webhook' })
      } else if (severity === 'warning' && !existing) {
        await sendTelegram(
          `New error type: ${errorType}\nFile: ${fileName}\n${message}`,
          'warning',
        )
      }

      await logAgentAction({
        agentName: 'basnet',
        triggerType: trigger,
        inputContext: payload,
        decision: severity,
        outcome: `logged sentry alert — ${severity}`,
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, received: true, severity })
    }

    // ── TRIGGER: stripe_event ──────────────────────────────────────────
    if (trigger === 'stripe_event') {
      const payload = body.payload ?? {}
      const eventType = payload.type as string | undefined

      if (eventType === 'invoice.payment_failed') {
        const customerEmail = (payload.customer_email as string | undefined) ?? 'unknown'
        await sendTelegram(`Payment failed: ${customerEmail}`, 'warning')
      } else if (eventType === 'customer.subscription.deleted') {
        const plan = (payload.plan as string | undefined) ?? 'unknown'
        await sendTelegram(`User churned: ${plan} plan`, 'info')
      } else if (eventType === 'checkout.session.completed') {
        const plan = (payload.plan as string | undefined) ?? 'unknown'
        await sendTelegram(`New paid user! ${plan} plan`, 'info')
      }

      await logAgentAction({
        agentName: 'basnet',
        triggerType: trigger,
        inputContext: { eventType },
        outcome: `stripe event handled: ${eventType}`,
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, received: true })
    }

    // ── TRIGGER: new_signup ────────────────────────────────────────────
    if (trigger === 'new_signup') {
      const payload = body.payload ?? {}
      const email = payload.email as string | undefined
      const source = (payload.source as string | undefined) ?? 'direct'

      await sendTelegram(`New signup: ${email ?? 'unknown'} (${source})`, 'info')

      await logAgentAction({
        agentName: 'basnet',
        triggerType: trigger,
        inputContext: { email, source },
        outcome: 'signup logged',
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, received: true })
    }

    return NextResponse.json({ success: false, error: `Unknown trigger: ${trigger}` })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'basnet' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendTelegram(`Basnet Head Agent error: ${msg}`, 'urgent').catch(() => {})
    return NextResponse.json({ success: false, error: msg })
  }
}
