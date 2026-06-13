export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs every day at 9pm UTC (7am AEST).
// Sends 2 emails to accountants + 2 emails to business owners.
// Mac-independent — runs on Vercel 24/7.

import { NextRequest, NextResponse } from 'next/server'
import { sparkSendAccountantEmails, sparkSendBusinessEmails } from '@/lib/agents/sub/spark'
import { logAgentAction } from '@/lib/agents/utils'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  const [accountantsR, businessesR] = await Promise.allSettled([
    sparkSendAccountantEmails(),
    sparkSendBusinessEmails(),
  ])

  const accountants = accountantsR.status === 'fulfilled' ? accountantsR.value : { sent: 0, names: [] }
  const businesses  = businessesR.status  === 'fulfilled' ? businessesR.value  : { sent: 0, names: [] }
  const totalSent   = accountants.sent + businesses.sent

  await logAgentAction({
    agentName:    'cron',
    triggerType:  'daily_outreach',
    actionsTaken: { accountantsSent: accountants.sent, businessesSent: businesses.sent, names: [...accountants.names, ...businesses.names] },
    durationMs:   Date.now() - start,
  })

  return NextResponse.json({ success: true, accountants, businesses, totalSent, durationMs: Date.now() - start })
}
