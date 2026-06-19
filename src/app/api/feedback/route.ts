import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'

const STARS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']
const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Read only rating/category/message from body — user identity sourced from session
  const { rating, category, message } = await req.json() as {
    rating: number
    category: string
    message: string
  }

  if (!message?.trim() || !rating) {
    return NextResponse.json({ error: 'rating and message required' }, { status: 400 })
  }

  // Fetch user details from DB — never trust client-supplied email or plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, business_name')
    .eq('id', user.id)
    .single()

  const userEmail   = user.email ?? ''
  const businessName = (profile?.business_name as string | null) ?? null
  const plan        = (profile?.plan as string | null) ?? 'free'

  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'SAB Account AI <noreply@sabaccountai.com>',
    to: 'basnet@sabaccountai.com',
    replyTo: userEmail,
    subject: `[${category}] ${STARS[rating]} from ${businessName || userEmail}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#1a1a1a;padding:20px 28px;border-radius:8px 8px 0 0;">
          <p style="color:#fff;font-size:16px;font-weight:600;margin:0;">SAB Account AI — Customer Feedback</p>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;width:130px;">Rating</td>
              <td style="padding:6px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${STARS[rating]} ${LABELS[rating]}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;">Category</td>
              <td style="padding:6px 0;font-size:14px;color:#1a1a1a;">${category}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;">Business</td>
              <td style="padding:6px 0;font-size:14px;color:#1a1a1a;">${businessName || '—'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email</td>
              <td style="padding:6px 0;font-size:14px;color:#1a1a1a;"><a href="mailto:${userEmail}" style="color:#c84b2f;">${userEmail}</a></td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;">Plan</td>
              <td style="padding:6px 0;font-size:14px;color:#1a1a1a;">${plan}</td>
            </tr>
          </table>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;border-left:3px solid #c84b2f;">
            <p style="font-size:13px;color:#6b7280;margin:0 0 8px;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;">Message</p>
            <p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <p style="font-size:12px;color:#9ca3af;margin-top:20px;margin-bottom:0;">
            Reply to this email to respond directly to ${userEmail}
          </p>
        </div>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
