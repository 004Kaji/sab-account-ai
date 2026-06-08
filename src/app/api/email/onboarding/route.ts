import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, firstName, emailType } = await req.json() as {
    email: string
    firstName: string
    emailType: 'day1' | 'day3' | 'day7'
  }

  if (!email || !emailType) {
    return NextResponse.json({ error: 'email and emailType required' }, { status: 400 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const name = firstName || 'there'

  const EMAILS = {
    day1: {
      subject: 'Welcome to SAB Account AI — let\'s get you set up',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #1a1a1a; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <p style="color: white; font-size: 18px; font-weight: 600; margin: 0;">SAB Account AI</p>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 16px;">Hey ${name}, welcome aboard 👋</h1>
            <p style="color: #4b5563; line-height: 1.7; margin: 0 0 20px;">
              You've just signed up for SAB Account AI — invoicing and payroll built specifically for Australian sole traders and small businesses.
            </p>
            <p style="color: #4b5563; line-height: 1.7; margin: 0 0 24px;">
              Here are 3 things to get started:
            </p>

            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
                <div style="background: #c84b2f; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; margin-right: 12px; margin-top: 1px; text-align: center; line-height: 24px;">1</div>
                <div>
                  <p style="font-weight: 600; margin: 0 0 4px; color: #111827;">Add your business name</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Go to Settings → Business to add your name, ABN, and address so invoices look professional.</p>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
                <div style="background: #c84b2f; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; margin-right: 12px; margin-top: 1px; text-align: center; line-height: 24px;">2</div>
                <div>
                  <p style="font-weight: 600; margin: 0 0 4px; color: #111827;">Create your first invoice</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Takes under 2 minutes. GST is calculated automatically and the invoice is ATO-compliant out of the box.</p>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start;">
                <div style="background: #c84b2f; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; margin-right: 12px; margin-top: 1px; text-align: center; line-height: 24px;">3</div>
                <div>
                  <p style="font-weight: 600; margin: 0 0 4px; color: #111827;">Add your first client</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Save client details once and reuse them on every invoice — no re-typing.</p>
                </div>
              </div>
            </div>

            <a href="https://sabaccountai.com/dashboard" style="display: inline-block; background: #c84b2f; color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
              Go to my dashboard →
            </a>

            <p style="color: #9ca3af; font-size: 13px; margin: 32px 0 0; line-height: 1.6;">
              If you have any questions, just reply to this email — I read every one.<br/>
              <strong>Sanjog</strong> · Founder, SAB Account AI
            </p>
          </div>
        </div>
      `,
    },

    day3: {
      subject: 'Your GST is being tracked automatically',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #1a1a1a; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <p style="color: white; font-size: 18px; font-weight: 600; margin: 0;">SAB Account AI</p>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 16px;">Hey ${name} — your GST is being tracked</h1>
            <p style="color: #4b5563; line-height: 1.7; margin: 0 0 20px;">
              Every invoice you create in SAB Account AI automatically tracks the GST you've collected. When BAS time comes around, you don't need to add it up manually — it's already done.
            </p>

            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="font-weight: 700; color: #9a3412; margin: 0 0 8px; font-size: 15px;">BAS deadline coming up</p>
              <p style="color: #7c2d12; font-size: 14px; line-height: 1.6; margin: 0;">
                Q4 BAS (April–June 2026) is due <strong>28 July 2026</strong>. Your dashboard shows exactly how much GST you owe — so there are no surprises.
              </p>
            </div>

            <p style="color: #4b5563; line-height: 1.7; margin: 0 0 24px;">
              You can also add business expenses under <strong>Records</strong> to claim GST credits — reducing what you owe the ATO.
            </p>

            <a href="https://sabaccountai.com/records" style="display: inline-block; background: #c84b2f; color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
              Add an expense →
            </a>

            <p style="color: #9ca3af; font-size: 13px; margin: 32px 0 0; line-height: 1.6;">
              Questions? Just reply.<br/>
              <strong>Sanjog</strong> · Founder, SAB Account AI
            </p>
          </div>
        </div>
      `,
    },

    day7: {
      subject: 'You\'ve been using SAB Account AI for a week',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #1a1a1a; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <p style="color: white; font-size: 18px; font-weight: 600; margin: 0;">SAB Account AI</p>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 16px;">One week in, ${name} 🎉</h1>
            <p style="color: #4b5563; line-height: 1.7; margin: 0 0 20px;">
              You've been using SAB Account AI for a week. If you're on the free plan, here's what you're missing on Pro:
            </p>

            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <div style="margin-bottom: 14px; display: flex; align-items: flex-start; gap: 10px;">
                <span style="color: #c84b2f; font-size: 16px;">✓</span>
                <div>
                  <p style="font-weight: 600; margin: 0 0 2px; color: #111827;">Payslips + payroll</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Generate ATO-compliant payslips with PAYG withholding, super, and leave loading calculated automatically.</p>
                </div>
              </div>
              <div style="margin-bottom: 14px; display: flex; align-items: flex-start; gap: 10px;">
                <span style="color: #c84b2f; font-size: 16px;">✓</span>
                <div>
                  <p style="font-weight: 600; margin: 0 0 2px; color: #111827;">Super guarantee tracking</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">See exactly how much super you owe each quarter — no more manual calculations.</p>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 10px;">
                <span style="color: #c84b2f; font-size: 16px;">✓</span>
                <div>
                  <p style="font-weight: 600; margin: 0 0 2px; color: #111827;">Tax & super overview</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Full FY income, estimated tax owed, and super obligations — all in one place.</p>
                </div>
              </div>
            </div>

            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="font-weight: 700; color: #991b1b; margin: 0 0 4px;">Pro is $19/mo — less than a coffee a week</p>
              <p style="color: #7f1d1d; font-size: 14px; margin: 0;">vs Xero at $70/mo or MYOB at $27/mo. No lock-in contract.</p>
            </div>

            <a href="https://sabaccountai.com/settings?tab=subscription" style="display: inline-block; background: #c84b2f; color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
              Upgrade to Pro →
            </a>

            <p style="color: #9ca3af; font-size: 13px; margin: 32px 0 0; line-height: 1.6;">
              Happy to answer any questions — just reply to this email.<br/>
              <strong>Sanjog</strong> · Founder, SAB Account AI
            </p>
          </div>
        </div>
      `,
    },
  }

  const template = EMAILS[emailType]
  if (!template) return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })

  const { error } = await resend.emails.send({
    from: 'Sanjog from SAB Account AI <sanjog@sabaccountai.com>',
    to:   [email],
    subject: template.subject,
    html: template.html,
  })

  if (error) {
    console.error('[email/onboarding] Resend error:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
