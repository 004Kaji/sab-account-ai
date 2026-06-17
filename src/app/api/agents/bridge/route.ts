export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { runBridge } from '@/lib/agents/sub/bridge'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const secret = process.env.AGENT_WEBHOOK_SECRET ?? ''
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report = await runBridge()
  return NextResponse.json({ success: true, ...report })
}
