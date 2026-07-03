export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { eligibleForMarkPaid, eligibleForReminder } from '@/lib/invoice-utils'

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json() as { action: string; ids: string[] }
  const { action, ids } = body

  if (!action || !ids?.length) {
    return NextResponse.json({ error: 'action and ids required' }, { status: 400 })
  }
  if (ids.length > 200) {
    return NextResponse.json({ error: 'Too many IDs (max 200)' }, { status: 400 })
  }

  switch (action) {

    case 'mark_paid': {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: now })
        .in('id', ids)
        .eq('user_id', user.id)
        .neq('status', 'paid')
        .is('deleted_at', null)

      if (error) {
        Sentry.captureException(new Error(error.message), { tags: { feature: 'bulk_actions', action } })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    case 'send_reminder': {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, status, invoice_number, client_name, client_email, total_inc_gst, due_date, business_name')
        .in('id', ids)
        .eq('user_id', user.id)
        .in('status', ['pending', 'overdue'])
        .is('deleted_at', null)

      const eligible = eligibleForReminder(invoices ?? [], ids)
      console.log('[bulk/send_reminder] ids:', ids, 'found invoices:', (invoices ?? []).map(i => ({ id: i.id, status: i.status, email: i.client_email })), 'eligible:', eligible)
      if (!eligible.length) return NextResponse.json({ ok: true, queued: 0, reason: 'no_eligible' })

      const eligibleInvoices = (invoices ?? []).filter(inv => eligible.includes(inv.id))
      let queued = 0

      const base   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'
      const secret = process.env.INTERNAL_API_SECRET ?? ''

      for (const inv of eligibleInvoices) {
        try {
          const res = await fetch(`${base}/api/email/invoice-reminder`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
            body:    JSON.stringify({
              to:            inv.client_email,
              clientName:    inv.client_name,
              businessName:  inv.business_name,
              invoiceNumber: inv.invoice_number,
              totalIncGst:   inv.total_inc_gst,
              dueDate:       inv.due_date,
            }),
          })
          if (res.ok) queued++
          else {
            const err = new Error(`invoice-reminder returned ${res.status} for ${inv.id}`)
            Sentry.captureException(err, { tags: { feature: 'bulk_actions', action, invoiceId: inv.id } })
            console.error('[bulk/send_reminder] email failed:', inv.id, res.status)
          }
        } catch (err) {
          Sentry.captureException(err, { tags: { feature: 'bulk_actions', action, invoiceId: inv.id } })
          console.error('[bulk/send_reminder] fetch error:', inv.id, err)
        }
      }
      return NextResponse.json({ ok: true, queued })
    }

    case 'soft_delete': {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('invoices')
        .update({ deleted_at: now })
        .in('id', ids)
        .eq('user_id', user.id)
        .is('deleted_at', null)

      if (error) {
        Sentry.captureException(new Error(error.message), { tags: { feature: 'bulk_actions', action } })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
