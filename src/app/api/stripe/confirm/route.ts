import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let sessionId: string
  try {
    const body = await req.json() as { sessionId: string }
    sessionId = body.sessionId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!sessionId) return NextResponse.json({ error: 'Missing session ID' }, { status: 400 })

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })
  } catch (err) {
    console.error('[stripe/confirm] Session retrieve failed:', err)
    return NextResponse.json({ error: 'Failed to retrieve payment session' }, { status: 500 })
  }

  if (session.status !== 'complete') {
    return NextResponse.json({ error: 'Payment not complete' }, { status: 400 })
  }

  // Verify the session belongs to this user
  if (session.metadata?.userId !== user.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const plan = session.metadata?.plan
  if (!plan) return NextResponse.json({ error: 'No plan in session' }, { status: 400 })

  // Use Stripe's actual trial end date from the subscription object
  const sub = session.subscription as { trial_end?: number | null; status?: string } | null
  const stripeStatus = sub?.status ?? 'trialing'
  const trialEnd = sub?.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : stripeStatus === 'trialing'
    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    : null

  await supabase.from('profiles').update({
    plan,
    stripe_customer_id:      session.customer as string,
    stripe_subscription_id:  typeof session.subscription === 'string' ? session.subscription : (session.subscription as { id: string } | null)?.id ?? null,
    subscription_status:     stripeStatus,
    trial_ends_at:           trialEnd,
  }).eq('id', user.id)

  return NextResponse.json({ ok: true, plan })
}
