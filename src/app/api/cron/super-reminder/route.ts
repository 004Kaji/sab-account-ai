export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Runs daily at 8am AEST (22:00 UTC).
// For each user who processed a payrun exactly 7 days ago, sends a Payday Super
// reminder if notify_super is enabled and they are on a paid plan.
// Deduplicates via alert_history — one email per user per payment date.

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'

function fmt(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export async function GET(req: NextRequest) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const resend   = new Resend(process.env.RESEND_API_KEY)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const paymentDate = sevenDaysAgo.toISOString().split('T')[0]

  // Find all payslips with that payment date
  const { data: payslips, error } = await supabase
    .from('payslips')
    .select('id, user_id, employee_name, super_sg, super_sal_sac, super_fund_name, payment_date')
    .eq('payment_date', paymentDate)

  if (error) {
    Sentry.captureException(error, { tags: { feature: 'super_reminder' } })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!payslips?.length) {
    return NextResponse.json({ ok: true, sent: 0, paymentDate, reason: 'no payslips' })
  }

  // Group payslips by user
  const byUser = new Map<string, typeof payslips>()
  for (const ps of payslips) {
    const uid = ps.user_id as string
    if (!byUser.has(uid)) byUser.set(uid, [])
    byUser.get(uid)!.push(ps)
  }

  let sent = 0

  for (const [userId, userPayslips] of byUser) {
    try {
      // Check dedup — only send once per user per payment date
      const alertKey = `super_remind_${userId}_${paymentDate}`
      const { count: existing } = await supabase
        .from('alert_history')
        .select('id', { count: 'exact', head: true })
        .eq('alert_key', alertKey)

      if ((existing ?? 0) > 0) continue

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, business_name, notify_super, plan')
        .eq('id', userId)
        .maybeSingle()

      if (!profile?.email) continue
      if (profile.notify_super === false) continue
      if (profile.plan === 'free') continue

      // Build per-employee summary
      const totalSg     = userPayslips.reduce((s, p) => s + (p.super_sg as number), 0)
      const totalSalSac = userPayslips.reduce((s, p) => s + (p.super_sal_sac as number), 0)
      const totalSuper  = totalSg + totalSalSac

      const payDateFormatted = new Date(`${paymentDate}T00:00:00`).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

      const firstName = (profile.business_name as string)?.split(' ')[0] || 'there'

      const employeeRows = userPayslips.map(ps => {
        const sg     = ps.super_sg as number
        const salSac = ps.super_sal_sac as number
        const total  = sg + salSac
        const fund   = (ps.super_fund_name as string | null) || 'Not specified'
        return `
          <tr>
            <td style="color:#57534E;font-size:13px;padding:6px 0;border-bottom:1px solid #E5DDD5">${ps.employee_name as string}</td>
            <td style="color:#57534E;font-size:13px;padding:6px 0;border-bottom:1px solid #E5DDD5">${fund}</td>
            <td align="right" style="color:#1C1917;font-size:13px;font-weight:600;padding:6px 0;border-bottom:1px solid #E5DDD5">${fmt(total)}</td>
          </tr>`
      }).join('')

      const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F5F0E8;margin:0;padding:32px 0">
<table width="560" align="center" style="background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:#1C1917;padding:24px 32px">
  <p style="margin:0;color:#fff;font-size:17px;font-weight:700">${(profile.business_name as string) || 'Your Business'}</p>
  <p style="margin:4px 0 0;color:#A09590;font-size:12px">Payday Super Reminder · ${payDateFormatted}</p>
</td></tr>
<tr><td style="padding:28px 32px">
  <p style="color:#1C1917;font-size:15px;margin:0 0 8px">Hi ${firstName},</p>
  <p style="color:#57534E;font-size:14px;margin:0 0 20px">
    You processed a payrun on <strong>${payDateFormatted}</strong>. Under Payday Super (mandatory from 1 July 2026),
    super must be paid to your employees' funds <strong>within 7 business days of each pay date</strong>.
    That deadline is approaching now.
  </p>

  <p style="color:#1C1917;font-size:13px;font-weight:700;margin:0 0 8px">Super due this payrun:</p>
  <table width="100%" style="background:#F5F0E8;border-radius:8px;margin:0 0 20px"><tr><td style="padding:16px 20px">
    <table width="100%" style="border-collapse:collapse">
      <tr>
        <th align="left" style="color:#A09590;font-size:11px;font-weight:600;padding-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Employee</th>
        <th align="left" style="color:#A09590;font-size:11px;font-weight:600;padding-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Fund</th>
        <th align="right" style="color:#A09590;font-size:11px;font-weight:600;padding-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Amount</th>
      </tr>
      ${employeeRows}
      <tr>
        <td colspan="2" style="color:#1C1917;font-size:14px;font-weight:700;padding-top:10px">Total super due</td>
        <td align="right" style="color:#C84B2F;font-size:16px;font-weight:700;padding-top:10px">${fmt(totalSuper)}</td>
      </tr>
    </table>
  </td></tr></table>

  <p style="color:#57534E;font-size:13px;margin:0 0 20px">
    Pay via <strong>SuperStream</strong> through your super clearing house or payroll system.
    Keep your payment receipt — the ATO matches SG payments against STP payroll reports.
  </p>

  <div style="text-align:center">
    <a href="https://sabaccountai.com/payslip-history" style="background:#1C1917;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600">View payslips →</a>
  </div>
  <p style="color:#A09590;font-size:11px;text-align:center;margin-top:20px">
    SAB Account AI · sabaccountai.com ·
    <a href="https://sabaccountai.com/settings" style="color:#A09590">Manage notifications</a>
  </p>
</td></tr></table></body></html>`

      await resend.emails.send({
        from:    process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
        to:      [profile.email as string],
        subject: `Super due now — ${fmt(totalSuper)} from ${payDateFormatted} payrun`,
        html,
      })

      await supabase.from('alert_history').insert({
        alert_key: alertKey,
        subject:   `Super reminder sent: ${fmt(totalSuper)} for payrun ${paymentDate}`,
        urgency:   'info',
      })

      sent++
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'super_reminder', user_id: userId } })
    }
  }

  return NextResponse.json({ ok: true, sent, paymentDate, usersFound: byUser.size })
}
