import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { tavilySearch } from '../mac-toolkit'
import type { AgentResult, ProgressFn } from './personal'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key)
}

export async function handleHealth(question: string, progress: ProgressFn, memoryContext?: string): Promise<AgentResult> {
  progress('LIFT', 'Connecting to Supabase...')
  const supabase = getSupabase()

  progress('LIFT', 'Querying user data...')
  const [totalR, paidR, recentR, activeR] = await Promise.allSettled([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('plan', 'free'),
    supabase.from('profiles').select('id, created_at, plan, email').order('created_at', { ascending: false }).limit(5),
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const total  = totalR.status === 'fulfilled'  ? (totalR.value.count ?? 0)  : 0
  const paid   = paidR.status === 'fulfilled'   ? (paidR.value.count ?? 0)   : 0
  const recent = recentR.status === 'fulfilled' ? (recentR.value.data ?? []) : []
  const active = activeR.status === 'fulfilled' ? (activeR.value.count ?? 0) : 0

  progress('LIFT', `${total} total, ${paid} paid, ${active} active this week. Scanning for signals...`)

  const healthContext = `Live user data:
- Total users: ${total}
- Paid users: ${paid}
- Free users: ${total - paid}
- Active this week: ${active}
- Conversion rate: ${total > 0 ? ((paid / total) * 100).toFixed(1) : 0}%
- Recent signups: ${recent.map((u: { email?: string; plan?: string }) => `${u.email ?? 'unknown'} (${u.plan ?? 'free'})`).join(', ') || 'none'}`

  // Web search for benchmarks, retention tactics, or engagement strategies
  let benchmarkContext = ''
  const q = question.toLowerCase()
  if (/benchmark|industry|average|typical|good|bad|compare|retention|churn|engage|convert|activate|onboard|strategy|improve/i.test(q)) {
    progress('LIFT', 'Searching SaaS growth strategies...')
    const searchQuery = /retention|churn|engage|activate|onboard/i.test(q)
      ? `SaaS user retention engagement onboarding small business accounting app 2026`
      : `SaaS conversion rate churn benchmark small business accounting 2026`
    const search = await tavilySearch(searchQuery, 3)
    if (search.answer) benchmarkContext = `\n\nIndustry context: ${search.answer}`
    else if (search.results.length) benchmarkContext = `\n\nContext:\n${search.results.slice(0,2).map(r => `- ${r.title}: ${r.content.slice(0,150)}`).join('\n')}`
  }

  progress('LIFT', 'Analysing health signals...')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: `You are Lift — Basnet's user health agent. VOICE interface.
Identify churn risk, conversion opportunities, and growth signals from real user data.
2-3 sentences MAX. Plain spoken English. No markdown.
Give one specific action based on the numbers.`,
    messages: [{
      role: 'user',
      content: [
        memoryContext ? `Memory + conversation:\n${memoryContext}\n\n` : '',
        `Question: ${question}\n\n${healthContext}${benchmarkContext}`,
      ].filter(Boolean).join(''),
    }],
  })

  progress('LIFT', 'Done.')
  const block = msg.content.find(b => b.type === 'text')

  const conversionRate = total > 0 ? (paid / total) * 100 : 0
  const suggestion = conversionRate < 5
    ? `Conversion is at ${conversionRate.toFixed(1)}%. Want me to identify which free users are most likely to convert?`
    : paid === 0
      ? 'No paid users yet. Want me to check which free users have been most active?'
      : `You have ${paid} paid user${paid !== 1 ? 's' : ''}. Want me to check for any churn signals?`

  return {
    answer: block?.type === 'text' ? block.text : 'No response',
    webSearchUsed: !!benchmarkContext,
    suggestion,
    nextAction: 'identify_churn',
  }
}
