export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getStripeMetrics } from '@/lib/agents/toolkits/basnet-toolkit'

// Lightweight read-only endpoint for the Python voice script's 8am briefing.
// Returns pre-computed metrics — no agent runs, no Claude calls, fast.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const secret = process.env.AGENT_WEBHOOK_SECRET ?? ''
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase    = createServiceClient()
  const yesterday   = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const daysUntilJuly1 = Math.max(0, Math.ceil(
    (new Date('2026-07-01').getTime() - Date.now()) / 86_400_000,
  ))

  const [
    stripeR,
    signupsR,
    alertsR,
    kiteR,
    blogR,
    communityR,
    tiktokR,
    outreachR,
  ] = await Promise.allSettled([
    getStripeMetrics(),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday),
    supabase
      .from('agent_error_log')
      .select('error_type, error_message, severity')
      .in('severity', ['critical', 'p0'])
      .eq('resolved', false)
      .gte('created_at', yesterday)
      .limit(3),
    supabase
      .from('kite_replies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft'),
    supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft'),
    supabase
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft'),
    supabase
      .from('tiktok_scripts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft'),
    supabase
      .from('accountant_outreach')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('emailed_at', null),
  ])

  const stripe = stripeR.status === 'fulfilled'
    ? stripeR.value
    : { mrr: 0, mrrChange: 0 }

  const alerts = alertsR.status === 'fulfilled'
    ? (alertsR.value.data ?? []) as Array<{ error_type: string; error_message: string; severity: string }>
    : []

  function rowCount(r: PromiseSettledResult<unknown>): number {
    if (r.status !== 'fulfilled') return 0
    return ((r.value as { count?: number | null }).count) ?? 0
  }

  return NextResponse.json({
    mrr:                 Math.round(stripe.mrr),
    mrrChange:           Math.round(stripe.mrrChange),
    newSignups24h:       rowCount(signupsR),
    p0Alerts:            alerts,
    daysUntilJuly1,
    outreachQueuedToday: rowCount(outreachR),
    kiteRepliesDraft:    rowCount(kiteR),
    contentDraft:        rowCount(blogR) + rowCount(communityR) + rowCount(tiktokR),
  })
}
