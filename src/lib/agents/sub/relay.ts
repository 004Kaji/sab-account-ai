import { createServiceClient } from '@/lib/supabase'
import { callClaude, logSubAgent } from '@/lib/agents/utils'

export const RELAY_IDENTITY = `
You are Relay, Basnet's user intelligence sub-agent.
Your job: user health signals, churn risk, support issues.
You care deeply about users staying and growing.
You flag problems before they become departures.
`

export interface RelayUser {
  userId: string
  email: string
  signal: 'onboarding_gap' | 'upgrade_signal' | 'churn_risk' | 'payment_issue'
  detail: string
}

export interface RelayReport {
  onboardingGaps: number
  upgradeSignals: number
  churnRisks: number
  paymentIssues: number
  users: RelayUser[]
}

type ProfileRow = {
  id: string
  email: string | null
  plan: string
  subscription_status: string | null
  created_at: string
}

export async function runRelay(): Promise<RelayReport> {
  const start = Date.now()
  const supabase = createServiceClient()
  const twoDaysAgo   = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const fourteenDays = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const weekAgo      = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [onboardResult, pastDueResult, oldFreeResult] = await Promise.allSettled([
    // Users who signed up 48h+ ago on free plan (likely onboarding gap)
    supabase.from('profiles').select('id, email, plan, subscription_status, created_at')
      .eq('plan', 'free').lt('created_at', twoDaysAgo).limit(20),
    // Users with payment issues
    supabase.from('profiles').select('id, email, plan, subscription_status, created_at')
      .eq('subscription_status', 'past_due').limit(20),
    // Free users inactive for 7+ days (potential churn)
    supabase.from('profiles').select('id, email, plan, subscription_status, created_at')
      .eq('plan', 'free').lt('created_at', fourteenDays).gt('created_at', weekAgo).limit(10),
  ])

  const users: RelayUser[] = []
  let onboardingGaps = 0
  let upgradeSignals = 0
  let churnRisks = 0
  let paymentIssues = 0

  if (onboardResult.status === 'fulfilled') {
    const rows = (onboardResult.value.data ?? []) as ProfileRow[]
    for (const r of rows.slice(0, 5)) {
      onboardingGaps++
      users.push({
        userId: r.id,
        email: r.email ?? '',
        signal: 'onboarding_gap',
        detail: `Free user since ${new Date(r.created_at).toLocaleDateString('en-AU')} — no invoice yet`,
      })
    }
  }

  if (pastDueResult.status === 'fulfilled') {
    const rows = (pastDueResult.value.data ?? []) as ProfileRow[]
    for (const r of rows) {
      paymentIssues++
      users.push({
        userId: r.id,
        email: r.email ?? '',
        signal: 'payment_issue',
        detail: `${r.plan} plan — payment past due`,
      })
    }
  }

  if (oldFreeResult.status === 'fulfilled') {
    const rows = (oldFreeResult.value.data ?? []) as ProfileRow[]
    for (const r of rows.slice(0, 3)) {
      churnRisks++
      users.push({
        userId: r.id,
        email: r.email ?? '',
        signal: 'churn_risk',
        detail: `Free user inactive since ${new Date(r.created_at).toLocaleDateString('en-AU')}`,
      })
    }
  }

  const report: RelayReport = { onboardingGaps, upgradeSignals, churnRisks, paymentIssues, users }
  await logSubAgent('relay', 'scan', '', JSON.stringify({ onboardingGaps, churnRisks, paymentIssues }), Date.now() - start, true)
  return report
}

export async function relayDraftFollowUp(
  userId: string,
  reason: 'onboarding_gap' | 'upgrade_signal' | 'churn_risk' | 'payment_issue',
): Promise<string> {
  const prompts: Record<string, string> = {
    onboarding_gap: 'This user signed up but never created an invoice. Write a 3-sentence email to help them get started with SAB Account AI.',
    upgrade_signal: 'This free user keeps hitting the invoice limit. Write a 3-sentence email showing the value of upgrading to Starter at $9/month.',
    churn_risk: 'This paid user has not logged in for 2 weeks. Write a 3-sentence email to re-engage them without being desperate.',
    payment_issue: 'This user has a failed payment. Write a 3-sentence email to help them update their payment details.',
  }

  try {
    return await callClaude({
      systemPrompt: RELAY_IDENTITY,
      userMessage: `User ID: ${userId}\n\n${prompts[reason]}\n\nShort, personal, 3 sentences max. Sign off as Sanjog, founder.`,
      maxTokens: 200,
    })
  } catch {
    return `Hi — just checking in from SAB Account AI. Is there anything I can help you with? Reply to this email anytime. — Sanjog`
  }
}
