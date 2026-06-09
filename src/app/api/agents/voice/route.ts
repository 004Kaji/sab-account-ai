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
type HistoryEntry = { q: string; a: string }

type QuestionClass = 'ENGINEERING' | 'USER_HEALTH' | 'MARKET_INTEL' | 'PERSONAL' | 'GENERAL'

const KEYWORDS: Record<QuestionClass, string[]> = {
  ENGINEERING:  ['error', 'bug', 'build', 'stripe webhook', 'supabase', 'sentry', 'deploy', 'code', 'payg', 'test', 'rls'],
  USER_HEALTH:  ['user', 'churn', 'signup', 'retention', 'mrr', 'revenue', 'paid users'],
  MARKET_INTEL: ['competitor', 'xero', 'myob', 'market', 'ato update', 'payday super'],
  PERSONAL:     ['visa', 'pr', 'university', 'goals', 'dream', 'north star', 'tired', 'overwhelmed', 'sub-agent', 'agent', 'what can you do', 'who are you', 'tell me about you', 'your name', 'job', 'jobs', 'work', 'employment', 'career', 'apply', 'resume', 'darwin', 'sydney', 'melbourne', 'brisbane', 'perth', 'find me', 'search for', 'look up', 'part time', 'full time', 'casual', 'study', 'assignment', 'weather', 'how much', 'price', 'cost', 'where'],
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

// ── Stateful response analyser ─────────────────────────────────────────

type ResponseMeta = {
  warning:        string | null
  topic:          string
  isComplete:     boolean
  nextSuggestion: string | null
}

async function analyseResponse(params: {
  question:     string
  answer:       string
  currentTopic: string | null
  masterContext: string
  history:      HistoryEntry[]
}): Promise<ResponseMeta> {
  const { question, answer, currentTopic, masterContext, history } = params

  const historyText = history.slice(-3).map(h => `Q: ${h.q}\nA: ${h.a}`).join('\n')

  try {
    const raw = await callClaude({
      systemPrompt: `You analyse voice conversations between Sanjog and his AI agent Basnet.
Sanjog is a Nepali international student in Australia on a student visa (subclass 500).
He can work max 48 hours per fortnight during semester. Any work over this risks his visa.
He works 14 hours/week on his SaaS SAB Account AI.
His north star: Permanent Residency → million dollar SaaS → financial independence.

Analyse the Q&A and return ONLY valid JSON with these fields:
- "warning": one sentence if the answer suggests something risky (visa breach, PR risk, financial risk, time overcommitment) — null if safe
- "topic": 3-4 words describing the current topic (e.g. "Darwin part-time jobs", "visa renewal", "SAB marketing")
- "is_complete": true if this topic feels resolved (answer was final, action was given, question answered fully)
- "next_suggestion": if is_complete is true, one sentence suggesting what to discuss next — null otherwise`,
      userMessage: `Current topic: ${currentTopic ?? 'none'}
Recent history:
${historyText}

Latest Q: ${question}
Latest A: ${answer}

Master context (abbreviated): ${masterContext.slice(0, 500)}

Return JSON only.`,
      maxTokens: 200,
      expectJson: true,
    })

    type MetaJSON = { warning?: string | null; topic?: string; is_complete?: boolean; next_suggestion?: string | null }
    const parsed = JSON.parse(raw) as MetaJSON
    return {
      warning:        parsed.warning ?? null,
      topic:          parsed.topic ?? currentTopic ?? 'general',
      isComplete:     parsed.is_complete ?? false,
      nextSuggestion: parsed.next_suggestion ?? null,
    }
  } catch {
    return { warning: null, topic: currentTopic ?? 'general', isComplete: false, nextSuggestion: null }
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      secret?:        string
      input?:         string
      mode?:          'voice' | 'text'
      history?:       HistoryEntry[]
      current_topic?: string | null
    }

    if (body.secret !== process.env.AGENT_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const question     = (body.input ?? '').trim()
    if (!question) return NextResponse.json({ error: 'input is required' }, { status: 400 })

    const mode         = body.mode ?? 'voice'
    const history      = (body.history ?? []).slice(-5)
    const currentTopic = body.current_topic ?? null
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

    // Merge session history (from client) with DB history
    const sessionCtx = history.map(h => `Q: ${h.q}\nA: ${h.a}`).join('\n\n')
    const dbCtx = recentR.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')
    const conversationContext = sessionCtx || dbCtx

    // Route to specialist sub-agent for richer context
    let subAgentContext = ''
    let agentUsed = 'basnet'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'
    const githubRepo = process.env.GITHUB_REPO ?? ''

    if (classification === 'PERSONAL') {
      const result = await relayAnswer(question, 'voice')
      const clean = stripMarkdown(applyPersonality(result.answer))

      // Risk + topic analysis for personal answers
      const meta = await analyseResponse({
        question, answer: clean, currentTopic, masterContext, history,
      })

      await logAgentAction({
        agentName: 'voice', triggerType: mode,
        inputContext: { question, classification },
        decision: 'relay', outcome: 'answered', durationMs: Date.now() - start,
      })

      return NextResponse.json({
        response: clean, agentUsed: 'relay', classification,
        url: result.url,
        warning:     meta.warning,
        topic:       meta.topic,
        is_complete: meta.isComplete,
        next_suggestion: meta.nextSuggestion,
      })
    }

    let actionUrl: string | undefined

    if (classification === 'ENGINEERING') {
      const flux = await runFlux().catch(() => null)
      if (flux) {
        subAgentContext = `PAYG: ${flux.payg.allPassing ? 'all passing' : 'FAILING'}, new errors: ${flux.sentry.newErrors.length}, status: ${flux.overall}`
        agentUsed = 'flux'
        actionUrl = githubRepo ? `https://github.com/${githubRepo}/issues` : `${appUrl}/dashboard/agent`
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
      actionUrl = `${appUrl}/dashboard/agent`
    } else if (classification === 'MARKET_INTEL') {
      const intel = await atlasResearch(question).catch(() => null)
      if (intel) {
        subAgentContext = intel
        agentUsed = 'atlas'
        // Extract first URL from atlas research if present
        const urlMatch = intel.match(/https?:\/\/[^\s)]+/)
        actionUrl = urlMatch ? urlMatch[0] : undefined
      }
    }

    const systemPrompt = `${VOICE_PERSONALITY}\n\nContext: ${masterContext.slice(0, 1500)}`
    const userMessage = [
      subAgentContext   ? `Live data: ${subAgentContext}` : '',
      conversationContext ? `Recent conversation:\n${conversationContext}` : '',
      currentTopic      ? `Current topic: ${currentTopic}` : '',
      `Question: ${question}`,
    ].filter(Boolean).join('\n\n')

    const raw = await callClaude({ systemPrompt, userMessage, maxTokens: 150 })

    const clean = stripMarkdown(applyPersonality(raw))
    const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const response = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 0 ? '.' : '')

    // Risk + topic analysis
    const meta = await analyseResponse({
      question, answer: response, currentTopic, masterContext, history,
    })

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

    return NextResponse.json({
      response, agentUsed, classification,
      url: actionUrl,
      warning:         meta.warning,
      topic:           meta.topic,
      is_complete:     meta.isComplete,
      next_suggestion: meta.nextSuggestion,
    })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'voice' } })
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg })
  }
}
