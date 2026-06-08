export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { readMasterContext, callClaude, logAgentAction, getStripeMetrics } from '@/lib/agents/utils'
import { BASNET_PERSONALITY, VOICE_CONSTRAINTS } from '@/lib/agents/personality'
import { runFlux } from '@/lib/agents/sub/flux'
import { runRelay } from '@/lib/agents/sub/relay'
import { liftScanForChurnRisk } from '@/lib/agents/sub/lift'
import { atlasResearch } from '@/lib/agents/sub/atlas'

type ConversationRow = {
  question: string
  answer: string
  created_at: string
}

type QuestionClass = 'ENGINEERING' | 'USER_HEALTH' | 'PRODUCT_TEST' | 'MARKET_INTEL' | 'CONTENT' | 'REVENUE' | 'LIFE' | 'GENERAL'

const KEYWORDS: Record<QuestionClass, string[]> = {
  ENGINEERING:   ['error', 'bug', 'build', 'stripe webhook', 'supabase', 'sentry', 'deploy', 'code', 'payg', 'test', 'rls', 'ssl', 'security'],
  USER_HEALTH:   ['user', 'churn', 'signup', 'retention', 'conversion', 'onboarding', 'free tier', 'upgrade', 'past due'],
  PRODUCT_TEST:  ['working', 'broken', 'check', 'invoice generation', 'calculation'],
  MARKET_INTEL:  ['competitor', 'xero', 'myob', 'market', 'news', 'ato update', 'law change', 'payday super update'],
  CONTENT:       ['tiktok', 'blog', 'post', 'content', 'what to write', 'this week', 'topic', 'hook', 'linkedin', 'facebook'],
  REVENUE:       ['mrr', 'revenue', 'churn', 'paid users', 'retention', 'upgrade', 'pricing'],
  LIFE:          ['visa', 'pr', 'university', 'goals', 'dream', 'north star', 'tired', 'overwhelmed', 'should i', 'what do i do'],
  GENERAL:       [],
}

function classify(question: string): QuestionClass {
  const q = question.toLowerCase()
  for (const cls of ['ENGINEERING', 'USER_HEALTH', 'PRODUCT_TEST', 'MARKET_INTEL', 'CONTENT', 'REVENUE', 'LIFE'] as const) {
    if (KEYWORDS[cls].some(k => q.includes(k))) return cls
  }
  return 'GENERAL'
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      secret?: string
      input?: string
      mode?: 'voice' | 'text'
    }

    if (body.secret !== process.env.AGENT_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const question = (body.input ?? '').trim()
    if (!question) {
      return NextResponse.json({ error: 'input is required' }, { status: 400 })
    }

    const mode = body.mode ?? 'text'
    const classification = classify(question)

    const [masterContext, recentConvs, stripeMetrics] = await Promise.all([
      readMasterContext(),
      (async () => {
        const supabase = createServiceClient()
        const { data } = await supabase.from('agent_conversations').select('question, answer, created_at')
          .order('created_at', { ascending: false }).limit(5)
        return (data ?? []) as ConversationRow[]
      })(),
      getStripeMetrics(),
    ])

    const conversationContext = recentConvs
      .map(c => `Q: ${c.question}\nA: ${c.answer}`)
      .join('\n\n')

    // Route to specialist sub-agent for richer context
    let subAgentContext = ''
    let agentUsed = 'basnet'

    if (classification === 'ENGINEERING') {
      const flux = await runFlux().catch(() => null)
      if (flux) {
        subAgentContext = `Engineering status: PAYG ${flux.paygPassing ? 'all passing' : 'FAILING'}, ${flux.unresolvedErrors} unresolved errors, deploy: ${flux.latestDeploymentStatus}`
        agentUsed = 'flux'
      }
    } else if (classification === 'USER_HEALTH' || classification === 'REVENUE') {
      const [relay, lift] = await Promise.all([runRelay().catch(() => null), liftScanForChurnRisk().catch(() => null)])
      subAgentContext = `Users: ${relay?.onboardingGaps ?? 0} onboarding gaps, ${relay?.paymentIssues ?? 0} payment issues. At-risk: ${lift?.totalAtRisk ?? 0}. MRR: $${stripeMetrics.mrr.toFixed(0)}`
      agentUsed = 'relay+lift'
    } else if (classification === 'MARKET_INTEL') {
      const intel = await atlasResearch(question).catch(() => null)
      if (intel) { subAgentContext = intel; agentUsed = 'atlas' }
    }

    const systemPrompt = mode === 'voice'
      ? `${BASNET_PERSONALITY}\n\n${VOICE_CONSTRAINTS}\n\nContext: ${masterContext.slice(0, 1500)}`
      : `${BASNET_PERSONALITY}\n\nContext: ${masterContext.slice(0, 2000)}`

    const userMessage = [
      subAgentContext ? `Live data: ${subAgentContext}` : '',
      conversationContext ? `Recent: ${conversationContext}` : '',
      `Question: ${question}`,
    ].filter(Boolean).join('\n\n')

    const response = await callClaude({
      systemPrompt,
      userMessage,
      maxTokens: mode === 'voice' ? 150 : 400,
    })

    const supabase = createServiceClient()
    await supabase.from('agent_conversations').insert({
      agent_name: agentUsed,
      question,
      answer: response,
      context_used: { mode, classification, hadSubAgentContext: !!subAgentContext },
    })

    await logAgentAction({
      agentName: 'voice',
      triggerType: mode,
      inputContext: { question, classification },
      decision: agentUsed,
      outcome: 'answered',
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ response, agentUsed, classification })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'voice' } })
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg })
  }
}
