export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const ADMIN_EMAILS = ['sanjog.basnet02@gmail.com', 'basnet@sabaccountai.com']

async function authenticate(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return false
  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return !error && !!user && ADMIN_EMAILS.includes(user.email ?? '')
}

export async function GET(req: NextRequest) {
  if (!(await authenticate(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const [blogR, communityR, tiktokR, kiteR, outreachR, bridgeR] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('id, title, created_at, content')
      .eq('status', 'draft')
      .order('created_at', { ascending: false }),
    supabase
      .from('community_posts')
      .select('id, segment, platform, content, created_at')
      .eq('status', 'draft')
      .order('created_at', { ascending: false }),
    supabase
      .from('tiktok_scripts')
      .select('id, segment, hook, script_body, cta, created_at')
      .eq('status', 'draft')
      .order('created_at', { ascending: false }),
    supabase
      .from('kite_replies')
      .select('id, source_platform, source_url, original_post_snippet, draft_reply, created_at')
      .eq('status', 'draft')
      .order('created_at', { ascending: false }),
    supabase
      .from('accountant_outreach')
      .select('emailed_at, replied_at, status, source, sequence_step'),
    supabase
      .from('bridge_referral_reports')
      .select('id, created_at, week_starting, accountant_email, referral_count, commission_owed, top_referrer')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const rows = (outreachR.data ?? []) as Array<Record<string, unknown>>
  const outreachStats = {
    total:   rows.length,
    emailed: rows.filter(r => r.emailed_at  != null).length,
    replied: rows.filter(r => r.replied_at  != null || r.status === 'replied').length,
    pending: rows.filter(r => r.emailed_at  == null).length,
    tpb:     rows.filter(r => r.source === 'tpb_register').length,
    tavily:  rows.filter(r => r.source === 'tavily_search').length,
    touch1:  rows.filter(r => r.sequence_step === 1).length,
    touch2:  rows.filter(r => r.sequence_step === 2).length,
    touch3:  rows.filter(r => r.sequence_step === 3).length,
  }

  return NextResponse.json({
    blogPosts:      blogR.data      ?? [],
    communityPosts: communityR.data ?? [],
    tiktokScripts:  tiktokR.data    ?? [],
    kiteReplies:    kiteR.data      ?? [],
    outreachStats,
    bridgeReport:   bridgeR.data    ?? null,
  })
}

const ALLOWED_TABLES = new Set(['blog_posts', 'community_posts', 'tiktok_scripts', 'kite_replies'])

export async function POST(req: NextRequest) {
  if (!(await authenticate(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as {
    action?: string
    id?: string
    table?: string
  }

  const { action, id, table } = body
  if (!action || !id) {
    return NextResponse.json({ error: 'Missing action or id' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (action === 'publish') {
    const { error } = await supabase.from('blog_posts').update({ status: 'published' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (action === 'posted' || action === 'dismiss') {
    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }
    const { error } = action === 'dismiss'
      ? await supabase.from(table).delete().eq('id', id)
      : await supabase.from(table).update({ status: 'posted' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
