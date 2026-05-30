import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import {
  sendFriendSignedUpEmail,
  sendFriendConvertedEmail,
  sendWelcomeReferredEmail,
} from '@/lib/referral-emails'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { type: string } & Record<string, unknown>

  // Only allow sending to the authenticated user's own email
  const targetEmail = (body.referrerEmail ?? body.newUserEmail) as string | undefined
  if (!targetEmail || targetEmail !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    if (body.type === 'friend_signed_up') {
      await sendFriendSignedUpEmail({
        referrerEmail: body.referrerEmail as string,
        referrerName: body.referrerName as string,
        referredName: body.referredName as string,
        code: body.code as string,
        totalReferrals: body.totalReferrals as number,
        convertedReferrals: body.convertedReferrals as number,
      })
    } else if (body.type === 'friend_converted') {
      await sendFriendConvertedEmail({
        referrerEmail: body.referrerEmail as string,
        referrerName: body.referrerName as string,
        referredEmail: body.referredEmail as string,
        code: body.code as string,
        convertedReferrals: body.convertedReferrals as number,
        additionalMonths: body.additionalMonths as number,
        lifetimePro: body.lifetimePro as boolean,
        newBillingDate: body.newBillingDate as string,
      })
    } else if (body.type === 'welcome_referred') {
      await sendWelcomeReferredEmail({
        newUserEmail: body.newUserEmail as string,
        newUserName: body.newUserName as string,
        referrerName: body.referrerName as string,
      })
    } else {
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'email_send', type: 'referral' } })
    console.error('Referral email error:', err)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
