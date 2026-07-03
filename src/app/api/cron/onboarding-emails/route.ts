import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'

// Runs daily. Sends onboarding emails at day 1, 3, and 7 after signup.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  const [{ data: users, error: usersError }, { data: businessProfiles }] = await Promise.all([
    supabase.from('profiles').select('id, email, created_at'),
    supabase.from('business_profiles').select('id, business_name'),
  ])

  if (usersError) {
    console.error('[cron/onboarding-emails] fetch profiles error:', usersError)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  const nameByUserId = new Map(
    (businessProfiles ?? []).map((bp) => [bp.id, (bp.business_name as string | null) ?? ''])
  )

  const { data: sent } = await supabase
    .from('onboarding_emails')
    .select('user_id, email_type')

  const sentSet = new Set((sent ?? []).map((r) => `${r.user_id}:${r.email_type}`))

  const SCHEDULE: { type: 'day1' | 'day3' | 'day7'; minDays: number; maxDays: number }[] = [
    { type: 'day1', minDays: 0, maxDays: 1 },
    { type: 'day3', minDays: 2, maxDays: 4 },
    { type: 'day7', minDays: 5, maxDays: 9 },
  ]

  let sent_count = 0

  for (const user of users ?? []) {
    if (!user.email) continue
    const daysSinceSignup = Math.floor((now.getTime() - new Date(user.created_at).getTime()) / 86_400_000)

    for (const { type, minDays, maxDays } of SCHEDULE) {
      if (daysSinceSignup < minDays || daysSinceSignup > maxDays) continue
      if (sentSet.has(`${user.id}:${type}`)) continue

      try {
        const res = await fetch(`${BASE_URL}/api/email/onboarding`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '',
          },
          body: JSON.stringify({
            email: user.email,
            firstName: (nameByUserId.get(user.id) ?? '').split(' ')[0],
            emailType: type,
          }),
        })

        if (!res.ok) {
          console.error(`[cron/onboarding-emails] failed ${type} → ${user.email}:`, await res.text())
          continue
        }

        await supabase.from('onboarding_emails').insert({ user_id: user.id, email_type: type })
        sentSet.add(`${user.id}:${type}`)
        sent_count++
      } catch (err) {
        console.error(`[cron/onboarding-emails] error ${type} → ${user.email}:`, err)
      }
    }
  }

  return NextResponse.json({ sent: sent_count, users: users?.length ?? 0 })
}
