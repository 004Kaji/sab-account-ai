import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isBeamConfigured, submitToBeam } from '@/lib/beam'
import { paydaySuperDeadline, wasPaidOnTime } from '@/lib/super-compliance'

// GET — list super payments for a date range
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(auth)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')
  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

  const { data, error } = await supabase
    .from('super_payments')
    .select('*')
    .eq('user_id', user.id)
    .gte('payment_date', from)
    .lte('payment_date', to)
    .order('payment_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payments: data, beam_configured: isBeamConfigured() })
}

// POST — submit super for a payrun or mark as manually paid
// body: { payment_date: 'YYYY-MM-DD', action?: 'pay' | 'mark_paid' }
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(auth)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { payment_date, action = 'pay', paid_date, method, reference } = await req.json()
  if (!payment_date) return NextResponse.json({ error: 'payment_date required' }, { status: 400 })

  const deadline = paydaySuperDeadline(payment_date)

  // Load payslips for that payment date
  const { data: payslips, error: psErr } = await supabase
    .from('payslips')
    .select('id, employee_name, super_sg, super_sal_sac, super_fund_name, member_number')
    .eq('user_id', user.id)
    .eq('payment_date', payment_date)

  if (psErr) return NextResponse.json({ error: psErr.message }, { status: 500 })
  if (!payslips?.length) return NextResponse.json({ error: 'No payslips for that date' }, { status: 404 })

  const newStatus   = action === 'mark_paid' ? 'manually_paid' : 'pending'
  const paidDate    = action === 'mark_paid' ? (paid_date || new Date().toISOString().split('T')[0]) : null
  const settledAt   = action === 'mark_paid' ? new Date().toISOString() : null

  // Delete existing records for this payrun then re-insert (avoids needing a unique constraint)
  await supabase.from('super_payments').delete().eq('user_id', user.id).eq('payment_date', payment_date)

  const records = payslips.map(p => ({
    user_id:         user.id,
    payslip_id:      p.id as string,
    employee_name:   p.employee_name as string,
    super_fund_name: (p.super_fund_name as string | null) ?? null,
    member_number:   (p.member_number as string | null) ?? null,
    amount:          Number(p.super_sg) + Number(p.super_sal_sac),
    payment_date,
    deadline,
    status:          newStatus,
    ...(action === 'mark_paid' ? { paid_date: paidDate, paid_method: method ?? 'manual', paid_reference: reference ?? null } : {}),
    ...(settledAt ? { settled_at: settledAt } : {}),
  }))

  const { data: inserted, error: insErr } = await supabase
    .from('super_payments')
    .insert(records)
    .select()

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // If mark_paid, record an immutable audit entry and we're done
  if (action === 'mark_paid') {
    const total  = payslips.reduce((s, p) => s + Number(p.super_sg) + Number(p.super_sal_sac), 0)
    const onTime = wasPaidOnTime(deadline, paidDate as string)
    await supabase.from('super_audit_log').insert({
      user_id:      user.id,
      payday:       payment_date,
      event:        'marked_paid',
      deadline,
      total_amount: total,
      on_time:      onTime,
      detail:       { method: method ?? 'manual', reference: reference ?? null, paid_date: paidDate, employees: payslips.length, source: 'tax_super_page' },
    })
    return NextResponse.json({ ok: true, status: 'manually_paid', paid_date: paidDate, on_time: onTime, beam_configured: false })
  }

  // If Beam partner credentials not configured yet, return pending state
  if (!isBeamConfigured()) {
    return NextResponse.json({
      ok: true,
      status: 'pending',
      beam_configured: false,
      message: 'Beam integration coming soon. Records saved — mark as paid manually for now.',
    })
  }

  // Get this user's beam_employer_id from business_profiles
  const { data: biz } = await supabase
    .from('business_profiles')
    .select('beam_employer_id')
    .eq('id', user.id)
    .single()

  const beamEmployerId = biz?.beam_employer_id as string | null
  if (!beamEmployerId) {
    return NextResponse.json({
      ok: true,
      status: 'pending',
      beam_configured: false,
      message: 'Connect your Beam employer account in Settings to pay super directly.',
    })
  }

  // Submit to Beam on behalf of this employer
  const contributions = payslips
    .filter(p => Number(p.super_sg) + Number(p.super_sal_sac) > 0)
    .map(p => ({
      employeeName:  p.employee_name as string,
      superFundName: (p.super_fund_name as string) || '',
      memberNumber:  (p.member_number as string) || '',
      usi:           '',  // TODO: add USI to employees table
      amount:        Number(p.super_sg) + Number(p.super_sal_sac),
      paymentDate:   payment_date,
    }))

  const beamResult = await submitToBeam(beamEmployerId, contributions)

  if (!beamResult.ok) {
    // Mark as failed in DB
    await supabase
      .from('super_payments')
      .update({ status: 'failed', failure_reason: beamResult.error, updated_at: new Date().toISOString() })
      .in('id', (inserted ?? []).map(r => r.id as string))

    return NextResponse.json({ ok: false, error: beamResult.error }, { status: 500 })
  }

  // Mark as submitted
  await supabase
    .from('super_payments')
    .update({
      status:        'submitted',
      beam_reference: beamResult.reference,
      submitted_at:  new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    })
    .in('id', (inserted ?? []).map(r => r.id as string))

  return NextResponse.json({
    ok: true,
    status: 'submitted',
    beam_reference: beamResult.reference,
    beam_configured: true,
  })
}
