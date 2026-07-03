import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase'

// Called daily by Vercel cron. Creates copies of recurring invoices that are due today.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: due } = await supabase
    .from('invoices')
    .select('*')
    .eq('recurring_active', true)
    .lte('recurring_next_date', today)

  let created = 0
  for (const inv of due ?? []) {
    // Calculate the next recurrence date after today
    const next = new Date(inv.recurring_next_date ?? today)
    if (inv.recurring_interval === 'weekly')       next.setDate(next.getDate() + 7)
    else if (inv.recurring_interval === 'fortnightly') next.setDate(next.getDate() + 14)
    else if (inv.recurring_interval === 'monthly')  next.setMonth(next.getMonth() + 1)
    else if (inv.recurring_interval === 'quarterly') next.setMonth(next.getMonth() + 3)
    else next.setFullYear(next.getFullYear() + 1)
    const nextDateStr = next.toISOString().split('T')[0]

    // Derive due date offset from original invoice
    const originalIssue = new Date(inv.issue_date)
    const originalDue   = new Date(inv.due_date)
    const termsDays     = Math.round((originalDue.getTime() - originalIssue.getTime()) / 86400000)
    const newDue        = new Date(today)
    newDue.setDate(newDue.getDate() + termsDays)

    // Generate next invoice number (append -R to flag it as recurring copy)
    const newNumber = `${inv.invoice_number}-R${new Date().getFullYear()}`

    try {
      await supabase.from('invoices').insert({
        user_id:        inv.user_id,
        invoice_number: newNumber,
        status:         'pending',
        document_type:  'invoice',
        client_name:    inv.client_name,
        client_abn:     inv.client_abn,
        client_email:   inv.client_email,
        client_address: inv.client_address,
        business_name:  inv.business_name,
        business_abn:   inv.business_abn,
        business_email: inv.business_email,
        business_phone: inv.business_phone,
        business_address: inv.business_address,
        line_items:     inv.line_items,
        has_gst:        inv.has_gst,
        subtotal_ex_gst: inv.subtotal_ex_gst,
        total_gst:      inv.total_gst,
        total_inc_gst:  inv.total_inc_gst,
        issue_date:     today,
        due_date:       newDue.toISOString().split('T')[0],
        payment_terms:  inv.payment_terms,
        bank_name:      inv.bank_name,
        account_name:   inv.account_name,
        bsb:            inv.bsb,
        account_number: inv.account_number,
        notes:          inv.notes,
        recurring_active: false,
      })

      // Advance the source invoice's next date
      await supabase.from('invoices').update({ recurring_next_date: nextDateStr }).eq('id', inv.id)
      created++
    } catch { /* non-fatal — continue */ }
  }

  return NextResponse.json({ invoicesCreated: created })
}
