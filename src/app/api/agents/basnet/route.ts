export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import {
  readMasterContext, callClaude, sendAlert, sendDailyDigest, sendWeeklyReport,
  logAgentAction, isRateLimited, getStripeMetrics,
} from '@/lib/agents/utils'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'
import { runFlux, fluxDiagnose } from '@/lib/agents/sub/flux'
import { runRelay } from '@/lib/agents/sub/relay'
import { runScout } from '@/lib/agents/sub/scout'
import { atlasWeeklyIntel } from '@/lib/agents/sub/atlas'
import { sparkWeeklyBrief } from '@/lib/agents/sub/spark'
import { liftScanForChurnRisk } from '@/lib/agents/sub/lift'
import {
  runWatcherCycle, evaluateAndAlert, saveWatcherReport,
  generateProactiveInsight, getLastProactiveInsightTime,
} from '@/lib/agents/watcher'

type QuestionClass = 'ENGINEERING' | 'USER_HEALTH' | 'PRODUCT_TEST' | 'MARKET_INTEL' | 'CONTENT' | 'REVENUE' | 'LIFE' | 'GENERAL'

const KEYWORDS: Record<QuestionClass, string[]> = {
  ENGINEERING:  ['error', 'bug', 'build', 'stripe webhook', 'supabase', 'sentry', 'deploy', 'code', 'payg', 'test', 'rls', 'ssl', 'security'],
  USER_HEALTH:  ['user', 'churn', 'signup', 'retention', 'conversion', 'onboarding', 'free tier', 'upgrade', 'past due'],
  PRODUCT_TEST: ['working', 'broken', 'check', 'invoice generation', 'calculation'],
  MARKET_INTEL: ['competitor', 'xero', 'myob', 'market', 'news', 'ato update', 'law change', 'payday super update'],
  CONTENT:      ['tiktok', 'blog', 'post', 'content', 'what to write', 'this week', 'topic', 'hook', 'linkedin', 'facebook'],
  REVENUE:      ['mrr', 'revenue', 'churn', 'paid users', 'retention', 'upgrade', 'pricing'],
  LIFE:         ['visa', 'pr', 'university', 'goals', 'dream', 'north star', 'tired', 'overwhelmed', 'should i', 'what do i do'],
  GENERAL:      [],
}

function classify(question: string): QuestionClass {
  const q = question.toLowerCase()
  for (const cls of ['ENGINEERING', 'USER_HEALTH', 'PRODUCT_TEST', 'MARKET_INTEL', 'CONTENT', 'REVENUE', 'LIFE'] as const) {
    if (KEYWORDS[cls].some(k => q.includes(k))) return cls
  }
  return 'GENERAL'
}

function isMonday(): boolean {
  return new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', weekday: 'long' }) === 'Monday'
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      trigger?: string
      question?: string
      payload?: Record<string, unknown>
      secret?: string
    }

    const trigger = body.trigger ?? 'ask'

    // ── TRIGGER: watch ─────────────────────────────────────────────────
    if (trigger === 'watch') {
      const report = await runWatcherCycle()
      const alertsSent = await evaluateAndAlert(report)
      const lastInsight = await getLastProactiveInsightTime()
      if (!lastInsight || lastInsight < new Date(Date.now() - 3600000)) {
        await generateProactiveInsight(report).catch(() => null)
      }
      await saveWatcherReport(report, alertsSent)
      await logAgentAction({ agentName: 'basnet', triggerType: trigger, actionsTaken: { alertsSent }, outcome: 'watch cycle complete' })
      return NextResponse.json({ success: true, alertsSent, timestamp: report.timestamp })
    }

    // ── TRIGGER: morning ───────────────────────────────────────────────
    if (trigger === 'morning') {
      if (await isRateLimited('basnet-morning', 2)) {
        return NextResponse.json({ success: true, message: 'Morning briefing already ran today' })
      }

      const monday = isMonday()

      // Run sub-agents in parallel
      const [fluxR, relayR, liftR, atlasR, sparkR] = await Promise.allSettled([
        runFlux(),
        runRelay(),
        liftScanForChurnRisk(),
        monday ? atlasWeeklyIntel() : Promise.resolve(null),
        monday ? (async () => {
          const watcher = await runWatcherCycle()
          return sparkWeeklyBrief(watcher)
        })() : Promise.resolve(null),
      ])

      const flux  = fluxR.status === 'fulfilled' ? fluxR.value : null
      const relay = relayR.status === 'fulfilled' ? relayR.value : null
      const lift  = liftR.status === 'fulfilled' ? liftR.value : null
      const atlas = atlasR.status === 'fulfilled' ? atlasR.value : null
      const spark = sparkR.status === 'fulfilled' ? sparkR.value : null

      const stripeMetrics = await getStripeMetrics()
      const masterContext = await readMasterContext()

      const briefingInput = JSON.stringify({
        payg: flux ? (flux.paygPassing ? 'all 5 passing' : `FAILING: ${flux.paygFailures.join(', ')}`) : 'not checked',
        unresolvedErrors: flux?.unresolvedErrors ?? 0,
        onboardingGaps: relay?.onboardingGaps ?? 0,
        atRiskUsers: lift?.totalAtRisk ?? 0,
        mrr: stripeMetrics.mrr,
        mrrChange: stripeMetrics.mrrChange,
        newPaidThisWeek: stripeMetrics.newPaidThisWeek,
        churn: stripeMetrics.churnThisWeek,
        monday,
        weekFocus: spark?.weekFocus ?? null,
        atlasIntel: atlas ? atlas.slice(0, 200) : null,
      })

      const briefing = await callClaude({
        systemPrompt: `${BASNET_PERSONALITY}\n\nContext: ${masterContext.slice(0, 1000)}`,
        userMessage: `Morning briefing data: ${briefingInput}\n\nWrite the morning briefing. Max 5 sentences. Start with the single most important thing. End with today's one focus. Use Basnet's voice — direct, specific, honest.`,
        maxTokens: 300,
      })

      const today = new Date().toISOString().split('T')[0]
      const sections = [{ title: 'Today', content: briefing }]
      if (monday && spark) sections.push({ title: `This week — ${spark.weekFocus}`, content: `Blog: ${spark.blogTitle}\nHook: ${spark.tiktokHook1}` })
      if (monday && atlas) sections.push({ title: 'Market intel', content: atlas })

      await sendDailyDigest(sections)

      const supabase = createServiceClient()
      await supabase.from('agent_briefings').upsert({
        briefing_date: today,
        metrics: JSON.parse(briefingInput) as Record<string, unknown>,
        content: briefing,
        sent_to_telegram: true,
      }, { onConflict: 'briefing_date' })

      await logAgentAction({ agentName: 'basnet', triggerType: trigger, outcome: briefing.slice(0, 200), durationMs: Date.now() - start })
      return NextResponse.json({ success: true, briefing })
    }

    // ── TRIGGER: ask ───────────────────────────────────────────────────
    if (trigger === 'ask' || trigger === 'manual') {
      const question = body.question ?? ''
      if (!question) return NextResponse.json({ success: false, error: 'question required' })

      const cls = classify(question)
      const masterContext = await readMasterContext()
      let answer = ''
      let agentUsed = 'basnet'

      if (cls === 'ENGINEERING') {
        const flux = await runFlux().catch(() => null)
        const context = flux ? `PAYG: ${flux.paygPassing ? '✓' : 'FAILING'}, Errors: ${flux.unresolvedErrors}, Deploy: ${flux.latestDeploymentStatus}` : ''
        answer = await callClaude({ systemPrompt: `${BASNET_PERSONALITY}\n${masterContext.slice(0, 1000)}`, userMessage: `${context}\n\nQ: ${question}`, maxTokens: 400 })
        agentUsed = 'flux'
      } else if (cls === 'USER_HEALTH' || cls === 'REVENUE') {
        const [relay, lift, stripe] = await Promise.all([runRelay().catch(() => null), liftScanForChurnRisk().catch(() => null), getStripeMetrics()])
        const context = `MRR: $${stripe.mrr.toFixed(0)}, Onboarding gaps: ${relay?.onboardingGaps ?? 0}, At-risk: ${lift?.totalAtRisk ?? 0}, Payment issues: ${relay?.paymentIssues ?? 0}`
        answer = await callClaude({ systemPrompt: `${BASNET_PERSONALITY}\n${masterContext.slice(0, 1000)}`, userMessage: `${context}\n\nQ: ${question}`, maxTokens: 400 })
        agentUsed = 'relay+lift'
      } else if (cls === 'PRODUCT_TEST') {
        const scout = await runScout().catch(() => null)
        const context = scout ? `Product status: ${scout.overallStatus}. Tests: ${scout.tests.filter(t => t.passed).length}/${scout.tests.length} passing.` : ''
        answer = await callClaude({ systemPrompt: `${BASNET_PERSONALITY}\n${masterContext.slice(0, 1000)}`, userMessage: `${context}\n\nQ: ${question}`, maxTokens: 400 })
        agentUsed = 'scout'
      } else {
        answer = await callClaude({ systemPrompt: `${BASNET_PERSONALITY}\n${masterContext.slice(0, 2000)}`, userMessage: question, maxTokens: 500 })
      }

      const supabase = createServiceClient()
      await supabase.from('agent_conversations').insert({ agent_name: agentUsed, question, answer, context_used: { classification: cls } })
      await logAgentAction({ agentName: 'basnet', triggerType: trigger, inputContext: { question, cls }, decision: agentUsed, durationMs: Date.now() - start })

      return NextResponse.json({ success: true, answer, agentUsed, classification: cls })
    }

    // ── TRIGGER: sentry_webhook ────────────────────────────────────────
    if (trigger === 'sentry_webhook') {
      const payload = body.payload ?? {}
      const errorType = payload.error as string | undefined
      const fileName  = payload.file as string | undefined
      const message   = payload.message as string | undefined
      const count     = (payload.count as number | undefined) ?? 1

      const supabase = createServiceClient()
      const severity = count > 10 ? 'critical' : 'warning'

      const { data: existing } = await supabase.from('agent_error_log').select('id, frequency')
        .eq('error_type', errorType ?? '').eq('resolved', false).maybeSingle()

      if (existing) {
        await supabase.from('agent_error_log').update({ frequency: (existing.frequency as number) + count }).eq('id', existing.id)
      } else {
        await supabase.from('agent_error_log').insert({
          error_type: errorType ?? 'unknown', error_message: message ?? '',
          file_name: fileName ?? '', frequency: count, severity, alerted: true, resolved: false,
        })
      }

      const diagnosis = await fluxDiagnose(`${errorType}: ${message} (${fileName})`).catch(() => '')
      await sendAlert(`Sentry: ${errorType}`, `${message}\nFile: ${fileName}\nCount: ${count}\n\n${diagnosis}`, severity === 'critical' ? 'urgent' : 'warning', 'flux')

      await logAgentAction({ agentName: 'basnet', triggerType: trigger, inputContext: payload, decision: severity, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, received: true, severity })
    }

    // ── TRIGGER: stripe_event ──────────────────────────────────────────
    if (trigger === 'stripe_event') {
      const payload = body.payload ?? {}
      const eventType = payload.type as string | undefined

      if (eventType === 'checkout.session.completed') {
        const plan = (payload.plan as string | undefined) ?? 'unknown'
        await sendAlert(`New paid user — ${plan} plan`, `A user just upgraded to ${plan}. Total MRR is growing.`, 'info', 'basnet')
      } else if (eventType === 'invoice.payment_failed') {
        const email = (payload.customer_email as string | undefined) ?? 'unknown'
        await sendAlert(`Payment failed — ${email}`, `Failed payment for ${email}. Check Stripe for retry status.`, 'urgent', 'basnet')
      } else if (eventType === 'customer.subscription.deleted') {
        const plan = (payload.plan as string | undefined) ?? 'unknown'
        await sendAlert(`User churned — ${plan} plan`, `A ${plan} subscription was cancelled. Check Stripe for reason.`, 'warning', 'basnet')
      }

      await logAgentAction({ agentName: 'basnet', triggerType: trigger, inputContext: { eventType }, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, received: true })
    }

    // ── TRIGGER: new_signup ────────────────────────────────────────────
    if (trigger === 'new_signup') {
      const payload = body.payload ?? {}
      const email  = payload.email as string | undefined
      const source = (payload.source as string | undefined) ?? 'direct'
      await sendAlert(`New signup — ${source}`, `${email ?? 'new user'} just joined via ${source}.`, 'info', 'basnet')
      await logAgentAction({ agentName: 'basnet', triggerType: trigger, inputContext: { email, source }, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, received: true })
    }

    // ── TRIGGER: weekly_learn ──────────────────────────────────────────
    if (trigger === 'weekly_learn') {
      const supabase = createServiceClient()
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const [convR, briefR, errR] = await Promise.all([
        supabase.from('agent_conversations').select('question, answer').gte('created_at', weekAgo).limit(20),
        supabase.from('agent_briefings').select('content').gte('created_at', weekAgo).limit(7),
        supabase.from('agent_error_log').select('error_type, resolved, frequency').gte('created_at', weekAgo).limit(10),
      ])

      const weekData = {
        conversations: (convR.data ?? []).length,
        briefings: (briefR.data ?? []).length,
        errors: (errR.data ?? []).length,
        resolvedErrors: (errR.data ?? []).filter(e => e.resolved).length,
      }

      const learning = await callClaude({
        systemPrompt: `${BASNET_PERSONALITY}`,
        userMessage: `You are Basnet reviewing your own week.\n\nData: ${JSON.stringify(weekData)}\n\nSample conversations: ${(convR.data ?? []).slice(0, 3).map(c => `Q: ${c.question}`).join('\n')}\n\nWhat worked? What failed? What should change? Write one paragraph. Specific. Honest.`,
        maxTokens: 300,
      })

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      await supabase.from('agent_learnings').insert({
        week_start: weekStartStr, what_worked: learning, what_failed: '', decision_rules_updated: '', raw_content: learning,
      })

      const { fs, path } = await import('fs').then(m => ({ fs: m, path: require('path') as typeof import('path') }))
      const learningsPath = path.join(process.cwd(), 'SANJOG_LEARNINGS.md')
      const entry = `\n## Week of ${weekStartStr}\n\n${learning}\n\n---\n`
      try { fs.appendFileSync(learningsPath, entry) } catch { /* non-fatal */ }

      await sendWeeklyReport(learning)
      await logAgentAction({ agentName: 'basnet', triggerType: trigger, outcome: learning.slice(0, 200), durationMs: Date.now() - start })
      return NextResponse.json({ success: true, learning })
    }

    return NextResponse.json({ success: false, error: `Unknown trigger: ${trigger}` })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'basnet' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendAlert('Basnet head agent error', msg, 'urgent', 'basnet').catch(() => null)
    return NextResponse.json({ success: false, error: msg })
  }
}
