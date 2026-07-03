import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'

export const maxDuration = 60

// Runs daily. For each Autopilot user, checks whether (a) super is owed on
// recent payroll, or (b) a BAS is due soon, and if so drops a proactive
// reminder into their SAB chat — phrased by Claude, with a template fallback —
// and emails it as a backup.
//
// SAB never moves money. It calculates, reminds, and hands over the details;
// the customer makes the bank transfer / ATO payment themselves.

const fmtAUD = (n: number) =>
  `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + 'T00:00:00Z').getTime()
  const b = new Date(toISO + 'T00:00:00Z').getTime()
  return Math.round((b - a) / 86_400_000)
}

function prettyDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

// Standard quarterly BAS lodgement deadlines (self-lodgers, 28th rule).
function nextBasDeadline(today: string): { dueDate: string; fy: string; quarter: number } | null {
  const thisYear = Number(today.slice(0, 4))
  const candidates: { dueDate: string; fy: string; quarter: number }[] = []
  for (const cy of [thisYear, thisYear + 1]) {
    candidates.push(
      { dueDate: `${cy}-02-28`, fy: `${cy - 1}-${cy}`,     quarter: 2 }, // Q2 Oct–Dec
      { dueDate: `${cy}-04-28`, fy: `${cy - 1}-${cy}`,     quarter: 3 }, // Q3 Jan–Mar
      { dueDate: `${cy}-07-28`, fy: `${cy - 1}-${cy}`,     quarter: 4 }, // Q4 Apr–Jun
      { dueDate: `${cy}-10-28`, fy: `${cy}-${cy + 1}`,     quarter: 1 }, // Q1 Jul–Sep
    )
  }
  const upcoming = candidates
    .filter(c => c.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return upcoming[0] ?? null
}

const REMINDER_SYSTEM = `You are SAB, a friendly Australian small-business assistant. Write a SHORT proactive reminder (2–4 sentences) for a business owner, in casual Australian English.

Rules:
- Start with a short **bold title** line (e.g. "**Super reminder**" or "**BAS due soon**").
- Use the numbers from the data EXACTLY as given. Never invent, round, or change a figure.
- Plain text only. **bold** is allowed for emphasis. A short bullet list with • is fine for a per-employee breakdown.
- SAB never moves money. Make clear the owner pays it themselves from their own bank / to the ATO — you just remind and keep track.
- End by offering to help (e.g. "Want me to break it down? Just ask.").
- No greeting like "Hi", no sign-off. Get straight to it. Keep it under 90 words.`

// Ask Claude to phrase the reminder. Returns null on any failure → caller uses
// the deterministic template, so a Claude outage never breaks the cron.
async function phraseReminder(
  anthropic: Anthropic,
  facts: Record<string, unknown>,
): Promise<string | null> {
  try {
    const res = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 400,
      system:     REMINDER_SYSTEM,
      messages:   [{ role: 'user', content: JSON.stringify(facts) }],
    })
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()
    return text || null
  } catch {
    return null
  }
}

function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}

async function emailReminder(resend: Resend, to: string, subject: string, message: string) {
  try {
    await resend.emails.send({
      from:    process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to,
      subject,
      html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1C1917;max-width:560px">
        <p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#C84B2F;margin:0 0 8px">🔔 Reminder from SAB</p>
        ${markdownToHtml(message)}
        <p style="font-size:12px;color:#8A8578;margin-top:20px">SAB Account AI · not a registered tax agent. For complex advice, consult your accountant.</p>
      </div>`,
    })
  } catch {
    /* email is best-effort — never block the chat reminder */
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase  = createServiceClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const resend    = new Resend(process.env.RESEND_API_KEY)
  const today     = new Date().toISOString().slice(0, 10)
  const windowStart = addDays(today, -14)

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('plan', 'autopilot')

  let nudged = 0

  for (const u of users ?? []) {
    const userId = u.id as string
    const email  = (u.email as string | null) ?? null

    const { data: biz } = await supabase
      .from('business_profiles')
      .select('business_name, gst_registered')
      .eq('id', userId)
      .single()

    // Helper: claim de-dup → phrase → post to chat → email. Returns true if sent.
    const deliver = async (
      nudgeType: string,
      periodKey: string,
      facts: Record<string, unknown>,
      template: string,
      emailSubject: string,
    ): Promise<boolean> => {
      // Claim FIRST (UNIQUE constraint). A repeat — or a missing table — errors
      // here and we skip, so we never double-send.
      const { error: claimErr } = await supabase.from('proactive_nudges').insert({
        user_id: userId, nudge_type: nudgeType, period_key: periodKey,
      })
      if (claimErr) return false

      const message = (await phraseReminder(anthropic, facts)) ?? template

      const { error: insErr } = await supabase.from('chat_messages').insert({
        user_id:    userId,
        role:       'assistant',
        content:    message,
        tool_calls: { kind: 'reminder', nudge_type: nudgeType },
      })
      if (insErr) return false

      if (email) await emailReminder(resend, email, emailSubject, message)
      return true
    }

    // ── (a) Payday Super reminder ─────────────────────────────────────
    {
      const { data: payslips } = await supabase
        .from('payslips')
        .select('employee_name, super_sg, pay_period_end')
        .eq('user_id', userId)
        .gte('pay_period_end', windowStart)
        .lte('pay_period_end', today)

      if (payslips && payslips.length > 0) {
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

        if (totalSuper > 0) {
          const dueDate = addDays(latestPayday, 7)
          const staffCount = Object.keys(perEmployee).length
          const breakdownLines = Object.entries(perEmployee).map(([n, sg]) => `• ${n}: ${fmtAUD(sg)}`)
          const template =
`🔔 **Super reminder**

You've run payroll recently — **${fmtAUD(totalSuper)}** in super is owed for ${staffCount} ${staffCount === 1 ? 'employee' : 'staff'}.

${breakdownLines.join('\n')}

Under **Payday Super** (from 1 July 2026), this needs to reach your employees' super funds by around **${prettyDate(dueDate)}**. Pay it from your own bank — I'll keep track, but the transfer is yours to make.`
          const facts = {
            kind: 'payday_super',
            total_super: fmtAUD(totalSuper),
            staff_count: staffCount,
            breakdown: Object.entries(perEmployee).map(([name, sg]) => ({ name, amount: fmtAUD(sg) })),
            due_by: prettyDate(dueDate),
          }
          if (await deliver('payday_super', latestPayday, facts, template, 'Super due soon — SAB reminder')) nudged++
        }
      }
    }

    // ── (b) BAS due-soon reminder (GST-registered only) ───────────────
    if (biz?.gst_registered) {
      const next = nextBasDeadline(today)
      if (next) {
        const daysUntil = daysBetween(today, next.dueDate)
        if (daysUntil >= 0 && daysUntil <= 7) {
          const startYear = Number(next.fy.split('-')[0])
          const ranges: Record<number, [string, string]> = {
            1: [`${startYear}-07-01`, `${startYear}-09-30`],
            2: [`${startYear}-10-01`, `${startYear}-12-31`],
            3: [`${startYear + 1}-01-01`, `${startYear + 1}-03-31`],
            4: [`${startYear + 1}-04-01`, `${startYear + 1}-06-30`],
          }
          const [from, to] = ranges[next.quarter]

          const [{ data: invoices }, { data: records }, { data: w2 }] = await Promise.all([
            supabase.from('invoices').select('total_gst').eq('user_id', userId).in('status', ['pending', 'paid', 'overdue']).gte('issue_date', from).lte('issue_date', to),
            supabase.from('records').select('gst_amount').eq('user_id', userId).eq('type', 'expense').gte('date', from).lte('date', to),
            supabase.from('payslips').select('income_tax, medicare_levy, help_repayment').eq('user_id', userId).gte('payment_date', from).lte('payment_date', to),
          ])

          const gstCollected = (invoices ?? []).reduce((s, i) => s + ((i.total_gst as number) || 0), 0)
          const gstCredits   = (records  ?? []).reduce((s, r) => s + ((r.gst_amount as number) || 0), 0)
          const payg         = (w2       ?? []).reduce((s, p) => s + ((p.income_tax as number) || 0) + ((p.medicare_levy as number) || 0) + ((p.help_repayment as number) || 0), 0)
          const netGst       = gstCollected - gstCredits
          const totalPayable = netGst + payg
          const quarterNames = ['', 'Q1 (Jul–Sep)', 'Q2 (Oct–Dec)', 'Q3 (Jan–Mar)', 'Q4 (Apr–Jun)']
          const period       = `${quarterNames[next.quarter]} ${next.fy}`
          const outcome      = totalPayable > 0 ? `${fmtAUD(totalPayable)} owing to the ATO`
                              : totalPayable < 0 ? `${fmtAUD(Math.abs(totalPayable))} refund from the ATO`
                              : 'net zero'

          const template =
`🔔 **BAS due soon**

Your BAS for **${period}** is due by **${prettyDate(next.dueDate)}** — that's in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}.

Based on your books: GST collected ${fmtAUD(gstCollected)}, GST credits ${fmtAUD(gstCredits)}${payg > 0 ? `, PAYG withheld ${fmtAUD(payg)}` : ''} → **${outcome}**.

Lodge and pay through the ATO from your own bank. Want me to walk through the figures? Just ask.`
          const facts = {
            kind: 'bas_due',
            period,
            due_by: prettyDate(next.dueDate),
            days_until: daysUntil,
            gst_collected: fmtAUD(gstCollected),
            gst_credits: fmtAUD(gstCredits),
            payg_withheld: fmtAUD(payg),
            net_outcome: outcome,
          }
          if (await deliver('bas_due', next.dueDate, facts, template, 'BAS due soon — SAB reminder')) nudged++
        }
      }
    }
  }

  return NextResponse.json({ nudged, users: users?.length ?? 0 })
}
