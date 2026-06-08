export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import {
  readMasterContext,
  sendTelegram,
  logAgentAction,
  callClaude,
  getSABMetrics,
} from '@/lib/agents/utils'

type ConversationRow = {
  agent_name: string
  question: string
  answer: string
  created_at: string
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      question?: string
      context?: string
    }

    if (!body.question?.trim()) {
      return NextResponse.json({ success: false, error: 'question is required' })
    }

    const [masterContext, sabMetrics] = await Promise.all([
      readMasterContext(),
      getSABMetrics(),
    ])

    const supabase = createServiceClient()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: recentConversations } = await supabase
      .from('agent_conversations')
      .select('agent_name, question, answer, created_at')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(10)

    const conversationHistory = ((recentConversations ?? []) as ConversationRow[])
      .map(c => `Q: ${c.question}\nA: ${c.answer}`)
      .join('\n\n')

    const answer = await callClaude({
      systemPrompt: `You are Sanjog's personal AI assistant.
You know everything about him from his master context file.
You think like him — direct, fast, honest, no fluff.
You never give advice that risks his visa.
You always consider his PR pathway.
You know his 14hr/week limit.
When he is overwhelmed: remind him of his north star and pick ONE thing.
When he asks about SAB: use live metrics.
Format: short paragraphs, no bullet walls.

MASTER CONTEXT:
${masterContext}`,
      userMessage: `Current SAB metrics: ${JSON.stringify(sabMetrics)}

${conversationHistory ? `Recent conversations:\n${conversationHistory}\n\n` : ''}${body.context ? `Additional context: ${body.context}\n\n` : ''}Question: ${body.question}`,
      maxTokens: 600,
    })

    await supabase.from('agent_conversations').insert({
      agent_name: 'inquiries',
      question: body.question,
      answer,
      context_used: {
        hadRecentConversations: (recentConversations?.length ?? 0) > 0,
        sabMetrics,
        additionalContext: body.context ?? null,
      },
    })

    await logAgentAction({
      agentName: 'inquiries',
      triggerType: 'question',
      inputContext: { question: body.question },
      outcome: 'answered',
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ success: true, answer })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'inquiries' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendTelegram(`Inquiries Agent error: ${msg}`, 'urgent').catch(() => {})
    return NextResponse.json({ success: false, error: msg })
  }
}
