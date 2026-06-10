import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { AgentResult, ProgressFn } from './personal'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key)
}

export async function handleHealth(question: string, progress: ProgressFn): Promise<AgentResult> {
  progress('LIFT', 'Connecting to Supabase...')
  const supabase = getSupabase()

  progress('LIFT', 'Querying user data...')
  const [totalR, paidR, recentR] = await Promise.allSettled([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('plan', 'free'),
    supabase.from('profiles').select('id, created_at, plan, email').order('created_at', { ascending: false }).limit(5),
  ])

  const total  = totalR.status === 'fulfilled'  ? (totalR.value.count ?? 0)  : 0
  const paid   = paidR.status === 'fulfilled'   ? (paidR.value.count ?? 0)   : 0
  const recent = recentR.status === 'fulfilled' ? (recentR.value.data ?? []) : []

  progress('LIFT', `Found ${total} total users, ${paid} paid. Scanning for churn risk...`)

  const healthContext = `Live user data:
- Total users: ${total}
- Paid users: ${paid}
- Free users: ${total - paid}
- Conversion rate: ${total > 0 ? ((paid / total) * 100).toFixed(1) : 0}%
- Recent signups: ${recent.map((u: { email?: string; plan?: string }) => `${u.email ?? 'unknown'} (${u.plan ?? 'free'})`).join(', ') || 'none'}`

  progress('LIFT', 'Analysing health signals...')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: `You are Lift — Basnet's user health agent.
Identify churn risk, conversion opportunities, and growth signals from real user data.
Give one specific action based on the numbers. No preamble.`,
    messages: [{ role: 'user', content: `Question: ${question}\n\n${healthContext}` }],
  })

  progress('LIFT', 'Done.')
  const block = msg.content.find(b => b.type === 'text')
  return { answer: block?.type === 'text' ? block.text : 'No response', webSearchUsed: false }
}
