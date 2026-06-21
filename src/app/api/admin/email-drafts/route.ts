export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { ADMIN_EMAILS } from '@/lib/admin'

async function authenticate(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return false
  const { data: { user }, error } = await createServiceClient().auth.getUser(token)
  return !error && !!user && ADMIN_EMAILS.includes(user.email ?? '')
}

export async function GET(req: NextRequest) {
  if (!(await authenticate(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('email_drafts')
    .select('id, agent, campaign, to_email, to_name, subject, body_text, source_table, source_id, sequence_step, is_follow_up, created_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ drafts: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await authenticate(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as {
    action?: 'send' | 'dismiss'
    id?: string
  }

  if (!body.id || !body.action) {
    return NextResponse.json({ error: 'id and action required' }, { status: 400 })
  }
  if (body.action !== 'send' && body.action !== 'dismiss') {
    return NextResponse.json({ error: 'action must be send or dismiss' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: draft, error: fetchErr } = await supabase
    .from('email_drafts')
    .select('*')
    .eq('id', body.id)
    .eq('status', 'draft')
    .single()

  if (fetchErr || !draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  if (body.action === 'dismiss') {
    const { error } = await supabase.from('email_drafts').update({ status: 'dismissed' }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // action === 'send'
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error: sendErr } = await resend.emails.send({
    from:    'Sanjog Basnet <basnet@sabaccountai.com>',
    to:      draft.to_email,
    subject: draft.subject,
    text:    draft.body_text,
    html:    draft.body_html,
    tags: [
      { name: 'agent',    value: draft.agent    },
      { name: 'campaign', value: draft.campaign  },
    ],
  })

  if (sendErr) {
    console.error('[email-drafts] send error:', sendErr)
    Sentry.captureException(sendErr, { tags: { route: 'admin/email-drafts' } })
    return NextResponse.json({ error: String(sendErr) }, { status: 500 })
  }

  const now = new Date().toISOString()

  await supabase.from('email_drafts').update({ status: 'sent', sent_at: now }).eq('id', body.id)

  // Update the source outreach record to reflect the send
  const nextDate = (daysFromNow: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    return d.toISOString().split('T')[0]
  }

  if (draft.source_table === 'accountant_outreach') {
    const step = draft.sequence_step ?? 0
    if (step === 0) {
      await supabase.from('accountant_outreach').update({
        emailed_at:    now,
        status:        'emailed',
        sequence_step: 1,
        follow_up_due: nextDate(4),
        email_subject: draft.subject,
        email_body:    draft.body_text,
      }).eq('id', draft.source_id)
    } else if (step === 1) {
      await supabase.from('accountant_outreach').update({
        emailed_at:    now,
        sequence_step: 2,
        follow_up_due: nextDate(4),
        email_subject: draft.subject,
        email_body:    draft.body_text,
      }).eq('id', draft.source_id)
    } else {
      await supabase.from('accountant_outreach').update({
        emailed_at:    now,
        sequence_step: 3,
        status:        'followed_up',
      }).eq('id', draft.source_id)
    }
  } else if (draft.source_table === 'business_outreach') {
    if (draft.is_follow_up) {
      await supabase.from('business_outreach').update({
        emailed_at: now,
        status:     'followed_up',
      }).eq('id', draft.source_id)
    } else {
      await supabase.from('business_outreach').update({
        emailed_at:    now,
        status:        'emailed',
        follow_up_due: nextDate(7),
        email_subject: draft.subject,
        email_body:    draft.body_text,
      }).eq('id', draft.source_id)
    }
  }

  return NextResponse.json({ success: true })
}
