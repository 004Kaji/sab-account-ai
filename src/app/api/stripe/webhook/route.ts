export const dynamic = 'force-dynamic'
// src/app/api/stripe/webhook/route.ts
// Stripe webhook handler — keeps Supabase in sync with subscription events

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { applyReferralReward } from '@/lib/referral'
import { sendFriendConvertedEmail } from '@/lib/referral-emails'
import { enqueueEmail } from '@/lib/queue'

// Stripe API 2026+ sends timestamps as ISO strings; older versions send Unix numbers.
const toISO = (val: number | string | null | undefined): string | null => {
  if (!val) return null
  return typeof val === 'number' ? new Date(val * 1000).toISOString() : new Date(val).toISOString()
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  if (!process.env.QSTASH_TOKEN) {
    console.error('QSTASH_TOKEN not configured — payment notification emails will not be queued')
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  })
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Log event to prevent double-processing
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .single()

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  const { error: insertErr } = await supabase.from('stripe_events').insert({ id: event.id, type: event.type, data: event.data })
  if (insertErr) {
    // 23505 = unique_violation: concurrent delivery already claimed this event
    if ((insertErr as { code?: string }).code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error('stripe_events insert error:', insertErr)
  }

  // ── HANDLE EVENTS ────────────────────────────────
  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // ── Invoice payment (one-off) ──────────────────────────────────
        if (session.metadata?.type === 'invoice_payment') {
          const invoiceId     = session.metadata.invoiceId
          const invoiceNumber = session.metadata.invoiceNumber
          const businessName  = session.metadata.businessName ?? ''
          const businessEmail = session.metadata.businessEmail ?? ''
          const clientName    = session.metadata.clientName ?? ''
          const clientEmail   = session.metadata.clientEmail ?? ''
          const amount        = session.amount_total != null
            ? '$' + (session.amount_total / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            : ''

          const { error: invoiceErr } = await supabase.from('invoices')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', invoiceId)
          if (invoiceErr) {
            Sentry.captureException(new Error(invoiceErr.message), { tags: { feature: 'stripe_webhook', step: 'invoice_status_update' } })
            console.error('Invoice status update error:', invoiceErr)
            throw invoiceErr
          }

          // Enqueue emails via QStash — decoupled from webhook, retried automatically on failure
          if (businessEmail) {
            await enqueueEmail('payment_received', { to: businessEmail, businessName, clientName, invoiceNumber, amount })
          }
          if (clientEmail) {
            await enqueueEmail('payment_confirmed', { to: clientEmail, clientName, businessName, invoiceNumber, amount })
          }

          console.log(`✅ Invoice ${invoiceNumber} paid by ${clientName}`)
          break
        }

        // ── Subscription checkout ──────────────────────────────────────
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan
        if (!userId || !plan) break

        let trialEndsAt: string | null = null
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          trialEndsAt = toISO(sub.trial_end)
        }

        const { error: planErr } = await supabase.from('profiles').update({
          plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'trialing',
          trial_ends_at: trialEndsAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', userId)
        if (planErr) {
          Sentry.captureException(new Error(planErr.message), { tags: { feature: 'stripe_webhook', step: 'plan_upgrade' } })
          console.error('Profile plan upgrade error:', planErr)
          throw planErr
        }

        console.log(`✅ User ${userId} upgraded to ${plan}`)

        // ── Referral conversion tracking ──────────────────────
        const { data: referral } = await supabase
          .from('referrals')
          .select('id, referrer_id, referral_code, referred_email')
          .eq('referred_user_id', userId)
          .eq('status', 'signed_up')
          .maybeSingle()

        if (referral) {
          const referrerId = referral.referrer_id as string
          const refCode = referral.referral_code as string

          // Mark referral as converted
          await supabase.from('referrals').update({
            status: 'converted',
            converted_at: new Date().toISOString(),
            reward_applied: true,
          }).eq('id', referral.id)

          // Atomic increment — avoids race condition from read-then-write
          await supabase.rpc('increment_converted_referrals', { referrer: referrerId })

          const { data: rc } = await supabase
            .from('referral_codes')
            .select('converted_referrals')
            .eq('user_id', referrerId)
            .single()

          const newConverted = (rc?.converted_referrals as number) ?? 1

          // Apply reward (reads updated count)
          const { additionalMonths, lifetimePro } = await applyReferralReward(referrerId)

          // Send reward email
          try {
            const { data: { user: referrerUser } } = await supabase.auth.admin.getUserById(referrerId)
            const referrerEmail = referrerUser?.email ?? ''
            const referrerName = (referrerUser?.user_metadata?.full_name as string | undefined)
              || referrerEmail.split('@')[0]

            const { data: updatedProfile } = await supabase
              .from('profiles')
              .select('billing_cycle_end')
              .eq('id', referrerId)
              .single()

            const newBillingDate = updatedProfile?.billing_cycle_end
              ? new Date(updatedProfile.billing_cycle_end as string).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'updated'

            await sendFriendConvertedEmail({
              referrerEmail,
              referrerName,
              referredEmail: (referral.referred_email as string) ?? '',
              code: refCode,
              convertedReferrals: newConverted,
              additionalMonths,
              lifetimePro,
              newBillingDate,
            })
          } catch (emailErr) {
            console.error('Referral reward email failed:', emailErr)
          }

          console.log(`✅ Referral converted: ${referrerId} earned ${additionalMonths} months`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break

        const plan = sub.metadata?.plan || sub.items.data[0]?.price?.metadata?.plan || 'free'
        await supabase.from('profiles').update({
          plan: sub.status === 'active' || sub.status === 'trialing' ? plan : 'free',
          subscription_status: sub.status,
          billing_cycle_end: toISO(sub.current_period_end),
        }).eq('id', userId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break

        await supabase.from('profiles').update({
          plan: 'free',
          subscription_status: 'cancelled',
          stripe_subscription_id: null,
        }).eq('id', userId)
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const customerId = inv.customer as string
        await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('stripe_customer_id', customerId)
        break
      }
    }

    await supabase.from('stripe_events').update({ processed: true }).eq('id', event.id)
    return NextResponse.json({ received: true })

  } catch (error) {
    Sentry.captureException(error, { tags: { feature: 'stripe_webhook' } })
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

