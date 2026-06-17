export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { updateApprovalStatus, getApprovalQueue } from '@/lib/agents/toolkits/sab-marketing-toolkit'
import { sparkPostApproved } from '@/lib/agents/sub/spark'

// GET /api/agents/approvals — returns pending approval queue
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const secret = process.env.AGENT_WEBHOOK_SECRET ?? ''
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const queue = await getApprovalQueue()
    return NextResponse.json({ success: true, queue })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// PATCH /api/agents/approvals — edit content or image of a pending draft
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const secret = process.env.AGENT_WEBHOOK_SECRET ?? ''
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      id?: string
      content?: string
      imageUrl?: string
    }
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const supabase = createServiceClient()
    const update: Record<string, unknown> = {}
    if (body.content  !== undefined) update.content    = body.content
    if (body.imageUrl !== undefined) update.media_urls = body.imageUrl ? [body.imageUrl] : []

    const { error } = await supabase.from('marketing_approvals').update(update).eq('id', body.id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// POST /api/agents/approvals — approve or reject a draft
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      id?: string
      action?: 'approve' | 'reject'
    }

    if (!body.id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    }
    if (body.action !== 'approve' && body.action !== 'reject') {
      return NextResponse.json({ success: false, error: 'action must be approve or reject' }, { status: 400 })
    }

    if (body.action === 'reject') {
      await updateApprovalStatus(body.id, 'rejected')
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    // approve → mark approved, then post to platform
    await updateApprovalStatus(body.id, 'approved')
    const result = await sparkPostApproved(body.id)

    return NextResponse.json({ success: result.success, postUrl: result.postUrl, error: result.error })
  } catch (err) {
    Sentry.captureException(err)

    // Log to DB for debugging
    try {
      const supabase = createServiceClient()
      await supabase.from('agent_logs').insert({
        agent_name: 'approvals',
        trigger_type: 'post_error',
        outcome: String(err),
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
