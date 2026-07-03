import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { encryptIfPresent, decryptIfPresent } from '@/lib/encrypt'
import { getProfile } from '@/lib/profile-cache'

function auth(req: NextRequest) {
  return req.headers.get('Authorization')?.replace('Bearer ', '') ?? null
}

async function getUser(token: string | null) {
  if (!token) return null
  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// GET /api/employees — list all employees for the authenticated user, TFN decrypted
export async function GET(req: NextRequest) {
  try {
    const user = await getUser(auth(req))
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const employees = (data ?? []).map((e: Record<string, unknown>) => ({
      ...e,
      tfn: decryptIfPresent(e.tfn as string | null),
    }))

    return NextResponse.json(employees)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

type EmployeeBody = {
  name?: string; email?: string; phone?: string; tfn?: string; abn?: string
  employment_type?: string; pay_cycle?: string; pay_basis?: string
  annual_salary?: number; hourly_rate?: number; ordinary_hours?: number
  super_fund_name?: string; member_number?: string; residency_status?: string
  notes?: string; annual_leave_hours?: number; personal_leave_hours?: number
  claiming_threshold?: boolean; has_help?: boolean
  // Super-fund profile (Payday Super)
  usi?: string; fund_abn?: string; is_smsf?: boolean; smsf_esa?: string
  smsf_bank_name?: string; smsf_bank_bsb?: string; smsf_bank_acct?: string
}

function pickFields(body: Record<string, unknown>): EmployeeBody {
  const ALLOWED: Array<keyof EmployeeBody> = [
    'name', 'email', 'phone', 'tfn', 'abn', 'employment_type', 'pay_cycle', 'pay_basis',
    'annual_salary', 'hourly_rate', 'ordinary_hours', 'super_fund_name', 'member_number',
    'residency_status', 'notes', 'annual_leave_hours', 'personal_leave_hours',
    'claiming_threshold', 'has_help',
    'usi', 'fund_abn', 'is_smsf', 'smsf_esa', 'smsf_bank_name', 'smsf_bank_bsb', 'smsf_bank_acct',
  ]
  return Object.fromEntries(ALLOWED.filter(k => k in body).map(k => [k, body[k]])) as EmployeeBody
}

// POST /api/employees — create, TFN encrypted before storing
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(auth(req))
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const profile = await getProfile(user.id)
    const plan = (profile?.plan ?? 'free').toLowerCase()
    if (plan !== 'pro' && plan !== 'autopilot') {
      return NextResponse.json({ error: 'plan_limit' }, { status: 403 })
    }

    const raw = await req.json() as Record<string, unknown>
    const supabase = createServiceClient()
    const fields = pickFields(raw)

    const { error } = await supabase.from('employees').insert({
      ...fields,
      tfn: encryptIfPresent(fields.tfn ?? null),
      user_id: user.id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

// PUT /api/employees — update by id, TFN encrypted before storing
export async function PUT(req: NextRequest) {
  try {
    const user = await getUser(auth(req))
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const raw = await req.json() as Record<string, unknown>
    const { id } = raw
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const fields = pickFields(raw)

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('employees')
      .update({ ...fields, tfn: encryptIfPresent(fields.tfn ?? null) })
      .eq('id', id as string)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

// DELETE /api/employees?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser(auth(req))
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
