export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { readMasterContext, callClaude, logAgentAction, getStripeMetrics } from '@/lib/agents/utils'
import { VOICE_PERSONALITY, applyPersonality } from '@/lib/agents/personality'
import { runFlux } from '@/lib/agents/sub/flux'
import { relayAnswer } from '@/lib/agents/sub/relay'
import { liftScanForChurnRisk } from '@/lib/agents/sub/lift'
import { atlasResearch } from '@/lib/agents/sub/atlas'
import { sparkFindBusinessProspects } from '@/lib/agents/sub/spark'
import { getWorldState, getRecentSignals } from '@/lib/agents/world-state'

import { classifyQuestion } from '@/lib/agents/classification'
import { getSparkEmailStatus } from '@/lib/agents/utils'

type ConversationRow = { question: string; answer: string; created_at: string }
type HistoryEntry = { q: string; a: string }

// Map shared classes to voice route handling groups
function classify(question: string): 'PERSONAL' | 'MAC' | 'ENGINEERING' | 'USER_HEALTH' | 'MARKET_INTEL' | 'STRATEGY' | 'AGENT_STATUS' | 'GENERAL' {
  const cls = classifyQuestion(question)
  if (cls === 'MAC')                                   return 'MAC'
  if (cls === 'AGENT_STATUS')                          return 'AGENT_STATUS'
  if (cls === 'STRATEGY')                              return 'STRATEGY'
  if (cls === 'PERSONAL')                              return 'PERSONAL'
  if (cls === 'SAB_PRODUCT' || cls === 'QUALITY')      return 'ENGINEERING'
  if (cls === 'RETENTION')                             return 'USER_HEALTH'
  if (cls === 'MARKET')                                return 'MARKET_INTEL'
  return 'GENERAL'
}

// ── Fable 5 strategy synthesis ─────────────────────────────────────────
// Used only for STRATEGY questions — pulls all signals, reasons across them.

async function callFable5Strategy(systemPrompt: string, userMessage: string): Promise<string> {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model:      'claude-fable-5',
      max_tokens: 600,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('').trim()
    return text || ''
  } catch {
    // Fallback to Sonnet if Fable 5 unavailable
    return callClaude({ systemPrompt, userMessage, maxTokens: 600 })
  }
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

    if (classification === 'MAC' || classification === 'PERSONAL') {
      const result = await relayAnswer(question, classification === 'MAC' ? 'local' : 'voice')
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
        warning:         meta.warning,
        topic:           meta.topic,
        is_complete:     meta.isComplete && history.length >= 2,
        next_suggestion: meta.nextSuggestion,
      })
    }

    // ── AGENT_STATUS: check logs and answer "did you send/run X?" ────────
    if (classification === 'AGENT_STATUS') {
      const status = await getSparkEmailStatus()
      const response = stripMarkdown(applyPersonality(
        await callClaude({
          systemPrompt: `${VOICE_PERSONALITY}\nAnswer in 2 sentences max. Plain English, spoken out loud. Use the log data to give a direct factual answer.`,
          userMessage: `Log data: ${status}\n\nSanjog's question: ${question}`,
          maxTokens: 120,
        })
      ))
      await logAgentAction({
        agentName: 'voice', triggerType: mode,
        inputContext: { question, classification: 'AGENT_STATUS' },
        decision: 'spark_status', outcome: 'answered', durationMs: Date.now() - start,
      })
      return NextResponse.json({
        response, agentUsed: 'spark', classification,
        url: null, warning: null, topic: 'agent status',
        is_complete: true, next_suggestion: null,
      })
    }

    // ── STRATEGY: pull all signals, synthesise with Fable 5 ──────────────
    if (classification === 'STRATEGY') {
      const [stripe, ws, signals, liftR, fluxR] = await Promise.allSettled([
        getStripeMetrics(),
        getWorldState(),
        getRecentSignals(168),
        liftScanForChurnRisk().catch(() => null),
        runFlux().catch(() => null),
      ])

      const s   = stripe.status  === 'fulfilled' ? stripe.value  : null
      const w   = ws.status      === 'fulfilled' ? ws.value      : null
      const sig = signals.status === 'fulfilled' ? signals.value : []
      const l   = liftR.status   === 'fulfilled' ? liftR.value   : null
      const f   = fluxR.status   === 'fulfilled' ? fluxR.value   : null

      const atlasSignal = sig.find(s => s.from_agent === 'atlas' && s.signal_type === 'recommendation')
      const sparkSignal = sig.find(s => s.from_agent === 'spark')
      const liftSignal  = sig.find(s => s.from_agent === 'lift' && s.severity === 'urgent')

      const allContext = [
        s  ? `STRIPE: MRR $${s.mrr.toFixed(0)}, MRR change $${s.mrrChange >= 0 ? '+' : ''}${s.mrrChange.toFixed(0)}, churn this week ${s.churnThisWeek}` : '',
        w  ? `WORLD STATE: july1 countdown ${w.july1_countdown} days, churn risk score ${w.churn_risk_score}/10, signups today ${w.signups_today} vs baseline ${w.signups_baseline}` : '',
        l  ? `LIFT: ${l.totalAtRisk} users at churn risk` : '',
        f  ? `FLUX: ${f.overall}, PAYG ${f.payg.allPassing ? 'passing' : 'FAILING'}, ${f.sentry.newErrors.length} new errors` : '',
        atlasSignal ? `ATLAS BRIEF: ${atlasSignal.summary}` : '',
        sparkSignal ? `SPARK FOCUS: ${sparkSignal.summary}` : '',
        liftSignal  ? `LIFT ALERT: ${liftSignal.summary}` : '',
      ].filter(Boolean).join('\n')

      const historyText = history.slice(-3).map(h => `Q: ${h.q}\nA: ${h.a}`).join('\n')

      const strategyPrompt = `You are Basnet — Sanjog's sharp, direct co-founder AI for SAB Account AI.

STRATEGY MODE — Sanjog needs deep analysis, not a quick take. Before answering, work through this framework in your head:

STEP 1 — READ THE SITUATION: What does the live data actually say right now? MRR, churn, signups, errors. State the real position plainly.
STEP 2 — UNDERSTAND THE QUESTION: What is Sanjog really asking underneath the words? What fear or opportunity is driving this?
STEP 3 — CONSIDER THE OPTIONS: What are 2-3 real paths forward? For each one, what does it cost (time, money, risk) and what does it win?
STEP 4 — GIVE THE VERDICT: Based on the data and the options, what is the single clearest move right now and why?

Then write your response as natural spoken English that flows through all four steps — situation, what's really being asked, the options with honest trade-offs, and your verdict. Do not label the steps. Just speak it like a smart co-founder thinking out loud.

Output rules:
- Plain spoken English — no markdown, no lists, no headers, no bullet points
- Never start with "I" — lead with the situation or insight
- 8-12 sentences — enough to cover all four steps properly
- Use real numbers from the live data whenever available
- Be honest: if the data is bad, say so; if an option is risky, say that too
- End every response with one concrete action Sanjog can take today

Return ONLY valid JSON (no markdown fences):
- "response": your full spoken analysis (plain English, 8-12 sentences)
- "url": most relevant page or null:
  * https://sabaccountai.com/clients — clients or retention
  * https://sabaccountai.com/invoices — invoices or payments
  * https://sabaccountai.com/blog — content or marketing
  * https://sabaccountai.com/dashboard — metrics overview
  * https://sabaccountai.com/settings — billing or settings
  * https://sabaccountai.com/partners — accountant partners

Master context: ${masterContext.slice(0, 800)}`

      const strategyMessage = [
        `LIVE SIGNALS RIGHT NOW:\n${allContext}`,
        historyText ? `Recent conversation:\n${historyText}` : '',
        currentTopic ? `Current topic: ${currentTopic}` : '',
        `Sanjog's question: ${question}`,
      ].filter(Boolean).join('\n\n')

      const raw = await callFable5Strategy(strategyPrompt, strategyMessage)

      let response = ''
      let strategyUrl: string | null = null
      try {
        const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
        const parsed = JSON.parse(clean) as { response?: string; url?: string | null }
        response = stripMarkdown(applyPersonality(parsed.response ?? raw))
        strategyUrl = parsed.url ?? null
      } catch {
        response = stripMarkdown(applyPersonality(raw))
      }

      const supabase = createServiceClient()
      await supabase.from('agent_conversations').insert({
        agent_name: 'basnet',
        question,
        answer: response,
        context_used: { mode, classification: 'STRATEGY', signals: sig.length },
      })

      await logAgentAction({
        agentName: 'voice', triggerType: mode,
        inputContext: { question, classification: 'STRATEGY' },
        decision: 'fable5_strategy', outcome: 'answered', durationMs: Date.now() - start,
      })

      return NextResponse.json({
        response,
        agentUsed: 'basnet',
        classification: 'STRATEGY',
        url: strategyUrl,
        warning: null,
        topic: 'business strategy',
        is_complete: false,
        next_suggestion: null,
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
    } else if (/prospect|find.*lead|find.*customer|find.*prospect|outreach|cold email/i.test(question)) {
      // Fire prospect search in background — takes 30-60s, result arrives via email
      sparkFindBusinessProspects().catch(() => null)
      return NextResponse.json({
        response: "On it. Spark is searching for local Darwin businesses and drafting outreach emails right now. Check your Gmail in about a minute — you'll get a list of prospects with personalised Payday Super emails ready to copy and send.",
        agentUsed: 'spark',
        classification,
        url: undefined,
        warning: null,
        topic: 'prospect outreach',
        is_complete: true,
        next_suggestion: null,
      })
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

    const historyText = history.slice(-3).map(h => `Q: ${h.q}\nA: ${h.a}`).join('\n')

    const systemPrompt = `${VOICE_PERSONALITY}

Context: ${masterContext.slice(0, 1200)}

You must return ONLY valid JSON with these fields:
- "response": your spoken answer (2 sentences max, plain English, no markdown)
- "warning": one sentence if the answer involves visa risk, PR risk, or working over 48h/fortnight — null if safe
- "topic": 3-4 words for the current topic (e.g. "Darwin part-time jobs")
- "is_complete": true only if the topic is fully resolved AND at least 2 exchanges have happened — false otherwise
- "next_suggestion": if is_complete is true, one sentence on what to discuss next — null otherwise`

    const userMessage = [
      subAgentContext     ? `Live data: ${subAgentContext}` : '',
      historyText         ? `Recent conversation:\n${historyText}` : '',
      currentTopic        ? `Current topic: ${currentTopic}` : '',
      `Exchanges so far this topic: ${history.length}`,
      `Question: ${question}`,
    ].filter(Boolean).join('\n\n')

    const raw = await callClaude({ systemPrompt, userMessage, maxTokens: 250, expectJson: true })

    let response = ''
    let meta: ResponseMeta = { warning: null, topic: currentTopic ?? 'general', isComplete: false, nextSuggestion: null }

    try {
      type Combined = { response?: string; warning?: string | null; topic?: string; is_complete?: boolean; next_suggestion?: string | null }
      const parsed = JSON.parse(raw) as Combined
      response = stripMarkdown(applyPersonality(parsed.response ?? ''))
      meta = {
        warning:        parsed.warning ?? null,
        topic:          parsed.topic ?? currentTopic ?? 'general',
        isComplete:     (parsed.is_complete ?? false) && history.length >= 2,
        nextSuggestion: parsed.next_suggestion ?? null,
      }
    } catch {
      response = stripMarkdown(applyPersonality(raw))
    }

    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0)
    response = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 0 ? '.' : '')

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
