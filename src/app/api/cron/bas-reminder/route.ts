export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs daily at 9am AEST (23:00 UTC).
// Sends 28-day and 7-day BAS reminders to Autopilot users.
// Deduplicates via bas_reminders table — never sends the same reminder twice.

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'

function fmt(n: number) {
  return `$${Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

interface QuarterInfo {
  label: string   // e.g. "Q1 FY2025-26"
  start: string
  end:   string
  due:   Date
}

function currentQuarter(): QuarterInfo {
  const now   = new Date()
  const month = now.getMonth() + 1
  const yr    = month >= 7 ? now.getFullYear() : now.getFullYear() - 1

  if (month >= 7 && month <= 9)  return { label: `Q1-FY${yr}-${yr+1}`, start: `${yr}-07-01`,   end: `${yr}-09-30`,   due: new Date(yr,  9, 28) }
  if (month >= 10 && month <= 12) return { label: `Q2-FY${yr}-${yr+1}`, start: `${yr}-10-01`,   end: `${yr}-12-31`,   due: new Date(yr+1,1, 28) }
  if (month >= 1 && month <= 3)  return { label: `Q3-FY${yr}-${yr+1}`, start: `${yr+1}-01-01`, end: `${yr+1}-03-31`, due: new Date(yr+1,3, 28) }
  return                                { label: `Q4-FY${yr}-${yr+1}`, start: `${yr+1}-04-01`, end: `${yr+1}-06-30`, due: new Date(yr+1,6, 28) }
}

export async function GET(req: NextRequest) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const resend   = new Resend(process.env.RESEND_API_KEY)
  const quarter  = currentQuarter()
  const now      = new Date()
  const daysAway = Math.ceil((quarter.due.getTime() - now.getTime()) / 86400000)

  // Only send on exactly 28 days or 7 days out
  const reminderType = daysAway === 28 ? '28_day' : daysAway === 7 ? '7_day' : null
  if (!reminderType) return NextResponse.json({ ok: true, skipped: true, daysAway })

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, business_name')
    .eq('plan', 'autopilot')

  if (!users?.length) return NextResponse.json({ ok: true, sent: 0 })

  let sent = 0
  for (const user of users) {
    try {
      // Check if already sent this reminder
      const { data: existing } = await supabase
        .from('bas_reminders')
        .select('id')
        .eq('user_id', user.id)
        .eq('quarter', quarter.label)
        .eq('reminder_type', reminderType)
        .single()

      if (existing) continue

      // Calculate BAS position
      const [{ data: invoices }, { data: records }] = await Promise.all([
        supabase.from('invoices').select('total_gst, total_inc_gst').eq('user_id', user.id).gte('issue_date', quarter.start).lte('issue_date', quarter.end),
        supabase.from('records').select('gst_amount, amount').eq('user_id', user.id).eq('type', 'expense').gte('date', quarter.start).lte('date', quarter.end),
      ])

      const gstCollected  = (invoices ?? []).reduce((s, i) => s + (i.total_gst as number), 0)
      const gstCredits    = (records  ?? []).reduce((s, r) => s + (r.gst_amount as number), 0)
      const netGst        = gstCollected - gstCredits
      const dueLabel      = quarter.due.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
      const firstName     = (user.business_name as string)?.split(' ')[0] || 'there'
      const qLabel        = quarter.label.replace(/-/g, ' ').replace('FY', 'FY ')

      const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F5F0E8;margin:0;padding:32px 0">
<table width="560" align="center" style="background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:#1C1917;padding:24px 32px">
  <p style="margin:0;color:#fff;font-size:17px;font-weight:700">${(user.business_name as string) || 'Your Business'}</p>
  <p style="margin:4px 0 0;color:#A09590;font-size:12px">BAS Reminder · ${qLabel}</p>
</td></tr>
<tr><td style="padding:28px 32px">
  <p style="color:#1C1917;font-size:15px;margin:0 0 8px">Hi ${firstName},</p>
  <p style="color:#57534E;font-size:14px;margin:0 0 20px">Your ${qLabel} BAS is due on <strong>${dueLabel}</strong> — ${daysAway} days away.</p>

  <p style="color:#1C1917;font-size:13px;font-weight:700;margin:0 0 8px">Your draft position:</p>
  <table width="100%" style="background:#F5F0E8;border-radius:8px;margin:0 0 20px"><tr><td style="padding:16px 20px">
    <table width="100%">
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">GST collected on sales (1A)</td><td align="right" style="color:#1C1917;font-size:13px;font-weight:600">${fmt(gstCollected)}</td></tr>
      <tr><td style="color:#57534E;font-size:13px;padding:4px 0">GST credits on purchases (1B)</td><td align="right" style="color:#1C1917;font-size:13px;font-weight:600">${fmt(gstCredits)}</td></tr>
      <tr style="border-top:1px solid #E5DDD5">
        <td style="color:#1C1917;font-size:14px;font-weight:700;padding:8px 0 4px">${netGst >= 0 ? 'Net GST payable' : 'GST refund due'}</td>
        <td align="right" style="color:#C84B2F;font-size:16px;font-weight:700;padding:8px 0 4px">${fmt(netGst)}</td>
      </tr>
    </table>
  </td></tr></table>

  <p style="color:#57534E;font-size:13px;margin:0 0 20px">No action needed yet — just keeping you ahead of the deadline. Ask SAB Chat to review your BAS before lodging.</p>

  <div style="text-align:center">
    <a href="https://sabaccountai.com/chat" style="background:#1C1917;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600">Review in SAB Chat →</a>
  </div>
  <p style="color:#A09590;font-size:11px;text-align:center;margin-top:20px">SAB Account AI · Autopilot · sabaccountai.com</p>
</td></tr></table></body></html>`

      await resend.emails.send({
        from:    process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
        to:      [user.email as string],
        subject: `⚠️ BAS due in ${daysAway} days — draft ready`,
        html,
      })

      // Record sent to prevent duplicates
      await supabase.from('bas_reminders').insert({
        user_id:       user.id,
        quarter:       quarter.label,
        reminder_type: reminderType,
      })

      sent++
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'bas_reminder', user_id: user.id as string } })
    }
  }

  return NextResponse.json({ ok: true, sent, quarter: quarter.label, reminderType, daysAway })
}
