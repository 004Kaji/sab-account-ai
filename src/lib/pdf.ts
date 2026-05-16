import { formatCurrency, formatDateAU } from '@/lib/utils'
import type { PayslipNumbers } from '@/lib/ato'

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

  const pageW  = 210
  const margin = 18
  const cW     = pageW - margin * 2
  const col2   = margin + cW * 0.58

  let y = margin

  // ── Header ─────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(28, 25, 23)
  doc.text(data.employer_name || 'Your Business', margin, y)

  doc.setFillColor(28, 25, 23)
  doc.rect(pageW - margin - 28, y - 7, 28, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('PAYSLIP', pageW - margin - 14, y - 1.5, { align: 'center' })

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)
  if (data.employer_abn) { doc.text(`ABN: ${data.employer_abn}`, margin, y); y += 4.5 }
  y += 2

  doc.setDrawColor(215, 210, 205)
  doc.line(margin, y, pageW - margin, y)
  y += 7

  // ── Employee + Pay Period columns ───────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 95, 90)
  doc.text('EMPLOYEE', margin, y)
  doc.text('PAY PERIOD', col2, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 25, 23)
  doc.text(data.employee_name || '—', margin, y)
  doc.text(data.payslip_number, col2, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)

  const payRateLine = data.pay_basis === 'hourly'
    ? `${formatCurrency(data.hourly_rate)}/hr · ${data.ordinary_hours} hrs/period`
    : `${formatCurrency(data.annual_salary)}/yr`
  const empLines: string[] = [
    `${data.employment_type} · ${data.pay_cycle}`,
    payRateLine,
    ...(data.super_fund_name ? [`Super Fund: ${data.super_fund_name}`] : []),
    ...(data.member_number   ? [`Member No: ${data.member_number}`]    : []),
  ]
  const taxScaleLabel = data.residency_status === 'whm'
    ? 'Scale 15 — Working Holiday Maker'
    : data.claiming_threshold
      ? `Scale 1${data.medicare_exempt ? ' — Medicare exempt' : ''}`
      : 'Scale 2'
  const periodLines: [string, string][] = [
    ['Period',   `${formatDateAU(data.pay_period_start)} – ${formatDateAU(data.pay_period_end)}`],
    ['Payment',  formatDateAU(data.payment_date)],
    ['Tax Scale', taxScaleLabel],
  ]

  const startY = y
  empLines.forEach(l => { doc.text(l, margin, y); y += 4.5 })
  let ry = startY
  periodLines.forEach(([label, val]) => {
    doc.text(label, col2, ry)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(28, 25, 23)
    doc.text(val, col2 + 22, ry)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 95, 90)
    ry += 4.5
  })

  y = Math.max(y, ry) + 6

  // ── Helper: section header ──────────────────────────────────────────
  function sectionHeader(title: string) {
    doc.setFillColor(245, 240, 232)
    doc.rect(margin, y, cW, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 95, 90)
    doc.text(title, margin + 2, y + 4.5)
    y += 9
  }

  // Helper: row
  function row(label: string, value: string, bold = false, indent = 0) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(9)
    doc.setTextColor(bold ? 28 : 60, bold ? 25 : 55, bold ? 23 : 50)
    doc.text(label, margin + 2 + indent, y)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(28, 25, 23)
    doc.text(value, pageW - margin, y, { align: 'right' })
    y += 5.5
  }

  function divider() {
    doc.setDrawColor(215, 210, 205)
    doc.line(margin, y, pageW - margin, y)
    y += 4
  }

  const n = data.numbers

  // ── EARNINGS ────────────────────────────────────────────────────────
  sectionHeader('EARNINGS')
  row(`Ordinary Earnings (${data.pay_cycle})`, formatCurrency(n.ordinaryEarnings))
  if (n.overtimePay > 0) row('Overtime Pay', formatCurrency(n.overtimePay))
  divider()
  row('Gross Pay', formatCurrency(n.grossPay), true)
  if (n.salarySacrifice > 0) row('Pre-Tax Salary Sacrifice to Super', `(${formatCurrency(n.salarySacrifice)})`)
  divider()
  row('Taxable Gross', formatCurrency(n.taxableGross), true)
  y += 3

  // ── DEDUCTIONS ──────────────────────────────────────────────────────
  sectionHeader('DEDUCTIONS (PAYG WITHHOLDING)')
  row('Income Tax', `(${formatCurrency(n.incomeTax)})`)
  if (n.medicareLevy > 0) row('Medicare Levy (2%)', `(${formatCurrency(n.medicareLevy)})`)
  if (n.helpRepayment > 0) row('HELP / HECS Repayment', `(${formatCurrency(n.helpRepayment)})`)
  divider()
  row('Total Deductions', `(${formatCurrency(n.totalDeductions)})`, true)
  y += 4

  // ── NET PAY box ─────────────────────────────────────────────────────
  doc.setFillColor(200, 75, 47)
  doc.rect(margin, y, cW, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('NET PAY', margin + 4, y + 7.5)
  doc.text(formatCurrency(n.netPay), pageW - margin - 4, y + 7.5, { align: 'right' })
  y += 17

  // ── SUPERANNUATION ──────────────────────────────────────────────────
  sectionHeader(`SUPERANNUATION (${data.use_new_super_rate ? '12%' : '11.5%'} SG RATE)`)
  row('Employer SG Contribution', formatCurrency(n.superSG))
  if (n.superSalSac > 0) row('Salary Sacrifice Super', formatCurrency(n.superSalSac))
  divider()
  row('Total Super This Period', formatCurrency(n.totalSuper), true)
  y += 3

  // ── YEAR TO DATE ────────────────────────────────────────────────────
  sectionHeader(data.ytdIsActual ? 'YEAR TO DATE' : 'YEAR TO DATE (ESTIMATED – ANNUALISED)')
  row('Gross Earnings YTD', formatCurrency(n.ytdGross))
  row('Tax Withheld YTD',   formatCurrency(n.ytdTax))
  row('Super YTD',          formatCurrency(n.ytdSuper))

  // ── Medicare exempt note ────────────────────────────────────────────
  if (data.medicare_exempt) {
    y += 4
    doc.setFillColor(240, 253, 244)
    doc.rect(margin, y, cW, 8, 'F')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(22, 101, 52)
    doc.text('Medicare levy exempt — MES held for this period', margin + 3, y + 5)
    y += 10
  }

  // ── Footer ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 155, 150)
  doc.text('Generated by SAB Account AI · ATO-compliant PAYG withholding', pageW / 2, 289, { align: 'center' })

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
}

async function buildInvoiceDoc(data: InvoicePDFData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW  = 210
  const margin = 18
  const cW     = pageW - margin * 2

  let y = margin

  // ── Header: business name + TAX INVOICE badge ─────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(28, 25, 23)
  doc.text(data.business_name || 'Your Business', margin, y)

  // Ember badge
  doc.setFillColor(200, 75, 47)
  doc.rect(pageW - margin - 40, y - 7, 40, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('TAX INVOICE', pageW - margin - 20, y - 1.5, { align: 'center' })

  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)
  const bizLines: string[] = []
  if (data.business_abn)     bizLines.push(`ABN: ${data.business_abn}`)
  if (data.business_email)   bizLines.push(data.business_email)
  if (data.business_phone)   bizLines.push(data.business_phone)
  if (data.business_address) bizLines.push(data.business_address)
  bizLines.forEach(l => { doc.text(l, margin, y); y += 4.5 })

  y += 3
  doc.setDrawColor(215, 210, 205)
  doc.line(margin, y, pageW - margin, y)
  y += 7

  // ── Bill To + Invoice Details columns ─────────────────────────────
  const col2 = margin + cW * 0.58

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 95, 90)
  doc.text('BILL TO', margin, y)
  doc.text('INVOICE DETAILS', col2, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 25, 23)
  doc.text(data.client_name || '—', margin, y)
  doc.text(data.invoice_number, col2, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 95, 90)

  const clientLines: string[] = []
  if (data.client_abn)     clientLines.push(`ABN: ${data.client_abn}`)
  if (data.client_email)   clientLines.push(data.client_email)
  if (data.client_address) clientLines.push(data.client_address)

  const detailRows: [string, string][] = [
    ['Issue Date', formatDateAU(data.issue_date)],
    ['Due Date',   formatDateAU(data.due_date)],
    ['Terms',      data.payment_terms],
  ]

  const startY = y
  clientLines.forEach(l => { doc.text(l, margin, y); y += 4.5 })

  let ry = startY
  detailRows.forEach(([label, val]) => {
    doc.text(label, col2, ry)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(28, 25, 23)
    doc.text(val, col2 + 26, ry)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 95, 90)
    ry += 4.5
  })

  y = Math.max(y, ry) + 7

  // ── Line items table ───────────────────────────────────────────────
  // Header row
  doc.setFillColor(245, 240, 232)
  doc.rect(margin, y, cW, 7.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 95, 90)

  const cx = {
    desc:   margin + 2,
    qty:    margin + cW * 0.52,
    price:  margin + cW * 0.64,
    gst:    margin + cW * 0.79,
    amount: margin + cW - 2,
  }

  doc.text('DESCRIPTION', cx.desc,   y + 4.5)
  doc.text('QTY',         cx.qty,    y + 4.5)
  doc.text('UNIT PRICE',  cx.price,  y + 4.5)
  doc.text('GST',         cx.gst,    y + 4.5)
  doc.text('AMOUNT',      cx.amount, y + 4.5, { align: 'right' })
  y += 9

  data.line_items.forEach((item, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(250, 248, 245)
      doc.rect(margin, y - 1, cW, 8, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(28, 25, 23)

    const desc = doc.splitTextToSize(item.description, cW * 0.50)[0]
    doc.text(desc,                            cx.desc,   y + 4)
    doc.text(String(item.qty),               cx.qty,    y + 4)
    doc.text(formatCurrency(item.unit_price), cx.price,  y + 4)
    doc.text(item.has_gst ? 'Yes' : 'No',   cx.gst,    y + 4)
    doc.text(formatCurrency(item.amount),    cx.amount, y + 4, { align: 'right' })
    y += 8
  })

  y += 2
  doc.setDrawColor(215, 210, 205)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // ── Totals ─────────────────────────────────────────────────────────
  const tx = margin + cW * 0.58

  ;[
    ['Subtotal (ex GST)', formatCurrency(data.subtotal_ex_gst)],
    ['GST (10%)',         formatCurrency(data.total_gst)],
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
  doc.setFillColor(200, 75, 47)
  doc.rect(tx - 2, y, pageW - margin - tx + 2, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL DUE (INC GST)', tx, y + 5.5)
  doc.text(formatCurrency(data.total_inc_gst), pageW - margin, y + 5.5, { align: 'right' })
  y += 14

  // ── Payment details ────────────────────────────────────────────────
  const payLines: string[] = []
  if (data.bank_name)      payLines.push(`Bank: ${data.bank_name}`)
  if (data.account_name)   payLines.push(`Account Name: ${data.account_name}`)
  if (data.bsb)            payLines.push(`BSB: ${data.bsb}`)
  if (data.account_number) payLines.push(`Account Number: ${data.account_number}`)

  if (payLines.length > 0) {
    doc.setFillColor(245, 240, 232)
    doc.rect(margin, y, cW, 7 + payLines.length * 5, 'F')
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(100, 95, 90)
    doc.text('PAYMENT DETAILS', margin + 3, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(28, 25, 23)
    payLines.forEach(l => { doc.text(l, margin + 3, y); y += 5 })
    y += 3
  }

  // ── Notes ──────────────────────────────────────────────────────────
  if (data.notes?.trim()) {
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(100, 95, 90)
    doc.text('NOTES', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(28, 25, 23)
    const noteLines = doc.splitTextToSize(data.notes, cW)
    doc.text(noteLines, margin, y)
  }

  // ── Footer ─────────────────────────────────────────────────────────
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
