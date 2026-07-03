export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Webhook, WebhookVerificationError } from 'svix'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { resendEventToField } from '@/lib/resend-utils'

type ResendEvent = {
  type: string
  data: { email_id: string; [key: string]: unknown }
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const body = await req.text()

  let event: ResendEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(body, {
      'svix-id':        req.headers.get('svix-id')        ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    }) as ResendEvent
  } catch (err) {
    if (!(err instanceof WebhookVerificationError)) {
      Sentry.captureException(err, { tags: { feature: 'resend_webhook' } })
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const field = resendEventToField(event.type)
  if (!field) {
    // Unknown event type — acknowledge so Resend stops retrying
    return NextResponse.json({ received: true })
  }

  const emailId = event.data.email_id
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('email_queue')
    .update({ [field]: new Date().toISOString() })
    .eq('resend_email_id', emailId)
    .is(field, null)

  if (error) {
    Sentry.captureException(new Error(error.message), {
      tags: { feature: 'resend_webhook', event_type: event.type },
    })
    console.error('[resend-webhook] DB update error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
