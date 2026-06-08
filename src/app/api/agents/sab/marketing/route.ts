export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import {
  readMasterContext,
  sendTelegram,
  logAgentAction,
  callClaude,
  getSABMetrics,
  getStripeMetrics,
  isRateLimited,
} from '@/lib/agents/utils'

type WeeklyBriefJSON = {
  focus_this_week: string
  blog_post_title: string
  blog_post_outline: string[]
  tiktok_hooks: string[]
  accountant_email_angle: string
  weekly_summary: string
  urgent_flag: boolean
  urgent_reason: string
}

type AccountantEmailJSON = {
  subject: string
  body: string
}

type AccountantRow = {
  id: string
  name: string
  email: string
  practice_type: string | null
  location: string | null
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    if (await isRateLimited('marketing', 10)) {
      return NextResponse.json({ success: false, error: 'Rate limited — max 10/day' })
    }

    const body = (await req.json().catch(() => ({}))) as {
      trigger?: string
      data?: Record<string, unknown>
    }
    const trigger = body.trigger ?? 'manual'

    // ── TRIGGER: weekly_brief ──────────────────────────────────────────
    if (trigger === 'weekly_brief') {
      const masterContext = await readMasterContext()
      const [sabMetrics, stripeMetrics] = await Promise.all([
        getSABMetrics(),
        getStripeMetrics(),
      ])

      const supabase = createServiceClient()

      const { data: lastBrief } = await supabase
        .from('content_briefs')
        .select('focus_this_week, week_start')
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count: totalEmailed } = await supabase
        .from('accountant_outreach')
        .select('*', { count: 'exact', head: true })
        .neq('emailed_at', null)

      const { count: totalReplied } = await supabase
        .from('accountant_outreach')
        .select('*', { count: 'exact', head: true })
        .eq('replied', true)

      const raw = await callClaude({
        systemPrompt: `You are the Marketing Agent for SAB Account AI.
You think like Sanjog — direct, fast, no fluff.
You know his 14hr/week limit.
You know the north star: PR + million dollar SaaS + portfolio of products.
Every suggestion must fit a solo founder on a student visa with 14hrs/week.
Context: ${masterContext.slice(0, 2000)}`,
        userMessage: `Weekly marketing brief — ${new Date().toISOString().split('T')[0]}

SAB Metrics: ${JSON.stringify(sabMetrics)}
Stripe: ${JSON.stringify(stripeMetrics)}
Last week focus: ${lastBrief?.focus_this_week ?? 'N/A'}
Accountants emailed total: ${totalEmailed ?? 0}
Accountants replied: ${totalReplied ?? 0}

Return ONLY valid JSON (no markdown):
{
  "focus_this_week": "one sentence max",
  "blog_post_title": "exact SEO-optimised title",
  "blog_post_outline": ["H2 1", "H2 2", "H2 3"],
  "tiktok_hooks": ["hook 1", "hook 2", "hook 3"],
  "accountant_email_angle": "one sentence",
  "weekly_summary": "3 sentences max",
  "urgent_flag": false,
  "urgent_reason": ""
}`,
        maxTokens: 800,
        expectJson: true,
      })

      let parsed: WeeklyBriefJSON
      try {
        parsed = JSON.parse(raw) as WeeklyBriefJSON
      } catch {
        return NextResponse.json({ success: false, error: 'Claude returned invalid JSON' })
      }

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      await supabase.from('content_briefs').upsert({
        week_start: weekStartStr,
        focus_this_week: parsed.focus_this_week,
        blog_post_title: parsed.blog_post_title,
        blog_post_outline: parsed.blog_post_outline,
        tiktok_hooks: parsed.tiktok_hooks,
        accountant_email_angle: parsed.accountant_email_angle,
        weekly_summary: parsed.weekly_summary,
        published: false,
      }, { onConflict: 'week_start' })

      const telegramMsg = `WEEKLY BRIEF — ${weekStartStr}

*Focus:* ${parsed.focus_this_week}
*Blog:* ${parsed.blog_post_title}
*TikTok hooks:* ${parsed.tiktok_hooks.slice(0, 2).join(' | ')}
*Accountant angle:* ${parsed.accountant_email_angle}

${parsed.weekly_summary}${parsed.urgent_flag ? `\n\n⚠️ URGENT: ${parsed.urgent_reason}` : ''}`

      await sendTelegram(telegramMsg, parsed.urgent_flag ? 'warning' : 'info')

      await logAgentAction({
        agentName: 'marketing',
        triggerType: trigger,
        decision: parsed.focus_this_week,
        actionsTaken: { weekStart: weekStartStr, telegramSent: true },
        outcome: parsed.weekly_summary,
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, brief: parsed, weekStart: weekStartStr })
    }

    // ── TRIGGER: accountant_emails ─────────────────────────────────────
    if (trigger === 'accountant_emails') {
      const masterContext = await readMasterContext()
      const supabase = createServiceClient()
      const today = new Date().toISOString().split('T')[0]

      // Get next pending accountants to email
      let { data: targets } = await supabase
        .from('accountant_outreach')
        .select('id, name, email, practice_type, location')
        .eq('status', 'pending')
        .is('emailed_at', null)
        .limit(2)

      // Fallback: get ones due for follow-up
      if (!targets || targets.length === 0) {
        const { data: followUps } = await supabase
          .from('accountant_outreach')
          .select('id, name, email, practice_type, location')
          .lte('follow_up_due', today)
          .eq('replied', false)
          .limit(2)
        targets = followUps
      }

      if (!targets || targets.length === 0) {
        return NextResponse.json({ success: true, message: 'No accountants to email today' })
      }

      const resend = new Resend(process.env.RESEND_API_KEY)
      const emailsSent: string[] = []

      for (const accountant of targets as AccountantRow[]) {
        const emailRaw = await callClaude({
          systemPrompt: `Write a personalised cold email from Sanjog Basnet, founder of SAB Account AI.
Tone: direct, genuine, not salesy.
Sanjog is a Nepali international student who built this to solve his own tax problem. That story is the pitch.
Context: ${masterContext.slice(0, 1000)}`,
          userMessage: `Write a cold email to this accountant:
Name: ${accountant.name}
Practice type: ${accountant.practice_type ?? 'accounting practice'}
Location: ${accountant.location ?? 'Australia'}

Return ONLY valid JSON (no markdown):
{ "subject": "subject line", "body": "full email body" }`,
          maxTokens: 600,
          expectJson: true,
        })

        let emailJSON: AccountantEmailJSON
        try {
          emailJSON = JSON.parse(emailRaw) as AccountantEmailJSON
        } catch {
          console.error('Email JSON parse failed for', accountant.name)
          continue
        }

        try {
          await resend.emails.send({
            from: 'Sanjog Basnet <sanjog@sabaccountai.com.au>',
            to: accountant.email,
            subject: emailJSON.subject,
            text: emailJSON.body,
          })
        } catch (emailErr) {
          console.error('Resend failed for', accountant.email, emailErr)
          continue
        }

        const followUpDate = new Date()
        followUpDate.setDate(followUpDate.getDate() + 7)

        await supabase
          .from('accountant_outreach')
          .update({
            emailed_at: new Date().toISOString(),
            status: 'emailed',
            follow_up_due: followUpDate.toISOString().split('T')[0],
            email_subject: emailJSON.subject,
            email_body: emailJSON.body,
          })
          .eq('id', accountant.id)

        emailsSent.push(accountant.name)
      }

      if (emailsSent.length > 0) {
        const followUpDate = new Date()
        followUpDate.setDate(followUpDate.getDate() + 7)
        await sendTelegram(
          `Friday emails sent to ${emailsSent.join(', ')}. Follow-ups due ${followUpDate.toISOString().split('T')[0]}.`,
          'info',
        )
      }

      await logAgentAction({
        agentName: 'marketing',
        triggerType: trigger,
        actionsTaken: { emailsSent },
        outcome: `Emailed ${emailsSent.length} accountants`,
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ success: true, emailsSent })
    }

    // ── TRIGGER: content_brief ─────────────────────────────────────────
    if (trigger === 'content_brief') {
      const supabase = createServiceClient()
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const { data: brief } = await supabase
        .from('content_briefs')
        .select('*')
        .eq('week_start', weekStartStr)
        .maybeSingle()

      if (brief) {
        return NextResponse.json({ success: true, brief })
      }

      // Generate one if missing
      return NextResponse.json({ success: true, brief: null, message: 'No brief for this week — trigger weekly_brief first' })
    }

    return NextResponse.json({ success: false, error: `Unknown trigger: ${trigger}` })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'marketing' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendTelegram(`Marketing Agent error: ${msg}`, 'urgent').catch(() => {})
    return NextResponse.json({ success: false, error: msg })
  }
}
