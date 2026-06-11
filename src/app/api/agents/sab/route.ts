export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import {
  readMasterContext, callClaude, sendAlert, logAgentAction, getSABMetrics, getStripeMetrics,
} from '@/lib/agents/toolkits/sab-tech-toolkit'
import { BASNET_PERSONALITY, applyPersonality } from '@/lib/agents/personality'
import { runFlux, fluxDiagnose } from '@/lib/agents/sub/flux'
import { sparkWeeklyBrief, sparkSendAccountantEmails, sparkWriteBlogPost, sparkDraftSocialPosts } from '@/lib/agents/sub/spark'
import { runScout } from '@/lib/agents/sub/scout'
import { runLift } from '@/lib/agents/sub/lift'

const ENGINEERING_KEYWORDS = ['error', 'bug', 'build', 'stripe webhook', 'supabase', 'sentry', 'deploy', 'code', 'payg', 'test', 'rls', 'ssl', 'security']
const MARKETING_KEYWORDS   = ['tiktok', 'blog', 'post', 'content', 'what to write', 'this week', 'topic', 'hook', 'linkedin', 'facebook', 'accountant', 'email']
const QUALITY_KEYWORDS     = ['working', 'broken', 'passing', 'endpoint', 'api', 'route', '401', '500', 'auth protection', 'invoice generation', 'calculation']

function classifyQuestion(q: string): 'quality' | 'engineering' | 'marketing' | 'general' {
  const lq = q.toLowerCase()
  if (QUALITY_KEYWORDS.some(k => lq.includes(k)))     return 'quality'
  if (ENGINEERING_KEYWORDS.some(k => lq.includes(k))) return 'engineering'
  if (MARKETING_KEYWORDS.some(k => lq.includes(k)))   return 'marketing'
  return 'general'
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      trigger?: string
      question?: string
      data?: Record<string, unknown>
    }
    const trigger = body.trigger ?? 'health_check'

    // ── TRIGGER: health_check ──────────────────────────────────────────
    if (trigger === 'health_check') {
      const report = await runFlux()
      await logAgentAction({ agentName: 'sab', triggerType: trigger, outcome: report.overall, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, report })
    }

    // ── TRIGGER: marketing_run ─────────────────────────────────────────
    if (trigger === 'marketing_run') {
      const marketingTrigger = (body.data?.marketingTrigger as string | undefined) ?? 'weekly_brief'

      if (marketingTrigger === 'weekly_brief') {
        const stripe = await getStripeMetrics()
        const brief = await sparkWeeklyBrief({
          newSignups:    0,
          mrr:           stripe.mrr,
          mrrChange:     stripe.mrrChange,
          churnThisWeek: stripe.churnThisWeek,
        })
        await logAgentAction({ agentName: 'sab', triggerType: trigger, decision: brief.weekFocus, durationMs: Date.now() - start })
        return NextResponse.json({ success: true, brief })
      }

      if (marketingTrigger === 'accountant_emails') {
        const result = await sparkSendAccountantEmails()
        await logAgentAction({ agentName: 'sab', triggerType: trigger, actionsTaken: { sent: result.sent }, durationMs: Date.now() - start })
        return NextResponse.json({ success: true, ...result })
      }

      if (marketingTrigger === 'draft_social_posts') {
        const result = await sparkDraftSocialPosts()
        await logAgentAction({ agentName: 'sab', triggerType: trigger, actionsTaken: { drafted: result.drafts.length }, durationMs: Date.now() - start })
        return NextResponse.json({ success: true, drafted: result.drafts.length, platforms: result.drafts.map(d => d.platform) })
      }

      if (marketingTrigger === 'write_blog_post') {
        const topicHint = body.data?.topic as string | undefined
        const result = await sparkWriteBlogPost(topicHint)
        await logAgentAction({ agentName: 'sab', triggerType: trigger, decision: result.post.title, durationMs: Date.now() - start })
        return NextResponse.json({ success: true, slug: result.post.slug, title: result.post.title, saved: result.saved, post: result.post })
      }

      return NextResponse.json({ success: false, error: `Unknown marketingTrigger: ${marketingTrigger}` })
    }

    // ── TRIGGER: full_report ───────────────────────────────────────────
    if (trigger === 'full_report') {
      const stripe = await getStripeMetrics()
      const [fluxR, briefR] = await Promise.all([
        runFlux(),
        sparkWeeklyBrief({ newSignups: 0, mrr: stripe.mrr, mrrChange: stripe.mrrChange, churnThisWeek: stripe.churnThisWeek }),
      ])

      const masterContext = await readMasterContext()
      const synthesis = await callClaude({
        systemPrompt: `${BASNET_PERSONALITY}\n\nContext: ${masterContext.slice(0, 1000)}`,
        userMessage: `Synthesise these reports. Max 150 words. What matters most right now?

Flux: ${JSON.stringify({ overall: fluxR.overall, paygPassing: fluxR.payg.allPassing })}
Spark: ${JSON.stringify({ weekFocus: briefR.weekFocus, urgentFlag: briefR.urgentFlag })}`,
        maxTokens: 250,
      })

      await logAgentAction({ agentName: 'sab', triggerType: trigger, outcome: synthesis.slice(0, 200), durationMs: Date.now() - start })
      return NextResponse.json({ success: true, synthesis, flux: fluxR, spark: briefR })
    }

    // ── TRIGGER: scout_scan ────────────────────────────────────────────
    if (trigger === 'scout_scan') {
      const report = await runScout()
      await logAgentAction({ agentName: 'sab', triggerType: trigger, outcome: report.summary, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, report })
    }

    // ── TRIGGER: lift_scan ─────────────────────────────────────────────
    if (trigger === 'lift_scan') {
      const report = await runLift()
      await logAgentAction({ agentName: 'sab', triggerType: trigger, outcome: report.summary, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, report })
    }

    // ── TRIGGER: ask ───────────────────────────────────────────────────
    if (trigger === 'ask') {
      const question = body.question ?? ''
      const classification = classifyQuestion(question)
      const masterContext = await readMasterContext()
      let answer = ''

      if (classification === 'quality') {
        const scout = await runScout()
        const failing = scout.tests.filter(t => !t.pass)
        answer = applyPersonality(
          failing.length === 0
            ? `All ${scout.tests.length} product tests passing. Product healthy.`
            : `${failing.length} tests failing: ${failing.map(t => `${t.name} (${t.actual})`).join(', ')}`
        )
      } else if (classification === 'engineering') {
        const diagnosis = await fluxDiagnose(question)
        answer = applyPersonality(diagnosis)
      } else if (classification === 'marketing') {
        const sab = await getSABMetrics()
        answer = await callClaude({
          systemPrompt: `${BASNET_PERSONALITY}\n\nContext: ${masterContext.slice(0, 1500)}`,
          userMessage: `SAB metrics: ${JSON.stringify(sab)}\n\nQ: ${question}`,
          maxTokens: 400,
        })
        answer = applyPersonality(answer)
      } else {
        answer = await callClaude({
          systemPrompt: `${BASNET_PERSONALITY}\n\nContext: ${masterContext.slice(0, 2000)}`,
          userMessage: question,
          maxTokens: 500,
        })
        answer = applyPersonality(answer)
      }

      await logAgentAction({ agentName: 'sab', triggerType: trigger, inputContext: { question, classification }, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, answer, classification })
    }

    return NextResponse.json({ success: false, error: `Unknown trigger: ${trigger}` })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'sab' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendAlert('SAB agent error', msg, 'urgent', 'sab').catch(() => {})
    return NextResponse.json({ success: false, error: msg })
  }
}
