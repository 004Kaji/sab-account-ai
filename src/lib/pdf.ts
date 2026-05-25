import { formatCurrency, formatDateAU, formatABN } from '@/lib/utils'
import type { PayslipNumbers } from '@/lib/ato'

function payslipScaleLabel(data: PayslipPDFData): string {
  if (data.residency_status === 'whm') return 'WHM (Schedule 15)'
  const exempt = data.medicare_exempt || (!!data.residency_status && data.residency_status !== 'citizen_pr')
  if (data.claiming_threshold && !exempt)  return 'Scale 2 (threshold)'
  if (!data.claiming_threshold && !exempt) return 'Scale 1 (no threshold)'
  if (data.claiming_threshold && exempt)   return 'Scale 5 (Medicare exempt)'
  return 'Scale 3 (no threshold, exempt)'
}

export interface PayslipPDFData {
  payslip_number: string
  pay_period_start: string
  pay_period_end: string
  payment_date: string
  employer_name: string
  employer_abn: string
  employee_name: string
  employment_type: string
  pay_cycle: string
  pay_basis: 'salary' | 'hourly'
  annual_salary: number
  hourly_rate: number
  ordinary_hours: number
  super_fund_name: string
  member_number: string
  use_new_super_rate: boolean
  claiming_threshold: boolean
  has_help: boolean
  medicare_exempt?: boolean
  residency_status?: string
  ytdIsActual?: boolean
  numbers: PayslipNumbers
}

async function buildPayslipDoc(data: PayslipPDFData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW    = 210
  const margin   = 18
  const cW       = pageW - margin * 2
  const n        = data.numbers
  const isHourly = data.pay_basis === 'hourly'
  const sgRate   = data.use_new_super_rate ? '12%' : '11.5%'

  // Table column right-edges
  const colHours  = margin + 88   // hours (hourly only)
  const colRate   = margin + 113  // rate  (hourly only)
  const colTP     = margin + 138  // THIS PAY
  const colYTD    = pageW - margin // YTD

  let y = margin

  // ── Header: Employee (left) · Employer (right) ──────────────────────
  const colRight = margin + cW * 0.55

  // PAYSLIP badge — top right
  doc.setFillColor(200, 75, 47)
  doc.rect(pageW - margin - 22, y - 6, 22, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255)
  doc.text('PAYSLIP', pageW - margin - 11, y - 0.5, { align: 'center' })

  // Column labels
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 95, 90)
  doc.text('EMPLOYEE', margin, y)
  doc.text('PAID BY', colRight, y)
  y += 5

  // Names
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(28, 25, 23)
  doc.text(data.employee_name || '—', margin, y)
  doc.setFontSize(10)
  doc.text(data.employer_name || 'Your Business', colRight, y)
  y += 5

  // Sub-details
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)
  doc.text(`${data.employment_type} · ${data.pay_cycle}`, margin, y)
  if (data.employer_abn) doc.text(`ABN ${formatABN(data.employer_abn)}`, colRight, y)
  y += 4.5

  // Pay rate hint
  if (isHourly && data.hourly_rate > 0) {
    doc.text(`${formatCurrency(data.hourly_rate)}/hr · ${data.ordinary_hours} hrs/period`, margin, y)
  } else if (!isHourly && data.annual_salary > 0) {
    doc.text(`${formatCurrency(data.annual_salary)}/yr`, margin, y)
  }
  y += 4.5

  if (data.super_fund_name) { doc.text(`Fund: ${data.super_fund_name}`, margin, y); y += 4.5 }
  if (data.member_number)   { doc.text(`Member: ${data.member_number}`, margin, y); y += 4.5 }

  y += 4

  // Separator
  doc.setDrawColor(215, 210, 205)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // ── Summary bar ─────────────────────────────────────────────────────
  const barH = 15
  doc.setFillColor(250, 248, 245)
  doc.setDrawColor(215, 210, 205)
  doc.rect(margin, y, cW, barH, 'FD')

  const labelY = y + 5.5
  const valueY = y + 11

  const summaryItems = [
    { label: 'Pay Period',     value: `${formatDateAU(data.pay_period_start)} – ${formatDateAU(data.pay_period_end)}`, x: margin + 3,        ember: false },
    { label: 'Payment Date',   value: formatDateAU(data.payment_date),                                                  x: margin + cW * 0.36, ember: false },
    { label: 'Total Earnings', value: formatCurrency(n.grossPay),                                                       x: margin + cW * 0.60, ember: false },
    { label: 'Net Pay',        value: formatCurrency(n.netPay),                                                          x: margin + cW * 0.79, ember: true  },
  ]
  summaryItems.forEach(({ label, value, x, ember }) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(120, 115, 110)
    doc.text(label, x, labelY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(ember ? 10 : 8.5)
    doc.setTextColor(ember ? 200 : 28, ember ? 75 : 25, ember ? 47 : 23)
    doc.text(value, x, valueY)
  })
  y += barH + 7

  // ── Column headers ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 95, 90)
  if (isHourly) {
    doc.text('HOURS', colHours, y, { align: 'right' })
    doc.text('RATE',  colRate,  y, { align: 'right' })
  }
  doc.text('THIS PAY', colTP,  y, { align: 'right' })
  doc.text('YTD',      colYTD, y, { align: 'right' })
  y += 2.5
  doc.setDrawColor(200, 195, 190)
  doc.line(margin, y, pageW - margin, y)
  y += 5.5

  // ── Section helpers ──────────────────────────────────────────────────
  function sectionLabel(title: string) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(28, 25, 23)
    doc.text(title, margin, y)
    y += 5.5
  }

  function lineItem(desc: string, thisPay: string, ytd?: string, hours?: string, rate?: string) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(60, 55, 50)
    doc.text(desc, margin + 2, y)
    if (hours) { doc.setTextColor(80, 75, 70); doc.text(hours, colHours, y, { align: 'right' }) }
    if (rate)  { doc.setTextColor(80, 75, 70); doc.text(rate,  colRate,  y, { align: 'right' }) }
    doc.setTextColor(28, 25, 23)
    doc.text(thisPay, colTP, y, { align: 'right' })
    if (ytd) doc.text(ytd, colYTD, y, { align: 'right' })
    y += 5.5
  }

  function sectionTotal(thisPay: string, ytd: string) {
    doc.setDrawColor(210, 205, 200)
    doc.line(margin, y - 1, pageW - margin, y - 1)
    y += 2.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(80, 75, 70)
    doc.text('TOTAL', colTP - 22, y)
    doc.setTextColor(28, 25, 23)
    doc.text(thisPay, colTP, y, { align: 'right' })
    doc.text(ytd,     colYTD, y, { align: 'right' })
    y += 8
  }

  // ── SALARY & WAGES ───────────────────────────────────────────────────
  sectionLabel('SALARY & WAGES')
  if (isHourly) {
    lineItem(
      'Ordinary Hours',
      formatCurrency(n.ordinaryEarnings),
      undefined,
      data.ordinary_hours.toFixed(4),
      formatCurrency(data.hourly_rate),
    )
  } else {
    lineItem('Ordinary Earnings', formatCurrency(n.ordinaryEarnings))
  }
  if (n.overtimePay > 0)    lineItem('Overtime Pay', formatCurrency(n.overtimePay))
  if (n.salarySacrifice > 0) lineItem('Less: Pre-Tax Salary Sacrifice', `(${formatCurrency(n.salarySacrifice)})`)
  sectionTotal(formatCurrency(n.grossPay), formatCurrency(n.ytdGross))

  // ── TAX ──────────────────────────────────────────────────────────────
  sectionLabel('TAX')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(130, 125, 120)
  doc.text(`Tax Scale: ${payslipScaleLabel(data)}${data.has_help ? ' + HELP' : ''}`, margin + 2, y)
  y += 4.5
  if (n.totalDeductions === 0) {
    lineItem('PAYG Withholding', '$0.00', '$0.00')
  } else {
    if (n.incomeTax > 0)     lineItem('PAYG Income Tax',      formatCurrency(n.incomeTax))
    if (n.medicareLevy > 0)  lineItem('Medicare Levy (2%)',   formatCurrency(n.medicareLevy))
    if (n.helpRepayment > 0) lineItem('HELP / HECS Repayment', formatCurrency(n.helpRepayment))
  }
  sectionTotal(formatCurrency(n.totalDeductions), formatCurrency(n.ytdTax))

  // ── SUPERANNUATION ───────────────────────────────────────────────────
  sectionLabel('SUPERANNUATION')
  const sgFundLine = data.super_fund_name
    ? `SGC ${sgRate} — ${data.super_fund_name}`
    : `Employer SGC (${sgRate})`
  lineItem(sgFundLine, formatCurrency(n.superSG))
  if (n.superSalSac > 0) lineItem('Salary Sacrifice Super', formatCurrency(n.superSalSac))
  sectionTotal(formatCurrency(n.totalSuper), formatCurrency(n.ytdSuper))

  // ── Notices ──────────────────────────────────────────────────────────
  // MES note only for non-WHM Medicare-exempt employees (WHMs are exempt by visa, not MES)
  if (data.medicare_exempt && data.residency_status !== 'whm') {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(22, 101, 52)
    doc.text('Medicare levy exempt — MES held for this period', margin, y)
    y += 5
  }
  if (data.annual_salary > 93000 && !data.medicare_exempt) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(146, 64, 14)
    doc.text('Note: Medicare Levy Surcharge (1%–1.5%) may apply at tax time if no private hospital cover held.', margin, y)
    y += 5
  }

  // ── Footer ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 155, 150)
  doc.text('Generated by SAB Account AI', pageW / 2, 289, { align: 'center' })

  return doc
}

export async function downloadPayslipPDF(data: PayslipPDFData) {
  const doc = await buildPayslipDoc(data)
  doc.save(`${data.payslip_number}.pdf`)
}

/** Returns the payslip PDF as a pure base64 string (no data-URI prefix). */
export async function getPayslipPDFBase64(data: PayslipPDFData): Promise<string> {
  const doc = await buildPayslipDoc(data)
  const dataUri = doc.output('datauristring') as string
  return dataUri.split(',')[1]
}

export interface InvoicePDFData {
  invoice_number: string
  issue_date: string
  due_date: string
  payment_terms: string
  business_name: string
  business_abn: string
  business_email: string
  business_phone: string
  business_address: string
  client_name: string
  client_business_name?: string
  client_abn: string
  client_email: string
  client_address: string
  line_items: Array<{ description: string; qty: number; unit_price: number; amount: number; has_gst: boolean }>
  subtotal_ex_gst: number
  total_gst: number
  total_inc_gst: number
  bank_name: string
  account_name: string
  bsb: string
  account_number: string
  notes: string
  payment_link?: string
}

async function buildInvoiceDoc(data: InvoicePDFData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW  = 210
  const margin = 18
  const cW     = pageW - margin * 2

  let y = margin

  // ── Header: Business name (left) + TAX INVOICE large (right) ────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(28, 25, 23)
  doc.text(data.business_name || 'Your Business', margin, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(200, 75, 47)
  doc.text('TAX INVOICE', pageW - margin, y, { align: 'right' })

  y += 6

  // Business contact details (left)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)
  if (data.business_abn)     { doc.text(`ABN ${formatABN(data.business_abn)}`, margin, y); y += 4.5 }
  if (data.business_email)   { doc.text(data.business_email, margin, y); y += 4.5 }
  if (data.business_phone)   { doc.text(data.business_phone, margin, y); y += 4.5 }
  if (data.business_address) { doc.text(data.business_address, margin, y); y += 4.5 }

  // Invoice meta (right, aligned under heading)
  const invMetaX   = margin + cW * 0.55
  const invMetaTop = margin + 9
  const invRows: [string, string][] = [
    ['Invoice No:',   data.invoice_number],
    ['Due Date:',     formatDateAU(data.due_date)],
    ['Invoice Date:', formatDateAU(data.issue_date)],
    ['Terms:',        data.payment_terms],
  ]
  let metaY = invMetaTop
  invRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 95, 90)
    doc.text(label, invMetaX, metaY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(28, 25, 23)
    doc.text(val, pageW - margin, metaY, { align: 'right' })
    metaY += 5
  })

  y = Math.max(y, metaY) + 5

  // Separator
  doc.setDrawColor(28, 25, 23)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageW - margin, y)
  doc.setLineWidth(0.2)
  y += 7

  // ── Invoice To (left) + Payment Method (right) ───────────────────────
  const colRight = margin + cW * 0.55

  // Labels
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(28, 25, 23)
  doc.text('INVOICE TO', margin, y)
  doc.text('PAYMENT METHOD', colRight, y)
  y += 5

  // Client name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 25, 23)
  doc.text(data.client_name || '—', margin, y)
  y += 5

  // Left: client details / Right: payment method (parallel columns)
  const clientLines: string[] = []
  if (data.client_business_name) clientLines.push(data.client_business_name)
  if (data.client_abn)           clientLines.push(`ABN: ${data.client_abn}`)
  if (data.client_email)         clientLines.push(data.client_email)
  if (data.client_address)       clientLines.push(data.client_address)

  const payMethodRows: [string, string][] = []
  if (data.account_name)   payMethodRows.push(['Account Name:', data.account_name])
  if (data.bsb)            payMethodRows.push(['BSB:',          data.bsb])
  if (data.account_number) payMethodRows.push(['Account No:',   data.account_number])
  if (data.bank_name)      payMethodRows.push(['Bank:',         data.bank_name])

  const sectionStartY = y
  let leftY  = sectionStartY
  let rightY = sectionStartY

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  clientLines.forEach(l => {
    doc.setTextColor(100, 95, 90)
    doc.text(l, margin, leftY)
    leftY += 4.5
  })
  payMethodRows.forEach(([label, val]) => {
    doc.setTextColor(100, 95, 90)
    doc.text(label, colRight, rightY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(28, 25, 23)
    doc.text(val, pageW - margin, rightY, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    rightY += 4.5
  })

  y = Math.max(leftY, rightY) + 7

  // Separator
  doc.setDrawColor(200, 195, 190)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  // ── Line items table ─────────────────────────────────────────────────
  const cx = {
    desc:   margin + 3,
    qty:    margin + cW * 0.52,
    price:  margin + cW * 0.64,
    gst:    margin + cW * 0.79,
    amount: margin + cW - 1,
  }

  // Ember header
  doc.setFillColor(200, 75, 47)
  doc.rect(margin, y, cW, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('DESCRIPTION', cx.desc,   y + 5)
  doc.text('QTY',         cx.qty,    y + 5)
  doc.text('UNIT PRICE',  cx.price,  y + 5)
  doc.text('GST',         cx.gst,    y + 5)
  doc.text('SUBTOTAL',    cx.amount, y + 5, { align: 'right' })
  y += 10

  data.line_items.forEach((item, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(247, 245, 242)
      doc.rect(margin, y - 1, cW, 8.5, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(28, 25, 23)
    const desc = doc.splitTextToSize(item.description, cW * 0.50)[0]
    doc.text(desc,                            cx.desc,   y + 4.5)
    doc.text(String(item.qty),               cx.qty,    y + 4.5)
    doc.text(formatCurrency(item.unit_price), cx.price,  y + 4.5)
    doc.text(item.has_gst ? 'Yes' : 'No',   cx.gst,    y + 4.5)
    doc.text(formatCurrency(item.amount),    cx.amount, y + 4.5, { align: 'right' })
    y += 8.5
  })

  y += 3
  doc.setDrawColor(200, 195, 190)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // ── Totals (right-aligned) ────────────────────────────────────────────
  const tx = margin + cW * 0.58

  ;[
    ['Sub-total:', formatCurrency(data.subtotal_ex_gst)],
    ['Tax (10%):', formatCurrency(data.total_gst)],
  ].forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 95, 90)
    doc.text(label, tx, y)
    doc.setTextColor(28, 25, 23)
    doc.text(val, pageW - margin, y, { align: 'right' })
    y += 5.5
  })

  y += 1
  // Ember total box
  doc.setFillColor(200, 75, 47)
  doc.rect(tx - 2, y, pageW - margin - tx + 2, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('Total:', tx, y + 6.5)
  doc.text(formatCurrency(data.total_inc_gst), pageW - margin - 2, y + 6.5, { align: 'right' })
  y += 16

  // ── Footer ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 155, 150)
  doc.text('Generated by SAB Account AI', pageW / 2, 289, { align: 'center' })

  return doc
}

export async function downloadInvoicePDF(data: InvoicePDFData) {
  const doc = await buildInvoiceDoc(data)
  doc.save(`${data.invoice_number}.pdf`)
}

/** Returns the invoice PDF as a pure base64 string (no data-URI prefix). */
export async function getInvoicePDFBase64(data: InvoicePDFData): Promise<string> {
  const doc = await buildInvoiceDoc(data)
  const dataUri = doc.output('datauristring') as string
  return dataUri.split(',')[1]
}

// ── ABN Remittance Statement ───────────────────────────────────────────
export interface ABNRemittancePDFData {
  business_name: string
  business_abn: string
  business_email: string
  business_address: string
  contractor_name: string
  contractor_abn: string
  contractor_address: string
  work_description: string
  payment_date: string
  invoice_reference: string
  gross_amount: number
  includes_gst: boolean
  gst_amount: number
  is_super_applicable: boolean
  super_amount: number
}

export async function getABNRemittancePDFBase64(data: ABNRemittancePDFData): Promise<string> {
  const doc = await buildABNRemittanceDoc(data)
  const dataUri = doc.output('datauristring') as string
  return dataUri.split(',')[1]
}

async function buildABNRemittanceDoc(data: ABNRemittancePDFData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210, margin = 18, cW = pageW - margin * 2
  let y = margin

  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(28, 25, 23)
  doc.text(data.business_name || 'Your Business', margin, y)
  doc.setFillColor(28, 25, 23)
  doc.rect(pageW - margin - 58, y - 7, 58, 9, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255)
  doc.text('REMITTANCE STATEMENT', pageW - margin - 29, y - 1.5, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 95, 90)
  if (data.business_abn)     { doc.text(`ABN: ${data.business_abn}`, margin, y); y += 4.5 }
  if (data.business_email)   { doc.text(data.business_email, margin, y); y += 4.5 }
  if (data.business_address) { doc.text(data.business_address, margin, y); y += 4.5 }
  y += 2
  doc.setDrawColor(215, 210, 205); doc.line(margin, y, pageW - margin, y); y += 7
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(100, 95, 90)
  doc.text('CONTRACTOR', margin, y); y += 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(28, 25, 23)
  doc.text(data.contractor_name || '—', margin, y); y += 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 95, 90)
  if (data.contractor_abn)     { doc.text(`ABN: ${data.contractor_abn}`, margin, y); y += 4.5 }
  if (data.contractor_address) { doc.text(data.contractor_address, margin, y); y += 4.5 }
  y += 4
  doc.setFillColor(245, 240, 232); doc.rect(margin, y, cW, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 95, 90)
  doc.text('WORK DETAILS', margin + 2, y + 4.5); y += 9
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(28, 25, 23)
  const descLines = doc.splitTextToSize(data.work_description || '—', cW)
  doc.text(descLines, margin, y); y += descLines.length * 5.5
  doc.setFontSize(8.5); doc.setTextColor(100, 95, 90)
  if (data.invoice_reference) { doc.text(`Reference: ${data.invoice_reference}`, margin, y); y += 4.5 }
  doc.text(`Payment Date: ${formatDateAU(data.payment_date)}`, margin, y); y += 8

  function pdfRow(label: string, value: string, bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(9)
    doc.setTextColor(bold ? 28 : 80, bold ? 25 : 75, bold ? 23 : 70)
    doc.text(label, margin + 2, y); doc.setTextColor(28, 25, 23)
    doc.text(value, pageW - margin, y, { align: 'right' }); y += 5.5
  }

  const grossEx = data.includes_gst
    ? Math.round((data.gross_amount - data.gst_amount) * 100) / 100 : data.gross_amount
  if (data.includes_gst) { pdfRow('Amount (ex GST)', formatCurrency(grossEx)); pdfRow('GST (10%)', formatCurrency(data.gst_amount)) }
  if (data.is_super_applicable) { pdfRow('Super SG (12%)', formatCurrency(data.super_amount)) }

  y += 2; doc.setDrawColor(215, 210, 205); doc.line(margin, y, pageW - margin, y); y += 4
  doc.setFillColor(28, 25, 23); doc.rect(margin, y, cW, 10, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255)
  doc.text('TOTAL PAYMENT', margin + 4, y + 6.5)
  doc.text(formatCurrency(data.gross_amount), pageW - margin - 4, y + 6.5, { align: 'right' }); y += 15
  if (data.is_super_applicable) {
    doc.setFillColor(255, 251, 235); doc.rect(margin, y, cW, 10, 'F')
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(146, 64, 14)
    doc.text(`Note: ${formatCurrency(data.super_amount)} super SG payable to contractor's nominated super fund (separate to above payment).`, margin + 3, y + 6)
    y += 13
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(160, 155, 150)
  doc.text('Generated by SAB Account AI · ABN Contractor Payment', pageW / 2, 289, { align: 'center' })
  return doc
}

export async function downloadABNRemittancePDF(data: ABNRemittancePDFData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 18
  const cW = pageW - margin * 2

  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(28, 25, 23)
  doc.text(data.business_name || 'Your Business', margin, y)

  doc.setFillColor(28, 25, 23)
  doc.rect(pageW - margin - 58, y - 7, 58, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('REMITTANCE STATEMENT', pageW - margin - 29, y - 1.5, { align: 'center' })

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)
  if (data.business_abn)     { doc.text(`ABN: ${data.business_abn}`, margin, y); y += 4.5 }
  if (data.business_email)   { doc.text(data.business_email, margin, y); y += 4.5 }
  if (data.business_address) { doc.text(data.business_address, margin, y); y += 4.5 }
  y += 2

  doc.setDrawColor(215, 210, 205)
  doc.line(margin, y, pageW - margin, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 95, 90)
  doc.text('CONTRACTOR', margin, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 25, 23)
  doc.text(data.contractor_name || '—', margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)
  if (data.contractor_abn)     { doc.text(`ABN: ${data.contractor_abn}`, margin, y); y += 4.5 }
  if (data.contractor_address) { doc.text(data.contractor_address, margin, y); y += 4.5 }
  y += 4

  doc.setFillColor(245, 240, 232)
  doc.rect(margin, y, cW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 95, 90)
  doc.text('WORK DETAILS', margin + 2, y + 4.5)
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(28, 25, 23)
  const descLines = doc.splitTextToSize(data.work_description || '—', cW)
  doc.text(descLines, margin, y)
  y += descLines.length * 5.5

  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)
  if (data.invoice_reference) { doc.text(`Reference: ${data.invoice_reference}`, margin, y); y += 4.5 }
  doc.text(`Payment Date: ${formatDateAU(data.payment_date)}`, margin, y)
  y += 8

  function pdfRow(label: string, value: string, bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(9)
    doc.setTextColor(bold ? 28 : 80, bold ? 25 : 75, bold ? 23 : 70)
    doc.text(label, margin + 2, y)
    doc.setTextColor(28, 25, 23)
    doc.text(value, pageW - margin, y, { align: 'right' })
    y += 5.5
  }

  const grossEx = data.includes_gst
    ? Math.round((data.gross_amount - data.gst_amount) * 100) / 100
    : data.gross_amount

  if (data.includes_gst) {
    pdfRow('Amount (ex GST)', formatCurrency(grossEx))
    pdfRow('GST (10%)', formatCurrency(data.gst_amount))
  }
  if (data.is_super_applicable) {
    pdfRow('Super SG (12%)', formatCurrency(data.super_amount))
  }

  y += 2
  doc.setDrawColor(215, 210, 205)
  doc.line(margin, y, pageW - margin, y)
  y += 4

  doc.setFillColor(28, 25, 23)
  doc.rect(margin, y, cW, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL PAYMENT', margin + 4, y + 6.5)
  doc.text(formatCurrency(data.gross_amount), pageW - margin - 4, y + 6.5, { align: 'right' })
  y += 15

  if (data.is_super_applicable) {
    doc.setFillColor(255, 251, 235)
    doc.rect(margin, y, cW, 10, 'F')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(146, 64, 14)
    doc.text(`Note: ${formatCurrency(data.super_amount)} super SG payable to contractor's nominated super fund (separate to the above payment).`, margin + 3, y + 6)
    y += 13
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 155, 150)
  doc.text('Generated by SAB Account AI · ABN Contractor Payment', pageW / 2, 289, { align: 'center' })

  const dateStr = data.payment_date.replace(/-/g, '')
  doc.save(`RS-${dateStr}-${data.contractor_name.replace(/\s+/g, '-')}.pdf`)
}

// ── No-ABN Withholding Statement ──────────────────────────────────────
export interface NoABNWithholdingPDFData {
  business_name: string
  business_abn: string
  business_email: string
  worker_name: string
  worker_address: string
  work_description: string
  payment_date: string
  gross_amount: number
  withholding_amount: number
  net_payable: number
}

export async function getNoABNWithholdingPDFBase64(data: NoABNWithholdingPDFData): Promise<string> {
  const doc = await buildNoABNWithholdingDoc(data)
  const dataUri = doc.output('datauristring') as string
  return dataUri.split(',')[1]
}

async function buildNoABNWithholdingDoc(data: NoABNWithholdingPDFData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210, margin = 18, cW = pageW - margin * 2
  let y = margin

  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(28, 25, 23)
  doc.text(data.business_name || 'Your Business', margin, y)
  doc.setFillColor(200, 75, 47); doc.rect(pageW - margin - 62, y - 7, 62, 9, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255)
  doc.text('WITHHOLDING STATEMENT', pageW - margin - 31, y - 1.5, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 95, 90)
  if (data.business_abn)   { doc.text(`ABN: ${data.business_abn}`, margin, y); y += 4.5 }
  if (data.business_email) { doc.text(data.business_email, margin, y); y += 4.5 }
  y += 2
  doc.setDrawColor(215, 210, 205); doc.line(margin, y, pageW - margin, y); y += 7
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(100, 95, 90)
  doc.text('PAYEE (NO ABN QUOTED)', margin, y); y += 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(28, 25, 23)
  doc.text(data.worker_name || '—', margin, y); y += 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 95, 90)
  if (data.worker_address) { doc.text(data.worker_address, margin, y); y += 4.5 }
  y += 4
  doc.setFillColor(245, 240, 232); doc.rect(margin, y, cW, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 95, 90)
  doc.text('SERVICES', margin + 2, y + 4.5); y += 9
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(28, 25, 23)
  const descLines = doc.splitTextToSize(data.work_description || '—', cW)
  doc.text(descLines, margin, y); y += descLines.length * 5.5
  doc.setFontSize(8.5); doc.setTextColor(100, 95, 90)
  doc.text(`Payment Date: ${formatDateAU(data.payment_date)}`, margin, y); y += 8

  function pdfRow(label: string, value: string, bold = false, color?: [number, number, number]) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(9)
    const c = color ?? (bold ? [28, 25, 23] : [80, 75, 70])
    doc.setTextColor(c[0], c[1], c[2]); doc.text(label, margin + 2, y)
    doc.setTextColor(28, 25, 23); doc.text(value, pageW - margin, y, { align: 'right' }); y += 5.5
  }

  pdfRow('Gross Payment', formatCurrency(data.gross_amount))
  if (data.withholding_amount > 0) {
    pdfRow('W4 Withholding (47%)', `(${formatCurrency(data.withholding_amount)})`, false, [200, 75, 47])
  } else {
    pdfRow('W4 Withholding', 'Nil (exception applies)', false, [100, 95, 90])
  }
  y += 2; doc.setDrawColor(215, 210, 205); doc.line(margin, y, pageW - margin, y); y += 4
  doc.setFillColor(200, 75, 47); doc.rect(margin, y, cW, 10, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255)
  doc.text('NET PAYABLE TO WORKER', margin + 4, y + 6.5)
  doc.text(formatCurrency(data.net_payable), pageW - margin - 4, y + 6.5, { align: 'right' }); y += 15
  if (data.withholding_amount > 0) {
    doc.setFillColor(255, 240, 240); doc.rect(margin, y, cW, 14, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(200, 75, 47)
    doc.text('ATO Obligation', margin + 3, y + 5)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 40, 30)
    doc.text(`Withhold ${formatCurrency(data.withholding_amount)} and remit to ATO. Report in W4 on your quarterly BAS.`, margin + 3, y + 10)
    doc.text('Provide a copy of this statement to the payee for their tax records.', margin + 3, y + 14.5)
    y += 18
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(160, 155, 150)
  doc.text('Generated by SAB Account AI · ATO No-ABN Withholding (PAYG W4)', pageW / 2, 289, { align: 'center' })
  return doc
}

export async function downloadNoABNWithholdingPDF(data: NoABNWithholdingPDFData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 18
  const cW = pageW - margin * 2

  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(28, 25, 23)
  doc.text(data.business_name || 'Your Business', margin, y)

  doc.setFillColor(200, 75, 47)
  doc.rect(pageW - margin - 62, y - 7, 62, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('WITHHOLDING STATEMENT', pageW - margin - 31, y - 1.5, { align: 'center' })

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)
  if (data.business_abn)   { doc.text(`ABN: ${data.business_abn}`, margin, y); y += 4.5 }
  if (data.business_email) { doc.text(data.business_email, margin, y); y += 4.5 }
  y += 2

  doc.setDrawColor(215, 210, 205)
  doc.line(margin, y, pageW - margin, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 95, 90)
  doc.text('PAYEE (NO ABN QUOTED)', margin, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 25, 23)
  doc.text(data.worker_name || '—', margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)
  if (data.worker_address) { doc.text(data.worker_address, margin, y); y += 4.5 }
  y += 4

  doc.setFillColor(245, 240, 232)
  doc.rect(margin, y, cW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 95, 90)
  doc.text('SERVICES', margin + 2, y + 4.5)
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(28, 25, 23)
  const descLines = doc.splitTextToSize(data.work_description || '—', cW)
  doc.text(descLines, margin, y)
  y += descLines.length * 5.5

  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)
  doc.text(`Payment Date: ${formatDateAU(data.payment_date)}`, margin, y)
  y += 8

  function pdfRow(label: string, value: string, bold = false, color?: [number, number, number]) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(9)
    const c = color ?? (bold ? [28, 25, 23] : [80, 75, 70])
    doc.setTextColor(c[0], c[1], c[2])
    doc.text(label, margin + 2, y)
    doc.setTextColor(28, 25, 23)
    doc.text(value, pageW - margin, y, { align: 'right' })
    y += 5.5
  }

  pdfRow('Gross Payment', formatCurrency(data.gross_amount))
  if (data.withholding_amount > 0) {
    pdfRow('W4 Withholding (47%)', `(${formatCurrency(data.withholding_amount)})`, false, [200, 75, 47])
  } else {
    pdfRow('W4 Withholding', 'Nil (exception applies)', false, [100, 95, 90])
  }

  y += 2
  doc.setDrawColor(215, 210, 205)
  doc.line(margin, y, pageW - margin, y)
  y += 4

  doc.setFillColor(200, 75, 47)
  doc.rect(margin, y, cW, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('NET PAYABLE TO WORKER', margin + 4, y + 6.5)
  doc.text(formatCurrency(data.net_payable), pageW - margin - 4, y + 6.5, { align: 'right' })
  y += 15

  if (data.withholding_amount > 0) {
    doc.setFillColor(255, 240, 240)
    doc.rect(margin, y, cW, 14, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(200, 75, 47)
    doc.text('ATO Obligation', margin + 3, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(80, 40, 30)
    doc.text(`Withhold ${formatCurrency(data.withholding_amount)} and remit to ATO. Report in W4 on your quarterly BAS.`, margin + 3, y + 10)
    doc.text('Provide a copy of this statement to the payee for their tax records.', margin + 3, y + 14.5)
    y += 18
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 155, 150)
  doc.text('Generated by SAB Account AI · ATO No-ABN Withholding (PAYG W4)', pageW / 2, 289, { align: 'center' })

  const dateStr = data.payment_date.replace(/-/g, '')
  doc.save(`W4-${dateStr}-${data.worker_name.replace(/\s+/g, '-')}.pdf`)
}
