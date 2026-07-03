export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Runs daily at 8am AEST (22:00 UTC).
// Payday Super reminders: for each unpaid payrun, emails the employer when the
// deadline is either 3 business days away OR is today (deadline day). Skips
// payruns already recorded as paid. One email per user per payday per trigger.

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { paydaySuperDeadline, addBusinessDays } from '@/lib/super-compliance'

function fmt(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

type ReminderTrigger = 'due_soon' | 'deadline_day'

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const resend   = new Resend(process.env.RESEND_API_KEY)

  const today          = new Date().toISOString().split('T')[0]
  const dueSoonDeadline = addBusinessDays(today, 3) // deadline exactly 3 biz days out

  // Scan payslips from the last ~20 days; deadlines for the two triggers all
  // fall in that payday window.
  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - 25)
  const windowStartISO = windowStart.toISOString().split('T')[0]

  const { data: payslips, error } = await supabase
    .from('payslips')
    .select('id, user_id, employee_name, super_sg, super_sal_sac, super_fund_name, payment_date')
    .gte('payment_date', windowStartISO)
    .lte('payment_date', today)
    .gt('super_sg', 0)

  if (error) {
    Sentry.captureException(error, { tags: { feature: 'super_reminder' } })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!payslips?.length) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no payslips' })
  }

  // Group by (user, payday); keep only payruns whose deadline hits a trigger.
  type Group = { userId: string; payday: string; deadline: string; trigger: ReminderTrigger; payslips: typeof payslips }
  const groups = new Map<string, Group>()
  for (const ps of payslips) {
    const userId = ps.user_id as string
    const payday = ps.payment_date as string
    const deadline = paydaySuperDeadline(payday)
    const trigger: ReminderTrigger | null =
      deadline === today ? 'deadline_day'
      : deadline === dueSoonDeadline ? 'due_soon'
      : null
    if (!trigger) continue
    const key = `${userId}|${payday}`
    if (!groups.has(key)) groups.set(key, { userId, payday, deadline, trigger, payslips: [] })
    groups.get(key)!.payslips.push(ps)
  }

  if (groups.size === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no payruns at a reminder trigger today' })
  }

  // Skip payruns already recorded as paid.
  const { data: paidRows } = await supabase
    .from('super_payments')
    .select('user_id, payment_date, paid_date, status')
  const paidKeys = new Set((paidRows ?? [])
    .filter(p => p.paid_date || ['manually_paid', 'paid', 'settled'].includes(p.status as string))
    .map(p => `${p.user_id}|${p.payment_date}`))

  let sent = 0

  for (const [key, group] of groups) {
    if (paidKeys.has(key)) continue
    const userId       = group.userId
    const userPayslips = group.payslips
    const paymentDate  = group.payday
    const trigger      = group.trigger
    try {
      // Check dedup — only send once per user per payment date
      const alertKey = `super_remind_${userId}_${paymentDate}_${trigger}`
      const { count: existing } = await supabase
        .from('alert_history')
        .select('id', { count: 'exact', head: true })
        .eq('alert_key', alertKey)

      if ((existing ?? 0) > 0) continue

      // Fetch profile. plan lives on `profiles`; business_name + notify_super +
      // contact email live on `business_profiles` — they are NOT columns on
      // `profiles`, so they must be read from the right table.
      const [{ data: bizProfile }, { data: acct }] = await Promise.all([
        supabase.from('business_profiles').select('email, business_name, notify_super').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('email, plan').eq('id', userId).maybeSingle(),
      ])

      const profile = {
        email:         (bizProfile?.email as string | null) || (acct?.email as string | null) || null,
        business_name: (bizProfile?.business_name as string | null) || null,
        notify_super:  bizProfile?.notify_super as boolean | null | undefined,
        plan:          (acct?.plan as string | null) ?? 'free',
      }

      if (!profile.email) continue
      if (profile.notify_super === false) continue
      if (profile.plan === 'free') continue

      // Build per-employee summary
      const totalSg     = userPayslips.reduce((s, p) => s + (p.super_sg as number), 0)
      const totalSalSac = userPayslips.reduce((s, p) => s + (p.super_sal_sac as number), 0)
      const totalSuper  = totalSg + totalSalSac

      const payDateFormatted = new Date(`${paymentDate}T00:00:00`).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
      const deadlineFormatted = new Date(`${group.deadline}T00:00:00`).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
      const deadlineLine = trigger === 'deadline_day'
        ? `The Payday Super deadline for this payrun is <strong>today (${deadlineFormatted})</strong>. Pay it now to stay compliant.`
        : `The Payday Super deadline for this payrun is <strong>${deadlineFormatted}</strong> — that's 3 business days away.`

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
    super must reach your employees' funds <strong>within 7 business days of each pay date</strong>.
    ${deadlineLine}
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
    Pay each fund from your own bank or the fund's employer portal, then mark it paid in SAB.
    Download the ready-to-use instruction sheet and CSV from your Tax &amp; Super page.
    Keep your payment receipt — the ATO matches SG payments against STP payroll reports.
  </p>

  <div style="text-align:center">
    <a href="https://sabaccountai.com/tax-super" style="background:#1C1917;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600">Prepare &amp; track super →</a>
  </div>
  <p style="color:#A09590;font-size:11px;text-align:center;margin-top:20px">
    SAB Account AI · sabaccountai.com ·
    <a href="https://sabaccountai.com/settings" style="color:#A09590">Manage notifications</a>
  </p>
</td></tr></table></body></html>`

      await resend.emails.send({
        from:    process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to:      [profile.email as string],
        subject: trigger === 'deadline_day'
          ? `Super due TODAY — ${fmt(totalSuper)} from ${payDateFormatted} payrun`
          : `Super due in 3 business days — ${fmt(totalSuper)} from ${payDateFormatted} payrun`,
        html,
      })

      await Promise.all([
        supabase.from('alert_history').insert({
          alert_key: alertKey,
          subject:   `Super reminder (${trigger}): ${fmt(totalSuper)} for payrun ${paymentDate}`,
          urgency:   'info',
        }),
        supabase.from('super_audit_log').insert({
          user_id:      userId,
          payday:       paymentDate,
          event:        'reminder_sent',
          deadline:     group.deadline,
          total_amount: totalSuper,
          detail:       { trigger },
        }),
      ])

      sent++
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'super_reminder', user_id: userId } })
    }
  }

  return NextResponse.json({ ok: true, sent, triggersFound: groups.size })
}
