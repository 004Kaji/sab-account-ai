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

  const weekAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: profiles },
    { count: newThisWeek },
    { count: newThisMonth },
    { count: invoiceCount },
    { count: payslipCount },
    { count: recordCount },
    { count: clientCount },
    { count: totalReferralSignups },
    { count: convertedReferrals },
    { data: topReferrers },
  ] = await Promise.all([
    supabase.from('profiles').select('id, plan, subscription_status'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo),
    supabase.from('invoices').select('*', { count: 'exact', head: true }),
    supabase.from('payslips').select('*', { count: 'exact', head: true }),
    supabase.from('records').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('referrals').select('*', { count: 'exact', head: true }),
    supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
    supabase.from('referral_codes')
      .select('user_id, code, total_referrals, converted_referrals, free_months_earned, lifetime_pro')
      .gt('total_referrals', 0)
      .order('converted_referrals', { ascending: false })
      .limit(10),
  ])

  const planCounts = { free: 0, starter: 0, pro: 0 }
  let trialing = 0, pastDue = 0, active = 0, cancelled = 0

  for (const p of profiles ?? []) {
    const plan = p.plan as keyof typeof planCounts
    if (plan in planCounts) planCounts[plan]++
    if (p.subscription_status === 'trialing')  trialing++
    if (p.subscription_status === 'past_due')  pastDue++
    if (p.subscription_status === 'active')    active++
    if (p.subscription_status === 'cancelled') cancelled++
  }

  const mrr = (planCounts.starter * 9) + (planCounts.pro * 19)

  // Enrich top referrers with email
  const refUserIds = (topReferrers ?? []).map(r => r.user_id)
  const { data: refProfiles } = refUserIds.length
    ? await supabase.from('profiles').select('id, email').in('id', refUserIds)
    : { data: [] }
  const emailMap = Object.fromEntries((refProfiles ?? []).map(p => [p.id, p.email]))

  const enrichedReferrers = (topReferrers ?? []).map(r => ({
    ...r,
    email: emailMap[r.user_id] ?? '—',
  }))

  return NextResponse.json({
    mrr,
    totalUsers:           profiles?.length ?? 0,
    planCounts,
    trialing,
    pastDue,
    active,
    cancelled,
    newThisWeek:          newThisWeek  ?? 0,
    newThisMonth:         newThisMonth ?? 0,
    invoiceCount:         invoiceCount ?? 0,
    payslipCount:         payslipCount ?? 0,
    recordCount:          recordCount  ?? 0,
    clientCount:          clientCount  ?? 0,
    totalReferralSignups: totalReferralSignups ?? 0,
    convertedReferrals:   convertedReferrals   ?? 0,
    topReferrers:         enrichedReferrers,
  })
}
