export const dynamic = 'force-dynamic'

// Runs daily at 4 AM AEST (18:00 UTC).
// Detects three event types and dispatches them to the agent layer:
//   1. new_user      — users who signed up in the last 24h, not yet AI-welcomed
//   2. invoice_8th   — free users who just hit their 8th invoice, eligible for upgrade
//   3. inactive_30d  — users inactive for 30–32 days, eligible for re-engagement

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logAgentAction } from '@/lib/agents/utils'
import { liftOnboardingEmail, liftReEngagementEmail } from '@/lib/agents/sub/lift'
import { sparkUpgradePrompt } from '@/lib/agents/sub/spark'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const start = Date.now()
  const results = { newUser: 0, invoice8th: 0, inactive30d: 0, errors: 0 }

  // ── 1. new_user: signed up in last 24h, not yet AI-welcomed ──────────
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: newUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .gte('created_at', oneDayAgo)
      .limit(20)

    for (const user of (newUsers ?? []) as { id: string; email: string; full_name: string | null }[]) {
      if (!user.email || user.email.includes('@sabaccountai.com')) continue

      // Skip if already AI-welcomed
      const { count } = await supabase
        .from('agent_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('agent_name', 'lift')
        .ilike('question', `onboarding: ${user.email}`)

      if ((count ?? 0) > 0) continue

      try {
        const result = await liftOnboardingEmail(user.email, user.full_name ?? '')
        if (result.sent) results.newUser++
      } catch { results.errors++ }
    }
  } catch (err) {
    console.error('[cron/agent-events] new_user phase failed:', err)
    results.errors++
  }

  // ── 2. invoice_8th: free users who just hit exactly 8 invoices ───────
  try {
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('user_id')

    const countByUser = new Map<string, number>()
    for (const row of (invoiceData ?? []) as { user_id: string }[]) {
      countByUser.set(row.user_id, (countByUser.get(row.user_id) ?? 0) + 1)
    }

    const usersAt8 = Array.from(countByUser.entries())
      .filter(([, count]) => count === 8)
      .map(([userId]) => userId)

    for (const userId of usersAt8.slice(0, 10)) {
      // Check profile is free plan and not already prompted
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name, plan')
        .eq('id', userId)
        .maybeSingle()

      if (!profile?.email || profile.plan !== 'free') continue

      // Skip if already sent upgrade prompt
      const { count } = await supabase
        .from('agent_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('agent_name', 'spark')
        .ilike('question', `upgrade_prompt: ${profile.email}%`)

      if ((count ?? 0) > 0) continue

      try {
        const result = await sparkUpgradePrompt(
          profile.email as string,
          (profile.full_name as string | null) ?? '',
          8,
        )
        if (result.sent) results.invoice8th++
      } catch { results.errors++ }
    }
  } catch (err) {
    console.error('[cron/agent-events] invoice_8th phase failed:', err)
    results.errors++
  }

  // ── 3. inactive_30d: free users inactive for 30–32 days ──────────────
  try {
    const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyTwoDaysAgo = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString()

    const { data: inactive } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .lte('updated_at', thirtyDaysAgo)
      .gte('updated_at', thirtyTwoDaysAgo)
      .eq('plan', 'free')
      .limit(10)

    for (const user of (inactive ?? []) as { id: string; email: string; full_name: string | null }[]) {
      if (!user.email) continue

      // Skip if already re-engaged recently
      const { count } = await supabase
        .from('agent_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('agent_name', 'lift')
        .ilike('question', `re_engagement: ${user.email}`)
        .gte('created_at', thirtyTwoDaysAgo)

      if ((count ?? 0) > 0) continue

      try {
        const result = await liftReEngagementEmail(user.email, user.full_name ?? '')
        if (result.sent) results.inactive30d++
      } catch { results.errors++ }
    }
  } catch (err) {
    console.error('[cron/agent-events] inactive_30d phase failed:', err)
    results.errors++
  }

  await logAgentAction({
    agentName: 'cron',
    triggerType: 'agent_events',
    actionsTaken: results as unknown as Record<string, unknown>,
    durationMs: Date.now() - start,
  })

  return NextResponse.json({ success: true, ...results })
}
