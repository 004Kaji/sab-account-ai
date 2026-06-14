import { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { calculatePayslip } from '@/lib/ato'

// ── ATO static knowledge ──────────────────────────────────────────────
const ATO_RULES: Record<string, string> = {
  super: `Super Guarantee (SG) rates:
- FY2024-25: 11.5%
- FY2025-26: 12.0% (from 1 July 2025)
- Future: stays at 12% (no further scheduled increases as of 2026)
Super must be paid into a complying fund or the employee's chosen fund.
Payday Super from 1 July 2026: super must be paid on every payday, not quarterly.
Late super attracts a Superannuation Guarantee Charge (SGC) which is non-deductible.`,

  medicare: `Medicare Levy: 2% of taxable income for Australian residents.
Exemptions (no Medicare levy):
- International students (student visa)
- Temporary work visa holders (482, 457, 400 etc)
- Working Holiday Makers (417, 462)
- Partner/dependent visas (temporary)
- Other temporary residents
Low-income threshold 2025-26: $27,222 (no levy below this). Phase-in between $27,222 and $34,028.
HELP/HECS repayment is separate from Medicare and applies from $67,000 income.`,

  payg: `PAYG Withholding scales (NAT 1004, FY2025-26):
Scale 1: Employee has NOT claimed tax-free threshold. No LITO. Higher withholding from first dollar. Used for second jobs.
Scale 2: Employee HAS claimed tax-free threshold. Includes Medicare and LITO phaseout. Primary scale for Australian residents.
Scale 3: Foreign residents. No Medicare, no LITO, no tax-free threshold.
Scale 5: Claiming threshold + FULL Medicare levy exemption. No Medicare withheld. For temp residents/international students who claim threshold.
WHM (Schedule 15): Working holiday makers. 15% up to $45,000, 30% up to $135,000, 37% up to $190,000, 45% above.
All PAYG amounts are rounded to the nearest dollar per ATO rules.`,

  bas: `BAS (Business Activity Statement) due dates for quarterly lodgers:
- Q1 (Jul-Sep): due 28 October
- Q2 (Oct-Dec): due 28 February
- Q3 (Jan-Mar): due 28 April
- Q4 (Apr-Jun): due 28 July
Monthly BAS lodgers: due 21st of the following month.
GST rate: 10% on taxable supplies. Input tax credits (ITCs) offset GST collected.
Net GST = GST collected on sales - GST credits on purchases. If negative, ATO owes you a refund.
Small business threshold: businesses with less than $75,000 turnover are not required to register for GST.`,

  abn: `ABN withholding:
If a contractor does not quote an ABN, you must withhold 47% (top marginal rate + 2% Medicare) from their payment.
Withholding amount must be sent to ATO via your BAS under W4 label.
Contractors with valid ABN: no withholding required (they handle their own tax).
ABN can be verified at abr.business.gov.au.
Sole traders are taxed as individuals on their net business income. No company tax rate.`,

  whm: `Working Holiday Makers (WHM) — visa 417 and 462:
Tax scale: 15% on first $45,000, 30% on $45,001-$135,000, 37% on $135,001-$190,000, 45% above $190,000.
No Medicare levy. No tax-free threshold. No LITO.
Super: WHMs are entitled to super at the SG rate (12%). They can claim it on departure via DASP (Departing Australia Superannuation Payment), taxed at 65%.
Employer must register as a Working Holiday Maker employer with ATO before hiring a WHM.`,

  payday_super: `Payday Super — mandatory from 1 July 2026:
Super must be paid on the same day or very close to every payday (not quarterly).
ATO will match payday super payments against payroll data reported through Single Touch Payroll (STP).
Penalties apply immediately from July 28, 2026 (first full payday after 1 July).
Super Guarantee Charge (SGC) is non-deductible and includes interest (10% p.a.) plus admin levy ($20 per employee per quarter).
Employers must use a clearing house or pay directly to the employee's chosen fund — no more holding super for 3 months.
Small Business Super Clearing House (SBSHC) is free for businesses with fewer than 19 employees or turnover under $10M.`,
}

// ── Helper: generate sequential invoice number ─────────────────────
async function nextInvoiceNumber(userId: string, supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (data?.invoice_number) {
    const match = (data.invoice_number as string).match(/(\d+)$/)
    if (match) return `INV-${String(parseInt(match[1]) + 1).padStart(4, '0')}`
  }
  return 'INV-0001'
}

// ── Helper: generate sequential payslip number ──────────────────────
async function nextPayslipNumber(userId: string, supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('payslips')
    .select('payslip_number')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (data?.payslip_number) {
    const match = (data.payslip_number as string).match(/(\d+)$/)
    if (match) return `PAY-${String(parseInt(match[1]) + 1).padStart(4, '0')}`
  }
  return 'PAY-0001'
}

function fmt(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

// ── Main dispatcher ────────────────────────────────────────────────
export async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient,
): Promise<Record<string, unknown>> {

  try {
    switch (name) {

      // ── create_invoice ──────────────────────────────────────────
      case 'create_invoice': {
        const items = input.items as Array<{ label: string; amount: number }>
        const includeGst = input.include_gst as boolean
        const subtotal = items.reduce((s, i) => s + i.amount, 0)
        const gst = includeGst ? Math.round(subtotal * 0.1 * 100) / 100 : 0
        const total = subtotal + gst

        const today = new Date()
        const dueDate = new Date(today)
        dueDate.setDate(dueDate.getDate() + 14)

        const invoiceNumber = await nextInvoiceNumber(userId, supabase)

        const { data: biz } = await supabase
          .from('business_profiles')
          .select('business_name, abn, email, phone, address')
          .eq('id', userId)
          .single()

        const lineItems = items.map(i => ({
          description: i.label,
          qty: 1,
          unit_price: i.amount,
          total: i.amount,
        }))

        const { data: inv, error } = await supabase.from('invoices').insert({
          user_id:         userId,
          invoice_number:  invoiceNumber,
          status:          'draft',
          client_name:     (input.client_name as string) || '',
          client_email:    (input.client_email as string) || null,
          business_name:   (biz?.business_name as string) || '',
          business_abn:    (biz?.abn as string) || null,
          business_email:  (biz?.email as string) || null,
          line_items:      lineItems,
          has_gst:         includeGst,
          subtotal_ex_gst: subtotal,
          total_gst:       gst,
          total_inc_gst:   total,
          issue_date:      today.toISOString().slice(0, 10),
          due_date:        dueDate.toISOString().slice(0, 10),
          notes:           (input.description as string) || null,
        }).select('id').single()

        if (error) throw new Error(error.message)

        return {
          invoice_id:     inv.id,
          invoice_number: invoiceNumber,
          client_name:    input.client_name,
          client_email:   input.client_email,
          subtotal:       fmt(subtotal),
          gst:            fmt(gst),
          total:          fmt(total),
          due_date:       dueDate.toISOString().slice(0, 10),
          status:         'draft',
          rows: [
            ...items.map(i => [i.label, fmt(i.amount)]),
            includeGst ? ['GST (10%)', fmt(gst)] : null,
            ['Total', fmt(total)],
          ].filter(Boolean),
        }
      }

      // ── send_invoice ────────────────────────────────────────────
      case 'send_invoice': {
        const invoiceId  = input.invoice_id as string
        const clientEmail = input.client_email as string

        const { data: inv, error: fetchErr } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .eq('user_id', userId)
          .single()

        if (fetchErr || !inv) return { error: 'Invoice not found or access denied' }

        const resend = new Resend(process.env.RESEND_API_KEY)
        const lineItemsHtml = (inv.line_items as Array<{ description: string; total: number }>)
          .map(li => `<tr><td style="padding:6px 0;color:#57534E;font-size:13px">${li.description}</td><td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">${fmt(li.total)}</td></tr>`)
          .join('')

        const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F5F0E8;margin:0;padding:40px 0">
<table width="560" align="center" style="background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:#1C1917;padding:28px 36px"><p style="margin:0;color:#fff;font-size:18px;font-weight:700">${inv.business_name as string}</p><p style="margin:6px 0 0;color:#A09590;font-size:13px">Invoice ${inv.invoice_number as string}</p></td></tr>
<tr><td style="padding:36px">
<p style="color:#1C1917;font-size:15px">Hi ${inv.client_name as string},</p>
<p style="color:#57534E;font-size:14px">Please find your invoice details below. Due date: <strong>${inv.due_date as string}</strong></p>
<table width="100%" style="background:#F5F0E8;border-radius:8px;margin:20px 0"><tr><td style="padding:20px 24px">
<table width="100%">${lineItemsHtml}
${inv.has_gst ? `<tr><td style="padding:6px 0;color:#57534E;font-size:13px;border-top:1px solid #E5DDD5">GST (10%)</td><td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600;border-top:1px solid #E5DDD5">${fmt(inv.total_gst as number)}</td></tr>` : ''}
<tr><td style="padding:10px 0 6px;border-top:1px solid #E5DDD5;color:#1C1917;font-size:14px;font-weight:700">Total Due</td><td align="right" style="padding:10px 0 6px;border-top:1px solid #E5DDD5;color:#C84B2F;font-size:18px;font-weight:700">${fmt(inv.total_inc_gst as number)}</td></tr>
</table></td></tr></table>
<p style="color:#A09590;font-size:11px;text-align:center;margin-top:24px">Generated by SAB Account AI · ATO-compliant invoicing</p>
</td></tr></table></body></html>`

        const { error: sendErr } = await resend.emails.send({
          from:    process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
          to:      [clientEmail],
          subject: `Invoice ${inv.invoice_number as string} from ${inv.business_name as string}`,
          html,
        })

        if (sendErr) throw new Error((sendErr as { message?: string }).message ?? 'Email send failed')

        await supabase.from('invoices').update({ status: 'pending' }).eq('id', invoiceId)

        return { ok: true, invoice_number: inv.invoice_number, sent_to: clientEmail, total: fmt(inv.total_inc_gst as number) }
      }

      // ── create_payslip ──────────────────────────────────────────
      case 'create_payslip': {
        const employeeId    = input.employee_id as string
        const grossPay      = input.gross_pay as number
        const periodStart   = input.pay_period_start as string
        const periodEnd     = input.pay_period_end as string

        const { data: emp, error: empErr } = await supabase
          .from('employees')
          .select('*')
          .eq('id', employeeId)
          .eq('user_id', userId)
          .single()

        if (empErr || !emp) return { error: 'Employee not found or access denied' }

        const { data: biz } = await supabase
          .from('business_profiles')
          .select('business_name, abn, super_rate_new')
          .eq('id', userId)
          .single()

        const payCycle = (emp.pay_cycle as string | null) === 'weekly' ? 'weekly'
          : (emp.pay_cycle as string | null) === 'monthly' ? 'monthly'
          : 'fortnightly'

        const annualSalary = (emp.annual_salary as number | null) ?? (grossPay * (payCycle === 'weekly' ? 52 : payCycle === 'fortnightly' ? 26 : 12))
        const residencyStatus = (emp.residency_status as 'citizen_pr' | 'student' | 'temp_work' | 'whm' | 'partner' | 'other_temp') ?? 'citizen_pr'
        const useNewSuperRate = (biz?.super_rate_new as boolean | null) ?? true

        const numbers = calculatePayslip({
          annualSalary,
          salarySacrifice:       0,
          overtimeHours:         0,
          overtimeRate:          0,
          payCycle,
          claimingThreshold:     true,
          hasHELP:               false,
          medicareLevyExemption: false,
          useNewSuperRate,
          residencyStatus,
        })

        const payslipNumber = await nextPayslipNumber(userId, supabase)
        const paymentDate = periodEnd

        const { data: ps, error: psErr } = await supabase.from('payslips').insert({
          user_id:         userId,
          payslip_number:  payslipNumber,
          employee_name:   emp.name as string,
          employment_type: (emp.employment_type as string) || 'casual',
          pay_cycle:       payCycle,
          super_fund_name: (emp.super_fund_name as string | null) ?? null,
          member_number:   (emp.member_number as string | null) ?? null,
          employer_name:   (biz?.business_name as string) || '',
          employer_abn:    (biz?.abn as string | null) ?? null,
          pay_period_start: periodStart,
          pay_period_end:   periodEnd,
          payment_date:     paymentDate,
          gross_pay:        numbers.grossPay,
          salary_sacrifice: numbers.salarySacrifice,
          taxable_gross:    numbers.taxableGross,
          income_tax:       numbers.incomeTax,
          medicare_levy:    numbers.medicareLevy,
          help_repayment:   numbers.helpRepayment,
          net_pay:          numbers.netPay,
          super_sg:         numbers.superSG,
          super_sal_sac:    numbers.superSalSac,
        }).select('id').single()

        if (psErr) throw new Error(psErr.message)

        return {
          payslip_id:      ps.id,
          payslip_number:  payslipNumber,
          employee_name:   emp.name,
          employee_email:  emp.email,
          pay_period:      `${periodStart} to ${periodEnd}`,
          gross_pay:       fmt(numbers.grossPay),
          income_tax:      fmt(numbers.incomeTax),
          medicare_levy:   fmt(numbers.medicareLevy),
          help_repayment:  fmt(numbers.helpRepayment),
          net_pay:         fmt(numbers.netPay),
          super_sg:        fmt(numbers.superSG),
          rows: [
            ['Gross Pay',      fmt(numbers.grossPay)],
            ['Income Tax',     fmt(numbers.incomeTax)],
            ['Medicare Levy',  fmt(numbers.medicareLevy)],
            ...(numbers.helpRepayment > 0 ? [['HELP Repayment', fmt(numbers.helpRepayment)]] : []),
            ['Net Pay',        fmt(numbers.netPay)],
            ['Super (12%)',    fmt(numbers.superSG)],
          ],
        }
      }

      // ── send_payslip ────────────────────────────────────────────
      case 'send_payslip': {
        const payslipId    = input.payslip_id as string
        const employeeEmail = input.employee_email as string

        const { data: ps, error: fetchErr } = await supabase
          .from('payslips')
          .select('*')
          .eq('id', payslipId)
          .eq('user_id', userId)
          .single()

        if (fetchErr || !ps) return { error: 'Payslip not found or access denied' }

        const resend = new Resend(process.env.RESEND_API_KEY)
        const payPeriod = `${ps.pay_period_start as string} to ${ps.pay_period_end as string}`

        const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F5F0E8;margin:0;padding:40px 0">
<table width="560" align="center" style="background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:#1C1917;padding:28px 36px"><p style="margin:0;color:#fff;font-size:18px;font-weight:700">${ps.employer_name as string}</p><p style="margin:6px 0 0;color:#A09590;font-size:13px">Payslip ${ps.payslip_number as string}</p></td></tr>
<tr><td style="padding:36px">
<p style="color:#1C1917;font-size:15px">Hi ${ps.employee_name as string},</p>
<p style="color:#57534E;font-size:14px">Your payslip for <strong>${payPeriod}</strong> is ready.</p>
<table width="100%" style="background:#F5F0E8;border-radius:8px;margin:20px 0"><tr><td style="padding:20px 24px">
<table width="100%">
<tr><td style="padding:6px 0;color:#57534E;font-size:13px">Gross Pay</td><td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">${fmt(ps.gross_pay as number)}</td></tr>
<tr><td style="padding:6px 0;color:#57534E;font-size:13px">Income Tax</td><td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">-${fmt(ps.income_tax as number)}</td></tr>
<tr><td style="padding:6px 0;color:#57534E;font-size:13px">Medicare Levy</td><td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">-${fmt(ps.medicare_levy as number)}</td></tr>
${(ps.help_repayment as number) > 0 ? `<tr><td style="padding:6px 0;color:#57534E;font-size:13px">HELP Repayment</td><td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">-${fmt(ps.help_repayment as number)}</td></tr>` : ''}
<tr><td style="padding:10px 0 6px;border-top:1px solid #E5DDD5;color:#1C1917;font-size:14px;font-weight:700">Net Pay</td><td align="right" style="padding:10px 0 6px;border-top:1px solid #E5DDD5;color:#C84B2F;font-size:18px;font-weight:700">${fmt(ps.net_pay as number)}</td></tr>
<tr><td style="padding:6px 0;color:#57534E;font-size:12px">Super (12%)</td><td align="right" style="padding:6px 0;color:#57534E;font-size:12px">${fmt(ps.super_sg as number)}</td></tr>
</table></td></tr></table>
<p style="color:#A09590;font-size:11px;text-align:center;margin-top:24px">Generated by SAB Account AI · ATO-compliant PAYG withholding</p>
</td></tr></table></body></html>`

        const { error: sendErr } = await resend.emails.send({
          from:    process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
          to:      [employeeEmail],
          subject: `Your payslip ${ps.payslip_number as string} from ${ps.employer_name as string}`,
          html,
        })

        if (sendErr) throw new Error((sendErr as { message?: string }).message ?? 'Email send failed')

        return { ok: true, payslip_number: ps.payslip_number, sent_to: employeeEmail, net_pay: fmt(ps.net_pay as number) }
      }

      // ── get_bas_position ────────────────────────────────────────
      case 'get_bas_position': {
        const fy      = input.financial_year as string
        const quarter = input.quarter as number
        const [startYear] = fy.split('-').map(Number)

        const quarterRanges: Record<number, [string, string]> = {
          1: [`${startYear}-07-01`,   `${startYear}-09-30`],
          2: [`${startYear}-10-01`,   `${startYear}-12-31`],
          3: [`${startYear + 1}-01-01`, `${startYear + 1}-03-31`],
          4: [`${startYear + 1}-04-01`, `${startYear + 1}-06-30`],
        }
        const [from, to] = quarterRanges[quarter]

        const { data: invoices } = await supabase
          .from('invoices')
          .select('total_gst, total_inc_gst')
          .eq('user_id', userId)
          .gte('issue_date', from)
          .lte('issue_date', to)

        const { data: records } = await supabase
          .from('records')
          .select('gst_amount, type')
          .eq('user_id', userId)
          .eq('type', 'expense')
          .gte('date', from)
          .lte('date', to)

        const gstCollected = (invoices ?? []).reduce((s, i) => s + (i.total_gst as number), 0)
        const gstCredits   = (records  ?? []).reduce((s, r) => s + (r.gst_amount as number), 0)
        const netGst       = gstCollected - gstCredits
        const quarterNames = ['', 'Q1 (Jul–Sep)', 'Q2 (Oct–Dec)', 'Q3 (Jan–Mar)', 'Q4 (Apr–Jun)']

        return {
          period:         `${quarterNames[quarter]} ${fy}`,
          gst_collected:  fmt(gstCollected),
          gst_credits:    fmt(gstCredits),
          net_gst:        fmt(Math.abs(netGst)),
          outcome:        netGst > 0 ? `You owe the ATO ${fmt(netGst)}` : netGst < 0 ? `ATO owes you a refund of ${fmt(Math.abs(netGst))}` : 'Net zero — nothing owing',
          invoice_count:  invoices?.length ?? 0,
        }
      }

      // ── get_super_due ───────────────────────────────────────────
      case 'get_super_due': {
        const from = input.pay_period_start as string
        const to   = input.pay_period_end as string

        const { data: payslips } = await supabase
          .from('payslips')
          .select('employee_name, gross_pay, super_sg')
          .eq('user_id', userId)
          .gte('pay_period_start', from)
          .lte('pay_period_end', to)

        const perEmployee: Record<string, { count: number; gross: number; super: number }> = {}
        for (const ps of payslips ?? []) {
          const key = ps.employee_name as string
          if (!perEmployee[key]) perEmployee[key] = { count: 0, gross: 0, super: 0 }
          perEmployee[key].count++
          perEmployee[key].gross  += ps.gross_pay as number
          perEmployee[key].super  += ps.super_sg as number
        }

        const breakdown = Object.entries(perEmployee).map(([name, d]) => ({
          employee: name,
          gross:    fmt(d.gross),
          super_due: fmt(d.super),
          payslips: d.count,
        }))

        const totalSuper = Object.values(perEmployee).reduce((s, d) => s + d.super, 0)

        return {
          period:      `${from} to ${to}`,
          total_super: fmt(totalSuper),
          sg_rate:     '12%',
          breakdown,
          payday_super_note: 'From 1 July 2026, super must be paid on every payday. Ensure your clearing house receives payment by each pay date.',
        }
      }

      // ── get_business_summary ────────────────────────────────────
      case 'get_business_summary': {
        const from = input.date_from as string
        const to   = input.date_to as string

        const [{ data: invoices }, { data: records }] = await Promise.all([
          supabase.from('invoices').select('total_inc_gst, total_gst').eq('user_id', userId).gte('issue_date', from).lte('issue_date', to),
          supabase.from('records').select('amount, gst_amount, type').eq('user_id', userId).gte('date', from).lte('date', to),
        ])

        const totalIncome   = (invoices ?? []).reduce((s, i) => s + (i.total_inc_gst as number), 0)
        const gstCollected  = (invoices ?? []).reduce((s, i) => s + (i.total_gst as number), 0)
        const totalExpenses = (records  ?? []).filter(r => (r.type as string) === 'expense').reduce((s, r) => s + (r.amount as number), 0)
        const gstCredits    = (records  ?? []).filter(r => (r.type as string) === 'expense').reduce((s, r) => s + (r.gst_amount as number), 0)
        const netProfit     = totalIncome - totalExpenses

        return {
          period:        `${from} to ${to}`,
          total_income:   fmt(totalIncome),
          gst_collected:  fmt(gstCollected),
          total_expenses: fmt(totalExpenses),
          gst_credits:    fmt(gstCredits),
          net_profit:     fmt(netProfit),
          invoice_count:  invoices?.length ?? 0,
          profitable:     netProfit >= 0,
        }
      }

      // ── get_ato_rules ───────────────────────────────────────────
      case 'get_ato_rules': {
        const topic = input.topic as string
        const rules = ATO_RULES[topic]
        if (!rules) return { error: `Unknown topic: ${topic}` }
        return { topic, rules }
      }

      // ── send_bas_to_accountant ──────────────────────────────────
      case 'send_bas_to_accountant': {
        const fy             = input.financial_year as string
        const quarter        = input.quarter as number
        const accountantEmail = input.accountant_email as string
        const accountantName  = (input.accountant_name as string) || 'Accountant'
        const [startYear]    = fy.split('-').map(Number)

        const quarterRanges: Record<number, [string, string]> = {
          1: [`${startYear}-07-01`,     `${startYear}-09-30`],
          2: [`${startYear}-10-01`,     `${startYear}-12-31`],
          3: [`${startYear + 1}-01-01`, `${startYear + 1}-03-31`],
          4: [`${startYear + 1}-04-01`, `${startYear + 1}-06-30`],
        }
        const [from, to] = quarterRanges[quarter]
        const quarterNames = ['', 'Q1 (Jul–Sep)', 'Q2 (Oct–Dec)', 'Q3 (Jan–Mar)', 'Q4 (Apr–Jun)']
        const periodLabel = `${quarterNames[quarter]} ${fy}`

        const [{ data: biz }, { data: invoices }, { data: records }] = await Promise.all([
          supabase.from('business_profiles').select('business_name, abn, email').eq('id', userId).single(),
          supabase.from('invoices').select('invoice_number, client_name, total_inc_gst, total_gst, issue_date').eq('user_id', userId).gte('issue_date', from).lte('issue_date', to).order('issue_date', { ascending: false }),
          supabase.from('records').select('amount, gst_amount, type, description, date').eq('user_id', userId).gte('date', from).lte('date', to),
        ])

        const gstCollected  = (invoices ?? []).reduce((s, i) => s + (i.total_gst as number), 0)
        const totalIncome   = (invoices ?? []).reduce((s, i) => s + (i.total_inc_gst as number), 0)
        const expenses      = (records  ?? []).filter(r => (r.type as string) === 'expense')
        const gstCredits    = expenses.reduce((s, r) => s + (r.gst_amount as number), 0)
        const totalExpenses = expenses.reduce((s, r) => s + (r.amount as number), 0)
        const netGst        = gstCollected - gstCredits
        const outcome       = netGst > 0 ? `Net GST payable to ATO: ${fmt(netGst)}` : netGst < 0 ? `GST refund from ATO: ${fmt(Math.abs(netGst))}` : 'Net zero — nothing owing'

        const invoiceRows = (invoices ?? []).map(i =>
          `<tr><td style="padding:5px 0;color:#57534E;font-size:13px">${i.invoice_number as string}</td><td style="padding:5px 0;color:#57534E;font-size:13px">${i.client_name as string}</td><td style="padding:5px 0;color:#57534E;font-size:13px">${i.issue_date as string}</td><td align="right" style="padding:5px 0;color:#1C1917;font-size:13px;font-weight:600">${fmt(i.total_inc_gst as number)}</td><td align="right" style="padding:5px 0;color:#57534E;font-size:12px">${fmt(i.total_gst as number)}</td></tr>`
        ).join('')

        const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F5F0E8;margin:0;padding:40px 0">
<table width="620" align="center" style="background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:#1C1917;padding:28px 36px">
  <p style="margin:0;color:#fff;font-size:18px;font-weight:700">${(biz?.business_name as string) || 'Your Business'}</p>
  <p style="margin:6px 0 0;color:#A09590;font-size:13px">BAS Summary — ${periodLabel}</p>
  ${biz?.abn ? `<p style="margin:4px 0 0;color:#A09590;font-size:12px">ABN: ${biz.abn as string}</p>` : ''}
</td></tr>
<tr><td style="padding:36px">
  <p style="color:#1C1917;font-size:15px">Dear ${accountantName},</p>
  <p style="color:#57534E;font-size:14px">Please find the BAS summary for <strong>${periodLabel}</strong> below.</p>

  <table width="100%" style="background:#F5F0E8;border-radius:8px;margin:20px 0"><tr><td style="padding:20px 24px">
  <table width="100%">
    <tr><td style="padding:6px 0;color:#57534E;font-size:13px">Total Income (inc. GST)</td><td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">${fmt(totalIncome)}</td></tr>
    <tr><td style="padding:6px 0;color:#57534E;font-size:13px">GST Collected (1A)</td><td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">${fmt(gstCollected)}</td></tr>
    <tr><td style="padding:6px 0;color:#57534E;font-size:13px">Total Expenses (inc. GST)</td><td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">${fmt(totalExpenses)}</td></tr>
    <tr><td style="padding:6px 0;color:#57534E;font-size:13px">GST Credits (1B)</td><td align="right" style="padding:6px 0;color:#1C1917;font-size:13px;font-weight:600">${fmt(gstCredits)}</td></tr>
    <tr><td style="padding:10px 0 6px;border-top:1px solid #E5DDD5;color:#1C1917;font-size:14px;font-weight:700">${netGst >= 0 ? 'Net GST Payable' : 'GST Refund Due'}</td><td align="right" style="padding:10px 0 6px;border-top:1px solid #E5DDD5;color:#C84B2F;font-size:18px;font-weight:700">${fmt(Math.abs(netGst))}</td></tr>
    <tr><td colspan="2" style="padding:6px 0;color:#57534E;font-size:12px;font-style:italic">${outcome}</td></tr>
  </table>
  </td></tr></table>

  ${(invoices ?? []).length > 0 ? `
  <p style="color:#1C1917;font-size:14px;font-weight:600;margin-top:24px">Invoices (${(invoices ?? []).length})</p>
  <table width="100%" style="border-collapse:collapse">
    <tr style="border-bottom:1px solid #E5DDD5"><th align="left" style="padding:6px 0;color:#A09590;font-size:11px;font-weight:600">NUMBER</th><th align="left" style="padding:6px 0;color:#A09590;font-size:11px;font-weight:600">CLIENT</th><th align="left" style="padding:6px 0;color:#A09590;font-size:11px;font-weight:600">DATE</th><th align="right" style="padding:6px 0;color:#A09590;font-size:11px;font-weight:600">TOTAL</th><th align="right" style="padding:6px 0;color:#A09590;font-size:11px;font-weight:600">GST</th></tr>
    ${invoiceRows}
  </table>` : ''}

  <p style="color:#A09590;font-size:11px;text-align:center;margin-top:32px">Generated by SAB Account AI · sabaccountai.com</p>
</td></tr></table></body></html>`

        const resend = new Resend(process.env.RESEND_API_KEY)
        const { error: sendErr } = await resend.emails.send({
          from:    process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
          to:      [accountantEmail],
          subject: `BAS Summary ${periodLabel} — ${(biz?.business_name as string) || 'Your Business'}`,
          html,
        })

        if (sendErr) throw new Error((sendErr as { message?: string }).message ?? 'Email send failed')

        return {
          ok:               true,
          period:           periodLabel,
          sent_to:          accountantEmail,
          gst_collected:    fmt(gstCollected),
          gst_credits:      fmt(gstCredits),
          net_gst:          fmt(Math.abs(netGst)),
          outcome,
          invoice_count:    invoices?.length ?? 0,
        }
      }

      // ── default ─────────────────────────────────────────────────
      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'sab_chat', tool: name } })
    return { error: err instanceof Error ? err.message : `Tool ${name} failed` }
  }
}
