export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { readMasterContext, callClaude, logAgentAction, getStripeMetrics } from '@/lib/agents/utils'
import { VOICE_PERSONALITY, applyPersonality } from '@/lib/agents/personality'
import { runFlux } from '@/lib/agents/sub/flux'
import { relayAnswer } from '@/lib/agents/sub/relay'
import { liftScanForChurnRisk } from '@/lib/agents/sub/lift'
import { atlasResearch } from '@/lib/agents/sub/atlas'

type ConversationRow = { question: string; answer: string; created_at: string }

type QuestionClass = 'ENGINEERING' | 'USER_HEALTH' | 'MARKET_INTEL' | 'PERSONAL' | 'GENERAL'

const KEYWORDS: Record<QuestionClass, string[]> = {
  ENGINEERING:  ['error', 'bug', 'build', 'stripe webhook', 'supabase', 'sentry', 'deploy', 'code', 'payg', 'test', 'rls'],
  USER_HEALTH:  ['user', 'churn', 'signup', 'retention', 'mrr', 'revenue', 'paid users'],
  MARKET_INTEL: ['competitor', 'xero', 'myob', 'market', 'ato update', 'payday super'],
  PERSONAL:     ['visa', 'pr', 'university', 'goals', 'dream', 'north star', 'tired', 'overwhelmed'],
  GENERAL:      [],
}

function classify(question: string): QuestionClass {
  const q = question.toLowerCase()
  for (const cls of ['ENGINEERING', 'USER_HEALTH', 'MARKET_INTEL', 'PERSONAL'] as const) {
    if (KEYWORDS[cls].some(k => q.includes(k))) return cls
  }
  return 'GENERAL'
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .trim()
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      secret?: string
      input?:  string
      mode?:   'voice' | 'text'
    }

    if (body.secret !== process.env.AGENT_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const question = (body.input ?? '').trim()
    if (!question) return NextResponse.json({ error: 'input is required' }, { status: 400 })

    const mode           = body.mode ?? 'voice'
    const classification = classify(question)

    const [masterContext, recentR, stripeMetrics] = await Promise.all([
      readMasterContext(),
      (async () => {
        const supabase = createServiceClient()
        const { data } = await supabase.from('agent_conversations').select('question, answer, created_at')
          .order('created_at', { ascending: false }).limit(5)
        return (data ?? []) as ConversationRow[]
      })(),
      getStripeMetrics(),
    ])

    const conversationContext = recentR.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')

    // Route to specialist sub-agent for richer context
    let subAgentContext = ''
    let agentUsed = 'basnet'

    if (classification === 'PERSONAL') {
      // Relay handles personal questions natively
      const answer = await relayAnswer(question, 'voice')
      const clean = stripMarkdown(applyPersonality(answer))

      await logAgentAction({
        agentName: 'voice', triggerType: mode,
        inputContext: { question, classification },
        decision: 'relay', outcome: 'answered', durationMs: Date.now() - start,
      })

      return NextResponse.json({ response: clean, agentUsed: 'relay', classification })
    }

    if (classification === 'ENGINEERING') {
      const flux = await runFlux().catch(() => null)
      if (flux) {
        subAgentContext = `PAYG: ${flux.payg.allPassing ? 'all passing' : 'FAILING'}, new errors: ${flux.sentry.newErrors.length}, status: ${flux.overall}`
        agentUsed = 'flux'
      }
    } else if (classification === 'USER_HEALTH') {
      const supabase = createServiceClient()
      const [lift, totalR, paidR] = await Promise.all([
        liftScanForChurnRisk().catch(() => null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('plan', 'free'),
      ])
      subAgentContext = `Total users: ${totalR.count ?? 0}. Paid users: ${paidR.count ?? 0}. At-risk: ${lift?.totalAtRisk ?? 0}. MRR: $${stripeMetrics.mrr.toFixed(0)}`
      agentUsed = 'lift'
    } else if (classification === 'MARKET_INTEL') {
      const intel = await atlasResearch(question).catch(() => null)
      if (intel) { subAgentContext = intel; agentUsed = 'atlas' }
    }

    const systemPrompt = `${VOICE_PERSONALITY}\n\nContext: ${masterContext.slice(0, 1500)}`
    const userMessage = [
      subAgentContext ? `Live data: ${subAgentContext}` : '',
      conversationContext ? `Recent: ${conversationContext}` : '',
      `Question: ${question}`,
    ].filter(Boolean).join('\n\n')

    const raw = await callClaude({ systemPrompt, userMessage, maxTokens: 120 })

    // Enforce voice constraints
    const clean = stripMarkdown(applyPersonality(raw))
    const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const response = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 0 ? '.' : '')

    const supabase = createServiceClient()
    await supabase.from('agent_conversations').insert({
      agent_name: agentUsed,
      question,
      answer: response,
      context_used: { mode, classification, hadSubAgentContext: !!subAgentContext },
    })

    await logAgentAction({
      agentName: 'voice', triggerType: mode,
      inputContext: { question, classification },
      decision: agentUsed, outcome: 'answered', durationMs: Date.now() - start,
    })

    return NextResponse.json({ response, agentUsed, classification })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'voice' } })
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg })
  }
}
