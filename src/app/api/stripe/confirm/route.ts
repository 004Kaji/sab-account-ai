import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { sessionId } = await req.json() as { sessionId: string }
  if (!sessionId) return NextResponse.json({ error: 'Missing session ID' }, { status: 400 })

  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return NextResponse.json({ error: 'Payment not complete' }, { status: 400 })
  }

  // Verify the session belongs to this user
  if (session.metadata?.userId !== user.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const plan = session.metadata?.plan
  if (!plan) return NextResponse.json({ error: 'No plan in session' }, { status: 400 })

  await supabase.from('profiles').update({
    plan,
    stripe_customer_id:      session.customer as string,
    stripe_subscription_id:  session.subscription as string,
    subscription_status:     'trialing',
    trial_ends_at:           new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  }).eq('id', user.id)

  return NextResponse.json({ ok: true, plan })
}
