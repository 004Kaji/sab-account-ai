import { createServiceClient } from '@/lib/supabase'
import { callClaude, logSubAgent } from '@/lib/agents/utils'

export const LIFT_IDENTITY = `
You are Lift, Basnet's retention sub-agent.
Your job: catch churn signals early and act on them.
You watch: login frequency, feature usage, payment health, plan tier movement.
You are proactive — you do not wait for users to leave.
`

export interface LiftUser {
  userId: string
  email: string
  churnRisk: string
  suggestedAction: string
}

export interface LiftReport {
  atRiskUsers: LiftUser[]
  totalAtRisk: number
}

type ProfileRow = {
  id: string
  email: string | null
  plan: string
  subscription_status: string | null
  updated_at: string
}

export async function liftScanForChurnRisk(): Promise<LiftReport> {
  const start = Date.now()
  const supabase = createServiceClient()
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

  const [paidInactiveResult, pastDueResult] = await Promise.allSettled([
    // Paid users not active recently (using updated_at as proxy)
    supabase.from('profiles').select('id, email, plan, subscription_status, updated_at')
      .neq('plan', 'free').lt('updated_at', tenDaysAgo).limit(10),
    // Past due users
    supabase.from('profiles').select('id, email, plan, subscription_status, updated_at')
      .eq('subscription_status', 'past_due').limit(10),
  ])

  const atRiskUsers: LiftUser[] = []

  if (paidInactiveResult.status === 'fulfilled') {
    const rows = (paidInactiveResult.value.data ?? []) as ProfileRow[]
    for (const r of rows.slice(0, 5)) {
      atRiskUsers.push({
        userId: r.id,
        email: r.email ?? '',
        churnRisk: `${r.plan} user — no activity in 10+ days`,
        suggestedAction: 'Send re-engagement email with a new feature highlight',
      })
    }
  }

  if (pastDueResult.status === 'fulfilled') {
    const rows = (pastDueResult.value.data ?? []) as ProfileRow[]
    for (const r of rows) {
      atRiskUsers.push({
        userId: r.id,
        email: r.email ?? '',
        churnRisk: `${r.plan} plan — payment past due`,
        suggestedAction: 'Send payment update email immediately — risk of auto-cancellation',
      })
    }
  }

  const report: LiftReport = { atRiskUsers, totalAtRisk: atRiskUsers.length }
  await logSubAgent('lift', 'scan', '', `${atRiskUsers.length} at-risk users`, Date.now() - start, true)
  return report
}

export async function liftGenerateRetentionEmail(
  userId: string,
  churnRisk: string,
): Promise<{ subject: string; body: string }> {
  try {
    const raw = await callClaude({
      systemPrompt: LIFT_IDENTITY,
      userMessage: `User ${userId} churn risk: ${churnRisk}\n\nWrite a 4-sentence retention email. Personal, not generic. No "we miss you" templates. Sign off as Sanjog, founder of SAB Account AI.\n\nReturn JSON: { "subject": "string", "body": "string" }`,
      maxTokens: 300,
      expectJson: true,
    })
    return JSON.parse(raw) as { subject: string; body: string }
  } catch {
    return {
      subject: 'Quick check-in from SAB Account AI',
      body: `Hi — Sanjog here, founder of SAB Account AI. I noticed you haven't been back in a while and wanted to check in. Is there anything about the product that isn't working for you? Reply directly to this email — I read every one. — Sanjog`,
    }
  }
}
