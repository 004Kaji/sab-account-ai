import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { invoiceId } = await req.json() as { invoiceId: string }
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_name, client_email, business_name, business_email, total_inc_gst, status')
    .eq('id', invoiceId)
    .single()

  if (error || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (inv.status === 'paid') return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'aud',
    line_items: [
      {
        price_data: {
          currency: 'aud',
          unit_amount: Math.round((inv.total_inc_gst as number) * 100),
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

  return NextResponse.json({ url: session.url })
}
