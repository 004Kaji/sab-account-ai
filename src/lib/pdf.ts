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

  // ── MLS disclosure note ──────────────────────────────────────────────
  if (data.annual_salary > 93000 && !data.medicare_exempt) {
    y += 4
    doc.setFillColor(255, 251, 235)
    doc.rect(margin, y, cW, 8, 'F')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(146, 64, 14)
    doc.text('Note: Medicare Levy Surcharge (1%–1.5%) may apply at tax time if no private hospital cover is held.', margin + 3, y + 5)
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
  if (data.client_business_name) clientLines.push(data.client_business_name)
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
    y += noteLines.length * 5
  }

  // ── Pay online ─────────────────────────────────────────────────────
  if (data.payment_link) {
    y += 6
    doc.setFillColor(200, 75, 47, 0.08)
    doc.setDrawColor(200, 75, 47)
    doc.roundedRect(margin, y, cW, 12, 2, 2, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(200, 75, 47)
    doc.text('Pay online:', margin + 4, y + 7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(28, 25, 23)
    doc.text(data.payment_link, margin + 26, y + 7.5)
    y += 15
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
