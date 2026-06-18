import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { sendInvoiceEmail } from '@/lib/send-email'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: bizProfile } = await supabase.from('business_profiles').select('logo_url').eq('id', user.id).single()
  const logoUrl = bizProfile?.logo_url && (bizProfile.logo_url as string).startsWith('https://') ? (bizProfile.logo_url as string) : ''

  const { to, clientName, businessName, invoiceNumber, totalDue, dueDate, pdfBase64, clientAbn, totalIncGst } =
    await req.json() as {
      to: string
      clientName: string
      businessName: string
      invoiceNumber: string
      totalDue: string
      dueDate: string
      pdfBase64: string
      clientAbn?: string
      totalIncGst?: number
    }

  if (!to || !pdfBase64) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (pdfBase64.length > 5_000_000) {
    return NextResponse.json({ error: 'PDF too large' }, { status: 400 })
  }

  try {
    await sendInvoiceEmail({ to, clientName, businessName, invoiceNumber, totalDue, dueDate, pdfBase64, logoUrl: logoUrl || undefined, clientAbn, totalIncGst })
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'email_send', type: 'invoice' } })
    console.error('Email error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
