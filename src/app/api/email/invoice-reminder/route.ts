export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { escHtml as esc } from '@/lib/email-utils'
import { formatCurrency, formatDateAU } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { to, clientName, businessName, invoiceNumber, totalIncGst, dueDate } =
    await req.json() as {
      to: string
      clientName: string
      businessName: string
      invoiceNumber: string
      totalIncGst: number
      dueDate: string
    }

  if (!to || !invoiceNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'
  const resend    = new Resend(process.env.RESEND_API_KEY)
  const from      = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
  const dueDateFmt = dueDate ? formatDateAU(dueDate) : 'overdue'
  const amountFmt  = totalIncGst != null ? formatCurrency(Number(totalIncGst)) : ''

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#1C1917;padding:28px 36px">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">${esc(businessName || 'SAB Account AI')}</p>
            <p style="margin:6px 0 0;color:#A09590;font-size:13px">Invoice Reminder</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px">
            <p style="margin:0 0 8px;color:#1C1917;font-size:15px">Hi ${esc(clientName || 'there')},</p>
            <h2 style="margin:0 0 16px;color:#92400E;font-size:20px;font-weight:700;line-height:1.3">
              Friendly reminder: invoice ${esc(invoiceNumber)} is outstanding
            </h2>
            <p style="margin:0 0 24px;color:#57534E;font-size:14px;line-height:1.7">
              This is a reminder that the following invoice remains unpaid. Please arrange payment at your earliest convenience.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:8px;margin-bottom:28px">
              <tr><td style="padding:20px 24px">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;color:#78716C;font-size:13px">Invoice</td>
                    <td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">${esc(invoiceNumber)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#78716C;font-size:13px">Due Date</td>
                    <td align="right" style="padding:6px 0;color:#92400E;font-size:13px;font-weight:600">${esc(dueDateFmt)}</td>
                  </tr>
                  ${amountFmt ? `<tr>
                    <td style="padding:10px 0 6px;border-top:1px solid #E5DDD5;color:#1C1917;font-size:14px;font-weight:700">Amount Due</td>
                    <td align="right" style="padding:10px 0 6px;border-top:1px solid #E5DDD5;color:#C84B2F;font-size:18px;font-weight:700">${esc(amountFmt)}</td>
                  </tr>` : ''}
                </table>
              </td></tr>
            </table>
            <p style="margin:0;color:#78716C;font-size:12px;line-height:1.6">
              If you have already arranged payment, please disregard this reminder. Contact ${esc(businessName || 'us')} if you have any questions.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F5F0E8;padding:20px 36px;border-top:1px solid #E5DDD5">
            <p style="margin:0;color:#A09590;font-size:11px;text-align:center">
              ${esc(businessName || 'SAB Account AI')} · Powered by <a href="${appUrl}" style="color:#A09590">SAB Account AI</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const { error } = await resend.emails.send({
    from,
    to:      [to],
    subject: `Payment reminder: Invoice ${invoiceNumber} from ${businessName || 'SAB Account AI'}`,
    html,
  })

  if (error) {
    Sentry.captureException(new Error((error as { message?: string }).message ?? 'Reminder email failed'), {
      tags: { feature: 'invoice_reminder' },
    })
    return NextResponse.json({ error: 'Failed to send reminder email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
