import { createServiceClient } from '@/lib/supabase'
import { callClaude, readMasterContext, sendAlert, logSubAgent } from '@/lib/agents/utils'
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

export async function relayAnswer(question: string, mode?: 'voice' | 'text'): Promise<string> {
  const start = Date.now()
  const supabase = createServiceClient()

  const [master, recentR] = await Promise.allSettled([
    readMasterContext(),
    supabase.from('agent_conversations').select('question, answer')
      .order('created_at', { ascending: false }).limit(5),
  ])

  const masterCtx = master.status === 'fulfilled' ? master.value : ''
  const recentConvs = recentR.status === 'fulfilled' ? (recentR.value.data ?? []) as ConvRow[] : []
  const conversationContext = recentConvs.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')

  const systemPrompt = mode === 'voice'
    ? `${VOICE_PERSONALITY}\n\nFull context:\n${masterCtx}`
    : `${RELAY_IDENTITY}\n\nFull context:\n${masterCtx}`

  const userMessage = [
    conversationContext ? `Recent conversations:\n${conversationContext}` : '',
    `Question: ${question}`,
  ].filter(Boolean).join('\n\n')

  const raw = await callClaude({ systemPrompt, userMessage, maxTokens: mode === 'voice' ? 100 : 500 })
  const answer = applyPersonality(raw)

  await supabase.from('agent_conversations').insert({
    agent_name: 'relay',
    question,
    answer,
    context_used: { mode: mode ?? 'text' },
  })

  await logSubAgent('relay', 'answer', question.slice(0, 100), answer.slice(0, 200), Date.now() - start, true)
  return answer
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
