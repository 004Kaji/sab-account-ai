export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import * as Sentry from '@sentry/nextjs'

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY    ?? '',
})

const EMAIL_ROUTES: Record<string, string> = {
  payment_received:  '/api/email/payment-received',
  payment_confirmed: '/api/email/payment-confirmed',
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('upstash-signature') ?? ''
  const body = await req.text()

  try {
    await receiver.verify({ signature, body })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { type, ...data } = JSON.parse(body) as { type: string } & Record<string, unknown>

  const endpoint = EMAIL_ROUTES[type]
  if (!endpoint) {
    return NextResponse.json({ error: `Unknown job type: ${type}` }, { status: 400 })
  }

  const base   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'
  const secret = process.env.INTERNAL_API_SECRET ?? ''

  const res = await fetch(`${base}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
    body:    JSON.stringify(data),
  })

  if (!res.ok) {
    const err = new Error(`${endpoint} returned ${res.status}`)
    Sentry.captureException(err, { tags: { feature: 'email_queue', type } })
    // Throw so QStash retries this job automatically
    throw err
  }

  return NextResponse.json({ ok: true })
}
