import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { escHtml as esc } from '@/lib/email-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { to, clientName, businessName, invoiceNumber, amount } =
    await req.json() as {
      to: string
      clientName: string
      businessName: string
      invoiceNumber: string
      amount: string
    }

  if (!to || !invoiceNumber) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#1C1917;padding:28px 36px">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700">${esc(businessName || 'Your Supplier')}</p>
            <p style="margin:6px 0 0;color:#A09590;font-size:13px">Payment confirmation</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px">
            <p style="margin:0 0 8px;color:#1C1917;font-size:15px">Hi ${esc(clientName)},</p>
            <p style="margin:0 0 28px;color:#57534E;font-size:14px;line-height:1.6">
              Your payment for invoice <strong>${esc(invoiceNumber)}</strong> from <strong>${esc(businessName)}</strong> has been received. Thank you!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:8px;margin-bottom:28px">
              <tr>
                <td style="padding:20px 24px">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;color:#78716C;font-size:13px">Invoice</td>
                      <td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">${esc(invoiceNumber)}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#78716C;font-size:13px">Paid to</td>
                      <td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">${esc(businessName)}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0 6px;border-top:1px solid #E5DDD5;color:#1C1917;font-size:14px;font-weight:700">Amount paid</td>
                      <td align="right" style="padding:10px 0 6px;border-top:1px solid #E5DDD5;color:#4A7055;font-size:20px;font-weight:700">${esc(amount)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#57534E;font-size:13px;line-height:1.6">
              Please keep this email as your payment confirmation. If you have any questions, contact ${esc(businessName)} directly.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F5F0E8;padding:20px 36px;border-top:1px solid #E5DDD5">
            <p style="margin:0;color:#A09590;font-size:11px;text-align:center">Powered by SAB Account AI</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'hello@sabaccountai.com',
    to: [to],
    subject: `Payment confirmed — ${invoiceNumber.replace(/[\r\n]/g, '')} from ${businessName.replace(/[\r\n]/g, '')} (${amount})`,
    html,
  })

  if (error) return NextResponse.json({ error: (error as { message?: string }).message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
