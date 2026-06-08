import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const ADMIN_EMAILS = ['sanjog.basnet02@gmail.com', 'basnet@sabaccountai.com']

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const plan   = searchParams.get('plan')
  const status = searchParams.get('status')
  const page   = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const limit  = 50

  let query = supabase
    .from('profiles')
    .select('id, email, plan, subscription_status, trial_ends_at, billing_cycle_end, created_at')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (plan)   query = query.eq('plan', plan)
  if (status) query = query.eq('subscription_status', status)

  const { data: profiles, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (profiles ?? []).map(p => p.id)
  if (ids.length === 0) return NextResponse.json({ users: [] })

  const [{ data: bizProfiles }, { data: refCodes }] = await Promise.all([
    supabase.from('business_profiles').select('id, business_name, industry').in('id', ids),
    supabase.from('referral_codes').select('user_id, code, total_referrals, converted_referrals, free_months_earned, lifetime_pro').in('user_id', ids),
  ])

  const bizMap = Object.fromEntries((bizProfiles ?? []).map(b => [b.id, b]))
  const refMap = Object.fromEntries((refCodes    ?? []).map(r => [r.user_id, r]))

  const users = (profiles ?? []).map(p => ({
    ...p,
    business_name: bizMap[p.id]?.business_name ?? null,
    industry:      bizMap[p.id]?.industry      ?? null,
    referral:      refMap[p.id]                ?? null,
  }))

  return NextResponse.json({ users })
}
