import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'
import { callClaude, sendAlert, logAgentAction, logSubAgent } from '@/lib/agents/utils'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'

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
  riskReason: 'inactive_paid' | 'never_invoiced' | 'free_limit_hit' | 'payment_issue' | 'onboarding_gap'
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
  updated_at:         string
}

// ── Main lift scan ─────────────────────────────────────────────────────

export async function runLift(): Promise<LiftReport> {
  const start = Date.now()
  const supabase = createServiceClient()
  const now = Date.now()
  const tenDaysAgo  = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString()
  const twoDaysAgo  = new Date(now - 48 * 60 * 60 * 1000).toISOString()

  const [inactivePaidR, pastDueR, neverInvoicedR, onboardingGapR, upgradeSignalR] =
    await Promise.allSettled([

      // SIGNAL 1: Paid users inactive 10+ days
      supabase.from('profiles')
        .select('id, email, plan, stripe_status, created_at, updated_at')
        .in('plan', ['starter', 'pro', 'enterprise'])
        .lt('updated_at', tenDaysAgo)
        .limit(10),

      // SIGNAL 4: Past due (payment issue)
      supabase.from('profiles')
        .select('id, email, plan, stripe_status, created_at, updated_at')
        .eq('stripe_status', 'past_due')
        .limit(10),

      // SIGNAL 2: Paid users who never invoiced (signed up 3+ days ago)
      supabase.from('profiles')
        .select('id, email, plan, stripe_status, created_at, updated_at')
        .in('plan', ['starter', 'pro', 'enterprise'])
        .lt('created_at', threeDaysAgo)
        .limit(10),

      // SIGNAL 5: Onboarding gaps — free users, 48h+ old, no invoice
      supabase.from('profiles')
        .select('id, email, plan, created_at, updated_at, stripe_status')
        .eq('plan', 'free')
        .lt('created_at', twoDaysAgo)
        .limit(20),

      // SIGNAL 3: Free users approaching invoice limit (upgrade signals)
      supabase.from('invoices')
        .select('user_id')
        .then(r => ({
          data: r.data,
          error: r.error,
        })),
    ])

  const atRiskUsers: AtRiskUser[] = []
  let onboardingGaps = 0
  let upgradeSignals = 0

  // SIGNAL 1: Inactive paid users
  if (inactivePaidR.status === 'fulfilled') {
    for (const row of (inactivePaidR.value.data ?? []).slice(0, 5) as ProfileRow[]) {
      const daysSince = Math.floor((now - new Date(row.updated_at).getTime()) / 86400000)
      atRiskUsers.push({
        userId:     row.id,
        email:      row.email ?? '',
        plan:       row.plan,
        riskReason: 'inactive_paid',
        daysSince,
        action:     `Send re-engagement email highlighting newest ${row.plan} feature`,
      })
    }
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

  // SIGNAL 2: Never invoiced paid users — check against invoice table
  if (neverInvoicedR.status === 'fulfilled' && upgradeSignalR.status === 'fulfilled') {
    const invoicedUserIds = new Set(
      (upgradeSignalR.value.data ?? []).map((r: Record<string, unknown>) => r.user_id as string)
    )
    for (const row of (neverInvoicedR.value.data ?? []).slice(0, 5) as ProfileRow[]) {
      if (!invoicedUserIds.has(row.id)) {
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
  if (onboardingGapR.status === 'fulfilled' && upgradeSignalR.status === 'fulfilled') {
    const invoicedUserIds = new Set(
      (upgradeSignalR.value.data ?? []).map((r: Record<string, unknown>) => r.user_id as string)
    )
    const freeRows = (onboardingGapR.value.data ?? []) as ProfileRow[]
    onboardingGaps = freeRows.filter(r => !invoicedUserIds.has(r.id)).length
  }

  // SIGNAL 3: Upgrade signals — free users with 8+ invoices (approaching limit)
  if (upgradeSignalR.status === 'fulfilled') {
    const invoiceData = upgradeSignalR.value.data ?? []
    const countByUser = new Map<string, number>()
    for (const row of invoiceData as { user_id: string }[]) {
      countByUser.set(row.user_id, (countByUser.get(row.user_id) ?? 0) + 1)
    }
    upgradeSignals = Array.from(countByUser.values()).filter(c => c >= 8).length
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
  return report
}

// ── Retention email generation ─────────────────────────────────────────

export async function liftRetentionEmail(
  user: AtRiskUser
): Promise<{ subject: string; body: string }> {
  try {
    const raw = await callClaude({
      systemPrompt: LIFT_IDENTITY,
      userMessage:  `Write a retention email for this user.
Plan: ${user.plan} · Risk: ${user.riskReason} · Days inactive: ${user.daysSince}
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
      from:    'Sanjog Basnet <sanjog@sabaccountai.com.au>',
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
