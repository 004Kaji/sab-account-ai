export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs every Tuesday 9am AEST (Monday 23:00 UTC).
// Generates the weekly content brief then drafts social posts.
// Runs after atlas cron (Monday) so Atlas brief is already published.

import { NextRequest, NextResponse } from 'next/server'
import { sparkWeeklyBrief, sparkDraftSocialPosts } from '@/lib/agents/sub/spark'
import { getStripeMetrics, getSABMetrics, getLatestAtlasIntel, getLatestLiftSignal, logAgentAction } from '@/lib/agents/utils'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const results = {
    brief:  { ok: false, topic: '', error: '' },
    social: { ok: false, count: 0,  error: '' },
  }

  // Gather live metrics to feed the brief
  const [stripe, sab, atlasIntel, liftSignal] = await Promise.allSettled([
    getStripeMetrics(),
    getSABMetrics(),
    getLatestAtlasIntel(),
    getLatestLiftSignal(),
  ])

  const s = stripe.status     === 'fulfilled' ? stripe.value     : null
  const m = sab.status        === 'fulfilled' ? sab.value        : null
  const intel = atlasIntel.status === 'fulfilled' ? atlasIntel.value : undefined
  const lift  = liftSignal.status === 'fulfilled' ? liftSignal.value : null

  // Weekly content brief
  try {
    const brief = await sparkWeeklyBrief({
      newSignups:     m?.newSignupsThisWeek ?? 0,
      mrr:            s?.mrr             ?? 0,
      mrrChange:      s?.mrrChange       ?? 0,
      churnThisWeek:  s?.churnThisWeek   ?? 0,
      liftAtRiskCount: lift?.atRiskCount ?? undefined,
      atlasIntel:     intel,
    })
    results.brief = { ok: true, topic: brief.blogTitle ?? '', error: '' }
  } catch (err) {
    results.brief.error = err instanceof Error ? err.message : String(err)
  }

  // Draft social posts (reads Atlas recommendation signal automatically)
  try {
    const drafts = await sparkDraftSocialPosts()
    results.social = { ok: true, count: drafts.drafts?.length ?? 0, error: '' }
  } catch (err) {
    results.social.error = err instanceof Error ? err.message : String(err)
  }

  await logAgentAction({
    agentName:    'cron',
    triggerType:  'spark_weekly',
    actionsTaken: results as unknown as Record<string, unknown>,
    durationMs:   Date.now() - start,
  })

  return NextResponse.json({ success: true, ...results, durationMs: Date.now() - start })
}
