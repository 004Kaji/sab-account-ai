export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs every Monday 7am AEST (Sunday 21:00 UTC).
// Fires atlasWeeklyIntel then atlasComplianceWatch sequentially.
// Each internally triggers Spark via autoTriggerSpark (fire-and-forget).

import { NextRequest, NextResponse } from 'next/server'
import { atlasWeeklyIntel, atlasComplianceWatch } from '@/lib/agents/sub/atlas'
import { sparkFindAccountants, sparkFindBusinesses } from '@/lib/agents/sub/spark'
import { logAgentAction } from '@/lib/agents/utils'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const results = {
    intel:        { ok: false, findings: 0, error: '' },
    compliance:   { ok: false, findings: 0, error: '' },
    accountants:  { ok: false, added: 0,    error: '' },
    businesses:   { ok: false, added: 0,    error: '' },
  }

  // Weekly market intel — also publishes Spark brief + auto-triggers blog
  try {
    const report = await atlasWeeklyIntel()
    results.intel = { ok: true, findings: report.intel.length, error: '' }
  } catch (err) {
    results.intel.error = err instanceof Error ? err.message : String(err)
  }

  // Compliance watch — ATO, FairWork, super, treasury
  try {
    const report = await atlasComplianceWatch()
    results.compliance = { ok: true, findings: report.findings.length, error: '' }
  } catch (err) {
    results.compliance.error = err instanceof Error ? err.message : String(err)
  }

  // Find new accountants across all Australian cities and add to outreach queue
  const cities = [
    'Sydney, Australia',
    'Melbourne, Australia',
    'Brisbane, Australia',
    'Perth, Australia',
    'Adelaide, Australia',
    'Darwin, Australia',
    'Gold Coast, Australia',
    'Canberra, Australia',
    'Newcastle, Australia',
    'Hobart, Australia',
  ]
  let totalAccountants = 0
  let totalBusinesses = 0
  for (const city of cities) {
    const [accR, bizR] = await Promise.allSettled([
      sparkFindAccountants(city),
      sparkFindBusinesses(city),
    ])
    if (accR.status === 'fulfilled') totalAccountants += accR.value.added
    if (bizR.status === 'fulfilled') totalBusinesses  += bizR.value.added
  }
  results.accountants = { ok: true, added: totalAccountants, error: '' }
  results.businesses  = { ok: true, added: totalBusinesses,  error: '' }

  await logAgentAction({
    agentName:    'cron',
    triggerType:  'atlas_weekly',
    actionsTaken: results as unknown as Record<string, unknown>,
    durationMs:   Date.now() - start,
  })

  return NextResponse.json({ success: true, ...results, durationMs: Date.now() - start })
}
