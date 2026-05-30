import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { stripe, PRICE_IDS } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    // Authenticate via Bearer token sent from the client
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const supabase = createServiceClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { plan } = await req.json() as { plan: 'starter' | 'pro' }
    if (plan !== 'starter' && plan !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const priceId = PRICE_IDS[plan]
    if (!priceId || priceId.startsWith('price_REPLACE') || priceId.startsWith('prod_')) {
      return NextResponse.json(
        { error: `Invalid Stripe price ID for ${plan} plan. Open .env.local and set STRIPE_PRICE_${plan.toUpperCase()} to a price_ ID (not prod_). Find it in Stripe Dashboard → Products → click product → copy the Price ID.` },
        { status: 500 },
      )
    }

    // Look up any existing Stripe customer ID for this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const ALLOWED_ORIGINS = ['https://sabaccountai.com', 'http://localhost:3000']
    const rawOrigin = req.headers.get('origin') ?? ''
    const origin = ALLOWED_ORIGINS.includes(rawOrigin) ? rawOrigin : 'https://sabaccountai.com'

    const checkoutParams = {
      mode: 'subscription' as const,
      payment_method_types: ['card'] as ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: user.id, plan },
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: user.id, plan },
      },
      success_url: `${origin}/settings?success=true&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/settings?tab=subscription`,
    }

    // Try with stored customer ID first; if it no longer exists in Stripe
    // (e.g. was created in test mode but app is now in live mode), clear it
    // and fall back to customer_email so the session still completes.
    let session
    if (profile?.stripe_customer_id) {
      try {
        session = await stripe.checkout.sessions.create({
          ...checkoutParams,
          customer: profile.stripe_customer_id,
        })
      } catch (err: unknown) {
        const stripeErr = err as { code?: string; message?: string }
        if (stripeErr?.code === 'resource_missing' || stripeErr?.message?.includes('No such customer')) {
          // Stale customer ID — clear it from the profile and retry without it
          await supabase.from('profiles').update({ stripe_customer_id: null }).eq('id', user.id)
          session = await stripe.checkout.sessions.create({
            ...checkoutParams,
            customer_email: user.email ?? undefined,
          })
        } else {
          throw err
        }
      }
    } else {
      session = await stripe.checkout.sessions.create({
        ...checkoutParams,
        customer_email: user.email ?? undefined,
      })
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'stripe_checkout' } })
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 },
    )
  }
}
