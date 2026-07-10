import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'
import { checkPublicRateLimit } from '@/lib/ratelimit'
import { FREE_MODE } from '@/lib/free-mode'

function generateCode(firm: string): string {
  const prefix = firm.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 6).padEnd(4, 'X')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}-${suffix}`
}

export async function POST(req: NextRequest) {
  if (FREE_MODE) {
    return NextResponse.json({ error: 'The partner program is closed while SAB Account AI is free.' }, { status: 404 })
  }
  const { allowed } = await checkPublicRateLimit(req)
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again in an hour.' }, { status: 429 })

  try {
    const body = await req.json()
    const { name, firm, email, phone, referrals, notes } = body as {
      name: string
      firm: string
      email: string
      phone?: string
      referrals?: string
      notes?: string
    }

    if (!name?.trim() || !firm?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name, firm, and email are required.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Generate unique referral code — retry once on collision
    let refCode = generateCode(firm.trim())
    const { error: insertErr } = await supabase.from('partner_applications').insert({
      name: name.trim(),
      firm: firm.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      referrals: referrals || null,
      notes: notes?.trim() || null,
      ref_code: refCode,
    })

    if (insertErr) {
      // Likely a code collision — retry with a new code
      refCode = generateCode(firm.trim())
      await supabase.from('partner_applications').insert({
        name: name.trim(),
        firm: firm.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        referrals: referrals || null,
        notes: notes?.trim() || null,
        ref_code: refCode,
      })
    }

    const referralLink = `https://sabaccountai.com/signup?ref=${refCode}`

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Notify Sanjog
    await resend.emails.send({
      from: 'SAB Account AI <basnet@sabaccountai.com>',
      to: 'sanjog.basnet02@gmail.com',
      replyTo: email.trim(),
      subject: `New partner — ${name.trim()} (${firm.trim()}) · code: ${refCode}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222;">
          <h2 style="color:#c84b2f;margin:0 0 20px;">New Partner Application</h2>
          <table style="width:100%;border-collapse:collapse;font-size:15px;">
            <tr><td style="padding:8px 0;color:#666;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${name.trim()}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Firm</td><td style="padding:8px 0;font-weight:600;">${firm.trim()}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${email.trim()}" style="color:#2563eb;">${email.trim()}</a></td></tr>
            <tr><td style="padding:8px 0;color:#666;">Phone</td><td style="padding:8px 0;">${phone?.trim() || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Est. referrals</td><td style="padding:8px 0;">${referrals || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;vertical-align:top;">Notes</td><td style="padding:8px 0;">${notes?.trim() || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Referral code</td><td style="padding:8px 0;font-weight:700;color:#c84b2f;">${refCode}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Referral link</td><td style="padding:8px 0;"><a href="${referralLink}" style="color:#2563eb;">${referralLink}</a></td></tr>
          </table>
          <p style="margin-top:24px;font-size:13px;color:#999;">Referral link has been sent to the applicant automatically.</p>
        </div>
      `,
    })

    // Confirmation + referral link to partner
    const firstName = name.trim().split(' ')[0]
    await resend.emails.send({
      from: 'Sanjog from SAB Account AI <basnet@sabaccountai.com>',
      to: email.trim(),
      subject: `Your SAB Account AI referral link is ready — ${refCode}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:24px;color:#222;line-height:1.6;">
          <p style="margin:0 0 16px;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;">Welcome to the SAB Account AI partner program! Your referral link is ready to use right now.</p>

          <div style="background:#f8f4f0;border:2px solid #c84b2f;border-radius:8px;padding:20px 24px;margin:24px 0;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.05em;">Your referral link</p>
            <a href="${referralLink}" style="font-size:16px;font-weight:700;color:#c84b2f;word-break:break-all;">${referralLink}</a>
            <p style="margin:8px 0 0;font-size:12px;color:#999;">Code: ${refCode}</p>
          </div>

          <p style="margin:0 0 16px;font-weight:600;">How it works:</p>
          <ol style="margin:0 0 16px;padding-left:20px;color:#444;font-size:15px;line-height:1.8;">
            <li>Share your link with clients who need invoicing, payslip, or BAS help</li>
            <li>They sign up using your link — they get their first month free</li>
            <li>You earn <strong>20% of their subscription every month</strong> they stay</li>
          </ol>

          <p style="margin:0 0 16px;">Commissions are tracked automatically and paid monthly by bank transfer. I'll send you a statement each month showing your referrals and earnings.</p>

          <p style="margin:0 0 16px;">Any questions, just reply to this email.</p>

          <p style="margin-top:28px;color:#666;font-size:13px;border-top:1px solid #eee;padding-top:16px;line-height:1.8;">
            Sanjog Basnet<br>
            Founder, SAB Account AI<br>
            0415 304 090 · basnet@sabaccountai.com · sabaccountai.com
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[partner-apply]', err)
    return NextResponse.json({ error: 'Something went wrong. Please email basnet@sabaccountai.com directly.' }, { status: 500 })
  }
}
