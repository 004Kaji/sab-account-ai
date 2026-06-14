export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { readMasterContext, callClaude, logAgentAction, getStripeMetrics } from '@/lib/agents/utils'
import { VOICE_PERSONALITY, applyPersonality } from '@/lib/agents/personality'
import { relayAnswer } from '@/lib/agents/sub/relay'
import { liftScanForChurnRisk } from '@/lib/agents/sub/lift'
import { atlasResearch } from '@/lib/agents/sub/atlas'
import { sparkFindBusinessProspects } from '@/lib/agents/sub/spark'
import { getWorldState, getRecentSignals } from '@/lib/agents/world-state'
import { classifyQuestion } from '@/lib/agents/classification'
import { getSparkEmailStatus } from '@/lib/agents/utils'

type ConversationRow = { question: string; answer: string; created_at: string }
type HistoryEntry    = { q: string; a: string }

// ── Classification ────────────────────────────────────────────────────

type VoiceClass = 'PERSONAL' | 'MAC' | 'ENGINEERING' | 'USER_HEALTH' | 'MARKET_INTEL' | 'STRATEGY' | 'AGENT_STATUS' | 'GENERAL'

function classify(question: string): VoiceClass {
  const cls = classifyQuestion(question)
  if (cls === 'MAC')                               return 'MAC'
  if (cls === 'AGENT_STATUS')                      return 'AGENT_STATUS'
  if (cls === 'STRATEGY')                          return 'STRATEGY'
  if (cls === 'PERSONAL')                          return 'PERSONAL'
  if (cls === 'SAB_PRODUCT' || cls === 'QUALITY')  return 'ENGINEERING'
  if (cls === 'RETENTION')                         return 'USER_HEALTH'
  if (cls === 'MARKET')                            return 'MARKET_INTEL'
  return 'GENERAL'
}

// ── Multi-task detection ──────────────────────────────────────────────
// Detect compound questions like "check code AND write blog post"
// Returns array of sub-questions if compound, else [question]

function splitTasks(question: string): string[] {
  const q = question.toLowerCase()

  // Explicit task connectors
  const parts = question
    .split(/\band\s+(?:also\s+)?(?:then\s+)?(?:can you\s+)?(?:please\s+)?/i)
    .map(s => s.trim())
    .filter(s => s.length > 8)

  if (parts.length < 2) return [question]

  // Only split if each part has a clear action verb
  const ACTION_VERBS = /\b(check|write|send|draft|run|scan|find|fix|commit|deploy|review|generate|list|show|tell|get|read|delete|open)\b/i
  const allHaveVerbs = parts.every(p => ACTION_VERBS.test(p))
  return allHaveVerbs ? parts : [question]
}

// ── Fable 5 strategy ──────────────────────────────────────────────────

async function callFable5Strategy(systemPrompt: string, userMessage: string): Promise<string> {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model:      'claude-fable-5',
      max_tokens: 700,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })
    return res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('').trim() || ''
  } catch {
    return callClaude({ systemPrompt, userMessage, maxTokens: 700 })
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

// ── Single-question handler ───────────────────────────────────────────
// Returns { response, agentUsed, url, warning, topic }

async function handleSingleQuestion(params: {
  question:     string
  history:      HistoryEntry[]
  currentTopic: string | null
  masterContext: string
  stripeMetrics: Awaited<ReturnType<typeof getStripeMetrics>> | null
  appUrl:        string
  githubRepo:    string
}): Promise<{ response: string; agentUsed: string; url?: string; warning: string | null; topic: string; isComplete: boolean }> {

  const { question, history, currentTopic, masterContext, stripeMetrics, appUrl, githubRepo } = params
  const classification = classify(question)
  const historyText    = history.slice(-10).map(h => `Q: ${h.q}\nA: ${h.a}`).join('\n')
  // Use 2500 chars of master context — enough to include pricing, agents, status
  const ctx            = masterContext.slice(0, 2500)

  // ── MAC / PERSONAL ─────────────────────────────────────────────────
  if (classification === 'MAC' || classification === 'PERSONAL') {
    const result = await relayAnswer(question, classification === 'MAC' ? 'local' : 'voice')
    return {
      response:  stripMarkdown(applyPersonality(result.answer)),
      agentUsed: 'relay',
      url:       result.url,
      warning:   null,
      topic:     currentTopic ?? 'personal',
      isComplete: false,
    }
  }

  // ── AGENT_STATUS ───────────────────────────────────────────────────
  if (classification === 'AGENT_STATUS') {
    const status   = await getSparkEmailStatus()
    const response = stripMarkdown(applyPersonality(await callClaude({
      systemPrompt: `${VOICE_PERSONALITY}\nUse the log data to give a specific factual answer. Reference actual numbers and names from the logs.`,
      userMessage:  `Log data:\n${status}\n\nConversation history:\n${historyText}\n\nQuestion: ${question}`,
      maxTokens:    350,
    })))
    return { response, agentUsed: 'spark', warning: null, topic: 'agent status', isComplete: true }
  }

  // ── STRATEGY ───────────────────────────────────────────────────────
  if (classification === 'STRATEGY') {
    // Pull signals and metrics in parallel — skip runFlux (too slow for voice)
    const [sm, ws, signals, liftR] = await Promise.allSettled([
      stripeMetrics ? Promise.resolve(stripeMetrics) : getStripeMetrics(),
      getWorldState(),
      getRecentSignals(168),
      liftScanForChurnRisk().catch(() => null),
    ])

    const s   = sm.status      === 'fulfilled' ? sm.value      : null
    const w   = ws.status      === 'fulfilled' ? ws.value      : null
    const sig = signals.status === 'fulfilled' ? signals.value : []
    const l   = liftR.status   === 'fulfilled' ? liftR.value   : null

    const atlasSignal = sig.find(s => s.from_agent === 'atlas' && s.signal_type === 'recommendation')
    const sparkSignal = sig.find(s => s.from_agent === 'spark')
    const liftSignal  = sig.find(s => s.from_agent === 'lift'  && s.severity === 'urgent')

    const liveData = [
      s  ? `MRR $${s.mrr.toFixed(0)}, change $${s.mrrChange >= 0 ? '+' : ''}${s.mrrChange.toFixed(0)} this week, churn ${s.churnThisWeek}` : '',
      w  ? `World state: ${w.july1_countdown} days to July 1, churn risk ${w.churn_risk_score}/10, signups today ${w.signups_today} vs baseline ${w.signups_baseline}` : '',
      l  ? `Lift: ${l.totalAtRisk} users at churn risk, ${l.upgradeSignals} near upgrade` : '',
      atlasSignal ? `Atlas: ${atlasSignal.summary}` : '',
      sparkSignal ? `Spark: ${sparkSignal.summary}` : '',
      liftSignal  ? `Lift alert: ${liftSignal.summary}` : '',
    ].filter(Boolean).join('\n')

    const strategyPrompt = `You are Basnet — Sanjog's direct co-founder AI.

STRATEGY MODE. Work through this before answering:
1. What does the live data say right now?
2. What is Sanjog really asking underneath the words?
3. What are 2-3 real paths with honest trade-offs?
4. What is the single clearest move right now?

Speak it as natural flowing English — like a smart co-founder thinking out loud.
No labels, no bullet points, no markdown. 8-12 sentences. End with one concrete action for today.
Use real numbers. Be honest about bad data.

Return ONLY valid JSON (no fences):
- "response": your full spoken analysis
- "url": most relevant URL or null (options: /clients, /invoices, /blog, /dashboard, /settings, /partners — full URL with https://sabaccountai.com prefix)

Master context: ${ctx}`

    const raw = await callFable5Strategy(strategyPrompt, [
      liveData    ? `Live data:\n${liveData}` : '',
      historyText ? `Conversation history:\n${historyText}` : '',
      currentTopic ? `Current topic: ${currentTopic}` : '',
      `Question: ${question}`,
    ].filter(Boolean).join('\n\n'))

    let response = raw
    let url: string | null = null
    try {
      const clean  = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      const parsed = JSON.parse(clean) as { response?: string; url?: string | null }
      response = parsed.response ?? raw
      url      = parsed.url ?? null
    } catch { /* use raw */ }

    return {
      response:  stripMarkdown(applyPersonality(response)),
      agentUsed: 'basnet',
      url:       url ?? undefined,
      warning:   null,
      topic:     'business strategy',
      isComplete: false,
    }
  }

  // ── Specialist sub-agent context ──────────────────────────────────
  let subAgentContext = ''
  let agentUsed       = 'basnet'
  let actionUrl: string | undefined

  if (classification === 'ENGINEERING') {
    // Fast check only — no TypeScript compilation in voice path
    const supabase = createServiceClient()
    const { data: recentErrors } = await supabase
      .from('agent_logs')
      .select('outcome, created_at')
      .eq('agent_name', 'flux')
      .order('created_at', { ascending: false })
      .limit(1)
    subAgentContext = recentErrors?.[0]
      ? `Last Flux run: ${recentErrors[0].outcome}`
      : 'No recent Flux run data'
    agentUsed  = 'flux'
    actionUrl  = githubRepo ? `https://github.com/${githubRepo}/issues` : `${appUrl}/dashboard/agent`

  } else if (classification === 'USER_HEALTH') {
    const supabase = createServiceClient()
    const [lift, totalR, paidR] = await Promise.all([
      liftScanForChurnRisk().catch(() => null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('plan', 'free'),
    ])
    const sm = stripeMetrics ?? { mrr: 0 }
    subAgentContext = `Total users: ${totalR.count ?? 0}. Paid: ${paidR.count ?? 0}. At-risk: ${lift?.totalAtRisk ?? 0}. MRR: $${sm.mrr.toFixed(0)}`
    agentUsed  = 'lift'
    actionUrl  = `${appUrl}/dashboard/agent`

  } else if (/prospect|find.*lead|find.*customer|find.*prospect|outreach|cold email/i.test(question)) {
    sparkFindBusinessProspects().catch(() => null)
    return {
      response:   'On it — Spark is searching for local Darwin businesses now. Check Gmail in about a minute for prospects with personalised Payday Super emails.',
      agentUsed:  'spark',
      warning:    null,
      topic:      'prospect outreach',
      isComplete: true,
    }

  } else if (classification === 'MARKET_INTEL') {
    const intel = await atlasResearch(question).catch(() => null)
    if (intel) {
      subAgentContext = intel
      agentUsed       = 'atlas'
      const urlMatch  = intel.match(/https?:\/\/[^\s)]+/)
      actionUrl       = urlMatch ? urlMatch[0] : undefined
    }
  }

  // ── Main Claude call ──────────────────────────────────────────────
  const systemPrompt = `${VOICE_PERSONALITY}

Context (your knowledge base for this conversation):
${ctx}

Return ONLY valid JSON with these fields:
- "response": your answer in natural spoken English. Match length to complexity — 2-3 sentences for simple facts, 4-6 for complex questions. If the question is ambiguous or missing a key detail, ask ONE specific clarifying question. Reference earlier conversation where relevant. Never repeat the question back.
- "warning": one sentence if this touches visa risk, PR risk, or working over 48h/fortnight — null if safe
- "topic": 3-4 words describing the current topic
- "is_complete": true if the topic is fully resolved, false if follow-up is likely
- "next_suggestion": if is_complete is true, one natural sentence on what to talk about next — null otherwise`

  const userMessage = [
    subAgentContext ? `Live data:\n${subAgentContext}` : '',
    historyText     ? `Conversation history:\n${historyText}` : '',
    currentTopic    ? `Current topic: ${currentTopic}` : '',
    `Question: ${question}`,
  ].filter(Boolean).join('\n\n')

  const raw = await callClaude({ systemPrompt, userMessage, maxTokens: 600, expectJson: true })

  let response = raw
  let warning: string | null = null
  let topic = currentTopic ?? 'general'
  let isComplete = false

  try {
    type R = { response?: string; warning?: string | null; topic?: string; is_complete?: boolean; next_suggestion?: string | null }
    const parsed = JSON.parse(raw) as R
    response   = stripMarkdown(applyPersonality(parsed.response ?? raw))
    warning    = parsed.warning ?? null
    topic      = parsed.topic ?? topic
    isComplete = parsed.is_complete ?? false
  } catch {
    response = stripMarkdown(applyPersonality(raw))
  }

  return { response, agentUsed, url: actionUrl, warning, topic, isComplete }
}

// ── Main handler ──────────────────────────────────────────────────────

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
    const history      = (body.history ?? []).slice(-10)
    const currentTopic = body.current_topic ?? null

    // Only fetch stripeMetrics when needed (not for every GENERAL question)
    const needsStripe = /revenue|mrr|churn|paid user|user|stripe|subscription|money|income/i.test(question)
    const [masterContext, recentR, stripeMetrics] = await Promise.all([
      readMasterContext(),
      (async () => {
        const supabase = createServiceClient()
        const { data } = await supabase.from('agent_conversations')
          .select('question, answer, created_at')
          .order('created_at', { ascending: false }).limit(5)
        return (data ?? []) as ConversationRow[]
      })(),
      needsStripe ? getStripeMetrics() : Promise.resolve(null),
    ])

    // Session history takes priority over DB history
    const sessionCtx = history.map(h => `Q: ${h.q}\nA: ${h.a}`).join('\n\n')
    const dbCtx      = recentR.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')
    void dbCtx // dbCtx available for future use; session history preferred

    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'
    const githubRepo = process.env.GITHUB_REPO ?? ''

    // ── Multi-task detection ─────────────────────────────────────────
    const tasks = splitTasks(question)

    if (tasks.length > 1) {
      // Run each sub-task in parallel
      const results = await Promise.allSettled(
        tasks.map(task => handleSingleQuestion({
          question:     task,
          history,
          currentTopic,
          masterContext,
          stripeMetrics,
          appUrl,
          githubRepo,
        }))
      )

      const parts: string[] = []
      let   agentsUsed: string[] = []

      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          parts.push(`${i + 1}. ${r.value.response}`)
          agentsUsed.push(r.value.agentUsed)
        }
      })

      const combined = parts.join('\n\n')
      const supabase = createServiceClient()
      await supabase.from('agent_conversations').insert({
        agent_name: 'basnet', question, answer: combined,
        context_used: { mode, classification: 'MULTI_TASK', tasks },
      })

      return NextResponse.json({
        response:        combined,
        agentUsed:       [...new Set(agentsUsed)].join('+'),
        classification:  'MULTI_TASK',
        url:             null,
        warning:         null,
        topic:           currentTopic ?? 'multiple tasks',
        is_complete:     false,
        next_suggestion: null,
      })
    }

    // ── Single question ──────────────────────────────────────────────
    const result = await handleSingleQuestion({
      question, history, currentTopic, masterContext, stripeMetrics, appUrl, githubRepo,
    })

    const supabase = createServiceClient()
    await supabase.from('agent_conversations').insert({
      agent_name: result.agentUsed, question, answer: result.response,
      context_used: { mode, classification: classify(question) },
    })

    await logAgentAction({
      agentName: 'voice', triggerType: mode,
      inputContext: { question, classification: classify(question) },
      decision: result.agentUsed, outcome: 'answered', durationMs: Date.now() - start,
    })

    return NextResponse.json({
      response:        result.response,
      agentUsed:       result.agentUsed,
      classification:  classify(question),
      url:             result.url,
      warning:         result.warning,
      topic:           result.topic,
      is_complete:     result.isComplete,
      next_suggestion: null,
    })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'voice' } })
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg })
  }
}
