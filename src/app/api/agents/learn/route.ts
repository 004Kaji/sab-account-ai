export const dynamic = 'force-dynamic'

import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { readMasterContext, sendAlert, logAgentAction, callClaude } from '@/lib/agents/utils'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'

type LearningJSON = {
  week_start:               string
  what_worked:              string
  what_failed:              string
  decision_rules_updated:   string
  raw_content:              string
}

type ConversationRow  = { question: string; answer: string; created_at: string }
type BriefingRow      = { briefing_date: string; content: string }
type ContentBriefRow  = { week_start: string; focus_this_week: string | null }
type OutreachRow      = { name: string; status: string; replied: boolean; emailed_at: string | null }
type ErrorRow         = { error_type: string | null; severity: string | null; resolved: boolean; frequency: number }

export async function POST() {
  const start = Date.now()

  try {
    const masterContext = await readMasterContext()
    const supabase = createServiceClient()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [conversationsR, briefingsR, contentR, outreachR, errorsR] = await Promise.all([
      supabase.from('agent_conversations').select('question, answer, created_at').gte('created_at', weekAgo).order('created_at', { ascending: true }),
      supabase.from('agent_briefings').select('briefing_date, content').gte('created_at', weekAgo).order('briefing_date', { ascending: true }),
      supabase.from('content_briefs').select('week_start, focus_this_week').gte('created_at', weekAgo),
      supabase.from('accountant_outreach').select('name, status, replied, emailed_at').gte('created_at', weekAgo),
      supabase.from('agent_error_log').select('error_type, severity, resolved, frequency').gte('created_at', weekAgo),
    ])

    const conversations = (conversationsR.data ?? []) as ConversationRow[]
    const briefings     = (briefingsR.data ?? [])     as BriefingRow[]
    const content       = (contentR.data ?? [])       as ContentBriefRow[]
    const outreach      = (outreachR.data ?? [])      as OutreachRow[]
    const errors        = (errorsR.data ?? [])        as ErrorRow[]

    const weekData = {
      conversations:       conversations.map(c => ({ q: c.question.slice(0, 100), a: c.answer.slice(0, 200) })),
      briefingCount:       briefings.length,
      contentBriefs:       content.map(b => b.focus_this_week),
      accountantsEmailed:  outreach.filter(o => o.emailed_at).length,
      accountantsReplied:  outreach.filter(o => o.replied).length,
      errorsFound:         errors.length,
      errorsResolved:      errors.filter(e => e.resolved).length,
      criticalErrors:      errors.filter(e => e.severity === 'critical').length,
    }

    const raw = await callClaude({
      systemPrompt: `${BASNET_PERSONALITY}\n\nMaster context: ${masterContext.slice(0, 1000)}`,
      userMessage: `Review this week of agent activity.

Data: ${JSON.stringify(weekData, null, 2)}

What worked? What failed? What decision rules should update?
Return ONLY valid JSON:
{
  "week_start": "YYYY-MM-DD",
  "what_worked": "paragraph",
  "what_failed": "paragraph",
  "decision_rules_updated": "paragraph",
  "raw_content": "## Week of [date]\\n\\n### What worked\\n...\\n\\n### What failed\\n...\\n\\n### Rules updated\\n..."
}`,
      maxTokens: 800,
      expectJson: true,
    })

    let parsed: LearningJSON
    try {
      parsed = JSON.parse(raw) as LearningJSON
    } catch {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const weekStartStr = weekStart.toISOString().split('T')[0]
      parsed = {
        week_start: weekStartStr,
        what_worked: 'Agent system ran without critical failures.',
        what_failed: 'Learning JSON parse failed.',
        decision_rules_updated: 'No updates.',
        raw_content: `## Week of ${weekStartStr}\n\n${raw}`,
      }
    }

    await supabase.from('agent_learnings').insert({
      week_start:              parsed.week_start,
      what_worked:             parsed.what_worked,
      what_failed:             parsed.what_failed,
      decision_rules_updated:  parsed.decision_rules_updated,
      raw_content:             parsed.raw_content,
    })

    // Append to SANJOG_LEARNINGS.md
    const learningsPath = path.join(process.cwd(), 'SANJOG_LEARNINGS.md')
    const newEntry = `\n## Week of ${parsed.week_start}\n\n**What worked:** ${parsed.what_worked}\n\n**What failed:** ${parsed.what_failed}\n\n**Decision rules updated:** ${parsed.decision_rules_updated}\n\n---\n`
    try {
      const current = fs.readFileSync(learningsPath, 'utf-8')
      const updated = current.replace('[Agent will populate from first Sunday onwards]', '')
      fs.writeFileSync(learningsPath, updated + newEntry, 'utf-8')
    } catch {
      fs.appendFileSync(learningsPath, newEntry, 'utf-8')
    }

    const summary = `${parsed.what_worked.slice(0, 150)}`
    await sendAlert(`Weekly learning — ${parsed.week_start}`, summary, 'info', 'learn')

    await logAgentAction({
      agentName: 'learn',
      triggerType: 'weekly',
      inputContext: weekData as unknown as Record<string, unknown>,
      outcome: `Learning saved for week ${parsed.week_start}`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ success: true, learning: parsed })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'learn' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendAlert('Learn agent error', msg, 'urgent', 'learn').catch(() => {})
    return NextResponse.json({ success: false, error: msg })
  }
}
