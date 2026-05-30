import { createServiceClient } from '@/lib/supabase'

function makeCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 6).padEnd(4, 'X')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}-${suffix}`
}

export async function generateReferralCode(userId: string, userName: string): Promise<string> {
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing?.code) return existing.code as string

  // Insert with a random suffix — collision probability is negligible (~1 in 1.6M).
  // On the rare conflict, re-fetch the row that won the race.
  const code = makeCode(userName)
  const { error } = await supabase
    .from('referral_codes')
    .insert({ user_id: userId, code })

  if (error) {
    const { data: race } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .single()
    return (race?.code as string) ?? code
  }

  return code
}

export function getReferralLink(code: string): string {
  return `https://sabaccountai.com/signup?ref=${code}`
}

export async function getRewardStatus(userId: string) {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return null

  const converted = (data.converted_referrals as number) ?? 0
  const earned = (data.free_months_earned as number) ?? 0
  const used = (data.free_months_used as number) ?? 0

  let nextReward = '1 converted friend = 1 month free'
  if (data.lifetime_pro) {
    nextReward = 'You have Lifetime Pro!'
  } else if (converted >= 3) {
    const need = 10 - converted
    nextReward = `${need} more converting friend${need === 1 ? '' : 's'} = Lifetime Pro`
  } else if (converted >= 1) {
    const need = 3 - converted
    nextReward = `${need} more converting friend${need === 1 ? '' : 's'} = 3 months free`
  }

  return {
    code: data.code as string,
    link: getReferralLink(data.code as string),
    totalReferrals: (data.total_referrals as number) ?? 0,
    convertedReferrals: converted,
    freeMonthsEarned: earned,
    freeMonthsRemaining: earned - used,
    lifetimePro: (data.lifetime_pro as boolean) ?? false,
    nextReward,
  }
}

export async function applyReferralReward(
  referrerId: string,
): Promise<{ additionalMonths: number; lifetimePro: boolean }> {
  const supabase = createServiceClient()

  const { data: rc } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', referrerId)
    .single()

  if (!rc) return { additionalMonths: 0, lifetimePro: false }

  const converted = (rc.converted_referrals as number) ?? 0
  const prevEarned = (rc.free_months_earned as number) ?? 0
  const prevUsed = (rc.free_months_used as number) ?? 0
  let newEarned = prevEarned
  let lifetimePro = (rc.lifetime_pro as boolean) ?? false

  if (converted >= 10 && !lifetimePro) {
    lifetimePro = true
  } else if (converted >= 3) {
    newEarned = Math.max(prevEarned, 3)
  } else if (converted >= 1) {
    newEarned = Math.max(prevEarned, 1)
  }

  const additionalMonths = newEarned - prevEarned

  await supabase
    .from('referral_codes')
    .update({ free_months_earned: newEarned, lifetime_pro: lifetimePro })
    .eq('user_id', referrerId)

  if (additionalMonths > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('billing_cycle_end')
      .eq('id', referrerId)
      .single()

    const currentEnd = profile?.billing_cycle_end
      ? new Date(profile.billing_cycle_end as string)
      : new Date()
    const base = currentEnd > new Date() ? currentEnd : new Date()
    const newEnd = new Date(base.getTime() + additionalMonths * 30 * 24 * 60 * 60 * 1000)

    await Promise.all([
      supabase
        .from('profiles')
        .update({ billing_cycle_end: newEnd.toISOString() })
        .eq('id', referrerId),
      supabase
        .from('referral_codes')
        .update({ free_months_used: prevUsed + additionalMonths })
        .eq('user_id', referrerId),
    ])
  }

  return { additionalMonths, lifetimePro }
}
