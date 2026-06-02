export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/ratelimit'
import { getProfile } from '@/lib/profile-cache'

const INCOME_CATEGORIES  = ['Consulting', 'Labour', 'Materials & Goods', 'Retainer', 'Rental Income', 'Other Income']
const EXPENSE_CATEGORIES = ['Motor Vehicle', 'Office Supplies', 'Software & Subscriptions', 'Equipment', 'Travel', 'Meals & Entertainment', 'Insurance', 'Marketing', 'Rent & Utilities', 'Professional Services', 'Materials', 'Other']

type AIResult = { type: 'income' | 'expense'; category: string; gst: boolean; confidence: 'high' | 'low' }

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.slice(7))
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { transactions } = await req.json() as {
    transactions: Array<{ description: string; amount: number; type: 'income' | 'expense' }>
  }

  if (!transactions?.length) return NextResponse.json({ results: [] })
  if (transactions.length > 100) {
    return NextResponse.json({ error: 'Too many transactions (max 100 per request)' }, { status: 400 })
  }

  const profile = await getProfile(user.id)
  const plan = profile?.plan ?? 'free'
  const { allowed } = await checkRateLimit(user.id, plan)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit reached. Please wait before categorising more transactions.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    )
  }
  const sanitized = transactions.map(t => ({
    ...t,
    description: String(t.description).slice(0, 200),
  }))

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const systemPrompt = `You are an Australian small business expense categoriser. For each bank transaction, return a JSON object with:
- type: 'income' or 'expense' (use the pre-determined type unless obviously wrong)
- category: MUST be exactly one of these strings:
  Income: ${INCOME_CATEGORIES.map(c => `"${c}"`).join(', ')}
  Expense: ${EXPENSE_CATEGORIES.map(c => `"${c}"`).join(', ')}
- gst: true if likely has GST (business purchases/sales), false for wages, super, bank fees, transfers, cash
- confidence: 'high' if category is clear, 'low' if uncertain

Return ONLY a JSON array, one object per transaction, same order. No markdown, no explanation.
Example: [{"type":"expense","category":"Software & Subscriptions","gst":true,"confidence":"high"}]`

  const userMessage = sanitized
    .map((t, i) => `${i + 1}. [${t.type.toUpperCase()}] ${t.description} $${t.amount.toFixed(2)}`)
    .join('\n')

  const fallback = (t: typeof sanitized[number]): AIResult => ({
    type: t.type,
    category: t.type === 'income' ? 'Other Income' : 'Other',
    gst: false,
    confidence: 'low',
  })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('no JSON array')

    const raw = JSON.parse(jsonMatch[0]) as AIResult[]

    const results: AIResult[] = sanitized.map((t, i) => {
      const r = raw[i]
      if (!r) return fallback(t)
      const type = r.type === 'income' || r.type === 'expense' ? r.type : t.type
      const validCats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
      const category = validCats.includes(r.category) ? r.category : (type === 'income' ? 'Other Income' : 'Other')
      return { type, category, gst: !!r.gst, confidence: r.confidence === 'high' ? 'high' : 'low' }
    })

    return NextResponse.json({ results })
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'ai_generation', operation: 'categorise' } })
    console.error('AI categorise error:', err)
    return NextResponse.json({ results: sanitized.map(fallback) })
  }
}
