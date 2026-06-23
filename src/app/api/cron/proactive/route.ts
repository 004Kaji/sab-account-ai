import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const maxDuration = 60

// Runs daily. For each Autopilot user, checks whether super is owed on recent
// payroll and, if so, drops a proactive reminder into their SAB chat.
//
// SAB never moves money — it calculates, reminds, and hands over the details.
// The customer makes the bank transfer themselves. Read-only + suggest only.

const fmtAUD = (n: number) =>
  `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function prettyDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

export async function GET(req: NextRequest) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const windowStart = addDays(today, -14) // look at the last fortnight of pay runs

  // Proactive chat is part of SAB Chat — Autopilot only.
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('plan', 'autopilot')

  let nudged = 0

  for (const u of users ?? []) {
    const userId = u.id as string

    // Super owed = sum of super_sg on payslips whose pay period ended recently.
    const { data: payslips } = await supabase
      .from('payslips')
      .select('employee_name, super_sg, pay_period_end')
      .eq('user_id', userId)
      .gte('pay_period_end', windowStart)
      .lte('pay_period_end', today)

    if (!payslips || payslips.length === 0) continue

    const perEmployee: Record<string, number> = {}
    let totalSuper = 0
    let latestPayday = windowStart
    for (const ps of payslips) {
      const name = ps.employee_name as string
      const sg = (ps.super_sg as number) || 0
      perEmployee[name] = (perEmployee[name] ?? 0) + sg
      totalSuper += sg
      const ppe = ps.pay_period_end as string
      if (ppe > latestPayday) latestPayday = ppe
    }
    if (totalSuper <= 0) continue

    // De-dup FIRST: claim this pay run before sending. The UNIQUE(user_id,
    // nudge_type, period_key) constraint means a repeat (or a missing table)
    // errors here and we skip — so we never double-send, and we send nothing
    // until the proactive_nudges table exists.
    const { error: claimErr } = await supabase.from('proactive_nudges').insert({
      user_id:    userId,
      nudge_type: 'payday_super',
      period_key: latestPayday,
    })
    if (claimErr) continue

    const dueDate = addDays(latestPayday, 7) // SG should reach funds within ~7 days of payday
    const staffCount = Object.keys(perEmployee).length
    const breakdown = Object.entries(perEmployee)
      .map(([name, sg]) => `• ${name}: ${fmtAUD(sg)}`)
      .join('\n')

    const message =
`🔔 **Super reminder**

You've run payroll recently — **${fmtAUD(totalSuper)}** in super is owed for ${staffCount} ${staffCount === 1 ? 'employee' : 'staff'}.

${breakdown}

Under **Payday Super** (from 1 July 2026), this needs to reach your employees' super funds by around **${prettyDate(dueDate)}**. Pay it from your own bank — I'll keep track, but the transfer is yours to make.

Want me to break down your BAS position too, or anything else? Just ask.`

    // Write the reminder into the chat. Flagged via the existing tool_calls JSONB
    // column so the UI can style it — no schema change to chat_messages.
    const { error: insErr } = await supabase.from('chat_messages').insert({
      user_id:    userId,
      role:       'assistant',
      content:    message,
      tool_calls: { kind: 'reminder', nudge_type: 'payday_super' },
    })
    if (insErr) continue

    nudged++
  }

  return NextResponse.json({ nudged, users: users?.length ?? 0 })
}
