import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendFriendSignedUpEmail, sendWelcomeReferredEmail } from '@/lib/referral-emails'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { refCode } = await req.json() as { refCode: string }
  if (!refCode) return NextResponse.json({ error: 'Missing refCode' }, { status: 400 })

  // Prevent double-tracking
  const { data: existingReferral } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_user_id', user.id)
    .maybeSingle()

  if (existingReferral) return NextResponse.json({ ok: true, skipped: true })

  // Look up the referral code
  const { data: rc } = await supabase
    .from('referral_codes')
    .select('user_id, code, total_referrals, converted_referrals')
    .eq('code', refCode)
    .maybeSingle()

  if (!rc) return NextResponse.json({ ok: true, notFound: true })

  const referrerId = rc.user_id as string

  // Don't allow self-referral
  if (referrerId === user.id) return NextResponse.json({ ok: true, selfReferral: true })

  // Create referral record
  await supabase.from('referrals').insert({
    referral_code: refCode,
    referrer_id: referrerId,
    referred_user_id: user.id,
    referred_email: user.email,
    status: 'signed_up',
  })

  // Increment total_referrals
  await supabase
    .from('referral_codes')
    .update({ total_referrals: ((rc.total_referrals as number) ?? 0) + 1 })
    .eq('code', refCode)

  // Get referrer info for email
  const { data: { user: referrerUser } } = await supabase.auth.admin.getUserById(referrerId)
  const referrerEmail = referrerUser?.email ?? ''
  const referrerName = (referrerUser?.user_metadata?.full_name as string | undefined)
    || referrerEmail.split('@')[0]

  const newUserName = (user.user_metadata?.full_name as string | undefined)
    || (user.email?.split('@')[0] ?? 'your friend')

  // Send emails (non-blocking, don't fail the request if emails fail)
  await Promise.allSettled([
    sendFriendSignedUpEmail({
      referrerEmail,
      referrerName,
      referredName: newUserName,
      code: refCode,
      totalReferrals: ((rc.total_referrals as number) ?? 0) + 1,
      convertedReferrals: (rc.converted_referrals as number) ?? 0,
    }),
    sendWelcomeReferredEmail({
      newUserEmail: user.email ?? '',
      newUserName,
      referrerName,
    }),
  ])

  return NextResponse.json({ ok: true })
}
