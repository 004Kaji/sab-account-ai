export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendAlert, logAgentAction } from '@/lib/agents/utils'
import { liftOnboardingEmail, liftReEngagementEmail } from '@/lib/agents/sub/lift'
import { sparkUpgradePrompt } from '@/lib/agents/sub/spark'

// Verify shared secret — set AGENT_WEBHOOK_SECRET in env, use same value in Supabase webhook headers
function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-webhook-secret')
  return !!process.env.AGENT_WEBHOOK_SECRET && secret === process.env.AGENT_WEBHOOK_SECRET
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      trigger: string
      record?: Record<string, unknown>
    }

    const trigger = body.trigger

    // ── new_user: Supabase profiles INSERT → send onboarding email ─────
    if (trigger === 'new_user') {
      const record = body.record ?? {}
      const email = record.email as string | undefined
      const name = (record.full_name as string | undefined) ?? ''

      if (!email) return NextResponse.json({ success: false, error: 'no email in payload' })

      // Skip internal / test addresses
      if (email.includes('@sabaccountai.com') || email.includes('+test')) {
        return NextResponse.json({ success: true, skipped: true, reason: 'internal address' })
      }

      const result = await liftOnboardingEmail(email, name)
      await logAgentAction({
        agentName: 'events',
        triggerType: 'new_user',
        inputContext: { email },
        outcome: result.sent ? 'onboarding sent' : 'failed',
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ success: true, ...result })
    }

    // ── invoice_milestone: invoices INSERT → upgrade prompt on 8th ─────
    if (trigger === 'invoice_milestone') {
      const record = body.record ?? {}
      const userId = record.user_id as string | undefined
      if (!userId) return NextResponse.json({ success: false, error: 'no user_id in payload' })

      const supabase = createServiceClient()

      const { count } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

      const invoiceCount = count ?? 0

      // Only fire on exactly the 8th — not every invoice after
      if (invoiceCount !== 8) {
        return NextResponse.json({ success: true, skipped: true, reason: `${invoiceCount} invoices, not milestone` })
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name, plan')
        .eq('id', userId)
        .maybeSingle()

      if (!profile?.email) return NextResponse.json({ success: false, error: 'profile not found' })

      if ((profile.plan as string | null) && profile.plan !== 'free') {
        return NextResponse.json({ success: true, skipped: true, reason: 'already paid' })
      }

      const result = await sparkUpgradePrompt(
        profile.email as string,
        (profile.full_name as string | null) ?? '',
        invoiceCount,
      )
      await logAgentAction({
        agentName: 'events',
        triggerType: 'invoice_milestone',
        inputContext: { userId, invoiceCount },
        outcome: result.sent ? 'upgrade prompt sent' : 'failed',
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ success: true, ...result })
    }

    // ── inactive_30d: n8n daily cron → re-engage users going quiet ─────
    // n8n fires this once per day; route handles dedup to avoid double-emailing
    if (trigger === 'inactive_30d') {
      const supabase = createServiceClient()
      const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const thirtyTwoDaysAgo = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString()

      // Narrow 2-day window: users who hit the 30-day mark today
      const { data: inactive } = await supabase
        .from('profiles')
        .select('id, email, full_name, plan')
        .lte('updated_at', thirtyDaysAgo)
        .gte('updated_at', thirtyTwoDaysAgo)
        .eq('plan', 'free')
        .limit(10)

      if (!inactive || inactive.length === 0) {
        return NextResponse.json({ success: true, sent: 0, message: 'No users in 30-day inactive window' })
      }

      type ProfileRow = { id: string; email: string; full_name: string | null; plan: string }
      let sent = 0

      for (const user of inactive as ProfileRow[]) {
        try {
          // Skip if we already emailed this user recently
          const { count: recentEmail } = await supabase
            .from('agent_conversations')
            .select('id', { count: 'exact', head: true })
            .eq('agent_name', 'lift')
            .ilike('question', `%${user.email}%`)
            .gte('created_at', thirtyTwoDaysAgo)

          if ((recentEmail ?? 0) > 0) continue

          const result = await liftReEngagementEmail(user.email, user.full_name ?? '')
          if (result.sent) sent++
        } catch (err) {
          console.error('inactive_30d email failed for', user.email, err)
        }
      }

      await logAgentAction({
        agentName: 'events',
        triggerType: 'inactive_30d',
        actionsTaken: { sent, total: inactive.length },
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ success: true, sent, total: inactive.length })
    }

    return NextResponse.json({ success: false, error: `Unknown trigger: ${trigger}` })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await sendAlert('Events agent error', msg, 'urgent', 'events').catch(() => null)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
