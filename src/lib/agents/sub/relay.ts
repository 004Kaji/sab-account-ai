import { createServiceClient } from '@/lib/supabase'
import { callClaude, readMasterContext, sendAlert, logSubAgent, tavilySearch } from '@/lib/agents/toolkits/personal-toolkit'
import { BASNET_PERSONALITY, VOICE_PERSONALITY, applyPersonality } from '@/lib/agents/personality'

export const RELAY_IDENTITY = `
${BASNET_PERSONALITY}
You are Relay, Basnet's personal ops sub-agent.
Job: answer questions, track goals, monitor visa,
manage day-to-day life tasks.
You read SANJOG_MASTER.md for all context.
Never give advice that risks the student visa.
Always flag PR pathway implications.

CRITICAL — AGENT SYSTEM FACTS (do not contradict these):
All 6 sub-agents are ALREADY BUILT AND LIVE IN PRODUCTION at sabaccountai.com.
They are NOT planned. They are NOT coming soon. They are running RIGHT NOW.
- Flux: live — checks PAYG and engineering health every 5 minutes
- Scout: live — tests the product daily at 2am AEST
- Spark: live — generates content briefs and sends accountant emails
- Atlas: live — searches the web for market intel every Monday
- Lift: live — scans for at-risk users daily at 3am AEST
- Relay: live — that is you, answering this question right now
When asked about agents, confirm they exist and describe what they do.
`

type ConvRow = { question: string; answer: string }

// ── Local Mac agent (optional — degrades gracefully if offline) ────────

async function callLocalAgent(question: string): Promise<string | null> {
  const localUrl = process.env.LOCAL_AGENT_URL
  const secret = process.env.AGENT_WEBHOOK_SECRET
  if (!localUrl) return null

  try {
    const res = await fetch(`${localUrl}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-agent-secret': secret } : {}),
      },
      body: JSON.stringify({ question }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { answer?: string }
    return data.answer ?? null
  } catch {
    return null
  }
}

// Topics that should use the local Mac agent
const MAC_QUERY_TRIGGERS = [
  'memory', 'ram', 'disk', 'storage', 'space', 'cpu', 'battery',
  'process', 'running app', 'system', 'computer', 'my mac', 'mac memory',
  'slow', 'performance', 'uptime', 'hard drive', 'ssd',
]

function isMacQuery(question: string): boolean {
  const q = question.toLowerCase()
  return MAC_QUERY_TRIGGERS.some(t => q.includes(t))
}

// Topics that warrant a live web search before answering
const WEB_SEARCH_TRIGGERS = [
  'visa', 'immigration', '485', '500', 'subclass', 'pr pathway', 'migration',
  'uni', 'university', 'course', 'assignment', 'exam', 'semester',
  'ato', 'tax', 'payg', 'super', 'bas', 'deadline',
  'news', 'update', 'latest', 'current', 'today', 'this year',
  'job', 'jobs', 'work', 'employment', 'career', 'apply', 'resume', 'hire', 'hiring',
  'salary', 'wage', 'part time', 'full time', 'casual', 'internship',
  'darwin', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide',
  'find', 'search for', 'look up', 'what is', 'how much', 'where',
  'weather', 'price', 'cost', 'rate', 'how to',
]

function needsWebSearch(question: string): boolean {
  const q = question.toLowerCase()
  return WEB_SEARCH_TRIGGERS.some(t => q.includes(t))
}

export interface RelayResult {
  answer: string
  url?: string
}

export async function relayAnswer(question: string, mode?: 'voice' | 'text' | 'local'): Promise<RelayResult> {
  const start = Date.now()
  const supabase = createServiceClient()

  // Try local Mac agent for:
  // - explicit local mode
  // - text mode (any question)
  // - voice mode if it's a Mac/system query (these MUST use real system data)
  const shouldUseLocal = process.env.LOCAL_AGENT_URL && (
    mode === 'local' ||
    mode !== 'voice' ||
    isMacQuery(question)
  )
  if (shouldUseLocal) {
    const localAnswer = await callLocalAgent(question)
    if (localAnswer) {
      await supabase.from('agent_conversations').insert({
        agent_name: 'relay',
        question,
        answer: localAnswer,
        context_used: { mode: mode ?? 'local', source: 'mac-agent' },
      })
      await logSubAgent('relay', 'answer_local', question.slice(0, 100), localAnswer.slice(0, 200), Date.now() - start, true)
      return { answer: localAnswer }
    }
  }

  const [master, recentR] = await Promise.allSettled([
    readMasterContext(),
    supabase.from('agent_conversations').select('question, answer')
      .order('created_at', { ascending: false }).limit(5),
  ])

  const masterCtx = master.status === 'fulfilled' ? master.value : ''
  const recentConvs = recentR.status === 'fulfilled' ? (recentR.value.data ?? []) as ConvRow[] : []
  const conversationContext = recentConvs.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')

  // Web search for questions that need current information
  let webContext = ''
  let topUrl: string | undefined
  if (needsWebSearch(question)) {
    const searchQuery = `${question} Australia 2026`
    const results = await tavilySearch(searchQuery, { maxResults: 3, includeAnswer: true })
    if (results.results.length > 0) topUrl = results.results[0].url
    if (results.answer) {
      webContext = `\n\nLive web search results for "${searchQuery}":\n${results.answer}`
    } else if (results.results.length > 0) {
      webContext = `\n\nLive web search results:\n${results.results.slice(0, 2).map(r => `- ${r.title}: ${r.content.slice(0, 200)}`).join('\n')}`
    }
  }

  const hasWebResults = webContext.length > 0

  const systemPrompt = mode === 'voice'
    ? hasWebResults
      ? `${VOICE_PERSONALITY}

IMPORTANT — you have live web search results below. Report what you actually found. Name real job titles, companies, or sites. Do NOT say "check your email" or "I am searching". Give the actual findings in 2-3 sentences.

Full context:\n${masterCtx}${webContext}`
      : `${VOICE_PERSONALITY}\n\nFull context:\n${masterCtx}`
    : `${RELAY_IDENTITY}\n\nFull context:\n${masterCtx}${webContext}`

  const userMessage = [
    conversationContext ? `Recent conversations:\n${conversationContext}` : '',
    `Question: ${question}`,
  ].filter(Boolean).join('\n\n')

  const raw = await callClaude({ systemPrompt, userMessage, maxTokens: mode === 'voice' && hasWebResults ? 200 : mode === 'voice' ? 100 : 500 })
  const answer = applyPersonality(raw)

  await supabase.from('agent_conversations').insert({
    agent_name: 'relay',
    question,
    answer,
    context_used: { mode: mode ?? 'text', webSearchUsed: hasWebResults, topUrl },
  })

  await logSubAgent('relay', 'answer', question.slice(0, 100), answer.slice(0, 200), Date.now() - start, true)
  return { answer, url: topUrl }
}

function parseDateFromMaster(content: string, pattern: RegExp): string | null {
  const m = content.match(pattern)
  return m ? m[1] : null
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function daysSince(dateStr: string): number {
  return Math.ceil((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export async function relayVisaCheck(): Promise<{
  daysUntilExpiry:   number
  urgency:           'ok' | 'warning' | 'urgent'
  daysSinceMigAgent: number
  recommendation:    string
}> {
  const content = await readMasterContext()

  const visaDate = parseDateFromMaster(content, /Visa expiry[^:]*:\s*\[?(\d{4}-\d{2}-\d{2})/i)
  const migDate  = parseDateFromMaster(content, /last consultation date[^:]*:\s*(\d{4}-\d{2}-\d{2})/i)

  const daysUntilExpiry   = visaDate ? daysUntil(visaDate) : 999
  const daysSinceMigAgent = migDate  ? daysSince(migDate)  : 0

  let urgency: 'ok' | 'warning' | 'urgent' = 'ok'
  if (daysUntilExpiry < 90)  urgency = 'urgent'
  else if (daysUntilExpiry < 180) urgency = 'warning'

  const recommendation = urgency === 'urgent'
    ? `Visa expires in ${daysUntilExpiry} days. Contact migration agent NOW.`
    : urgency === 'warning'
      ? `Visa expires in ${daysUntilExpiry} days. Start renewal prep.`
      : `Visa OK — ${daysUntilExpiry} days remaining.`

  if (urgency === 'urgent') {
    await sendAlert(
      `Visa expiry — ${daysUntilExpiry} days`,
      `Visa expires ${visaDate}. ${daysUntilExpiry} days left. Contact migration agent immediately.`,
      'urgent', 'relay',
    )
  }

  return { daysUntilExpiry, urgency, daysSinceMigAgent, recommendation }
}

export async function relayGoalCheck(): Promise<string> {
  const supabase = createServiceClient()

  const [masterR, profilesR] = await Promise.allSettled([
    readMasterContext(),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const master = masterR.status === 'fulfilled' ? masterR.value : ''
  const userCount = profilesR.status === 'fulfilled' ? (profilesR.value.count ?? 0) : 0

  const assessment = await callClaude({
    systemPrompt: `${RELAY_IDENTITY}\n\nContext: ${master.slice(0, 2000)}`,
    userMessage: `Compare current state vs north star goals. Is Sanjog on track?
Current users: ${userCount}.
One honest paragraph. Specific numbers only. No fluff.`,
    maxTokens: 300,
  })

  return applyPersonality(assessment)
}
