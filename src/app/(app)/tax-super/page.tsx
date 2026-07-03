'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { posthog } from '@/components/PostHogProvider'
import { useProfile } from '@/app/(app)/profile-context'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { buildQuarters, currentQuarterIndex } from '@/lib/tax-quarters'
import type { Quarter } from '@/lib/tax-quarters'
import { paydaySuperDeadline, deriveSuperStatus, wasPaidOnTime, PCG_2026_1_LINE, NOT_ADVICE_DISCLAIMER } from '@/lib/super-compliance'
import { buildSuperInstructionSheet, superInstructionCSV } from '@/lib/super-instructions'
import { downloadSuperInstructionPDF } from '@/lib/pdf'
import { SuperDisclaimer } from '@/components/SuperDisclaimer'

type BasSummary = { gstCollected: number; gstCredits: number; netGST: number; paygWithheld: number; totalSuper: number }

async function buildBasDoc(quarter: Quarter, summary: BasSummary, businessName: string, abn: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const EMBER  = [200, 75, 47]  as [number, number, number]
  const CHAR   = [28, 25, 23]   as [number, number, number]
  const GREY   = [120, 113, 108] as [number, number, number]
  const CREAM  = [249, 246, 240] as [number, number, number]
  const WHITE  = [255, 255, 255] as [number, number, number]
  const GREEN  = [21, 128, 61]   as [number, number, number]
  const fc = (n: number) => '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const pageW = 210

  // ── Header bar ──────────────────────────────────────────────────────
  doc.setFillColor(...EMBER)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('BAS Summary', 15, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Business Activity Statement — prepared by SAB Account AI', 15, 19)
  doc.text(`sabaccountai.com`, 15, 25)

  // ── Business details ─────────────────────────────────────────────────
  doc.setFillColor(...CREAM)
  doc.rect(0, 30, pageW, 30, 'F')
  doc.setTextColor(...CHAR)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(businessName || 'Your Business', 15, 39)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  if (abn) doc.text(`ABN: ${abn}`, 15, 45)
  doc.text(`Quarter: ${quarter.label}`, 15, abn ? 51 : 45)
  doc.text(`Period: ${quarter.start}  to  ${quarter.end}`, 90, abn ? 51 : 45)
  doc.text(`BAS Due: ${quarter.basDue}`, 15, abn ? 57 : 51)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`, 90, abn ? 57 : 51)

  let y = 68

  // ── Section helper ───────────────────────────────────────────────────
  const section = (title: string, icon: string) => {
    doc.setFillColor(...CHAR)
    doc.rect(15, y, pageW - 30, 8, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`${icon}  ${title}`, 18, y + 5.5)
    y += 8
  }

  const row = (label: string, value: string, bold = false, color: [number,number,number] = CHAR, sub = false) => {
    doc.setFillColor(...WHITE)
    doc.rect(15, y, pageW - 30, 9, 'F')
    doc.setTextColor(sub ? GREY[0] : CHAR[0], sub ? GREY[1] : CHAR[1], sub ? GREY[2] : CHAR[2])
    doc.setFontSize(9)
    doc.setFont('helvetica', sub ? 'normal' : bold ? 'bold' : 'normal')
    doc.text(label, 20, y + 6)
    doc.setTextColor(...color)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(value, pageW - 20, y + 6, { align: 'right' })
    // Bottom border
    doc.setDrawColor(230, 226, 220)
    doc.line(15, y + 9, pageW - 15, y + 9)
    y += 9
  }

  const totalRow = (label: string, value: string, color: [number,number,number]) => {
    doc.setFillColor(color[0], color[1], color[2], )
    doc.setFillColor(color[0], color[1], color[2])
    // Tinted background
    doc.setFillColor(Math.min(255, color[0] + 200), Math.min(255, color[1] + 200), Math.min(255, color[2] + 200))
    doc.rect(15, y, pageW - 30, 10, 'F')
    doc.setTextColor(...CHAR)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(label, 20, y + 7)
    doc.setTextColor(...color)
    doc.text(value, pageW - 20, y + 7, { align: 'right' })
    y += 10
  }

  // ── GST Section ──────────────────────────────────────────────────────
  section('GST - Business Activity Statement', 'G1')
  y += 1
  row('G1  Total sales (inc. GST)', fc(summary.gstCollected * 11), false, CHAR)
  row('1A  GST on sales (GST collected)', fc(summary.gstCollected), false, CHAR)
  row('1B  GST on purchases (GST credits)', `- ${fc(summary.gstCredits)}`, false, GREY, true)
  y += 1
  totalRow(
    summary.netGST >= 0 ? 'Net GST to pay ATO' : 'GST Refund from ATO',
    fc(summary.netGST),
    summary.netGST >= 0 ? EMBER : GREEN,
  )

  y += 6

  // ── PAYG Section ─────────────────────────────────────────────────────
  if (summary.paygWithheld > 0) {
    section('PAYG Withholding', 'W2')
    y += 1
    row('W2  Total PAYG withheld from employees', fc(summary.paygWithheld), false, CHAR)
    y += 1
    totalRow('PAYG to report on BAS (W2)', fc(summary.paygWithheld), EMBER)
    y += 6
  }

  // ── ATO Field Reference ──────────────────────────────────────────────
  section('ATO BAS Field Reference', '?')
  y += 2
  const fields = [
    ['G1', 'Total sales including GST', fc(summary.gstCollected * 11)],
    ['1A', 'GST on sales - amount to report', fc(summary.gstCollected)],
    ['1B', 'GST on purchases - your credit', fc(summary.gstCredits)],
    ...(summary.paygWithheld > 0 ? [['W2', 'PAYG withholding - total withheld', fc(summary.paygWithheld)]] : []),
  ]
  doc.setFontSize(8.5)
  for (const [field, desc, val] of fields) {
    doc.setTextColor(...GREY)
    doc.setFont('helvetica', 'bold')
    doc.text(field, 20, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(desc, 35, y + 5)
    doc.setTextColor(...CHAR)
    doc.setFont('helvetica', 'bold')
    doc.text(val, pageW - 20, y + 5, { align: 'right' })
    doc.setDrawColor(230, 226, 220)
    doc.line(15, y + 7, pageW - 15, y + 7)
    y += 7
  }

  y += 6

  // ── Total Payable Box ────────────────────────────────────────────────
  const totalPayable = summary.netGST + summary.paygWithheld
  const isRefund = totalPayable < 0
  doc.setFillColor(...(isRefund ? GREEN : EMBER))
  doc.rect(15, y, pageW - 30, 22, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(isRefund ? 'NET REFUND FROM ATO' : 'TOTAL AMOUNT PAYABLE TO ATO', 20, y + 7)
  doc.setFontSize(18)
  doc.text(fc(totalPayable), pageW - 20, y + 16, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Net GST ${summary.netGST < 0 ? `(refund) ${fc(summary.netGST)}` : fc(summary.netGST)}${summary.paygWithheld > 0 ? `  +  PAYG W2 ${fc(summary.paygWithheld)}` : ''}`, 20, y + 16)
  doc.text(isRefund ? `Lodge by ${quarter.basDue} to claim your refund` : `Due by ${quarter.basDue}`, 20, y + 20)
  y += 28

  // ── How to Lodge ─────────────────────────────────────────────────────
  const boxH = 62
  doc.setFillColor(...CREAM)
  doc.rect(15, y, pageW - 30, boxH, 'F')
  doc.setFillColor(...(isRefund ? GREEN : EMBER))
  doc.rect(15, y, 3, boxH, 'F')

  doc.setTextColor(...CHAR)
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.text('How to Lodge Your BAS', 22, y + 8)

  const lodgeSteps = [
    ['Option 1 - Via your accountant:', 'Email or share this PDF. Your accountant will lodge via the ATO portal.'],
    ['Option 2 - Self-lodge via myGov:', 'Go to my.gov.au, select ATO, then Lodge Activity Statement. Enter 1A, 1B, W2.'],
    ['Option 3 - ATO Business Portal:', 'Go to bp.ato.gov.au, select Activity Statements, enter figures from this PDF.'],
    [isRefund ? 'Refund:' : 'Payment:', isRefund ? `Lodge by ${quarter.basDue} — ATO will refund ${fc(totalPayable)} to your nominated bank account.` : `Pay ${fc(totalPayable)} by ${quarter.basDue} via BPAY or EFT. Reference on your ATO portal.`],
  ]

  const stepStart = y + 16
  lodgeSteps.forEach(([label, detail], i) => {
    const rowY = stepStart + i * 11
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...EMBER)
    doc.text(label, 22, rowY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GREY)
    doc.text(detail, 22, rowY + 5)
  })

  y += boxH + 6

  // ── Footer ───────────────────────────────────────────────────────────
  doc.setFillColor(...CHAR)
  doc.rect(0, 282, pageW, 15, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Generated by SAB Account AI · sabaccountai.com · For accountant/tax agent use only. Not a lodgement document.', pageW / 2, 291, { align: 'center' })

  return doc
}

async function exportBasPDF(quarter: Quarter, summary: BasSummary, businessName: string, abn: string) {
  const doc = await buildBasDoc(quarter, summary, businessName, abn)
  doc.save(`BAS-Summary-${quarter.label.replace(/\s/g, '-')}.pdf`)
}

async function getBasBase64(quarter: Quarter, summary: BasSummary, businessName: string, abn: string): Promise<string> {
  const doc = await buildBasDoc(quarter, summary, businessName, abn)
  return (doc.output('datauristring') as string).split(',')[1]
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SuperRow {
  employee_name: string
  super: number
}

interface Summary {
  gstCollected:  number
  gstCredits:    number
  netGST:        number
  paygWithheld:  number
  superByEmp:    SuperRow[]
  totalSuper:    number
}

interface SuperPayment {
  id: string
  payslip_id: string
  employee_name: string
  super_fund_name: string | null
  amount: number
  payment_date: string
  deadline: string
  status: string
  beam_reference: string | null
  paid_date: string | null
}

interface Payrun {
  payment_date: string
  total: number
  employees: string[]
  deadline: string
  payments: SuperPayment[]
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TaxSuperPage() {
  const profile   = useProfile()
  const quarters  = buildQuarters()
  const [qIdx, setQIdx]         = useState(() => currentQuarterIndex(quarters))
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)
  const [emailTo,   setEmailTo]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [sendMsg,   setSendMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const [businessAbn, setBusinessAbn] = useState('')
  const [payruns, setPayruns]         = useState<Payrun[]>([])
  const [beamConfigured, setBeamConfigured] = useState(false)
  const [payingDate, setPayingDate]   = useState<string | null>(null)
  const [payMsg, setPayMsg]           = useState<{ date: string; ok: boolean; text: string } | null>(null)

  useEffect(() => { document.title = 'Tax & Super — SAB Account AI' }, [])
  useEffect(() => { if (posthog.__loaded) posthog.capture('bas_viewed') }, [])

  // Fetch ABN once on mount
  useEffect(() => {
    async function fetchAbn() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('business_profiles').select('abn').eq('id', user.id).single()
      if (data?.abn) setBusinessAbn(data.abn as string)
    }
    fetchAbn()
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const q       = quarters[qIdx]
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [
        { data: invoices },
        { data: expenseRecs },
        { data: payslips },
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('total_gst')
          .eq('user_id', user.id)
          .neq('status', 'draft')
          .gte('issue_date', q.start)
          .lte('issue_date', q.end),
        supabase
          .from('records')
          .select('gst_amount')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .gte('date', q.start)
          .lte('date', q.end),
        supabase
          .from('payslips')
          .select('employee_name, income_tax, medicare_levy, help_repayment, super_sg, super_sal_sac')
          .eq('user_id', user.id)
          .gte('pay_period_end', q.start)
          .lte('pay_period_end', q.end),
      ])

      const gstCollected = (invoices ?? []).reduce((s, r) => s + Number(r.total_gst), 0)
      const gstCredits   = (expenseRecs ?? []).reduce((s, r) => s + Number(r.gst_amount), 0)
      const netGST       = gstCollected - gstCredits
      const paygWithheld = (payslips ?? []).reduce((s, p) => s + Number(p.income_tax) + Number(p.medicare_levy) + Number(p.help_repayment), 0)

      // Super per employee
      const empMap = new Map<string, number>()
      for (const p of payslips ?? []) {
        const name  = p.employee_name as string
        const super_ = Number(p.super_sg) + Number(p.super_sal_sac)
        empMap.set(name, (empMap.get(name) ?? 0) + super_)
      }
      const superByEmp = [...empMap.entries()]
        .map(([employee_name, super_]) => ({ employee_name, super: super_ }))
        .sort((a, b) => b.super - a.super)
      const totalSuper = superByEmp.reduce((s, r) => s + r.super, 0)

      setSummary({ gstCollected, gstCredits, netGST, paygWithheld, superByEmp, totalSuper })
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx])

  // Load recent payruns + their super payment status.
  // Payday Super is NOT quarterly — a payrun's super deadline routinely falls in
  // a different BAS quarter than the payday (e.g. a late-June payrun is due in
  // early July). So the tracker uses a rolling recent window, independent of the
  // GST quarter selector above, otherwise current obligations vanish at every
  // quarter boundary.
  useEffect(() => {
    async function loadPayruns() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const to = new Date().toISOString().split('T')[0]
      const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 120)
      const from = fromDate.toISOString().split('T')[0]

      // Load payslips grouped by payment_date
      const { data: payslips } = await supabase
        .from('payslips')
        .select('id, employee_name, super_sg, super_sal_sac, payment_date')
        .eq('user_id', user.id)
        .gte('payment_date', from)
        .lte('payment_date', to)
        .gt('super_sg', 0)
        .order('payment_date', { ascending: false })

      if (!payslips?.length) { setPayruns([]); return }

      // Group by payment_date
      const dateMap = new Map<string, { total: number; employees: string[] }>()
      for (const p of payslips) {
        const date = p.payment_date as string
        if (!dateMap.has(date)) dateMap.set(date, { total: 0, employees: [] })
        const row = dateMap.get(date)!
        row.total += Number(p.super_sg) + Number(p.super_sal_sac)
        if (!row.employees.includes(p.employee_name as string)) row.employees.push(p.employee_name as string)
      }

      // Fetch existing payment records for the same window
      const res = await fetch(
        `/api/super/pay?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      const { payments = [], beam_configured = false } = res.ok ? await res.json() : {}
      setBeamConfigured(beam_configured)

      const paymentsByDate = new Map<string, SuperPayment[]>()
      for (const p of payments as SuperPayment[]) {
        if (!paymentsByDate.has(p.payment_date)) paymentsByDate.set(p.payment_date, [])
        paymentsByDate.get(p.payment_date)!.push(p)
      }

      const runs: Payrun[] = [...dateMap.entries()].map(([date, info]) => ({
        payment_date: date,
        total:        info.total,
        employees:    info.employees,
        deadline:     paydaySuperDeadline(date),
        payments:     paymentsByDate.get(date) ?? [],
      }))

      setPayruns(runs)
    }
    loadPayruns()
  // Rolling window — independent of the GST quarter. Refresh after a mark-paid.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payMsg])

  // Build the per-fund super instruction sheet for a payday and download it
  // as a PDF or a CSV the employer can upload to their fund's portal. SAB
  // prepares and tracks — it never moves money.
  async function handleDownloadInstructions(payday: string, format: 'pdf' | 'csv') {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: payslips }, { data: biz }, { data: employees }] = await Promise.all([
      supabase.from('payslips').select('employee_name, super_sg, super_sal_sac, super_fund_name, member_number').eq('user_id', user.id).eq('payment_date', payday).gt('super_sg', 0),
      supabase.from('business_profiles').select('business_name, abn').eq('id', user.id).single(),
      supabase.from('employees').select('name, usi, fund_abn, is_smsf, smsf_esa').eq('user_id', user.id),
    ])
    if (!payslips?.length) return
    const empByName = new Map((employees ?? []).map(e => [e.name as string, e]))
    const sheet = buildSuperInstructionSheet({
      businessName: (biz?.business_name as string) || 'Your Business',
      businessAbn:  (biz?.abn as string | null) ?? undefined,
      payday,
      items: payslips.map(p => {
        const emp = empByName.get(p.employee_name as string)
        return {
          employeeName: p.employee_name as string,
          fundName:     (p.super_fund_name as string | null) || '',
          usi:          (emp?.usi as string | null) || '',
          memberNumber: (p.member_number as string | null) || '',
          isSmsf:       (emp?.is_smsf as boolean | null) || false,
          smsfEsa:      (emp?.smsf_esa as string | null) || undefined,
          amount:       Number(p.super_sg) + Number(p.super_sal_sac),
        }
      }),
    })
    if (format === 'pdf') {
      await downloadSuperInstructionPDF(sheet)
    } else {
      const blob = new Blob([superInstructionCSV(sheet)], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Super-${payday.replace(/-/g, '')}.csv`
      document.body.appendChild(a); a.click()
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 1000)
    }
  }

  async function handleSuperAction(paymentDate: string, action: 'pay' | 'mark_paid') {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setPayingDate(paymentDate)
    setPayMsg(null)
    try {
      const res = await fetch('/api/super/pay', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ payment_date: paymentDate, action }),
      })
      const data = await res.json()
      setPayMsg({
        date: paymentDate,
        ok:   res.ok && data.ok,
        text: res.ok && data.ok
          ? action === 'mark_paid'
            ? 'Marked as paid'
            : data.beam_configured
              ? `Submitted to Beam — ref: ${data.beam_reference}`
              : 'Saved. Beam integration coming soon — mark as paid manually for now.'
          : data.error ?? 'Something went wrong',
      })
    } finally {
      setPayingDate(null)
    }
  }

  const q = quarters[qIdx]

  if (profile.plan !== 'pro' && profile.plan !== 'autopilot') {
    return (
      <div style={{ maxWidth: 480, margin: '6rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
        <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</p>
        <h2 className="font-display" style={{ fontSize: '1.375rem', color: 'var(--char)', marginBottom: '0.75rem' }}>
          Tax & Super Summary is a Pro feature
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Upgrade to Pro to see your BAS figures, PAYG withholding and super obligations in one place.
        </p>
        <Link href="/settings?tab=subscription" className="btn btn-ember" style={{ display: 'inline-block', padding: '0.625rem 1.5rem' }}>
          Upgrade to Pro
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.375rem' }}>
          Tax &amp; Super Summary
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '0.9375rem' }}>
          Your ATO obligations for the selected quarter. Use these figures when lodging your BAS and paying super.
        </p>
      </div>

      {/* Quarter selector + Export */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)', display: 'block', marginBottom: '0.375rem' }}>
            Quarter
          </label>
          <select
            value={qIdx}
            onChange={e => setQIdx(Number(e.target.value))}
            className="sab-input"
            style={{ maxWidth: 380 }}
          >
            {quarters.map((q, i) => (
              <option key={i} value={i}>{q.label}</option>
            ))}
          </select>
        </div>
        {summary && (
          <button
            onClick={async () => {
              setExporting(true)
              try {
                await exportBasPDF(
                  quarters[qIdx],
                  summary,
                  profile.business_name ?? '',
                  businessAbn,
                )
              } finally {
                setExporting(false)
              }
            }}
            disabled={exporting}
            className="btn btn-ember"
            style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
          >
            {exporting ? (
              <><div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Generating…</>
            ) : <>📄 Export PDF</>}
          </button>
        )}
      </div>

      {/* ── Email BAS to accountant ───────────────────────────────── */}
      {summary && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.25rem' }}>📧 Send BAS Summary to Your Accountant</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginBottom: '1rem' }}>
            Email the {quarters[qIdx].label} BAS summary PDF directly to your accountant or tax agent.
          </p>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <input
              type="email"
              value={emailTo}
              onChange={e => { setEmailTo(e.target.value); setSendMsg(null) }}
              placeholder="accountant@example.com"
              className="sab-input"
              style={{ flex: 1, minWidth: 220 }}
            />
            <button
              onClick={async () => {
                if (!emailTo.trim()) return
                setSending(true)
                setSendMsg(null)
                try {
                  const supabase = createBrowserClient()
                  const { data: { session } } = await supabase.auth.getSession()
                  const pdfBase64 = await getBasBase64(
                    quarters[qIdx],
                    summary,
                    profile.business_name ?? '',
                    businessAbn,
                  )
                  const res = await fetch('/api/email/bas', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({
                      to: emailTo.trim(),
                      businessName: profile.business_name ?? '',
                      quarter: quarters[qIdx].label,
                      basDue: quarters[qIdx].basDue,
                      netGST: summary.netGST,
                      paygWithheld: summary.paygWithheld,
                      pdfBase64,
                    }),
                  })
                  if (res.ok) {
                    setSendMsg({ ok: true, text: `BAS summary sent to ${emailTo}` })
                    setEmailTo('')
                  } else {
                    const err = await res.json()
                    setSendMsg({ ok: false, text: err.error ?? 'Failed to send email' })
                  }
                } catch {
                  setSendMsg({ ok: false, text: 'Something went wrong. Try again.' })
                } finally {
                  setSending(false)
                }
              }}
              disabled={sending || !emailTo.trim()}
              className="btn btn-char"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
            >
              {sending ? (
                <><div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Sending…</>
              ) : <>✉️ Send to Accountant</>}
            </button>
          </div>
          {sendMsg && (
            <p style={{ marginTop: '0.625rem', fontSize: '0.8125rem', color: sendMsg.ok ? '#15803d' : 'var(--ember)', fontWeight: 500 }}>
              {sendMsg.ok ? '✓ ' : '⚠ '}{sendMsg.text}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '3rem 0', color: 'var(--text3)' }}>
          <div className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
          Loading…
        </div>
      ) : summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── BAS Section ─────────────────────────────────────────────── */}
          <div style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', margin: 0 }}>GST — Business Activity Statement</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', margin: '0.2rem 0 0' }}>BAS due: {q.basDue}</p>
              </div>
              <span style={{ fontSize: '1.5rem' }}>📋</span>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <Row label="GST collected on invoices" value={summary.gstCollected} />
              <Row label="GST credits on expenses"   value={-summary.gstCredits}  sub />
              <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0' }} />
              <Row
                label={summary.netGST >= 0 ? 'Net GST to pay ATO' : 'GST refund from ATO'}
                value={Math.abs(summary.netGST)}
                bold
                color={summary.netGST >= 0 ? 'var(--ember)' : '#15803d'}
              />

              {summary.paygWithheld > 0 && (
                <>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0' }} />
                  <Row label="PAYG withholding (from payslips)" value={summary.paygWithheld} bold color="var(--ember)" />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.375rem' }}>
                    Report PAYG withholding separately on your BAS under W2.
                  </p>
                </>
              )}

              {summary.gstCollected === 0 && summary.gstCredits === 0 && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text3)', marginTop: '0.5rem' }}>
                  No invoices or expense records found for this quarter.{' '}
                  <Link href="/records" style={{ color: 'var(--ember)' }}>Add records →</Link>
                </p>
              )}
            </div>
          </div>

          {/* ── Super Section ────────────────────────────────────────────── */}
          <div style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', margin: 0 }}>Superannuation Obligations</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', margin: '0.2rem 0 0' }}>Super due: {q.superDue} · Rate: 12%</p>
              </div>
              <span style={{ fontSize: '1.5rem' }}>🏦</span>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              {summary.superByEmp.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>
                  No payslips found for this quarter.{' '}
                  <Link href="/payslip" style={{ color: 'var(--ember)' }}>Create a payslip →</Link>
                </p>
              ) : (
                <>
                  {summary.superByEmp.map((row) => (
                    <Row key={row.employee_name} label={row.employee_name} value={row.super} />
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0' }} />
                  <Row label="Total super to pay" value={summary.totalSuper} bold color="var(--ember)" />
                  <div style={{ marginTop: '0.5rem' }}><SuperDisclaimer compact /></div>
                </>
              )}
            </div>
          </div>

          {/* ── Compliance Health panel ──────────────────────────────────── */}
          {payruns.length > 0 && (() => {
            const runsWithStatus = payruns.map(run => {
              const paidRec = run.payments.find(p => p.paid_date || ['settled', 'manually_paid', 'submitted', 'processing'].includes(p.status))
              const paidDate = paidRec?.paid_date ?? (paidRec ? run.payment_date : null)
              return { ...run, status: deriveSuperStatus({ deadlineISO: run.deadline, paidDateISO: paidDate }), paidDate }
            })
            const overdue = runsWithStatus.filter(r => r.status === 'OVERDUE')
            const dueSoon = runsWithStatus.filter(r => r.status === 'DUE_SOON')
            const paid    = runsWithStatus.filter(r => r.status === 'PAID')
            let streak = 0
            for (const r of paid.slice().sort((a, b) => b.payment_date.localeCompare(a.payment_date))) {
              if (r.paidDate && wasPaidOnTime(r.deadline, r.paidDate)) streak++
              else break
            }
            const allClear = overdue.length === 0
            return (
              <div style={{ background: allClear ? '#f0fdf4' : '#fef2f2', borderRadius: 'var(--r)', border: `1px solid ${allClear ? '#bbf7d0' : '#fecaca'}`, padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', margin: 0 }}>Compliance Health</h2>
                  <span style={{ fontSize: '1.5rem' }}>{allClear ? '🟢' : '🔴'}</span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: allClear ? '#15803d' : '#dc2626' }}>{overdue.length}</div><div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Overdue</div></div>
                  <div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{dueSoon.length}</div><div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Due soon</div></div>
                  <div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--char)' }}>{streak}</div><div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>On-time streak</div></div>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                  {allClear
                    ? `All super up to date. ${PCG_2026_1_LINE}`
                    : `${overdue.length} payrun${overdue.length === 1 ? '' : 's'} overdue — pay now and record it to stay low-risk. ${PCG_2026_1_LINE}`}
                </p>
              </div>
            )
          })()}

          {/* ── Payday Super Payment Tracker ─────────────────────────────── */}
          {payruns.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', margin: 0 }}>Payday Super — Payment Tracker</h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', margin: '0.2rem 0 0' }}>
                    Pay within 7 business days of each payday · SAB prepares &amp; tracks — you pay via your bank or fund portal
                  </p>
                </div>
                <span style={{ fontSize: '1.5rem' }}>⚡</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.625rem 1.5rem', color: 'var(--text3)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pay Date</th>
                      <th style={{ textAlign: 'left', padding: '0.625rem 1rem', color: 'var(--text3)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Employees</th>
                      <th style={{ textAlign: 'right', padding: '0.625rem 1rem', color: 'var(--text3)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Super</th>
                      <th style={{ textAlign: 'left', padding: '0.625rem 1rem', color: 'var(--text3)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deadline</th>
                      <th style={{ textAlign: 'left', padding: '0.625rem 1rem', color: 'var(--text3)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                      <th style={{ padding: '0.625rem 1.5rem' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {payruns.map(run => {
                      const paidRec = run.payments.find(p => p.paid_date || ['settled', 'manually_paid', 'submitted', 'processing'].includes(p.status))
                      const paidDate = paidRec?.paid_date ?? (paidRec ? run.payment_date : null)
                      const status  = deriveSuperStatus({ deadlineISO: run.deadline, paidDateISO: paidDate })
                      const overdue = status === 'OVERDUE'
                      const isActing = payingDate === run.payment_date

                      const statusBadge = (() => {
                        if (status === 'PAID') {
                          const onTime = paidDate ? wasPaidOnTime(run.deadline, paidDate) : true
                          return onTime
                            ? { label: 'Paid on time', color: '#15803d', bg: '#dcfce7' }
                            : { label: 'Paid late', color: '#b45309', bg: '#fef3c7' }
                        }
                        if (status === 'OVERDUE')  return { label: 'Overdue', color: '#dc2626', bg: '#fee2e2' }
                        if (status === 'DUE_SOON') return { label: 'Due Soon', color: '#d97706', bg: '#fef3c7' }
                        return { label: 'Upcoming', color: 'var(--text3)', bg: 'var(--cream)' }
                      })()

                      const isDone = status === 'PAID'

                      return (
                        <tr key={run.payment_date} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 1.5rem', color: 'var(--char)', fontWeight: 500 }}>
                            {new Date(`${run.payment_date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text2)' }}>
                            {run.employees.join(', ')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--char)', fontWeight: 600, textAlign: 'right' }}>
                            {formatCurrency(run.total)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: overdue ? '#dc2626' : 'var(--text2)', fontWeight: overdue ? 600 : 400 }}>
                            {new Date(`${run.deadline}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ background: statusBadge.bg, color: statusBadge.color, padding: '0.2rem 0.625rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => handleDownloadInstructions(run.payment_date, 'pdf')}
                                className="btn btn-ghost"
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                                title="Download the pay-your-super instruction sheet"
                              >
                                Instructions
                              </button>
                              <button
                                onClick={() => handleDownloadInstructions(run.payment_date, 'csv')}
                                className="btn btn-ghost"
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                                title="Download a CSV for your fund's employer portal"
                              >
                                CSV
                              </button>
                              {!isDone && (
                                <button
                                  onClick={() => handleSuperAction(run.payment_date, 'mark_paid')}
                                  disabled={isActing}
                                  className="btn btn-char"
                                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.875rem' }}
                                >
                                  {isActing ? '…' : 'Mark as Paid'}
                                </button>
                              )}
                            </div>
                            {paidDate && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>paid {new Date(`${paidDate}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {payMsg && (
                <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.8125rem', color: payMsg.ok ? '#15803d' : 'var(--ember)', fontWeight: 500 }}>
                  {payMsg.ok ? '✓ ' : '⚠ '}{payMsg.text}
                </div>
              )}
            </div>
          )}

          {/* ── Coming from SBSCH? ────────────────────────────────────────── */}
          <SbschImportCard />

          {/* ── Disclaimer ───────────────────────────────────────────────── */}
          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', lineHeight: 1.6, textAlign: 'center' }}>
            These figures are calculated from your invoices, expense records and payslips in SAB Account AI.
            SAB calculates, prepares and tracks super payments — it does not pay super or move money on your behalf.
            Always verify against your records before lodging with the ATO. {NOT_ADVICE_DISCLAIMER}
          </p>

        </div>
      )}
    </div>
  )
}

// ── Coming from SBSCH? — one-file CSV onboarding ──────────────────────────────

interface SbschPreviewRow {
  name: string; super_fund_name?: string; usi?: string; member_number?: string
  is_smsf: boolean; smsf_esa?: string; match: 'update' | 'create'; warnings: string[]
}

function SbschImportCard() {
  const [open, setOpen]       = useState(false)
  const [busy, setBusy]       = useState(false)
  const [csv, setCsv]         = useState('')
  const [preview, setPreview] = useState<{ rows: SbschPreviewRow[]; to_update: number; to_create: number } | null>(null)
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  async function post(commit: boolean, csvText: string) {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const res = await fetch('/api/super/sbsch-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ csv: csvText, commit }),
    })
    return { res, data: await res.json() as Record<string, unknown> }
  }

  async function handleFile(file: File) {
    setBusy(true); setMsg(null); setPreview(null)
    try {
      const text = await file.text()
      setCsv(text)
      const out = await post(false, text)
      if (!out) return
      if (!out.res.ok) { setMsg({ ok: false, text: String(out.data.error ?? 'Could not read that file.') }); return }
      setPreview({ rows: out.data.rows as SbschPreviewRow[], to_update: out.data.to_update as number, to_create: out.data.to_create as number })
    } finally { setBusy(false) }
  }

  async function handleCommit() {
    setBusy(true); setMsg(null)
    try {
      const out = await post(true, csv)
      if (!out) return
      if (!out.res.ok) { setMsg({ ok: false, text: String(out.data.error ?? 'Import failed.') }); return }
      setMsg({ ok: true, text: `Imported — ${out.data.created} added, ${out.data.updated} updated.${(out.data.failed as number) ? ` ${out.data.failed} failed.` : ''}` })
      setPreview(null); setCsv('')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'left', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--char)' }}>Coming from the SBSCH?</span>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', margin: '0.2rem 0 0' }}>The ATO clearing house closed 1 July 2026 — import your employee &amp; fund details from a CSV.</p>
        </div>
        <span style={{ fontSize: '1.1rem', color: 'var(--text3)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 1.5rem 1.25rem' }}>
          <label className="btn btn-char" style={{ display: 'inline-block', fontSize: '0.8125rem', padding: '0.4rem 1rem', cursor: 'pointer' }}>
            {busy ? 'Reading…' : 'Choose SBSCH CSV'}
            <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} disabled={busy}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </label>

          {preview && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', margin: '0 0 0.5rem' }}>
                {preview.rows.length} employees found · {preview.to_create} new, {preview.to_update} matched
              </p>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <tbody>
                    {preview.rows.map((r, i) => (
                      <tr key={i} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '0.4rem 0.75rem', color: 'var(--char)', fontWeight: 500 }}>{r.name}</td>
                        <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text2)' }}>{r.is_smsf ? `SMSF ${r.smsf_esa ?? ''}` : (r.super_fund_name ?? '—')}</td>
                        <td style={{ padding: '0.4rem 0.75rem', color: r.warnings.length ? 'var(--ember)' : 'var(--text3)', fontSize: '0.75rem' }}>
                          {r.warnings.length ? `⚠ ${r.warnings[0]}` : (r.match === 'create' ? 'new' : 'update')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleCommit} disabled={busy} className="btn btn-ember" style={{ marginTop: '0.75rem', fontSize: '0.8125rem', padding: '0.45rem 1.1rem' }}>
                {busy ? 'Importing…' : `Import ${preview.rows.length} employees`}
              </button>
            </div>
          )}

          {msg && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: msg.ok ? '#15803d' : 'var(--ember)', fontWeight: 500 }}>
              {msg.ok ? '✓ ' : '⚠ '}{msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Row component ─────────────────────────────────────────────────────────────

function Row({ label, value, bold, sub, color }: {
  label: string
  value: number
  bold?: boolean
  sub?: boolean
  color?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
      <span style={{ fontSize: '0.9rem', color: sub ? 'var(--text3)' : 'var(--text2)', fontWeight: bold ? 600 : 400 }}>
        {sub ? `− ${label}` : label}
      </span>
      <span style={{ fontSize: bold ? '1rem' : '0.9rem', fontWeight: bold ? 700 : 500, color: color ?? 'var(--char)' }}>
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  )
}
