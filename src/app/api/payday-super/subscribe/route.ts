import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { email?: string }
    const email = (body.email ?? '').trim().toLowerCase()

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Upsert — silently succeeds if email already subscribed
    const { error: dbError } = await supabase
      .from('payday_super_subscribers')
      .upsert({ email, subscribed: true }, { onConflict: 'email', ignoreDuplicates: true })

    if (dbError) {
      console.error('[payday-super/subscribe] db error:', dbError)
      return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
    }

    // Send confirmation email — best-effort, don't fail if Resend is unavailable
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from:    'Sanjog Basnet <basnet@sabaccountai.com>',
          to:      email,
          subject: 'Payday Super starts July 1 — here\'s what you need to know',
          html: `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2937">
  <div style="margin-bottom:24px">
    <span style="background:#c84b2f;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:4px 10px;border-radius:999px">⚡ From 1 July 2026</span>
  </div>

  <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 16px">
    Payday Super: what every employer needs to know
  </h1>

  <p style="margin:0 0 16px;line-height:1.7;font-size:15px">
    The new <strong>Payday Super</strong> law requires all Australian employers to pay
    superannuation on <strong>every payday</strong> — not quarterly as it works today.
    Missing a payment triggers ATO penalties with no grace period.
  </p>

  <div style="background:#fef9f8;border:1px solid #f3d5cc;border-radius:8px;padding:20px;margin:24px 0">
    <p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#c84b2f">Three things to do before July 1</p>
    <ol style="margin:0;padding-left:20px;line-height:1.8;font-size:14px;color:#374151">
      <li>Calculate your super obligations per pay run (12% of ordinary time earnings)</li>
      <li>Set up a SuperStream-compliant payment method if you haven't already</li>
      <li>Make sure your payroll software can pay super within 7 business days of each payday</li>
    </ol>
  </div>

  <p style="margin:0 0 24px;line-height:1.7;font-size:15px">
    SAB Account AI calculates your exact super obligation on every payslip and shows
    you the 7-day deadline so you're never caught out.
  </p>

  <a href="https://sabaccountai.com.au/payday-super"
     style="display:inline-block;background:#c84b2f;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none">
    Use the free Payday Super calculator →
  </a>

  <p style="margin:32px 0 0;font-size:12px;color:#9ca3af;line-height:1.6">
    You signed up for Payday Super reminders at sabaccountai.com.au/payday-super.<br>
    SAB Account AI · ABN 49 541 449 108
  </p>
</div>`,
        })
      } catch (emailErr) {
        console.error('[payday-super/subscribe] email send failed:', emailErr)
        // Don't return error — email failure doesn't invalidate the subscription
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[payday-super/subscribe] unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 })
  }
}
