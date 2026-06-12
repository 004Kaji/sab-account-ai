import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
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

    // Save to Supabase
    await supabase.from('partner_applications').insert({
      name: name.trim(),
      firm: firm.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      referrals: referrals || null,
      notes: notes?.trim() || null,
    })

    // Email Sanjog
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'SAB Account AI <basnet@sabaccountai.com>',
      to: 'sanjog.basnet02@gmail.com',
      replyTo: email.trim(),
      subject: `New partner application — ${name.trim()} (${firm.trim()})`,
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
          </table>
          <p style="margin-top:24px;font-size:13px;color:#999;">Reply directly to this email to respond to the applicant.</p>
        </div>
      `,
    })

    // Confirmation email to applicant
    await resend.emails.send({
      from: 'Sanjog from SAB Account AI <basnet@sabaccountai.com>',
      to: email.trim(),
      subject: 'We received your partner application — SAB Account AI',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222;line-height:1.6;">
          <p>Hi ${name.trim().split(' ')[0]},</p>
          <p>Thanks for applying to the SAB Account AI partner program.</p>
          <p>I'll review your application and send your unique referral link within 1 business day.</p>
          <p>In the meantime, feel free to reply to this email if you have any questions.</p>
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
