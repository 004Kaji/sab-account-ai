import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { SAB_CHAT_TOOLS } from '@/lib/chat/tools'
import { executeToolCall } from '@/lib/chat/tool-handlers'
import { getAwardRates, pct } from '@/lib/award-rates'

export const maxDuration = 60

const SYSTEM_PROMPT = (ctx: {
  businessName: string
  abn: string
  gstRegistered: boolean
  industry: string
  satRateMult: number | null
  sunRateMult: number | null
  phRateMult: number | null
  eveningRateMult: number | null
  clientsSection: string
  employeesSection: string
  recentInvoicesSection: string
  recentPayslipsSection: string
  invoiceCount: number
  invoiceTotal: string
  today: string
}) => `You are SAB — a smart, friendly business assistant for ${ctx.businessName}.
You work like a trusted offsider who knows this business inside out. Talk like a real person, not a robot.

TODAY: ${ctx.today}
BUSINESS: ${ctx.businessName} | ABN: ${ctx.abn || 'not set'} | GST: ${ctx.gstRegistered ? 'registered' : 'not registered'} | FY2025-26
SUPER RATE: 12% | Payday Super mandatory from 1 July 2026

${ctx.clientsSection}

${ctx.employeesSection}

${ctx.recentInvoicesSection}

${ctx.recentPayslipsSection}

━━━ HOW TO TALK ━━━

Be natural. Be brief. Sound human.

- Short replies. No bullet lists unless listing actual data.
- Never say "Certainly!", "Of course!", "Great question!" or any filler. Just get on with it.
- Don't repeat what the user just said back to them.
- Use casual Australian English. Contractions are fine (I'll, you've, that's).
- If you already have the info — just do it. Don't ask again.
- If something is missing, ask for ONE thing only. Not a list of questions.
- Never ask for the same info twice in a conversation. Check the chat history first.
- After creating a confirm card, wait — don't explain it or ask "shall I send it?" The card has a button.

━━━ WHAT YOU CAN DO ━━━

PAYSLIPS:
- Single payslip → create_payslip (use employee ID from EMPLOYEES above, match by name)
- Everyone at once → process_payroll (say "running payroll for everyone" as you go)
- Auto-compute gross pay — don't ask the user for it if the employee has a stored rate:
    Hourly: rate × hours shown in EMPLOYEES list
    Salary: annual ÷ 26 (fortnightly) / ÷ 52 (weekly) / ÷ 12 (monthly)
- Default pay period: ends today, back-dated by pay cycle (14 days fortnightly, 7 days weekly, current month)
- Only ask if: you genuinely can't figure out which employee, or they want a different date range

PENALTY / OVERTIME HOURS (for hourly employees):
When the user mentions evening, Saturday, Sunday, public holiday hours or different rates for certain hours:
- Calculate ordinary_hours = total_hours - penalty_hours (e.g. 48 total - 8 evening - 8 Saturday = 32 ordinary)
- Pass ordinary_hours + pay_items to create_payslip — the tool computes the correct gross automatically
- NEVER compute gross manually — always use the tool with these parameters
${(() => {
  const awards = ctx.industry ? getAwardRates(ctx.industry) : null
  if (!awards) return `- Industry not set in Settings — use typical Fair Work rates and mention the employer should verify at fairwork.gov.au`

  const satMult     = ctx.satRateMult     ?? awards.saturday
  const sunMult     = ctx.sunRateMult     ?? awards.sunday
  const phMult      = ctx.phRateMult      ?? awards.publicHoliday
  const eveningMult = ctx.eveningRateMult ?? awards.evening?.mult

  const customNote  = (ctx.satRateMult || ctx.sunRateMult || ctx.phRateMult || ctx.eveningRateMult)
    ? ' (★ custom rate set by employer — overrides Award default)'
    : ''

  return `- THIS BUSINESS IS COVERED BY: ${awards.awardName}${customNote ? '\n- EMPLOYER HAS SET CUSTOM PENALTY RATES — use these instead of Award defaults' : ''}
- USE THESE EXACT MULTIPLIERS (rate_mult values):
    ${awards.evening || eveningMult ? `Evening: rate_mult ${eveningMult ?? awards.evening?.mult} (${pct(eveningMult ?? awards.evening?.mult ?? 1)})${ctx.eveningRateMult ? ' ★ custom' : ''}` : 'Evening penalty: not applicable under this Award'}
    Saturday:       rate_mult ${satMult} (${pct(satMult)})${ctx.satRateMult ? ' ★ custom' : ''}
    Sunday:         rate_mult ${sunMult} (${pct(sunMult)})${ctx.sunRateMult ? ' ★ custom' : ''}
    Public Holiday: rate_mult ${phMult} (${pct(phMult)})${ctx.phRateMult ? ' ★ custom' : ''}
    ${awards.note ? `NOTE: ${awards.note}` : ''}`
})()}

INVOICES:
- You need: who it's for + what work was done + amount. That's it.
- Client already in CLIENTS list → use their stored email automatically
- New client not in list → create_client first, then create_invoice
- Build line items from their plain-English description of the work
- Don't ask for anything that's already been said in the conversation

LISTS & DATA:
- "List all clients / employees / invoices / payslips" → answer directly from the data above. Never say you don't have access.
- Business summary, BAS position, super owed → call the relevant tool

ATO QUESTIONS:
- Answer from your knowledge for common stuff (rates, deadlines, basics)
- Call get_ato_rules for specifics you're not certain about
- You're not a registered tax agent — say so for complex advice and suggest their accountant

━━━ HARD RULES ━━━

1. Never do PAYG/super maths yourself. Always use create_payslip or get_super_due. The tools use ATO NAT 1004 coefficients — your maths will be wrong.
2. Never send anything without a confirm card first. Create → show card → user confirms → send.
3. After user confirms a card, act immediately — don't ask "are you sure?" again.

━━━ CONFIRM CARD FORMAT ━━━

When you create a payslip or invoice, output this tag so the UI renders it as a card. Put it at the END of your message after a short natural sentence like "Here's what I've got:":

<confirm_card>
{"type":"payslip|invoice|bas|super","title":"Short title","rows":[["Label","Value"]],"action":"send_payslip|send_invoice|send_all_payslips","action_payload":{},"confirm_label":"Send to Name →","warning":"optional warning if relevant"}
</confirm_card>

CRITICAL — action_payload must contain EVERYTHING needed to execute the action without asking again:
- send_payslip:      {"payslip_id":"<uuid>","employee_email":"<email>"}
- send_invoice:      {"invoice_id":"<uuid>","client_email":"<email>"}
- send_all_payslips: {"payslips":[{"payslip_id":"<uuid>","employee_email":"<email>","employee_name":"<name>"},...]}

When the user clicks confirm, the UI will send you: "Confirmed. Call <action> now with this exact payload: <action_payload>"
You must then immediately call that tool with exactly those parameters — no questions, no re-confirmation.`

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Plan gate — autopilot only
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profile?.plan !== 'autopilot') {
    return NextResponse.json({ error: 'SAB Chat requires the Autopilot plan.' }, { status: 403 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { messages } = await req.json() as { messages: Anthropic.MessageParam[] }

  const fmtAUD = (n: number) => `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  const thisMonth = new Date().toISOString().slice(0, 7) + '-01'

  // Load full business context in parallel
  const [
    { data: biz },
    { data: allClients },
    { data: allEmployees },
    { data: recentInvoices },
    { data: recentPayslips },
    { data: monthInvoices },
  ] = await Promise.all([
    supabase.from('business_profiles').select('business_name, abn, gst_registered, industry, sat_rate_mult, sun_rate_mult, ph_rate_mult, evening_rate_mult').eq('id', user.id).single(),
    supabase.from('clients').select('id, business_name, contact_name, email, phone').eq('user_id', user.id).order('business_name').limit(100),
    supabase.from('employees').select('id, name, email, employment_type, pay_cycle, pay_basis, hourly_rate, ordinary_hours, annual_salary').eq('user_id', user.id).order('name').limit(100),
    supabase.from('invoices').select('id, invoice_number, client_name, client_email, total_inc_gst, status, issue_date').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('payslips').select('id, payslip_number, employee_name, net_pay, pay_period_start, pay_period_end').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('invoices').select('total_inc_gst').eq('user_id', user.id).gte('issue_date', thisMonth).lte('issue_date', today),
  ])

  const invoiceTotal = (monthInvoices ?? []).reduce((s, i) => s + (i.total_inc_gst as number), 0)

  const clientsList  = allClients ?? []
  const employeeList = allEmployees ?? []

  const clientsSection = clientsList.length === 0
    ? 'CLIENTS: none on file'
    : `CLIENTS (${clientsList.length} total):\n` + clientsList.map(c =>
        `- ${c.business_name as string}${c.contact_name ? ` | contact: ${c.contact_name as string}` : ''} | email: ${(c.email as string) || 'not set'} | phone: ${(c.phone as string) || 'not set'} | id: ${c.id as string}`
      ).join('\n')

  const employeesSection = employeeList.length === 0
    ? 'EMPLOYEES: none on file'
    : `EMPLOYEES (${employeeList.length} total):\n` + employeeList.map(e => {
        const payBasis    = (e.pay_basis as string) || 'salary'
        const payCycle    = (e.pay_cycle as string) || 'fortnightly'
        const rateStr     = payBasis === 'hourly'
          ? `${fmtAUD(e.hourly_rate as number)}/hr × ${e.ordinary_hours as number} hrs = ${fmtAUD((e.hourly_rate as number) * (e.ordinary_hours as number))}/pay`
          : e.annual_salary ? `${fmtAUD(e.annual_salary as number)}/yr (${payCycle})` : 'rate not set'
        return `- ${e.name as string} | email: ${(e.email as string) || 'not set'} | ${(e.employment_type as string) || 'casual'} | ${payCycle} | ${payBasis} | ${rateStr} | id: ${e.id as string}`
      }).join('\n')

  const recentInvoicesSection = (recentInvoices ?? []).length === 0
    ? 'RECENT INVOICES: none'
    : `RECENT INVOICES (last ${(recentInvoices ?? []).length}):\n` + (recentInvoices ?? []).map(i =>
        `- ${i.invoice_number as string}: ${i.client_name as string} | ${fmtAUD(i.total_inc_gst as number)} | ${i.status as string} | ${i.issue_date as string} | id: ${i.id as string}`
      ).join('\n')

  const recentPayslipsSection = (recentPayslips ?? []).length === 0
    ? 'RECENT PAYSLIPS: none'
    : `RECENT PAYSLIPS (last ${(recentPayslips ?? []).length}):\n` + (recentPayslips ?? []).map(p =>
        `- ${p.payslip_number as string}: ${p.employee_name as string} | net ${fmtAUD(p.net_pay as number)} | ${p.pay_period_start as string} to ${p.pay_period_end as string} | id: ${p.id as string}`
      ).join('\n')

  const systemPrompt = SYSTEM_PROMPT({
    businessName:          (biz?.business_name as string) || user.email?.split('@')[0] || 'Your Business',
    abn:                   (biz?.abn as string) || '',
    gstRegistered:         (biz?.gst_registered as boolean) || false,
    industry:              (biz?.industry as string) || '',
    satRateMult:           biz?.sat_rate_mult     != null ? (biz.sat_rate_mult as number) : null,
    sunRateMult:           biz?.sun_rate_mult     != null ? (biz.sun_rate_mult as number) : null,
    phRateMult:            biz?.ph_rate_mult      != null ? (biz.ph_rate_mult as number) : null,
    eveningRateMult:       biz?.evening_rate_mult != null ? (biz.evening_rate_mult as number) : null,
    clientsSection,
    employeesSection,
    recentInvoicesSection,
    recentPayslipsSection,
    invoiceCount:          monthInvoices?.length ?? 0,
    invoiceTotal:          fmtAUD(invoiceTotal),
    today,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        let currentMessages = [...messages]
        let fullAssistantText = ''

        // Agentic loop — handles tool use
        while (true) {
          const response = await anthropic.messages.create({
            model:      'claude-sonnet-4-6',
            max_tokens: 2048,
            system:     systemPrompt,
            tools:      SAB_CHAT_TOOLS,
            messages:   currentMessages,
            stream:     false,
          })

          // Collect text from this response turn
          let turnText = ''
          const toolUseBlocks: Anthropic.ToolUseBlock[] = []

          for (const block of response.content) {
            if (block.type === 'text') {
              turnText += block.text
              // Stream text chunks to client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: block.text })}\n\n`))
            } else if (block.type === 'tool_use') {
              toolUseBlocks.push(block)
            }
          }

          fullAssistantText += turnText

          if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
            break
          }

          // Execute tool calls and continue
          const toolResults: Anthropic.ToolResultBlockParam[] = []
          for (const toolBlock of toolUseBlocks) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_start', tool: toolBlock.name })}\n\n`))
            const result = await executeToolCall(
              toolBlock.name,
              toolBlock.input as Record<string, unknown>,
              user.id,
              supabase,
            )
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_end', tool: toolBlock.name })}\n\n`))
            toolResults.push({ type: 'tool_result', tool_use_id: toolBlock.id, content: JSON.stringify(result) })
          }

          currentMessages = [
            ...currentMessages,
            { role: 'assistant' as const, content: response.content },
            { role: 'user' as const, content: toolResults },
          ]
        }

        // Persist user message + assistant response
        const userMsg = messages[messages.length - 1]
        const userText = typeof userMsg?.content === 'string' ? userMsg.content
          : Array.isArray(userMsg?.content) ? (userMsg.content as Array<{ type: string; text?: string }>).filter(b => b.type === 'text').map(b => b.text).join('') : ''

        await Promise.all([
          supabase.from('chat_messages').insert([
            { user_id: user.id, role: 'user',      content: userText },
            { user_id: user.id, role: 'assistant', content: fullAssistantText },
          ]),
          supabase.rpc('increment_chat_usage', { p_user_id: user.id, p_date: today }),
        ])

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()

      } catch (err) {
        Sentry.captureException(err, { tags: { feature: 'sab_chat' } })
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : 'Something went wrong' })}\n\n`))
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
