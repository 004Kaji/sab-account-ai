export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import {
  readMasterContext, readAgentLearnings, callClaude, sendAlert, logAgentAction,
  isRateLimited, briefingAlreadySentToday, getStripeMetrics,
  checkAgentSchedules, getLatestAtlasIntel, getLatestLiftSignal,
} from '@/lib/agents/toolkits/basnet-toolkit'
import { BASNET_PERSONALITY, EMAIL_PERSONALITY, applyPersonality } from '@/lib/agents/personality'
import { runFlux, fluxDiagnose } from '@/lib/agents/sub/flux'
import { sparkWeeklyBrief, sparkSendAccountantEmails } from '@/lib/agents/sub/spark'
import { relayAnswer, relayVisaCheck, relayGoalCheck } from '@/lib/agents/sub/relay'
import { runScout } from '@/lib/agents/sub/scout'
import { runLift } from '@/lib/agents/sub/lift'
import { atlasResearch, atlasWeeklyIntel, atlasMonitorBrand } from '@/lib/agents/sub/atlas'
import {
  runWatcherCycle, evaluateAndAlert, saveWatcherReport,
  proactiveInsight, getLastProactiveInsightTime, getLastWatcherReport,
} from '@/lib/agents/watcher'

import { classifyQuestion } from '@/lib/agents/classification'

// ── Classify question (shared with voice route) ────────────────────────

function classify(question: string) {
  return classifyQuestion(question)
}

function isMonday(): boolean {
  return new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', weekday: 'long' }) === 'Monday'
}

function weekdayDate(): string {
  return new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney', weekday: 'long', day: 'numeric', month: 'long',
  })
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

    // ── TRIGGER: morning ───────────────────────────────────────────────
    if (trigger === 'morning') {
      if (await isRateLimited('basnet_morning', 2)) {
        return NextResponse.json({ success: true, message: 'Morning briefing already ran today' })
      }
      if (await briefingAlreadySentToday()) {
        return NextResponse.json({ success: true, message: 'Briefing already sent today' })
      }

      const monday = isMonday()

      const [masterContextR, learningsR, personalR, sabR, scoutR, liftR, scheduleR, atlasR] = await Promise.allSettled([
        readMasterContext(),
        readAgentLearnings(4),
        Promise.all([relayVisaCheck(), relayGoalCheck()]),
        runFlux(),
        runScout(),
        runLift(),
        checkAgentSchedules(),
        getLatestAtlasIntel(),
      ])

      const masterContext = masterContextR.status === 'fulfilled' ? masterContextR.value : ''
      const learnings     = learningsR.status     === 'fulfilled' ? learningsR.value     : ''
      const visa      = personalR.status  === 'fulfilled' ? personalR.value[0]  : null
      const goals     = personalR.status  === 'fulfilled' ? personalR.value[1]  : null
      const flux      = sabR.status       === 'fulfilled' ? sabR.value          : null
      const scout     = scoutR.status     === 'fulfilled' ? scoutR.value        : null
      const lift      = liftR.status      === 'fulfilled' ? liftR.value         : null
      const missed    = scheduleR.status  === 'fulfilled' ? scheduleR.value.missed : []
      const atlasIntel = atlasR.status    === 'fulfilled' ? atlasR.value        : ''

      // Alert immediately if any agent missed its schedule
      if (missed.length > 0) {
        await sendAlert(
          `Agent schedule missed: ${missed.join(', ')}`,
          `These agents did not run in their expected window: ${missed.join(', ')}.\nCheck n8n workflows and Vercel logs.`,
          'warning', 'basnet',
        )
      }

      const stripe = await getStripeMetrics()

      const briefingData = JSON.stringify({
        urgent: visa?.urgency === 'urgent' ? `Visa expires in ${visa.daysUntilExpiry} days` : null,
        payg: flux ? (flux.payg.allPassing ? '5/5 passing' : `FAILING: ${flux.payg.results.filter(r => !r.pass).map(r => r.tc).join(', ')}`) : 'unknown',
        mrr: stripe.mrr,
        newPaid: stripe.newPaidThisWeek,
        churn: stripe.churnThisWeek,
        goals: goals ? goals.slice(0, 200) : null,
        monday,
        scoutAlert: scout?.criticalFail ? `Critical product failure: ${scout.tests.filter(t => !t.pass).map(t => t.name).join(', ')}` : null,
        liftAlert: (lift?.atRiskUsers.length ?? 0) > 0 ? `${lift!.atRiskUsers.length} users at risk` : null,
        missedAgents: missed.length > 0 ? missed : null,
        marketIntel: atlasIntel || null,
      })

      const today = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', weekday: 'long', day: 'numeric', month: 'long' })

      const learningsSection = learnings
        ? `\n\nWhat worked and failed in recent weeks:\n${learnings}`
        : ''

      const briefing = await callClaude({
        systemPrompt: `${EMAIL_PERSONALITY}\n\nContext: ${masterContext.slice(0, 1000)}${learningsSection}`,
        userMessage: `Morning briefing — ${today}

Data: ${briefingData}

Write morning briefing. Max 5 sentences.
Format: URGENT (if any) · SAB TODAY · FOCUS · NORTH STAR CHECK
Direct. Specific numbers. Basnet voice.
If past learnings are relevant to today's data, reference them.`,
        maxTokens: 300,
      })

      const supabase = createServiceClient()
      const todayStr = new Date().toISOString().split('T')[0]
      await supabase.from('agent_briefings').upsert({
        briefing_date: todayStr,
        metrics: JSON.parse(briefingData) as Record<string, unknown>,
        content: briefing,
        sent_to_telegram: true,
      }, { onConflict: 'briefing_date' })

      await sendAlert(`Morning — ${weekdayDate()}`, briefing, 'info', 'basnet')
      await logAgentAction({ agentName: 'basnet', triggerType: trigger, outcome: briefing.slice(0, 200), durationMs: Date.now() - start })
      return NextResponse.json({ success: true, briefing })
    }

    // ── TRIGGER: weekly ────────────────────────────────────────────────
    if (trigger === 'weekly') {
      const stripe = await getStripeMetrics()

      // Read cross-agent signals before running Spark — so the brief reflects real state
      const [liftSignalR, atlasLastR] = await Promise.allSettled([
        getLatestLiftSignal(),
        getLatestAtlasIntel(),
      ])
      const liftSignal  = liftSignalR.status  === 'fulfilled' ? liftSignalR.value  : { atRiskCount: 0, upgradeSignals: 0 }
      const atlasLast   = atlasLastR.status   === 'fulfilled' ? atlasLastR.value   : ''

      const [briefR, goalsR, atlasR] = await Promise.allSettled([
        sparkWeeklyBrief({
          newSignups:    0,
          mrr:           stripe.mrr,
          mrrChange:     stripe.mrrChange,
          churnThisWeek: stripe.churnThisWeek,
          liftAtRiskCount: liftSignal.atRiskCount,
          atlasIntel:    atlasLast,
        }),
        relayGoalCheck(),
        atlasWeeklyIntel(),
      ])

      const brief = briefR.status === 'fulfilled' ? briefR.value : null
      const goals = goalsR.status === 'fulfilled' ? goalsR.value : null
      const atlas = atlasR.status === 'fulfilled' ? atlasR.value : null

      // Run brand monitoring in background — don't block weekly brief
      atlasMonitorBrand().catch(() => null)

      const summaryParts = [
        brief ? `Week focus: ${brief.weekFocus}` : '',
        brief ? `Blog: ${brief.blogTitle}` : '',
        goals ? `Goals: ${goals.slice(0, 150)}` : '',
      ]

      if (atlas) {
        summaryParts.push(`\nMarket intelligence this week:\n${atlas.summary}`)
        if (atlas.actionItem) summaryParts.push(`Action: ${atlas.actionItem}`)
      }

      const summary = summaryParts.filter(Boolean).join('\n')

      await sendAlert(`Weekly — ${weekdayDate()}`, summary, 'info', 'basnet')
      await logAgentAction({ agentName: 'basnet', triggerType: trigger, outcome: summary.slice(0, 200), durationMs: Date.now() - start })
      return NextResponse.json({ success: true, brief, goals, atlas })
    }

    // ── TRIGGER: ask ───────────────────────────────────────────────────
    if (trigger === 'ask' || trigger === 'manual') {
      const question = body.question ?? ''
      if (!question) return NextResponse.json({ success: false, error: 'question required' })

      const cls = classify(question)

      // Read master context + learnings in parallel — both needed before any Claude call
      const [masterContext, askLearnings] = await Promise.all([
        readMasterContext(),
        readAgentLearnings(3),
      ])

      const learningsCtx = askLearnings
        ? `\n\nWhat worked and failed in recent weeks:\n${askLearnings}`
        : ''

      let answer = ''
      let agentUsed = 'basnet'

      if (cls === 'QUALITY') {
        const scout = await runScout()
        const failing = scout.tests.filter(t => !t.pass)
        answer = failing.length === 0
          ? `All ${scout.tests.length} product tests passing. Product healthy.`
          : `${failing.length} tests failing: ${failing.map(t => `${t.name} — ${t.actual}`).join(', ')}`
        agentUsed = 'scout'
      } else if (cls === 'RETENTION') {
        const lift = await runLift()
        answer = lift.atRiskUsers.length === 0
          ? `No at-risk users right now. ${lift.upgradeSignals} users near upgrade threshold.`
          : `${lift.atRiskUsers.length} at-risk users. Top risk: ${lift.atRiskUsers[0]?.riskReason ?? 'unknown'}. Action: ${lift.atRiskUsers[0]?.action ?? 'check dashboard'}`
        agentUsed = 'lift'
      } else if (cls === 'MARKET') {
        answer = await atlasResearch(question)
        agentUsed = 'atlas'
      } else if (cls === 'SAB_PRODUCT') {
        answer = await fluxDiagnose(question)
        agentUsed = 'flux'
      } else if (cls === 'SAB_MARKETING') {
        answer = await callClaude({
          systemPrompt: `${BASNET_PERSONALITY}\n\nContext: ${masterContext.slice(0, 1500)}${learningsCtx}`,
          userMessage: question,
          maxTokens: 400,
        })
        agentUsed = 'spark'
      } else if (cls === 'MAC') {
        answer = (await relayAnswer(question, 'local')).answer
        agentUsed = 'relay'
      } else if (cls === 'PERSONAL') {
        answer = (await relayAnswer(question)).answer
        agentUsed = 'relay'
      } else {
        answer = await callClaude({
          systemPrompt: `${BASNET_PERSONALITY}\n\nContext: ${masterContext.slice(0, 2000)}${learningsCtx}`,
          userMessage: question,
          maxTokens: 500,
        })
      }

      answer = applyPersonality(answer)

      const supabase = createServiceClient()
      await supabase.from('agent_conversations').insert({ agent_name: agentUsed, question, answer, context_used: { classification: cls } })
      await logAgentAction({ agentName: 'basnet', triggerType: trigger, inputContext: { question, cls }, decision: agentUsed, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, answer, agentUsed, classification: cls })
    }

    // ── TRIGGER: watch ─────────────────────────────────────────────────
    if (trigger === 'watch') {
      const previous = await getLastWatcherReport()
      const report = await runWatcherCycle()
      const alertsSent = await evaluateAndAlert(report, previous)
      const lastInsight = await getLastProactiveInsightTime()
      if (!lastInsight || lastInsight < new Date(Date.now() - 3600000)) {
        await proactiveInsight(report).catch(() => null)
      }
      await saveWatcherReport(report, alertsSent)
      await logAgentAction({ agentName: 'basnet', triggerType: trigger, actionsTaken: { alertsSent }, outcome: 'watch cycle complete' })
      return NextResponse.json({ success: true, alertsSent, timestamp: report.timestamp })
    }

    // ── TRIGGER: sentry_webhook ────────────────────────────────────────
    if (trigger === 'sentry_webhook') {
      const payload = body.payload ?? {}
      const errorType = payload.error as string | undefined
      const fileName  = payload.file  as string | undefined
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

      const diagnosis = await fluxDiagnose(`${errorType}: ${message}`, fileName).catch(() => '')
      await sendAlert(`Sentry: ${errorType}`, `${message}\nFile: ${fileName}\nCount: ${count}\n\n${diagnosis}`, severity === 'critical' ? 'urgent' : 'warning', 'flux')
      await logAgentAction({ agentName: 'basnet', triggerType: trigger, inputContext: payload, decision: severity, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, received: true, severity })
    }

    // ── TRIGGER: stripe_event ──────────────────────────────────────────
    if (trigger === 'stripe_event') {
      const payload  = body.payload ?? {}
      const eventType = payload.type as string | undefined

      if (eventType === 'checkout.session.completed') {
        const plan = (payload.plan as string | undefined) ?? 'unknown'
        await sendAlert(`New paid user — ${plan}`, `User upgraded to ${plan}. MRR is growing.`, 'info', 'basnet')
      } else if (eventType === 'invoice.payment_failed') {
        const email = (payload.customer_email as string | undefined) ?? 'unknown'
        await sendAlert(`Payment failed — ${email}`, `Failed payment for ${email}. Check Stripe for retry.`, 'urgent', 'basnet')
      } else if (eventType === 'customer.subscription.deleted') {
        const plan = (payload.plan as string | undefined) ?? 'unknown'
        await sendAlert(`User churned — ${plan}`, `${plan} subscription cancelled. Check Stripe for reason.`, 'warning', 'basnet')
      }

      await logAgentAction({ agentName: 'basnet', triggerType: trigger, inputContext: { eventType }, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, received: true })
    }

    // ── TRIGGER: new_signup ────────────────────────────────────────────
    if (trigger === 'new_signup') {
      const payload = body.payload ?? {}
      const email  = payload.email  as string | undefined
      const source = (payload.source as string | undefined) ?? 'direct'
      await sendAlert(`New signup — ${source}`, `${email ?? 'new user'} joined via ${source}.`, 'info', 'basnet')
      await logAgentAction({ agentName: 'basnet', triggerType: trigger, inputContext: { email, source }, durationMs: Date.now() - start })
      return NextResponse.json({ success: true, received: true })
    }

    return NextResponse.json({ success: false, error: `Unknown trigger: ${trigger}` })

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'basnet' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendAlert('Basnet head agent error', msg, 'urgent', 'basnet').catch(() => null)
    return NextResponse.json({ success: false, error: msg })
  }
}
