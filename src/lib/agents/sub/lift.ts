import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'
import { callClaude, sendAlert, logAgentAction, logSubAgent, readAgentLearnings } from '@/lib/agents/utils'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'
import { getWorldState, getRecentSignals, updateWorldState, publishSignal } from '@/lib/agents/world-state'

export const LIFT_IDENTITY = `
${BASNET_PERSONALITY}
You are Lift, Basnet's retention sub-agent.
Job: catch churn signals early and act immediately.
You watch login frequency, feature usage, payment health.
You are proactive — you do not wait for users to leave.
When you find an at-risk user you say exactly:
"[User segment] at risk. [Specific signal]. Action: [one line]."
`

export interface AtRiskUser {
  userId:     string
  email:      string
  plan:       string
  riskReason: 'inactive_paid' | 'never_invoiced' | 'free_limit_hit' | 'payment_issue' | 'onboarding_gap' | 'power_user_gone'
  daysSince:  number
  action:     string
}

export interface LiftReport {
  timestamp:      Date
  atRiskUsers:    AtRiskUser[]
  upgradeSignals: number
  onboardingGaps: number
  summary:        string
}

type ProfileRow = {
  id:                 string
  email:              string | null
  plan:               string
  stripe_status:      string | null
  created_at:         string
  last_sign_in_at:    string | null
}

// ── Retention outcome check ────────────────────────────────────────────
// For users emailed 3–14 days ago, check if they've been active since.

type ConvRow = {
  created_at: string
  context_used: { userId?: string; riskReason?: string } | null
}

export async function checkRetentionOutcomes(): Promise<{
  totalEmailed: number
  cameBack: number
  conversionRate: number
}> {
  try {
    const supabase = createServiceClient()
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const threeDaysAgo    = new Date(Date.now() -  3 * 24 * 60 * 60 * 1000).toISOString()

    const { data: emailedConvs } = await supabase
      .from('agent_conversations')
      .select('created_at, context_used')
      .eq('agent_name', 'lift')
      .eq('question', 'retention_email')
      .gte('created_at', fourteenDaysAgo)
      .lte('created_at', threeDaysAgo)

    if (!emailedConvs || emailedConvs.length === 0) {
      return { totalEmailed: 0, cameBack: 0, conversionRate: 0 }
    }

    const rows = emailedConvs as ConvRow[]
    let cameBack = 0

    // For each retention email, check if user created an invoice OR payslip
    // in the 3 days after it was sent — real proof the email worked.
    const outcomeResults = await Promise.allSettled(
      rows.map(async row => {
        const userId = row.context_used?.userId
        if (!userId) return false
        const emailSentAt = row.created_at
        const threeAfter  = new Date(new Date(emailSentAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
        const [invR, payR] = await Promise.allSettled([
          supabase.from('invoices').select('id').eq('user_id', userId)
            .gte('created_at', emailSentAt).lte('created_at', threeAfter).limit(1).maybeSingle(),
          supabase.from('payslips').select('id').eq('user_id', userId)
            .gte('created_at', emailSentAt).lte('created_at', threeAfter).limit(1).maybeSingle(),
        ])
        return (invR.status === 'fulfilled' && invR.value.data !== null) ||
               (payR.status === 'fulfilled' && payR.value.data !== null)
      })
    )
    cameBack = outcomeResults.filter(r => r.status === 'fulfilled' && r.value === true).length

    const conversionRate = rows.length > 0 ? Math.round((cameBack / rows.length) * 100) : 0
    return { totalEmailed: rows.length, cameBack, conversionRate }
  } catch {
    return { totalEmailed: 0, cameBack: 0, conversionRate: 0 }
  }
}

// ── Main lift scan ─────────────────────────────────────────────────────

export async function runLift(): Promise<LiftReport> {
  const start = Date.now()

  // ── Activation check (Tab 3 logic) ────────────────────────────────────
  const [ws, recentSignals] = await Promise.all([getWorldState(), getRecentSignals(6)])

  // Stand down: last scan < 6h ago, churn risk low, no failed payments
  const lastLiftSignal = recentSignals.find(s => s.from_agent === 'lift')
  const hoursAgo = lastLiftSignal
    ? (Date.now() - new Date(lastLiftSignal.created_at!).getTime()) / 3600000
    : 999
  const standDown = hoursAgo < 6 && ws.churn_risk_score < 4 && ws.failed_payments_count === 0
  if (standDown) {
    return {
      timestamp: new Date(),
      atRiskUsers: [],
      upgradeSignals: ws.upgrade_candidates,
      onboardingGaps: ws.onboarding_gap_count,
      summary: `Stand down — last scan ${hoursAgo.toFixed(1)}h ago, churn risk ${ws.churn_risk_score}/10.`,
    }
  }

  const supabase = createServiceClient()
  const now = Date.now()

  // Check how last week's retention emails performed (non-blocking)
  const outcomes = await checkRetentionOutcomes()
  if (outcomes.totalEmailed > 0) {
    await logAgentAction({
      agentName: 'lift',
      triggerType: 'retention_outcome',
      outcome: `${outcomes.cameBack}/${outcomes.totalEmailed} users came back after retention email (${outcomes.conversionRate}%)`,
    })
  }
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString()
  const twoDaysAgo   = new Date(now - 48 * 60 * 60 * 1000).toISOString()

  const [
    paidUsersR, pastDueR, neverInvoicedR, onboardingGapR,
    recentInvoicesR, recentPayslipsR, recentLoginsR,
    allInvoicesR, allPayslipsR,
  ] = await Promise.allSettled([

    // SIGNAL 1: All paid users — genuine activity filter applied in JS
    supabase.from('profiles')
      .select('id, email, plan, stripe_status, created_at, last_sign_in_at')
      .in('plan', ['starter', 'pro', 'enterprise'])
      .limit(50),

    // SIGNAL 4: Past due (payment issue)
    supabase.from('profiles')
      .select('id, email, plan, stripe_status, created_at, last_sign_in_at')
      .eq('stripe_status', 'past_due')
      .limit(10),

    // SIGNAL 2: Paid users signed up 3+ days ago (never-invoiced check)
    supabase.from('profiles')
      .select('id, email, plan, stripe_status, created_at, last_sign_in_at')
      .in('plan', ['starter', 'pro', 'enterprise'])
      .lt('created_at', threeDaysAgo)
      .limit(10),

    // SIGNAL 5: Onboarding gaps — free users, 48h+ old
    supabase.from('profiles')
      .select('id, email, plan, created_at, last_sign_in_at, stripe_status')
      .eq('plan', 'free')
      .lt('created_at', twoDaysAgo)
      .limit(20),

    // Activity signal A: invoices created in last 7 days
    supabase.from('invoices').select('user_id').gte('created_at', sevenDaysAgo),

    // Activity signal B: payslips created in last 7 days
    supabase.from('payslips').select('user_id').gte('created_at', sevenDaysAgo),

    // Activity signal C: paid profiles with a login in last 7 days
    supabase.from('profiles')
      .select('id')
      .in('plan', ['starter', 'pro', 'enterprise'])
      .gte('last_sign_in_at', sevenDaysAgo),

    // SIGNAL 3 + power_user_gone: all invoices with timestamps
    supabase.from('invoices').select('user_id, created_at').limit(2000),

    // power_user_gone: all payslips with timestamps
    supabase.from('payslips').select('user_id, created_at').limit(2000),
  ])

  const atRiskUsers: AtRiskUser[] = []
  let onboardingGaps = 0
  let upgradeSignals = 0

  // ── Build genuine activity sets ────────────────────────────────────────
  // A paid user is considered active if ANY of the three signals is true:
  //   A) created an invoice in the last 7 days
  //   B) created a payslip in the last 7 days
  //   C) logged in within the last 7 days (last_sign_in_at)
  type ActivityRow  = { user_id?: string; id?: string; created_at?: string }
  const recentInvoiceIds = new Set(
    (recentInvoicesR.status === 'fulfilled' ? recentInvoicesR.value.data ?? [] : [] as ActivityRow[])
      .map((r: ActivityRow) => r.user_id!)
  )
  const recentPayslipIds = new Set(
    (recentPayslipsR.status === 'fulfilled' ? recentPayslipsR.value.data ?? [] : [] as ActivityRow[])
      .map((r: ActivityRow) => r.user_id!)
  )
  const recentLoginIds = new Set(
    (recentLoginsR.status === 'fulfilled' ? recentLoginsR.value.data ?? [] : [] as ActivityRow[])
      .map((r: ActivityRow) => r.id!)
  )
  const isGenuinelyActive = (userId: string): boolean =>
    recentInvoiceIds.has(userId) || recentPayslipIds.has(userId) || recentLoginIds.has(userId)

  // All invoice + payslip history (for upgrade signals and power_user_gone detection)
  const allInvoiceData = (allInvoicesR.status === 'fulfilled' ? allInvoicesR.value.data ?? [] : []) as ActivityRow[]
  const allPayslipData = (allPayslipsR.status === 'fulfilled' ? allPayslipsR.value.data ?? [] : []) as ActivityRow[]

  // Count old activity (before 7 days ago) per user — used for power_user_gone
  const oldInvoiceCount = new Map<string, number>()
  const oldPayslipCount = new Map<string, number>()
  for (const r of allInvoiceData) {
    if (r.created_at && r.created_at < sevenDaysAgo)
      oldInvoiceCount.set(r.user_id!, (oldInvoiceCount.get(r.user_id!) ?? 0) + 1)
  }
  for (const r of allPayslipData) {
    if (r.created_at && r.created_at < sevenDaysAgo)
      oldPayslipCount.set(r.user_id!, (oldPayslipCount.get(r.user_id!) ?? 0) + 1)
  }

  // All user_ids who have ever created an invoice (for never_invoiced + onboarding_gap)
  const everInvoicedIds = new Set(allInvoiceData.map(r => r.user_id!))

  // SIGNAL 1: Paid users with no invoice, payslip, OR login in last 7 days
  const allPaidUsers = (paidUsersR.status === 'fulfilled' ? paidUsersR.value.data ?? [] : []) as ProfileRow[]
  for (const row of allPaidUsers.filter(r => !isGenuinelyActive(r.id)).slice(0, 5)) {
    const lastActivity = row.last_sign_in_at ?? row.created_at
    const daysSince    = Math.floor((now - new Date(lastActivity).getTime()) / 86400000)
    atRiskUsers.push({
      userId:     row.id,
      email:      row.email ?? '',
      plan:       row.plan,
      riskReason: 'inactive_paid',
      daysSince,
      action:     `Send re-engagement email highlighting newest ${row.plan} feature`,
    })
  }

  // SIGNAL 4: Payment issues
  if (pastDueR.status === 'fulfilled') {
    for (const row of (pastDueR.value.data ?? []) as ProfileRow[]) {
      atRiskUsers.push({
        userId:     row.id,
        email:      row.email ?? '',
        plan:       row.plan,
        riskReason: 'payment_issue',
        daysSince:  0,
        action:     'Send payment update email immediately — risk of auto-cancellation',
      })
    }
  }

  // SIGNAL 2: Never invoiced paid users
  if (neverInvoicedR.status === 'fulfilled') {
    for (const row of (neverInvoicedR.value.data ?? []).slice(0, 5) as ProfileRow[]) {
      if (!everInvoicedIds.has(row.id)) {
        const daysSince = Math.floor((now - new Date(row.created_at).getTime()) / 86400000)
        atRiskUsers.push({
          userId:     row.id,
          email:      row.email ?? '',
          plan:       row.plan,
          riskReason: 'never_invoiced',
          daysSince,
          action:     'Send onboarding email with "create your first invoice in 2 minutes" guide',
        })
      }
    }
  }

  // SIGNAL 5: Onboarding gaps — free users who never invoiced
  if (onboardingGapR.status === 'fulfilled') {
    const freeRows = (onboardingGapR.value.data ?? []) as ProfileRow[]
    onboardingGaps = freeRows.filter(r => !everInvoicedIds.has(r.id)).length
  }

  // SIGNAL 3: Upgrade signals — free users with 8+ invoices (approaching limit)
  const invoiceCountByUser = new Map<string, number>()
  for (const r of allInvoiceData) {
    invoiceCountByUser.set(r.user_id!, (invoiceCountByUser.get(r.user_id!) ?? 0) + 1)
  }
  upgradeSignals = Array.from(invoiceCountByUser.values()).filter(c => c >= 8).length

  // SIGNAL 6: power_user_gone — had 3+ invoices OR payslips before 7 days ago, now cold
  // Highest-priority re-engagement: these users proved the product works for them.
  const alreadyFlagged = new Set(atRiskUsers.map(u => u.userId))
  for (const row of allPaidUsers) {
    if (alreadyFlagged.has(row.id) || isGenuinelyActive(row.id)) continue
    const hadInvoices = (oldInvoiceCount.get(row.id) ?? 0) >= 3
    const hadPayslips = (oldPayslipCount.get(row.id) ?? 0) >= 3
    if (hadInvoices || hadPayslips) {
      const lastActivity = row.last_sign_in_at ?? row.created_at
      atRiskUsers.push({
        userId:     row.id,
        email:      row.email ?? '',
        plan:       row.plan,
        riskReason: 'power_user_gone',
        daysSince:  Math.floor((now - new Date(lastActivity).getTime()) / 86400000),
        action:     'Send personalised re-engagement — power user gone cold',
      })
    }
  }

  // Generate actions via Claude for found users (batch, not per-user — to save tokens)
  // Actions are already pre-set above; Claude is used for personalised email only

  const summary = atRiskUsers.length === 0 && upgradeSignals === 0
    ? `No at-risk users. ${onboardingGaps} onboarding gaps.`
    : `${atRiskUsers.length} at-risk users. ${upgradeSignals} upgrade signals. ${onboardingGaps} onboarding gaps.`

  const report: LiftReport = {
    timestamp: new Date(),
    atRiskUsers,
    upgradeSignals,
    onboardingGaps,
    summary,
  }

  // Alerts
  if (atRiskUsers.length > 0) {
    const breakdown = atRiskUsers
      .map(u => `• ${u.plan} user (${u.riskReason}, ${u.daysSince}d) — ${u.action}`)
      .join('\n')
    await sendAlert(
      `Lift: ${atRiskUsers.length} users at risk`,
      breakdown,
      'warning',
      'lift',
    )
  }

  if (upgradeSignals > 0) {
    await sendAlert(
      `Lift: ${upgradeSignals} users ready to upgrade`,
      'Free users hitting invoice limit. Consider a targeted upgrade prompt.',
      'info',
      'lift',
    )
  }

  await logAgentAction({
    agentName:    'lift',
    triggerType:  'daily_scan',
    actionsTaken: { atRiskCount: atRiskUsers.length, upgradeSignals, onboardingGaps } as unknown as Record<string, unknown>,
    outcome:      summary,
    durationMs:   Date.now() - start,
  })

  await logSubAgent('lift', 'daily_scan', '', summary, Date.now() - start, true)

  // ── Write world state + publish signal ─────────────────────────────────
  // Churn risk score: (at-risk users) / max(1, total paid proxy) * 10, capped at 10
  const paidAtRisk = atRiskUsers.filter(u => u.plan !== 'free').length
  const totalPaidProxy = Math.max(1, atRiskUsers.length + upgradeSignals + 5)
  const churnScore = Math.min(10, Math.round((paidAtRisk * 2 + (atRiskUsers.length - paidAtRisk)) / totalPaidProxy * 10))

  await updateWorldState({
    churn_risk_score: churnScore,
    upgrade_candidates: upgradeSignals,
    onboarding_gap_count: onboardingGaps,
    lift_outcome_summary: summary.slice(0, 200),
    last_updated_by: 'lift',
  })

  const severity = churnScore >= 7 ? 'urgent' : churnScore >= 4 ? 'warning' : 'info'
  await publishSignal({
    from_agent: 'lift',
    signal_type: atRiskUsers.length > 0 ? 'risk_detected' : 'action_taken',
    severity,
    summary: `${summary} Churn risk score: ${churnScore}/10.`,
    data: {
      churn_risk_score: churnScore,
      at_risk_count: atRiskUsers.length,
      upgrade_candidates: upgradeSignals,
      onboarding_gaps: onboardingGaps,
      top_risk_reasons: [...new Set(atRiskUsers.map(u => u.riskReason))],
    },
    suggested_reactions: churnScore >= 7
      ? 'Basnet should elevate churn_risk_score in world state. Spark should shift to RETENTION mode.'
      : upgradeSignals > 0
      ? `Spark should run upgrade prompts for ${upgradeSignals} users at threshold.`
      : 'No immediate action required.',
    expires_after_hours: 24,
  })

  return report
}

// ── Retention email generation ─────────────────────────────────────────

export async function liftRetentionEmail(
  user: AtRiskUser
): Promise<{ subject: string; body: string }> {
  try {
    const learnings = await readAgentLearnings(3)
    const learningsContext = learnings
      ? `\nPast learnings — what worked and failed in previous retention emails:\n${learnings}`
      : ''

    const powerUserNote = user.riskReason === 'power_user_gone'
      ? '\nThis was a highly engaged user — previously generating 3+ invoices or payslips per week. Open with exactly: "We noticed you haven\'t generated a payslip recently — is everything OK?" Be human and caring, not salesy. One soft CTA.'
      : ''

    const raw = await callClaude({
      systemPrompt: `${LIFT_IDENTITY}${learningsContext}`,
      userMessage:  `Write a retention email for this user.
Plan: ${user.plan} · Risk: ${user.riskReason} · Days inactive: ${user.daysSince}${powerUserNote}
Rules:
- 4 sentences max
- Personal not generic
- Never say "we miss you"
- Reference what they signed up for (Australian invoicing/payroll for small business)
- One clear action for them to take
Return JSON: { "subject": "string", "body": "string" }`,
      maxTokens:    400,
      expectJson:   true,
    })
    return JSON.parse(raw) as { subject: string; body: string }
  } catch {
    return {
      subject: 'Quick check-in from SAB Account AI',
      body:    `Hi — Sanjog here, founder of SAB Account AI. Noticed you haven't been back in a while and wanted to check in. Is there anything about the product that isn't clicking for you? Reply directly — I read every one. — Sanjog`,
    }
  }
}

export async function liftSendRetentionEmail(user: AtRiskUser): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !user.email) return false

  try {
    const email = await liftRetentionEmail(user)
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error } = await resend.emails.send({
      from:    'Sanjog Basnet <basnet@sabaccountai.com>',
      to:      user.email,
      subject: email.subject,
      html:    `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;font-size:15px;line-height:1.7;color:#1f2937">${email.body.replace(/\n/g, '<br>')}</div>`,
      text:    email.body,
    })

    if (error) { console.error('liftSendRetentionEmail error:', error); return false }

    const supabase = createServiceClient()
    await supabase.from('agent_conversations').insert({
      agent_name:   'lift',
      question:     'retention_email',
      answer:       `${email.subject}\n\n${email.body}`,
      context_used: { userId: user.userId, riskReason: user.riskReason },
    })

    return true
  } catch (err) {
    console.error('liftSendRetentionEmail failed:', err)
    return false
  }
}

// Backward-compat alias for voice/route.ts
export async function liftScanForChurnRisk(): Promise<{ totalAtRisk: number; atRiskUsers: AtRiskUser[] }> {
  const report = await runLift()
  return { totalAtRisk: report.atRiskUsers.length, atRiskUsers: report.atRiskUsers }
}

// ── Onboarding email: fires immediately when a new user signs up ───────

export async function liftOnboardingEmail(email: string, name: string): Promise<{ sent: boolean }> {
  if (!process.env.RESEND_API_KEY || !email) return { sent: false }
  const start = Date.now()
  try {
    const learnings = await readAgentLearnings(2).catch(() => '')
    const emailRaw = await callClaude({
      systemPrompt: `${LIFT_IDENTITY}${learnings ? `\n\nPast learnings:\n${learnings}` : ''}`,
      userMessage: `Write a warm welcome email for a brand-new SAB Account AI user.
Name: ${name || 'there'}
Goal: get them to their first win in the next 5 minutes — create an invoice or generate a payslip.
Keep it short. Founder voice (Sanjog). One clear CTA.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`,
      maxTokens: 350,
      expectJson: true,
    })

    type EmailJSON = { subject: string; body: string }
    const emailJSON = JSON.parse(emailRaw) as EmailJSON

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Sanjog from SAB Account AI <basnet@sabaccountai.com>',
      to: email,
      subject: emailJSON.subject,
      text: emailJSON.body,
    })

    const supabase = createServiceClient()
    await supabase.from('agent_conversations').insert({
      agent_name: 'lift',
      question: `onboarding: ${email}`,
      answer: emailJSON.body,
      context_used: { trigger: 'new_user_event' },
    })

    await logSubAgent('lift', 'onboarding_email', email, emailJSON.subject, Date.now() - start, true)
    return { sent: true }
  } catch (err) {
    await logSubAgent('lift', 'onboarding_email', email, String(err), Date.now() - start, false)
    return { sent: false }
  }
}

// ── Re-engagement email: fires for users inactive ~30 days ────────────

export async function liftReEngagementEmail(email: string, name: string): Promise<{ sent: boolean }> {
  if (!process.env.RESEND_API_KEY || !email) return { sent: false }
  const start = Date.now()
  try {
    const learnings = await readAgentLearnings(2).catch(() => '')
    const emailRaw = await callClaude({
      systemPrompt: `${LIFT_IDENTITY}${learnings ? `\n\nPast learnings:\n${learnings}` : ''}`,
      userMessage: `Write a re-engagement email for a user who hasn't used SAB Account AI in 30 days.
Name: ${name || 'there'}
They've used the product before. Remind them of something timely they can do right now — end of financial year invoices, payslip reconciliation, etc.
Genuine. One hook, one value reminder, one soft CTA. Not pushy.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`,
      maxTokens: 350,
      expectJson: true,
    })

    type EmailJSON = { subject: string; body: string }
    const emailJSON = JSON.parse(emailRaw) as EmailJSON

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Sanjog from SAB Account AI <basnet@sabaccountai.com>',
      to: email,
      subject: emailJSON.subject,
      text: emailJSON.body,
    })

    const supabase = createServiceClient()
    await supabase.from('agent_conversations').insert({
      agent_name: 'lift',
      question: `re_engagement: ${email}`,
      answer: emailJSON.body,
      context_used: { trigger: 'inactive_30d' },
    })

    await logSubAgent('lift', 're_engagement_email', email, emailJSON.subject, Date.now() - start, true)
    return { sent: true }
  } catch (err) {
    await logSubAgent('lift', 're_engagement_email', email, String(err), Date.now() - start, false)
    return { sent: false }
  }
}
