import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { SAB_CHAT_TOOLS } from '@/lib/chat/tools'
import { executeToolCall } from '@/lib/chat/tool-handlers'

export const maxDuration = 60

const DAILY_LIMIT = 30

const SYSTEM_PROMPT = (ctx: {
  businessName: string
  abn: string
  gstRegistered: boolean
  clientsSection: string
  employeesSection: string
  recentInvoicesSection: string
  recentPayslipsSection: string
  invoiceCount: number
  invoiceTotal: string
  today: string
}) => `You are SAB, the AI business assistant for ${ctx.businessName} (ABN: ${ctx.abn || 'not set'}).
You are embedded inside SAB Account AI — an ATO-compliant invoicing and payroll platform for Australian small businesses.

BUSINESS CONTEXT:
- Business name: ${ctx.businessName}
- ABN: ${ctx.abn || 'not set'}
- GST registered: ${ctx.gstRegistered ? 'Yes' : 'No'}
- Subscription: Autopilot
- Invoices this month: ${ctx.invoiceCount} totalling ${ctx.invoiceTotal}
- Current financial year: FY2025-26
- Super Guarantee rate: 12% (from 1 July 2025)
- Payday Super: mandatory from 1 July 2026 — super must be paid on every payday

${ctx.clientsSection}

${ctx.employeesSection}

${ctx.recentInvoicesSection}

${ctx.recentPayslipsSection}

YOUR RULES:
1. NEVER calculate PAYG withholding or super yourself — always call create_payslip or get_super_due tool. Your calculations will be wrong. The tools use ATO-verified NAT 1004 coefficients.
2. NEVER send anything without showing a confirm card first. Create first, send second — always two steps.
3. For action requests (create, send, calculate) — use the appropriate tool. Do not guess figures.
4. For knowledge questions (ATO rules, deadlines, exemptions) — answer from your knowledge or call get_ato_rules.
5. For business data questions (income, expenses, invoices) — call get_business_summary or get_bas_position.
6. When a user asks to list clients, employees, invoices, or payslips — answer directly from the data above. Do NOT say you don't have the list.

PAYSLIP RULES:
7. When creating a payslip, look up the employee in EMPLOYEES above by name to get their ID and pay details.
8. Do NOT ask for gross pay or dates if the employee has a stored rate. Compute them yourself:
   - Hourly employees: gross_pay = hourly_rate × ordinary_hours (already shown in EMPLOYEES as "/pay")
   - Salary employees: gross_pay = annual_salary ÷ 26 (fortnightly) or ÷ 52 (weekly) or ÷ 12 (monthly)
   - Pay period: end = today (${ctx.today}), start = today minus 13 days (fortnightly) / 6 days (weekly) / first of month (monthly)
9. Only ask the user for: which employee (if ambiguous) and the pay period (if they want a specific one other than the current period).

INVOICE RULES:
10. When creating an invoice, always ask what work was done (description) and the amount. Build line items from their description.
11. If the client is in CLIENTS above, use their stored email. If the client is NEW (not in the list), call create_client first to add them, then create_invoice.
12. Always ask: client name, what work was done, rate/amount. Do not send without a confirm card.

GENERAL:
13. Keep responses concise and plain Australian English. No jargon. No unnecessary explanation.
14. When you create a document, always wrap the result in <confirm_card> tags as JSON so the UI can render it as a structured card.
15. You are not a registered tax agent. For complex tax advice, recommend they consult their accountant.

CONFIRM CARD FORMAT — always use this when creating a document:
<confirm_card>
{"type":"payslip|invoice|bas|super","title":"Document title","rows":[["Label","Value"]],"action":"send_payslip|send_invoice","action_payload":{},"confirm_label":"Send to [name] →","warning":"optional warning"}
</confirm_card>`

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

  // Rate limit — 30 messages/day
  const today = new Date().toISOString().slice(0, 10)
  const { data: usage } = await supabase
    .from('chat_usage')
    .select('message_count')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  const currentCount = (usage?.message_count as number) ?? 0
  if (currentCount >= DAILY_LIMIT) {
    return NextResponse.json({ error: `Daily limit reached (${DAILY_LIMIT} messages). Resets at midnight.` }, { status: 429 })
  }

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
    supabase.from('business_profiles').select('business_name, abn, gst_registered').eq('id', user.id).single(),
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
          supabase.from('chat_usage').upsert(
            { user_id: user.id, date: today, message_count: currentCount + 1 },
            { onConflict: 'user_id,date' },
          ).then(() =>
            supabase.from('chat_usage')
              .update({ message_count: currentCount + 1 })
              .eq('user_id', user.id)
              .eq('date', today)
          ),
        ])

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', remaining: DAILY_LIMIT - currentCount - 1 })}\n\n`))
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
