import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'

// Called daily by Vercel cron. Marks overdue invoices and sends one reminder email per invoice.
export async function GET(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // 1. Mark pending invoices as overdue where due_date has passed
  const { data: nowOverdue } = await supabase
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .eq('document_type', 'invoice')
    .lt('due_date', today)
    .select('id, invoice_number, client_name, client_email, total_inc_gst, due_date, user_id')

  // 2. Send one reminder email per newly overdue invoice (where client_email exists and not already sent)
  const { data: needsReminder } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, client_name, client_email, total_inc_gst, due_date, user_id,
      business_profiles!inner(business_name, notify_overdue)
    `)
    .eq('status', 'overdue')
    .eq('document_type', 'invoice')
    .is('overdue_reminder_sent_at', null)
    .not('client_email', 'is', null)
    .not('client_email', 'eq', '')

  let remindersQueued = 0
  for (const inv of needsReminder ?? []) {
    const profile = (inv as Record<string, unknown>).business_profiles as { business_name: string; notify_overdue: boolean } | null
    if (!profile?.notify_overdue) continue

    try {
      const amount = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(inv.total_inc_gst))
      await resend.emails.send({
        from: 'SAB Account AI <noreply@sabaccountai.com>',
        to: inv.client_email as string,
        subject: `Payment reminder: ${inv.invoice_number} is overdue`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1C1917">
            <p>Hi ${inv.client_name},</p>
            <p>This is a friendly reminder that invoice <strong>${inv.invoice_number}</strong> for <strong>${amount}</strong> was due on ${inv.due_date} and is now overdue.</p>
            <p>Please arrange payment at your earliest convenience.</p>
            <p>If you have any questions, please reply to this email.</p>
            <p>Regards,<br/>${profile.business_name}</p>
          </div>
        `,
      })
      await supabase.from('invoices').update({ overdue_reminder_sent_at: new Date().toISOString() }).eq('id', inv.id)
      remindersQueued++
    } catch (err) { console.error('[overdue] reminder failed for invoice', inv.id, err) }
  }

  return NextResponse.json({
    markedOverdue: nowOverdue?.length ?? 0,
    remindersSent: remindersQueued,
  })
}
