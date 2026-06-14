import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { stripe, PRICE_IDS } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'
import { getProfile } from '@/lib/profile-cache'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const supabase = createServiceClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const profile = await getProfile(user.id)

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found for this account.' }, { status: 400 })
    }

    const ALLOWED_ORIGINS = ['https://sabaccountai.com', 'http://localhost:3000']
    const rawOrigin = req.headers.get('origin') ?? ''
    const origin = ALLOWED_ORIGINS.includes(rawOrigin) ? rawOrigin : 'https://sabaccountai.com'

    // Optional: if a targetPlan is passed, jump straight to plan-switch confirmation
    const body = await req.json().catch(() => ({})) as { targetPlan?: string }
    const targetPlan = body.targetPlan as 'starter' | 'pro' | 'autopilot' | undefined

    let flowData: Parameters<typeof stripe.billingPortal.sessions.create>[0]['flow_data'] | undefined

    if (targetPlan && profile.stripe_subscription_id && PRICE_IDS[targetPlan]) {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
      const itemId = sub.items.data[0]?.id

      if (itemId) {
        flowData = {
          type: 'subscription_update_confirm',
          after_completion: {
            type: 'redirect',
            redirect: { return_url: `${origin}/settings?success=true&plan=${targetPlan}` },
          },
          subscription_update_confirm: {
            subscription: profile.stripe_subscription_id,
            items: [{ id: itemId, price: PRICE_IDS[targetPlan] }],
          },
        }
      }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
      return_url: `${origin}/settings?tab=subscription`,
      ...(flowData ? { flow_data: flowData } : {}),
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'stripe_portal' } })
    console.error('Portal error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Portal session failed' },
      { status: 500 },
    )
  }
}
