export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs every Tuesday 9am AEST (Monday 23:00 UTC).
// Generates the weekly content brief, drafts social posts, and community-segment posts.
// Runs after atlas cron (Monday) so Atlas brief is already published.

import { NextRequest, NextResponse } from 'next/server'
import { sparkWeeklyBrief, sparkDraftSocialPosts, sparkPostCommunity, sparkGenerateTikTok } from '@/lib/agents/sub/spark'
import { getStripeMetrics, getSABMetrics, getLatestAtlasIntel, getLatestLiftSignal, logAgentAction } from '@/lib/agents/utils'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const results = {
    brief:     { ok: false, topic:   '', error: '' },
    social:    { ok: false, count:    0, error: '' },
    community: { ok: false, drafts:   0, error: '' },
    tiktok:    { ok: false, scripts:  0, error: '' },
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

  // Social posts, community posts, and TikTok scripts — all independent, run concurrently
  const [socialR, communityR, tiktokR] = await Promise.allSettled([
    sparkDraftSocialPosts(),
    sparkPostCommunity(),
    sparkGenerateTikTok(),
  ])
  if (socialR.status === 'fulfilled') {
    results.social = { ok: true, count: socialR.value.drafts?.length ?? 0, error: '' }
  } else {
    results.social.error = socialR.reason instanceof Error ? socialR.reason.message : String(socialR.reason)
  }
  if (communityR.status === 'fulfilled') {
    results.community = { ok: true, drafts: communityR.value.drafts, error: '' }
  } else {
    results.community.error = communityR.reason instanceof Error ? communityR.reason.message : String(communityR.reason)
  }
  if (tiktokR.status === 'fulfilled') {
    results.tiktok = { ok: true, scripts: tiktokR.value.scripts, error: '' }
  } else {
    results.tiktok.error = tiktokR.reason instanceof Error ? tiktokR.reason.message : String(tiktokR.reason)
  }

  await logAgentAction({
    agentName:    'cron',
    triggerType:  'spark_weekly',
    actionsTaken: results as unknown as Record<string, unknown>,
    durationMs:   Date.now() - start,
  })

  return NextResponse.json({ success: true, ...results, durationMs: Date.now() - start })
}
