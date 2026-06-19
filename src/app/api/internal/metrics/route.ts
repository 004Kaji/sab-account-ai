export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Internal metrics endpoint for the Basnet agent system.
// Auth: x-internal-secret header (INTERNAL_API_SECRET env var).
// Agents call this instead of querying SAB's customer tables directly.

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    profilesRes,
    invoicesRes,
    payslipsRes,
    recentInvoicesRes,
    recentPayslipsRes,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, plan, subscription_status, created_at, billing_cycle_end'),
    supabase
      .from('invoices')
      .select('user_id, created_at')
      .limit(2000),
    supabase
      .from('payslips')
      .select('user_id, created_at')
      .limit(2000),
    supabase
      .from('invoices')
      .select('user_id')
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('payslips')
      .select('user_id')
      .gte('created_at', sevenDaysAgo),
  ])

  const profiles = profilesRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const payslips = payslipsRes.data ?? []

  const paid = profiles.filter(p =>
    p.plan !== 'free' && p.subscription_status === 'active'
  )
  const signupsToday = profiles.filter(p => {
    const d = new Date(p.created_at as string)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }).length
  const signupsThisMonth = profiles.filter(p =>
    new Date(p.created_at as string) >= new Date(thirtyDaysAgo)
  ).length

  const activeUserIds = new Set([
    ...(recentInvoicesRes.data ?? []).map(r => r.user_id),
    ...(recentPayslipsRes.data ?? []).map(r => r.user_id),
  ])

  const paidInactive = paid.filter(p => !activeUserIds.has(p.id))

  return NextResponse.json({
    totalUsers:        profiles.length,
    paidUsers:         paid.length,
    freeUsers:         profiles.filter(p => p.plan === 'free').length,
    signupsToday,
    signupsThisMonth,
    activeThisWeek:    activeUserIds.size,
    paidInactiveCount: paidInactive.length,
    planBreakdown: {
      free:       profiles.filter(p => p.plan === 'free').length,
      starter:    profiles.filter(p => p.plan === 'starter').length,
      pro:        profiles.filter(p => p.plan === 'pro').length,
      autopilot:  profiles.filter(p => p.plan === 'autopilot').length,
    },
    recentActivity: {
      invoicesThisWeek: (recentInvoicesRes.data ?? []).length,
      payslipsThisWeek: (recentPayslipsRes.data ?? []).length,
    },
    invoicesAllTime: invoices.length,
    payslipsAllTime: payslips.length,
  })
}
