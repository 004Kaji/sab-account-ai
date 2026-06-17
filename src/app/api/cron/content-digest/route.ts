export const dynamic = 'force-dynamic'

// Runs daily at 8am AEST (22:00 UTC).
// Emails basnet@sabaccountai.com.au with a count of all draft content waiting for review.
// Only sends if at least one item is in draft status.

import { NextRequest, NextResponse } from 'next/server'
import { atlasDailyDigest } from '@/lib/agents/sub/atlas'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await atlasDailyDigest()
  return NextResponse.json({ success: true, ...result })
}
