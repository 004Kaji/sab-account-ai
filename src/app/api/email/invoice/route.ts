import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { sendInvoiceEmail } from '@/lib/send-email'
import { checkEmailRateLimit } from '@/lib/ratelimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fmtAUD(n: number): string {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function fmtDateAU(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00Z`)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Confirms a base64 payload really is a PDF (magic bytes "%PDF") before we
// attach it to an email sent from our verified domain.
function isPdfBase64(b64: string): boolean {
  try {
    const head = Buffer.from(b64.slice(0, 8), 'base64')
    return head.toString('latin1', 0, 5) === '%PDF-'
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rl = await checkEmailRateLimit(user.id)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many email requests. Try again later.' }, { status: 429 })

  let body: { to?: string; invoiceNumber?: string; pdfBase64?: string }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { to, invoiceNumber, pdfBase64 } = body

  // ── Validate the recipient and attachment we were handed ─────────────
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 })
  }
  if (!invoiceNumber) {
    return NextResponse.json({ error: 'Missing invoice number' }, { status: 400 })
  }
  if (!pdfBase64) {
    return NextResponse.json({ error: 'Missing PDF' }, { status: 400 })
  }
  if (pdfBase64.length > 5_000_000) {
    return NextResponse.json({ error: 'PDF too large' }, { status: 400 })
  }
  if (!isPdfBase64(pdfBase64)) {
    return NextResponse.json({ error: 'Attachment is not a valid PDF' }, { status: 400 })
  }

  // ── The invoice must exist and belong to this user ───────────────────
  // Every send maps to a real owned invoice; the email envelope (subject,
  // body, amounts, business name) is derived from the stored row, never from
  // client-supplied fields — so the message can't misrepresent the invoice.
  const { data: invoice, error: lookupErr } = await supabase
    .from('invoices')
    .select('invoice_number, business_name, client_name, client_email, client_abn, total_inc_gst, due_date')
    .eq('user_id', user.id)
    .eq('invoice_number', invoiceNumber)
    .maybeSingle()

  if (lookupErr) {
    Sentry.captureException(lookupErr, { tags: { feature: 'email_send', type: 'invoice', step: 'lookup' } })
    return NextResponse.json({ error: 'Could not load invoice' }, { status: 500 })
  }
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const { data: bizProfile } = await supabase.from('business_profiles').select('logo_url').eq('id', user.id).single()
  const logoUrl = bizProfile?.logo_url && (bizProfile.logo_url as string).startsWith('https://') ? (bizProfile.logo_url as string) : ''

  const totalIncGst = Number(invoice.total_inc_gst) || 0

  try {
    await sendInvoiceEmail({
      to,
      clientName:    (invoice.client_name as string) || 'there',
      businessName:  (invoice.business_name as string) || '',
      invoiceNumber: invoice.invoice_number as string,
      totalDue:      fmtAUD(totalIncGst),
      dueDate:       fmtDateAU(invoice.due_date as string | null),
      pdfBase64,
      logoUrl:       logoUrl || undefined,
      clientAbn:     (invoice.client_abn as string) || undefined,
      totalIncGst,
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'email_send', type: 'invoice' } })
    console.error('Email error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send email' }, { status: 500 })
  }

  // Mark invoice as pending after successful send (only transitions from draft)
  await supabase
    .from('invoices')
    .update({ status: 'pending' })
    .eq('user_id', user.id)
    .eq('invoice_number', invoiceNumber)
    .eq('status', 'draft')

  return NextResponse.json({ ok: true })
}
