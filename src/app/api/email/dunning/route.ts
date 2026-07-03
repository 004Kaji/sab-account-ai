export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import Stripe from 'stripe'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { escHtml as esc } from '@/lib/email-utils'
import { DUNNING_STEPS, getDunningStep } from '@/lib/dunning-utils'

type DunningStep = 3 | 7 | 14

function buildDunningHtml(
  step: typeof DUNNING_STEPS[number],
  portalUrl: string,
  userName: string,
): string {
  const accentColor = step.tone === 'gentle' ? '#C84B2F' : step.tone === 'urgent' ? '#92400E' : '#7C3AED'
  const headerBg    = step.tone === 'final'  ? '#4C1D95' : '#1C1917'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:${headerBg};padding:28px 36px">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">SAB Account AI</p>
            <p style="margin:6px 0 0;color:#A09590;font-size:13px">Billing Notice</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px">
            <p style="margin:0 0 8px;color:#1C1917;font-size:15px">Hi ${esc(userName || 'there')},</p>
            <h2 style="margin:0 0 16px;color:${accentColor};font-size:20px;font-weight:700;line-height:1.3">${esc(step.heading)}</h2>
            <p style="margin:0 0 28px;color:#57534E;font-size:14px;line-height:1.7">${esc(step.body)}</p>
            <a href="${portalUrl}"
               style="display:inline-block;background:${accentColor};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.01em">
              ${esc(step.cta)}
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:#F5F0E8;padding:20px 36px;border-top:1px solid #E5DDD5">
            <p style="margin:0;color:#A09590;font-size:11px;text-align:center">
              SAB Account AI · <a href="${portalUrl}" style="color:#A09590">Manage billing</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY || !process.env.QSTASH_NEXT_SIGNING_KEY) {
    console.error('[email/dunning] QStash signing keys not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY,
  })

  const body = await req.text()
  try {
    await receiver.verify({ signature: req.headers.get('upstash-signature') ?? '', body })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { step, userEmail, userName, stripeCustomerId } =
    JSON.parse(body) as {
      step: number
      userEmail: string
      userName: string
      stripeCustomerId: string
    }

  const dunningStep = getDunningStep(step)
  if (!dunningStep) {
    Sentry.captureException(new Error(`[email/dunning] Unknown dunning step: ${step}`))
    return NextResponse.json({ error: `Unknown dunning step: ${step}` }, { status: 400 })
  }

  if (!userEmail) {
    return NextResponse.json({ error: 'Missing userEmail' }, { status: 400 })
  }

  // Generate a fresh Stripe billing portal URL (portal sessions expire in ~5 min,
  // so we create it at delivery time, not at schedule time)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'
  let portalUrl = `${appUrl}/settings?tab=subscription`

  if (stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
      const session = await stripe.billingPortal.sessions.create({
        customer:   stripeCustomerId,
        return_url: `${appUrl}/settings?tab=subscription`,
      })
      portalUrl = session.url
    } catch (err) {
      // Non-fatal — fall back to settings link
      Sentry.captureException(err, { tags: { feature: 'dunning', step: 'portal_session' } })
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from   = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
  const html   = buildDunningHtml(dunningStep, portalUrl, userName)

  const { error } = await resend.emails.send({
    from,
    to:      [userEmail],
    subject: dunningStep.subject,
    html,
  })

  if (error) {
    Sentry.captureException(new Error((error as { message?: string }).message ?? 'Dunning email failed'), {
      tags: { feature: 'dunning', step: String(step) },
    })
    throw new Error((error as { message?: string }).message ?? 'Failed to send dunning email')
  }

  return NextResponse.json({ ok: true })
}
