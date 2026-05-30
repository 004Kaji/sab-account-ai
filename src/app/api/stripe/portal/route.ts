import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const supabase = createServiceClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found for this account.' }, { status: 400 })
    }

    const ALLOWED_ORIGINS = ['https://sabaccountai.com', 'http://localhost:3000']
    const rawOrigin = req.headers.get('origin') ?? ''
    const origin = ALLOWED_ORIGINS.includes(rawOrigin) ? rawOrigin : 'https://sabaccountai.com'
    const session = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
      return_url: `${origin}/settings?tab=subscription`,
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
