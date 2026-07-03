import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getProfile } from '@/lib/profile-cache'
import { parseSbschCsv, type SbschEmployeeRow } from '@/lib/sbsch-import'

// POST /api/super/sbsch-import
// body: { csv: string, commit?: boolean }
// Without commit → dry-run preview (parsed rows + warnings, matched vs new).
// With commit    → upsert fund details onto matching employees, create new ones.
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const profile = await getProfile(user.id)
  const plan = (profile?.plan ?? 'free').toLowerCase()
  if (plan !== 'pro' && plan !== 'autopilot') {
    return NextResponse.json({ error: 'plan_limit' }, { status: 403 })
  }

  let csv: string
  let commit = false
  try {
    const body = await req.json() as { csv: string; commit?: boolean }
    csv = body.csv
    commit = !!body.commit
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!csv || typeof csv !== 'string') return NextResponse.json({ error: 'csv required' }, { status: 400 })

  const { rows, errors } = parseSbschCsv(csv)
  if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 422 })

  // Match against existing employees by case-insensitive name.
  const { data: existing } = await supabase
    .from('employees')
    .select('id, name')
    .eq('user_id', user.id)
  const byName = new Map((existing ?? []).map(e => [(e.name as string).trim().toLowerCase(), e.id as string]))

  const preview = rows.map(r => ({
    ...r,
    match: byName.has(r.name.trim().toLowerCase()) ? 'update' as const : 'create' as const,
  }))

  if (!commit) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      total: rows.length,
      to_update: preview.filter(p => p.match === 'update').length,
      to_create: preview.filter(p => p.match === 'create').length,
      rows: preview,
    })
  }

  const fundFields = (r: SbschEmployeeRow) => ({
    super_fund_name: r.super_fund_name ?? null,
    usi:             r.usi ?? null,
    fund_abn:        r.fund_abn ?? null,
    member_number:   r.member_number ?? null,
    is_smsf:         r.is_smsf,
    smsf_esa:        r.smsf_esa ?? null,
    smsf_bank_bsb:   r.smsf_bank_bsb ?? null,
    smsf_bank_acct:  r.smsf_bank_acct ?? null,
    email:           r.email ?? null,
  })

  let updated = 0
  let created = 0
  const failures: string[] = []

  for (const r of rows) {
    const id = byName.get(r.name.trim().toLowerCase())
    if (id) {
      const { error } = await supabase.from('employees').update(fundFields(r)).eq('id', id).eq('user_id', user.id)
      if (error) failures.push(`${r.name}: ${error.message}`); else updated++
    } else {
      const { error } = await supabase.from('employees').insert({
        user_id:         user.id,
        name:            r.name,
        employment_type: 'casual',
        pay_cycle:       'fortnightly',
        pay_basis:       'salary',
        residency_status: 'citizen_pr',
        ...fundFields(r),
      })
      if (error) failures.push(`${r.name}: ${error.message}`); else created++
    }
  }

  return NextResponse.json({ ok: true, dry_run: false, updated, created, failed: failures.length, failures })
}
