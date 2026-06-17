export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { runKite } from '@/lib/agents/sub/kite'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const secret = process.env.AGENT_WEBHOOK_SECRET ?? ''
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report = await runKite()
  return NextResponse.json({ success: true, ...report })
}
