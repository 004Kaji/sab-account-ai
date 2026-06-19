import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { sendPayslipEmail } from '@/lib/send-email'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: bizProfile } = await supabase.from('business_profiles').select('logo_url').eq('id', user.id).single()
  const logoUrl = bizProfile?.logo_url && (bizProfile.logo_url as string).startsWith('https://') ? (bizProfile.logo_url as string) : ''

  const { to, employeeName, employerName, payslipNumber, netPay, payPeriod, pdfBase64 } =
    await req.json() as {
      to: string
      employeeName: string
      employerName: string
      payslipNumber: string
      netPay: string
      payPeriod: string
      pdfBase64: string
    }

  if (!to || !pdfBase64) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (pdfBase64.length > 5_000_000) {
    return NextResponse.json({ error: 'PDF too large' }, { status: 400 })
  }

  try {
    await sendPayslipEmail({ to, employeeName, employerName, payslipNumber, netPay, payPeriod, pdfBase64, logoUrl: logoUrl || undefined })
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'email_send', type: 'payslip' } })
    console.error('Email error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send email' }, { status: 500 })
  }

  // Stamp sent_at after successful send (only if not already sent)
  if (payslipNumber) {
    await supabase
      .from('payslips')
      .update({ sent_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('payslip_number', payslipNumber)
      .is('sent_at', null)
  }

  return NextResponse.json({ ok: true })
}
