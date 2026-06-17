export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { runBridge } from '@/lib/agents/sub/bridge'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report = await runBridge()
  return NextResponse.json({ success: true, ...report })
}
