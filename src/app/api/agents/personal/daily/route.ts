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
  getStripeMetrics,
  briefingAlreadySentToday,
  isRateLimited,
} from '@/lib/agents/utils'

function parseVisaExpiry(masterContext: string): string | null {
  const match = masterContext.match(/Visa expiry[^:]*:\s*\[?(\d{4}-\d{2}-\d{2})/i)
  return match ? match[1] : null
}

function parseMigrationAgentDate(masterContext: string): string | null {
  const match = masterContext.match(/last consultation date[^:]*:\s*(\d{4}-\d{2}-\d{2})/i)
  return match ? match[1] : null
}

function parseLastAccountantEmailDate(masterContext: string): string | null {
  const match = masterContext.match(/last accountant email[^:]*:\s*(\d{4}-\d{2}-\d{2})/i)
  return match ? match[1] : null
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function daysSince(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    const body = (await req.json().catch(() => ({}))) as { trigger?: string }
    const trigger = body.trigger ?? 'morning_briefing'

    const masterContext = await readMasterContext()

    // ── TRIGGER: morning_briefing ──────────────────────────────────────
    if (trigger === 'morning_briefing') {
      if (await isRateLimited('daily-morning', 1)) {
        const alreadySent = await briefingAlreadySentToday()
        if (alreadySent) {
          return NextResponse.json({ success: true, message: 'Briefing already sent today' })
        }
      }

      const supabase = createServiceClient()
      const today = new Date().toISOString().split('T')[0]
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const [sabMetrics, stripeMetrics] = await Promise.all([getSABMetrics(), getStripeMetrics()])

      const { data: unresolvedErrors } = await supabase
        .from('agent_error_log')
        .select('error_type, severity, frequency')
        .eq('resolved', false)
        .order('frequency', { ascending: false })
        .limit(3)

      const { data: contentBrief } = await supabase
        .from('content_briefs')
        .select('focus_this_week, blog_post_title')
        .eq('week_start', weekStartStr)
        .maybeSingle()

      const { data: followUpsToday } = await supabase
        .from('accountant_outreach')
        .select('name')
        .eq('follow_up_due', today)
        .eq('replied', false)
        .limit(5)

      // Parse dates from master context
      const visaExpiry = parseVisaExpiry(masterContext)
      const migrationAgentDate = parseMigrationAgentDate(masterContext)
      const lastAccountantEmail = parseLastAccountantEmailDate(masterContext)

      const visaWarning = visaExpiry ? daysUntil(visaExpiry) : null
      const migrationWarning = migrationAgentDate ? daysSince(migrationAgentDate) : null
      const accountantEmailWarning = lastAccountantEmail ? daysSince(lastAccountantEmail) : null

      const contextData = {
        sabMetrics,
        stripeMetrics,
        unresolvedErrors: unresolvedErrors ?? [],
        contentBrief,
        followUpsToday: followUpsToday?.map(f => f.name) ?? [],
        visaDaysRemaining: visaWarning,
        migrationAgentDaysSinceConsult: migrationWarning,
        daysSinceLastAccountantEmail: accountantEmailWarning,
      }

      const briefingContent = await callClaude({
        systemPrompt: `You are Sanjog's morning briefing agent.
You know his entire life context.
You produce a daily briefing that tells him exactly what matters TODAY — not this week, not this month. TODAY.
Maximum 200 words total.
Structure:
URGENT (if anything is): one line
SAB TODAY: one metric that matters
FOCUS: one task only — the most important
NORTH STAR CHECK: one sentence reminder
Keep it short. He reads this at 7am.`,
        userMessage: `Date: ${today}
${JSON.stringify(contextData, null, 2)}`,
        maxTokens: 300,
      })

      await supabase.from('agent_briefings').upsert({
        briefing_date: today,
        metrics: contextData as unknown as Record<string, unknown>,
        content: briefingContent,
        sent_to_telegram: true,
      }, { onConflict: 'briefing_date' })

      await sendTelegram(`MORNING BRIEFING — ${today}\n\n${briefingContent}`, 'info')

      await logAgentAction({
        agentName: 'daily',
        triggerType: trigger,
        inputContext: contextData as unknown as Record<string, unknown>,
        outcome: 'briefing_sent',
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, briefing: briefingContent, date: today })
    }

    // ── TRIGGER: visa_check ────────────────────────────────────────────
    if (trigger === 'visa_check') {
      const visaExpiry = parseVisaExpiry(masterContext)
      const migrationAgentDate = parseMigrationAgentDate(masterContext)

      const daysToExpiry = visaExpiry ? daysUntil(visaExpiry) : null
      const sinceAgent = migrationAgentDate ? daysSince(migrationAgentDate) : null

      const parts: string[] = []

      if (daysToExpiry !== null) {
        parts.push(`Visa expires in ${daysToExpiry} days (${visaExpiry})`)
        if (daysToExpiry < 90) {
          await sendTelegram(
            `VISA URGENT: ${daysToExpiry} days until expiry (${visaExpiry}). Contact migration agent NOW.`,
            'urgent',
          )
        } else if (daysToExpiry < 180) {
          await sendTelegram(
            `Visa check: ${daysToExpiry} days remaining (${visaExpiry}). Start preparing renewal.`,
            'warning',
          )
        }
      } else {
        parts.push('Visa expiry date not set in SANJOG_MASTER.md — update it now')
      }

      if (sinceAgent !== null && sinceAgent > 30) {
        await sendTelegram(
          `Migration agent check: ${sinceAgent} days since last consultation. Book a check-in.`,
          'warning',
        )
        parts.push(`${sinceAgent} days since last migration agent consultation`)
      }

      const summary = parts.join('\n')

      await logAgentAction({
        agentName: 'daily',
        triggerType: trigger,
        outcome: summary,
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, summary, daysToExpiry, sinceAgent })
    }

    // ── TRIGGER: goal_check ────────────────────────────────────────────
    if (trigger === 'goal_check') {
      const [sabMetrics, stripeMetrics] = await Promise.all([getSABMetrics(), getStripeMetrics()])

      const assessment = await callClaude({
        systemPrompt: `You know Sanjog's north star goals: PR + million dollar SaaS + portfolio of products.
Context: ${masterContext.slice(0, 1500)}`,
        userMessage: `Compare current state vs north star goals.
What is the gap? What is the current trajectory?
Is Sanjog on track for PR + million dollar SaaS?
Be brutally honest. Short answer.

Current data:
${JSON.stringify({ sabMetrics, stripeMetrics }, null, 2)}`,
        maxTokens: 400,
      })

      await logAgentAction({
        agentName: 'daily',
        triggerType: trigger,
        inputContext: { sabMetrics, stripeMetrics } as unknown as Record<string, unknown>,
        outcome: assessment.slice(0, 200),
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, assessment })
    }

    return NextResponse.json({ success: false, error: `Unknown trigger: ${trigger}` })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'daily' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendTelegram(`Daily Life Agent error: ${msg}`, 'urgent').catch(() => {})
    return NextResponse.json({ success: false, error: msg })
  }
}
