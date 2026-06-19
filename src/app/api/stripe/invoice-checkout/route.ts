import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  let invoiceId: string
  try {
    const body = await req.json() as { invoiceId: string }
    invoiceId = body.invoiceId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!invoiceId || !UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_name, client_email, business_name, business_email, total_inc_gst, status')
    .eq('id', invoiceId)
    .single()

  if (error || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  // Only allow payment for invoices that have actually been sent to the client.
  // Rejecting drafts prevents enumerating unpublished invoice data.
  if (!['pending', 'overdue'].includes(inv.status as string)) {
    return NextResponse.json({ error: 'This invoice is not available for payment' }, { status: 400 })
  }

  const total = inv.total_inc_gst as number
  if (typeof total !== 'number' || total <= 0) {
    return NextResponse.json({ error: 'Invalid invoice amount' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'

  let session: { url: string | null }
  try {
    session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'aud',
    line_items: [
      {
        price_data: {
          currency: 'aud',
          unit_amount: Math.round(total * 100),
          product_data: {
            name: `Invoice ${inv.invoice_number}`,
            description: `Payment to ${inv.business_name}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'invoice_payment',
      invoiceId: inv.id as string,
      invoiceNumber: inv.invoice_number as string,
      businessName: (inv.business_name as string) ?? '',
      businessEmail: (inv.business_email as string) ?? '',
      clientName: (inv.client_name as string) ?? '',
      clientEmail: (inv.client_email as string) ?? '',
    },
    customer_email: (inv.client_email as string) || undefined,
    success_url: `${base}/pay/${invoiceId}?success=true`,
    cancel_url: `${base}/pay/${invoiceId}`,
  })
  } catch (err) {
    console.error('[invoice-checkout] Stripe session creation failed:', err)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
