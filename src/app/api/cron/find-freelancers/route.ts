export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs every Sunday 8pm UTC (6am AEST Monday).
// Searches for Australian freelancers across major cities and adds them
// to the business_outreach table (business_type starts with "freelancer_").
// The daily-outreach cron then emails 5 of them each day automatically.

import { NextRequest, NextResponse } from 'next/server'
import { sparkFindFreelancers } from '@/lib/agents/sub/spark'
import { logAgentAction } from '@/lib/agents/utils'

const CITIES = [
  'Sydney, Australia',
  'Melbourne, Australia',
  'Brisbane, Australia',
  'Perth, Australia',
  'Adelaide, Australia',
  'Gold Coast, Australia',
  'Canberra, Australia',
  'Newcastle, Australia',
]

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  let totalFound = 0
  let totalAdded = 0
  const cityResults: Record<string, { found: number; added: number }> = {}

  // Run cities sequentially to avoid rate-limiting Tavily
  for (const city of CITIES) {
    try {
      const result = await sparkFindFreelancers(city)
      cityResults[city] = result
      totalFound += result.found
      totalAdded += result.added
    } catch (err) {
      console.error(`[find-freelancers] failed for ${city}:`, err)
      cityResults[city] = { found: 0, added: 0 }
    }
  }

  await logAgentAction({
    agentName:    'cron',
    triggerType:  'find_freelancers',
    actionsTaken: { totalFound, totalAdded, cities: cityResults },
    durationMs:   Date.now() - start,
  })

  return NextResponse.json({ success: true, totalFound, totalAdded, cities: cityResults, durationMs: Date.now() - start })
}
