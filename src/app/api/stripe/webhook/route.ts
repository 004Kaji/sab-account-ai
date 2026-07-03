export const dynamic = 'force-dynamic'
// src/app/api/stripe/webhook/route.ts
// Stripe webhook handler — keeps Supabase in sync with subscription events

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { PRICE_IDS } from '@/lib/stripe'
import { applyReferralReward } from '@/lib/referral'
import { sendFriendConvertedEmail } from '@/lib/referral-emails'
import { enqueueEmail, getQStashClient } from '@/lib/queue'
import { toISO } from '@/lib/date-utils'
import { invalidateProfile } from '@/lib/profile-cache'
import { captureServerEvent } from '@/lib/posthog'
import { mapStripeEventToPostHog } from '@/lib/posthog-webhook-utils'

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
    // Non-idempotency DB error — return 500 so Stripe retries rather than
    // processing without a recorded idempotency key (which risks double-processing).
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // ── HANDLE EVENTS ────────────────────────────────
  try {
    switch (event.type) {

      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        const ph = mapStripeEventToPostHog('customer.subscription.created', userId, {
          status: sub.status,
          plan: sub.metadata?.plan,
        })
        if (ph) {
          try { await captureServerEvent(ph.distinctId, ph.event, ph.properties) } catch { /* analytics best-effort */ }
        }
        break
      }

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

          // Enqueue emails via QStash in parallel — wrapped so a queue failure doesn't
          // cause a 500 that would re-mark the invoice paid on Stripe's retry.
          await Promise.allSettled([
            businessEmail
              ? enqueueEmail('payment_received',  { to: businessEmail, businessName, clientName, invoiceNumber, amount })
              : Promise.resolve(),
            clientEmail
              ? enqueueEmail('payment_confirmed', { to: clientEmail, clientName, businessName, invoiceNumber, amount })
              : Promise.resolve(),
          ]).then(results => {
            for (const r of results) {
              if (r.status === 'rejected') {
                Sentry.captureException(r.reason, { tags: { feature: 'stripe_webhook', step: 'email_queue' } })
                console.error('Failed to enqueue payment email:', r.reason)
              }
            }
          })

          console.log(`✅ Invoice ${invoiceNumber} paid by ${clientName}`)
          break
        }

        // ── Subscription checkout ──────────────────────────────────────
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan
        if (!userId || !plan) {
          Sentry.captureException(new Error('checkout.session.completed missing userId or plan metadata'), {
            extra: { sessionId: session.id, metadata: session.metadata },
          })
          break
        }

        let trialEndsAt: string | null = null
        let subscriptionStatus = 'trialing'
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          trialEndsAt = toISO(sub.trial_end)
          subscriptionStatus = sub.status
        }

        const { error: planErr } = await supabase.from('profiles').update({
          plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: subscriptionStatus,
          trial_ends_at: trialEndsAt ?? (subscriptionStatus === 'trialing'
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            : null),
        }).eq('id', userId)
        if (planErr) {
          Sentry.captureException(new Error(planErr.message), { tags: { feature: 'stripe_webhook', step: 'plan_upgrade' } })
          console.error('Profile plan upgrade error:', planErr)
          throw planErr
        }

        await invalidateProfile(userId)
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

          // Increment + reward are now consolidated in applyReferralReward so the
          // SELECT that computes the tier always runs after the write on the same connection.
          const { additionalMonths, lifetimePro, convertedReferrals: newConverted } = await applyReferralReward(referrerId)

          // Apply Stripe credit so Stripe actually honours the free months on next invoice
          if (additionalMonths > 0 || lifetimePro) {
            try {
              const { data: referrerProfile } = await supabase
                .from('profiles')
                .select('stripe_customer_id, stripe_subscription_id')
                .eq('id', referrerId)
                .single()

              const customerId      = referrerProfile?.stripe_customer_id as string | null
              const subscriptionId  = referrerProfile?.stripe_subscription_id as string | null

              if (customerId && subscriptionId) {
                if (lifetimePro) {
                  // Apply 100% forever coupon — keeps subscription active at $0 so they never
                  // lose access. cancel_at_period_end would trigger subscription.deleted and
                  // downgrade them to free.
                  let couponId = 'LIFETIME_PRO_REWARD'
                  try { await stripe.coupons.retrieve(couponId) } catch {
                    await stripe.coupons.create({ id: couponId, percent_off: 100, duration: 'forever', name: 'Lifetime Pro Referral Reward' })
                  }
                  await stripe.subscriptions.update(subscriptionId, { coupon: couponId })
                  console.log(`👑 Lifetime Pro: applied 100% forever coupon for ${referrerId}`)
                } else {
                  // Credit based on what the referred friend pays, not the referrer's plan
                  const friendSubId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as { id: string } | null)?.id
                  const friendSub   = friendSubId ? await stripe.subscriptions.retrieve(friendSubId) : null
                  const unitAmount  = friendSub?.items.data[0]?.price?.unit_amount ?? 0
                  const currency    = friendSub?.currency ?? 'aud'
                  if (unitAmount > 0) {
                    await stripe.customers.createBalanceTransaction(customerId, {
                      amount:      -(unitAmount * additionalMonths),
                      currency,
                      description: `Referral reward – ${additionalMonths} free month${additionalMonths > 1 ? 's' : ''}`,
                    })
                    console.log(`💳 Applied Stripe credit: ${unitAmount * additionalMonths} ${currency} for ${referrerId}`)
                  }
                }
              }
            } catch (creditErr) {
              console.error('Failed to apply Stripe referral credit:', creditErr)
              Sentry.captureException(creditErr, { tags: { feature: 'referral', step: 'stripe_credit' } })
            }
          }

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

        const isActive = sub.status === 'active' || sub.status === 'trialing'

        // Resolve plan: price ID is most reliable (stale checkout metadata can say 'starter'
        // even after a manual upgrade to 'pro', causing false downgrades on portal visits).
        const priceId = sub.items.data[0]?.price?.id
        const planFromPrice = priceId
          ? (Object.entries(PRICE_IDS).find(([, id]) => id === priceId)?.[0] as string | undefined)
          : undefined
        const detectedPlan = planFromPrice
          || sub.metadata?.plan
          || sub.items.data[0]?.price?.metadata?.plan

        const update: Record<string, unknown> = {
          subscription_status: sub.status,
          billing_cycle_end: toISO(sub.current_period_end),
        }

        if (!isActive) {
          update.plan = 'free'
        } else if (detectedPlan) {
          update.plan = detectedPlan
        }
        // Active but plan unknown — leave stored plan untouched

        await supabase.from('profiles').update(update).eq('id', userId)
        await invalidateProfile(userId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break

        // Don't downgrade Lifetime Pro users — their subscription may be deleted
        // for unrelated reasons but the reward is permanent.
        const { data: rc } = await supabase
          .from('referral_codes')
          .select('lifetime_pro')
          .eq('user_id', userId)
          .maybeSingle()

        if (rc?.lifetime_pro) {
          console.log(`👑 Skipping downgrade — ${userId} has Lifetime Pro`)
          await invalidateProfile(userId)
          break
        }

        await supabase.from('profiles').update({
          plan: 'free',
          subscription_status: 'cancelled',
          stripe_subscription_id: null,
          billing_cycle_end: null,
          trial_ends_at: null,
        }).eq('id', userId)
        await invalidateProfile(userId)
        const phDel = mapStripeEventToPostHog('customer.subscription.deleted', userId)
        if (phDel) {
          try { await captureServerEvent(phDel.distinctId, phDel.event) } catch { /* analytics best-effort */ }
        }
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const customerId  = inv.customer as string
        const invoiceId   = inv.id

        const { data: profileRow } = await supabase
          .from('profiles')
          .select('id, email, stripe_customer_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profileRow?.id) break

        await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('stripe_customer_id', customerId)
        await invalidateProfile(profileRow.id as string)

        const phFail = mapStripeEventToPostHog('invoice.payment_failed', profileRow.id as string)
        if (phFail) {
          try { await captureServerEvent(phFail.distinctId, phFail.event) } catch { /* analytics best-effort */ }
        }

        // Schedule dunning email sequence via QStash
        const userId    = profileRow.id as string
        const userEmail = profileRow.email as string
        const base      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'

        if (userEmail && process.env.QSTASH_TOKEN) {
          const userName = userEmail.split('@')[0]
          const qstash   = getQStashClient()

          for (const delayDays of [3, 7, 14] as const) {
            const delaySeconds  = delayDays * 24 * 60 * 60
            const scheduledFor  = new Date(Date.now() + delaySeconds * 1000).toISOString()

            try {
              const result = await qstash.publishJSON({
                url:   `${base}/api/email/dunning`,
                body:  { step: delayDays, userEmail, userName, stripeCustomerId: customerId },
                delay: delaySeconds,
                retries: 2,
              })

              await supabase.from('dunning_jobs').insert({
                user_id:            userId,
                stripe_invoice_id:  invoiceId,
                qstash_message_id:  result.messageId,
                scheduled_for:      scheduledFor,
              })
            } catch (err) {
              Sentry.captureException(err, { tags: { feature: 'dunning', step: `day_${delayDays}` } })
              console.error(`[dunning] Failed to schedule day-${delayDays} email:`, err)
            }
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const inv       = event.data.object as Stripe.Invoice
        const invoiceId = inv.id

        // Cancel any pending dunning jobs for this invoice
        const { data: pendingJobs } = await supabase
          .from('dunning_jobs')
          .select('id, qstash_message_id')
          .eq('stripe_invoice_id', invoiceId)
          .is('cancelled_at', null)

        if (pendingJobs?.length && process.env.QSTASH_TOKEN) {
          const qstash = getQStashClient()
          const now    = new Date().toISOString()

          await Promise.allSettled(
            pendingJobs.map(async (job) => {
              try {
                await qstash.messages.cancel(job.qstash_message_id as string)
                await supabase.from('dunning_jobs')
                  .update({ cancelled_at: now })
                  .eq('id', job.id)
              } catch (err) {
                Sentry.captureException(err, { tags: { feature: 'dunning', step: 'cancel' } })
                console.error('[dunning] Failed to cancel job:', job.qstash_message_id, err)
              }
            }),
          )
          console.log(`✅ Cancelled ${pendingJobs.length} dunning job(s) for invoice ${invoiceId}`)
        }
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

