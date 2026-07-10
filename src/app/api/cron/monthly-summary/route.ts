export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs 1st of every month at 8am AEST (22:00 UTC prior day).
// Sends each Autopilot user a snapshot of last month: income, payroll, BAS, compliance status.

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { FREE_MODE } from '@/lib/free-mode'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'

function fmt(n: number) {
  return `$${Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function lastMonthRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end   = new Date(now.getFullYear(), now.getMonth(), 0)
  const label = start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  return {
    start: start.toISOString().slice(0, 10),
    end:   end.toISOString().slice(0, 10),
    label,
  }
}

function currentQuarterDueDate() {
  const now   = new Date()
  const month = now.getMonth() + 1
  // Q1=Jul-Sep due 28 Oct, Q2=Oct-Dec due 28 Feb, Q3=Jan-Mar due 28 Apr, Q4=Apr-Jun due 28 Jul
  const due = month <= 1 || month === 2 ? new Date(now.getFullYear(), 1, 28)
    : month <= 4 ? new Date(now.getFullYear(), 3, 28)
    : month <= 7 ? new Date(now.getFullYear(), 6, 28)
    : new Date(now.getFullYear(), 9, 28)
  const daysAway = Math.ceil((due.getTime() - now.getTime()) / 86400000)
  return { date: due.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }), daysAway }
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const resend   = new Resend(process.env.RESEND_API_KEY)
  const range    = lastMonthRange()
  const basDue   = currentQuarterDueDate()

  // Get all autopilot users (every user counts as autopilot in free mode)
  let usersQuery = supabase
    .from('profiles')
    .select('id, email, business_name')
  if (!FREE_MODE) usersQuery = usersQuery.eq('plan', 'autopilot')
  const { data: users } = await usersQuery

  if (!users?.length) return NextResponse.json({ ok: true, sent: 0 })

  let sent = 0
  for (const user of users) {
    try {
      const [{ data: invoices }, { data: payslips }, { data: records }] = await Promise.all([
        supabase.from('invoices').select('total_inc_gst, total_gst').eq('user_id', user.id).gte('issue_date', range.start).lte('issue_date', range.end),
        supabase.from('payslips').select('income_tax, medicare_levy, super_sg').eq('user_id', user.id).gte('pay_period_end', range.start).lte('pay_period_end', range.end),
        supabase.from('records').select('amount, gst_amount').eq('user_id', user.id).eq('type', 'expense').gte('date', range.start).lte('date', range.end),
      ])

      const totalInvoiced = (invoices ?? []).reduce((s, i) => s + (i.total_inc_gst as number), 0)
      const gstCollected  = (invoices ?? []).reduce((s, i) => s + (i.total_gst as number), 0)
      const totalPayg     = (payslips ?? []).reduce((s, p) => s + (p.income_tax as number) + (p.medicare_levy as number), 0)
      const totalSuper    = (payslips ?? []).reduce((s, p) => s + (p.super_sg as number), 0)
      const totalExpenses = (records  ?? []).reduce((s, r) => s + (r.amount as number), 0)
      const gstCredits    = (records  ?? []).reduce((s, r) => s + (r.gst_amount as number), 0)
      const netProfit     = totalInvoiced - totalExpenses
      const netGst        = gstCollected - gstCredits

      const firstName   = (user.business_name as string)?.split(' ')[0] || 'there'
      const basWarning  = basDue.daysAway <= 28
        ? `<tr><td colspan="2" style="padding:8px 0"><div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:6px;padding:10px 14px;color:#92400E;font-size:13px">⚠️ BAS due ${basDue.date} — ${basDue.daysAway} days away</div></td></tr>`
        : ''
      const complianceStatus = basDue.daysAway <= 7 ? 'Action needed' : 'All clear'

      const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F5F0E8;margin:0;padding:32px 0">
<table width="560" align="center" style="background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:#1C1917;padding:24px 32px">
  <p style="margin:0;color:#fff;font-size:17px;font-weight:700">${(user.business_name as string) || 'Your Business'}</p>
  <p style="margin:4px 0 0;color:#A09590;font-size:12px">${range.label} Summary · SAB Account AI</p>
</td></tr>
<tr><td style="padding:28px 32px">
  <p style="color:#1C1917;font-size:15px;margin:0 0 20px">Hi ${firstName},</p>
  <p style="color:#57534E;font-size:13px;margin:0 0 20px">Here's your ${range.label} snapshot:</p>

  <p style="color:#1C1917;font-size:13px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em">📊 Income</p>
  <table width="100%" style="background:#F5F0E8;border-radius:8px;margin:0 0 16px"><tr><td style="padding:16px 20px">
    <table width="100%">
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">Invoices sent</td><td align="right" style="color:#1C1917;font-size:13px;font-weight:600">${(invoices ?? []).length}</td></tr>
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">Total invoiced</td><td align="right" style="color:#1C1917;font-size:13px;font-weight:600">${fmt(totalInvoiced)}</td></tr>
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">GST collected</td><td align="right" style="color:#1C1917;font-size:13px;font-weight:600">${fmt(gstCollected)}</td></tr>
    </table>
  </td></tr></table>

  <p style="color:#1C1917;font-size:13px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em">💼 Payroll</p>
  <table width="100%" style="background:#F5F0E8;border-radius:8px;margin:0 0 16px"><tr><td style="padding:16px 20px">
    <table width="100%">
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">Payslips issued</td><td align="right" style="color:#1C1917;font-size:13px;font-weight:600">${(payslips ?? []).length}</td></tr>
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">PAYG withheld</td><td align="right" style="color:#1C1917;font-size:13px;font-weight:600">${fmt(totalPayg)}</td></tr>
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">Super paid</td><td align="right" style="color:#1C1917;font-size:13px;font-weight:600">${fmt(totalSuper)}</td></tr>
    </table>
  </td></tr></table>

  <p style="color:#1C1917;font-size:13px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em">🧾 BAS Position</p>
  <table width="100%" style="background:#F5F0E8;border-radius:8px;margin:0 0 16px"><tr><td style="padding:16px 20px">
    <table width="100%">
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">GST owed this quarter</td><td align="right" style="color:#1C1917;font-size:13px;font-weight:600">${fmt(netGst)}</td></tr>
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">Net profit (this month)</td><td align="right" style="color:#1C1917;font-size:13px;font-weight:600">${fmt(netProfit)}</td></tr>
      ${basWarning}
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">Compliance status</td><td align="right" style="color:${complianceStatus === 'All clear' ? '#15803D' : '#C84B2F'};font-size:13px;font-weight:600">${complianceStatus === 'All clear' ? '✅ All clear' : '⚠️ Action needed'}</td></tr>
    </table>
  </td></tr></table>

  <div style="text-align:center;margin-top:24px">
    <a href="https://sabaccountai.com/dashboard" style="background:#1C1917;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600">View dashboard →</a>
  </div>
  <p style="color:#A09590;font-size:11px;text-align:center;margin-top:20px">SAB Account AI · sabaccountai.com · Unsubscribe</p>
</td></tr></table></body></html>`

      await resend.emails.send({
        from:    process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to:      [user.email as string],
        subject: `Your ${range.label} business summary — SAB Account AI`,
        html,
      })
      sent++
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'monthly_summary', user_id: user.id as string } })
    }
  }

  return NextResponse.json({ ok: true, sent, month: range.label })
}
