export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

// Runs daily to keep Upstash Redis active on the free tier.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!redis) {
    return NextResponse.json({ ok: false, message: 'Redis not configured' })
  }

  await redis.set('__ping__', new Date().toISOString(), { ex: 90000 })
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
