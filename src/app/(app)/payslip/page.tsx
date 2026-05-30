'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { useProfile } from '@/app/(app)/profile-context'
import { useToast } from '@/components/ui/Toast'
import PlanGate from '@/components/ui/PlanGate'
import ReferralBanner from '@/components/ui/ReferralBanner'
import AutocompleteDropdown from '@/components/ui/AutocompleteDropdown'
import { calculatePayslip, isMedicareExemptByResidency, getPaygScaleLabel, type PayslipNumbers, type ResidencyStatus } from '@/lib/ato'
import { formatCurrency, formatDateAU, todayISO, addDays, formatABN } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────
type PayCycle = 'weekly' | 'fortnightly' | 'monthly'

type PayBasis = 'salary' | 'hourly'

const DEFAULT_HOURS: Record<PayCycle, number> = { weekly: 38, fortnightly: 76, monthly: 165 }
const PERIODS_PER_YEAR: Record<PayCycle, number> = { weekly: 52, fortnightly: 26, monthly: 12 }

interface EmployeeRecord {
  id: string
  name: string
  email: string | null
  employment_type: string
  pay_cycle: string
  pay_basis: string
  annual_salary: number | null
  hourly_rate: number | null
  ordinary_hours: number | null
  super_fund_name: string | null
  member_number: string | null
  residency_status: string
}

interface PayslipForm {
  payslip_number:    string
  employer_name:     string
  employer_abn:      string
  employee_name:     string
  employment_type:   string
  pay_cycle:         PayCycle
  pay_basis:         PayBasis
  residency_status:  ResidencyStatus
  claiming_threshold: boolean
  has_help:          boolean
  medicare_exemption: boolean
  use_new_super_rate: boolean
  annual_salary:     number
  hourly_rate:       number
  ordinary_hours:    number
  salary_sacrifice:  number
  overtime_hours:    number
  overtime_rate:     number
  employee_email:    string
  super_fund_name:   string
  member_number:     string
  pay_period_start:  string
  pay_period_end:    string
  payment_date:      string
}

interface BizProfile {
  business_name: string
  abn: string
  email: string
  logo_url?: string
  super_rate_new?: boolean | null
}

function defaultPeriod(cycle: PayCycle): { start: string; end: string } {
  const today = todayISO()
  if (cycle === 'weekly')      return { start: addDays(today, -6),  end: today }
  if (cycle === 'fortnightly') return { start: addDays(today, -13), end: today }
  const now = new Date()
  return {
    start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    end:   today,
  }
}

function makeForm(num: string, employerName = '', employerAbn = '', useNewSuperRate = true): PayslipForm {
  const today   = todayISO()
  const cycle: PayCycle = 'fortnightly'
  const period  = defaultPeriod(cycle)
  return {
    payslip_number:    num,
    employer_name:     employerName,
    employer_abn:      employerAbn,
    employee_name:     '',
    employment_type:   'full-time',
    pay_cycle:         cycle,
    pay_basis:         'salary',
    residency_status:  'student',
    claiming_threshold: true,
    has_help:          false,
    medicare_exemption: true,   // default: international student = exempt
    use_new_super_rate: useNewSuperRate,
    annual_salary:     0,
    hourly_rate:       0,
    ordinary_hours:    76,
    salary_sacrifice:  0,
    overtime_hours:    0,
    overtime_rate:     0,
    employee_email:    '',
    super_fund_name:   '',
    member_number:     '',
    pay_period_start:  period.start,
    pay_period_end:    period.end,
    payment_date:      today,
  }
}

// ── Stable sub-components (defined at module level so React doesn't remount on every render)
function PreviewRow({ label, value, bold, muted, indent }: {
  label: string; value: string; bold?: boolean; muted?: boolean; indent?: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.3rem 0',
      paddingLeft: indent ? '0.75rem' : 0,
      borderBottom: '1px solid #F0EBE3',
      fontSize: '0.8rem',
      fontWeight: bold ? 700 : 400,
      color: muted ? '#A09590' : '#1C1917',
    }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  )
}

function PreviewSection({ title }: { title: string }) {
  return (
    <div style={{
      background: '#F5F0E8',
      padding: '0.3rem 0.5rem',
      fontSize: '0.625rem',
      fontWeight: 700,
      letterSpacing: '0.06em',
      color: '#A09590',
      margin: '0.75rem 0 0.25rem',
      borderRadius: '3px',
    }}>
      {title}
    </div>
  )
}

// ── Payslip Preview ────────────────────────────────────────────────────
function PayslipPreview({ form, biz, numbers, ytdIsActual }: {
  form: PayslipForm
  biz: BizProfile | null
  numbers: PayslipNumbers
  ytdIsActual?: boolean
}) {

  const superRate = form.use_new_super_rate ? '12%' : '11.5%'

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      padding: '1.25rem',
      fontSize: '0.8125rem',
      color: '#1C1917',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>
            {biz?.business_name || 'Your Business'}
          </p>
          {biz?.abn && <p style={{ fontSize: '0.75rem', color: '#A09590' }}>ABN: {formatABN(biz.abn)}</p>}
        </div>
        <div style={{ background: '#1C1917', color: '#fff', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', padding: '0.25rem 0.625rem', borderRadius: '3px' }}>
          PAYSLIP
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E5DDD5', margin: '0.75rem 0' }} />

      {/* Employee + Period */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, color: '#A09590', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>EMPLOYEE</p>
          <p style={{ fontWeight: 700 }}>{form.employee_name || '—'}</p>
          <p style={{ fontSize: '0.75rem', color: '#A09590' }}>{form.employment_type} · {form.pay_cycle}</p>
          {form.super_fund_name && <p style={{ fontSize: '0.75rem', color: '#A09590' }}>Fund: {form.super_fund_name}</p>}
          {form.member_number   && <p style={{ fontSize: '0.75rem', color: '#A09590' }}>Member: {form.member_number}</p>}
        </div>
        <div>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, color: '#A09590', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>PAY PERIOD</p>
          <p style={{ fontWeight: 700 }}>{form.payslip_number}</p>
          <p style={{ fontSize: '0.75rem', color: '#A09590' }}>
            {form.pay_period_start ? formatDateAU(form.pay_period_start) : '—'} – {form.pay_period_end ? formatDateAU(form.pay_period_end) : '—'}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#A09590' }}>Payment: {form.payment_date ? formatDateAU(form.payment_date) : '—'}</p>
          <p style={{ fontSize: '0.75rem', color: '#A09590' }}>
            {getPaygScaleLabel(form.claiming_threshold, form.residency_status, form.medicare_exemption)}
          </p>
          {form.residency_status !== 'whm' && (
            <p style={{ fontSize: '0.75rem', color: '#A09590' }}>
              Threshold: {form.claiming_threshold ? 'Yes' : 'No'} · HELP/HECS: {form.has_help ? 'Yes' : 'No'}
            </p>
          )}
        </div>
      </div>

      {/* Earnings */}
      <PreviewSection title="EARNINGS" />
      <PreviewRow
        label={form.pay_basis === 'hourly' && form.hourly_rate > 0
          ? `Ordinary Earnings (${form.ordinary_hours} hrs @ ${formatCurrency(form.hourly_rate)}/hr)`
          : `Ordinary Earnings (${form.pay_cycle})`}
        value={formatCurrency(numbers.ordinaryEarnings)}
      />
      {numbers.overtimePay > 0 && <PreviewRow label="Overtime Pay" value={formatCurrency(numbers.overtimePay)} />}
      <PreviewRow label="Gross Pay" value={formatCurrency(numbers.grossPay)} bold />
      {numbers.salarySacrifice > 0 && (
        <PreviewRow label="Pre-Tax Salary Sacrifice" value={`(${formatCurrency(numbers.salarySacrifice)})`} muted />
      )}
      <PreviewRow label="Taxable Gross" value={formatCurrency(numbers.taxableGross)} bold />

      {/* Deductions */}
      <PreviewSection title="DEDUCTIONS (PAYG WITHHOLDING)" />
      {numbers.incomeTax > 0 && <PreviewRow label="Income Tax" value={`(${formatCurrency(numbers.incomeTax)})`} />}
      {numbers.medicareLevy > 0 && <PreviewRow label="Medicare Levy (2%)" value={`(${formatCurrency(numbers.medicareLevy)})`} />}
      {numbers.helpRepayment > 0 && <PreviewRow label="HELP / HECS Repayment" value={`(${formatCurrency(numbers.helpRepayment)})`} />}
      {numbers.totalDeductions > 0 && <PreviewRow label="Total Deductions" value={`(${formatCurrency(numbers.totalDeductions)})`} bold />}

      {/* Net Pay */}
      <div style={{
        background: '#C84B2F',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.6rem 0.75rem',
        borderRadius: '4px',
        margin: '0.75rem 0',
        fontWeight: 700,
      }}>
        <span style={{ fontSize: '0.875rem' }}>NET PAY</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>{formatCurrency(numbers.netPay)}</span>
      </div>

      {/* Super */}
      <PreviewSection title={`SUPERANNUATION (${superRate} SG)`} />
      <PreviewRow label="Employer SG Contribution" value={formatCurrency(numbers.superSG)} />
      {numbers.superSalSac > 0 && <PreviewRow label="Salary Sacrifice Super" value={formatCurrency(numbers.superSalSac)} />}
      <PreviewRow label="Total Super This Period" value={formatCurrency(numbers.totalSuper)} bold />

      {/* YTD */}
      <PreviewSection title={ytdIsActual ? 'YEAR TO DATE' : 'YEAR TO DATE (ESTIMATED)'} />
      <PreviewRow label="Gross Earnings YTD" value={formatCurrency(numbers.ytdGross)} />
      <PreviewRow label="Tax Withheld YTD"   value={formatCurrency(numbers.ytdTax)} />
      <PreviewRow label="Super YTD"          value={formatCurrency(numbers.ytdSuper)} />

      <p style={{ fontSize: '0.625rem', color: '#C0BAB5', textAlign: 'center', marginTop: '1rem' }}>
        Generated by SAB Account AI · ATO-compliant PAYG withholding
      </p>
    </div>
  )
}

// ── Toggle switch component ────────────────────────────────────────────
function Toggle({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}
    >
      <div style={{
        width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
        background: checked ? 'var(--ember)' : 'var(--border)',
        position: 'relative', transition: 'background 150ms', marginTop: '2px',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', width: '14px', height: '14px', borderRadius: '50%',
          background: '#fff', top: '3px', left: checked ? '19px' : '3px',
          transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }} />
      </div>
      <div style={{ pointerEvents: 'none' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--char)', lineHeight: 1.3 }}>{label}</p>
        {hint && <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.125rem' }}>{hint}</p>}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function PayslipPage() {
  const router  = useRouter()
  useProfile()
  const { toast } = useToast()
  useEffect(() => { document.title = 'Payslips — SAB Account AI' }, [])

  const [biz, setBiz]   = useState<BizProfile | null>(null)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [form, setForm] = useState<PayslipForm>(makeForm('PS-…'))
  const [saving, setSaving] = useState(false)
  const [savedSlip, setSavedSlip] = useState<{ id: string; number: string } | null>(null)
  const [ytdPrev, setYtdPrev] = useState<{ gross: number; tax: number; super_: number } | null>(null)
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const effectiveAnnualSalary = form.pay_basis === 'hourly'
    ? form.hourly_rate * form.ordinary_hours * PERIODS_PER_YEAR[form.pay_cycle]
    : form.annual_salary

  const numbers: PayslipNumbers = calculatePayslip({
    annualSalary:          effectiveAnnualSalary,
    salarySacrifice:       form.salary_sacrifice,
    overtimeHours:         form.overtime_hours,
    overtimeRate:          form.overtime_rate,
    payCycle:              form.pay_cycle,
    claimingThreshold:     form.claiming_threshold,
    hasHELP:               form.has_help,
    medicareLevyExemption: form.medicare_exemption,
    useNewSuperRate:       form.use_new_super_rate,
    residencyStatus:       form.residency_status,
  })

  const ytdIsActual = ytdPrev !== null
  const displayNumbers: PayslipNumbers = ytdIsActual
    ? {
        ...numbers,
        ytdGross: Math.round((ytdPrev!.gross + numbers.grossPay) * 100) / 100,
        ytdTax:   Math.round((ytdPrev!.tax   + numbers.totalDeductions) * 100) / 100,
        ytdSuper: Math.round((ytdPrev!.super_ + numbers.totalSuper) * 100) / 100,
      }
    : numbers

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: bizData }, { data: lastSlip }, { data: empData }] = await Promise.all([
        supabase.from('business_profiles').select('business_name,abn,email,logo_url,super_rate_new').eq('id', user.id).single(),
        supabase.from('payslips').select('payslip_number').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('employees').select('id,name,email,employment_type,pay_cycle,pay_basis,annual_salary,hourly_rate,ordinary_hours,super_fund_name,member_number,residency_status').eq('user_id', user.id).order('name'),
      ])
      setBiz(bizData ?? null)
      setEmployees((empData ?? []) as EmployeeRecord[])
      const yr = new Date().getFullYear()
      const lastSeq = lastSlip?.payslip_number
        ? parseInt(lastSlip.payslip_number.split('-').pop() ?? '0', 10)
        : 0
      const num = `PS-${yr}-${String(lastSeq + 1).padStart(3, '0')}`
      setForm(makeForm(num, bizData?.business_name ?? '', bizData?.abn ?? '', bizData?.super_rate_new ?? true))
    }
    load()
  }, [])

  // Fetch real YTD from saved payslips whenever the employee name changes
  useEffect(() => {
    const name = form.employee_name.trim()
    if (!name) { setYtdPrev(null); return }
    const timer = setTimeout(async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Australian financial year: 1 July → 30 June
      const now = new Date()
      const fyYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
      const fyStart = `${fyYear}-07-01`
      const { data } = await supabase
        .from('payslips')
        .select('gross_pay, income_tax, medicare_levy, help_repayment, super_sg, super_sal_sac')
        .eq('user_id', user.id)
        .eq('employee_name', name)
        .gte('payment_date', fyStart)
      if (!data) return
      const totals = data.reduce(
        (acc, row) => ({
          gross:  acc.gross  + (row.gross_pay      ?? 0),
          tax:    acc.tax    + (row.income_tax      ?? 0) + (row.medicare_levy ?? 0) + (row.help_repayment ?? 0),
          super_: acc.super_ + (row.super_sg        ?? 0) + (row.super_sal_sac ?? 0),
        }),
        { gross: 0, tax: 0, super_: 0 },
      )
      setYtdPrev(totals)
    }, 400)
    return () => clearTimeout(timer)
  }, [form.employee_name])

  function setField<K extends keyof PayslipForm>(key: K, value: PayslipForm[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'pay_cycle') {
        const period = defaultPeriod(value as PayCycle)
        next.pay_period_start = period.start
        next.pay_period_end   = period.end
        next.ordinary_hours   = DEFAULT_HOURS[value as PayCycle]
      }
      if (key === 'residency_status') {
        next.medicare_exemption = isMedicareExemptByResidency(value as ResidencyStatus)
      }
      return next
    })
  }

  async function handleSave() {
    if (!form.employee_name.trim()) { toast('Employee name is required', 'error'); return }
    const hasEarnings = form.pay_basis === 'hourly'
      ? form.hourly_rate > 0 && form.ordinary_hours > 0
      : form.annual_salary > 0
    if (!hasEarnings) { toast('Pay details are required', 'error'); return }

    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('payslips').insert({
        user_id:           user.id,
        payslip_number:    form.payslip_number,
        employee_name:     form.employee_name,
        employment_type:   form.employment_type,
        pay_cycle:         form.pay_cycle,
        super_fund_name:   form.super_fund_name,
        member_number:     form.member_number,
        employer_name:     form.employer_name || (biz?.business_name ?? ''),
        employer_abn:      form.employer_abn  || (biz?.abn ?? ''),
        pay_period_start:  form.pay_period_start,
        pay_period_end:    form.pay_period_end,
        payment_date:      form.payment_date,
        gross_pay:         numbers.grossPay,
        salary_sacrifice:  numbers.salarySacrifice,
        taxable_gross:     numbers.taxableGross,
        income_tax:        numbers.incomeTax,
        medicare_levy:     numbers.medicareLevy,
        help_repayment:    numbers.helpRepayment,
        net_pay:           numbers.netPay,
        super_sg:          numbers.superSG,
        super_sal_sac:     numbers.superSalSac,
      }).select('id').single()

      if (error) throw error
      setSavedSlip({ id: data.id, number: form.payslip_number })
      if (form.employee_email) setEmailTo(form.employee_email)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadPDF() {
    try {
      const { downloadPayslipPDF } = await import('@/lib/pdf')
      await downloadPayslipPDF({
        payslip_number:    form.payslip_number,
        pay_period_start:  form.pay_period_start,
        pay_period_end:    form.pay_period_end,
        payment_date:      form.payment_date,
        employer_name:     form.employer_name || (biz?.business_name ?? ''),
        employer_abn:      (form.employer_abn || biz?.abn) ? formatABN(form.employer_abn || (biz?.abn ?? '')) : '',
        employee_name:     form.employee_name,
        employment_type:   form.employment_type,
        pay_cycle:         form.pay_cycle,
        pay_basis:         form.pay_basis,
        annual_salary:     effectiveAnnualSalary,
        hourly_rate:       form.hourly_rate,
        ordinary_hours:    form.ordinary_hours,
        super_fund_name:   form.super_fund_name,
        member_number:     form.member_number,
        use_new_super_rate: form.use_new_super_rate,
        claiming_threshold: form.claiming_threshold,
        has_help:          form.has_help,
        medicare_exempt:   form.medicare_exemption,
        residency_status:  form.residency_status,
        ytdIsActual,
        numbers:           displayNumbers,
        logo_url:          biz?.logo_url || undefined,
      })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'PDF generation failed', 'error')
    }
  }

  async function handleSendEmail() {
    if (!emailTo.trim()) { toast('Enter an email address', 'error'); return }
    setEmailSending(true)
    try {
      const { getPayslipPDFBase64 } = await import('@/lib/pdf')
      const pdfBase64 = await getPayslipPDFBase64({
        payslip_number:    form.payslip_number,
        pay_period_start:  form.pay_period_start,
        pay_period_end:    form.pay_period_end,
        payment_date:      form.payment_date,
        employer_name:     form.employer_name || (biz?.business_name ?? ''),
        employer_abn:      (form.employer_abn || biz?.abn) ? formatABN(form.employer_abn || (biz?.abn ?? '')) : '',
        employee_name:     form.employee_name,
        employment_type:   form.employment_type,
        pay_cycle:         form.pay_cycle,
        pay_basis:         form.pay_basis,
        annual_salary:     effectiveAnnualSalary,
        hourly_rate:       form.hourly_rate,
        ordinary_hours:    form.ordinary_hours,
        super_fund_name:   form.super_fund_name,
        member_number:     form.member_number,
        medicare_exempt:   form.medicare_exemption,
        residency_status:  form.residency_status,
        use_new_super_rate: form.use_new_super_rate,
        claiming_threshold: form.claiming_threshold,
        has_help:          form.has_help,
        ytdIsActual,
        numbers:           displayNumbers,
        logo_url:          biz?.logo_url || undefined,
      })

      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const payPeriod = `${formatDateAU(form.pay_period_start)} – ${formatDateAU(form.pay_period_end)}`
      const res = await fetch('/api/email/payslip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to:           emailTo.trim(),
          employeeName: form.employee_name,
          employerName: biz?.business_name ?? '',
          payslipNumber: form.payslip_number,
          netPay:       formatCurrency(displayNumbers.netPay),
          payPeriod,
          pdfBase64,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to send')
      setEmailSent(true)
      toast('Payslip sent successfully!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send email', 'error')
    } finally {
      setEmailSending(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────
  if (savedSlip) {
    return (
      <div style={{ maxWidth: '520px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.25rem' }}>
          ✓
        </div>
        <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          Payslip Saved!
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
          {savedSlip.number} · Net pay {formatCurrency(displayNumbers.netPay)}
        </p>

        {/* Send by email */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '1rem', textAlign: 'left' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.625rem' }}>
            Send payslip by email
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="sab-input"
              type="email"
              placeholder="employee@example.com"
              value={emailTo}
              onChange={e => { setEmailTo(e.target.value); setEmailSent(false) }}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleSendEmail}
              disabled={emailSending || emailSent}
              className="btn btn-char"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {emailSending && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
              {emailSending ? 'Sending…' : emailSent ? '✓ Sent' : 'Send Email'}
            </button>
          </div>
          {emailSent && (
            <p style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.5rem' }}>
              Payslip emailed to {emailTo}
            </p>
          )}
        </div>

        {/* Payday Super — due this pay run */}
        <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '1rem', textAlign: 'left' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#92400e', marginBottom: '0.75rem' }}>
            ⚡ Payday Super — Due This Pay Run
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'Amount',  value: formatCurrency(displayNumbers.totalSuper) },
              { label: 'Due',     value: 'Within 7 business days of payment date' },
              { label: 'Pay to',  value: form.super_fund_name || 'See employee super fund details' },
              { label: 'Method',  value: 'SuperStream' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8125rem' }}>
                <span style={{ color: '#78350f', fontWeight: 500, flexShrink: 0 }}>{row.label}</span>
                <span style={{ color: '#92400e', textAlign: 'right', fontFamily: row.label === 'Amount' ? 'var(--font-mono)' : 'inherit', fontWeight: row.label === 'Amount' ? 700 : 400 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={handleDownloadPDF} className="btn btn-ember" style={{ width: '100%' }}>
            Download PDF
          </button>
          <button
            onClick={() => {
              setSavedSlip(null)
              setEmailTo('')
              setEmailSent(false)
              setSelectedEmployeeId(null)
              const yr  = new Date().getFullYear()
              const nextNum = parseInt(savedSlip.number.split('-')[2] ?? '1') + 1
              setForm(makeForm(`PS-${yr}-${String(nextNum).padStart(3, '0')}`, form.employer_name, form.employer_abn, biz?.super_rate_new ?? true))
            }}
            className="btn btn-outline"
            style={{ width: '100%' }}
          >
            Create Another Payslip
          </button>
          <button onClick={() => router.push('/dashboard')} className="btn btn-ghost" style={{ width: '100%' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Main layout ───────────────────────────────────────────────────
  return (
    <PlanGate requiredPlan="pro">
      <div className="page-pad" style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Payday Super urgent banner */}
        <div style={{
          background: 'rgba(234,179,8,0.1)',
          border: '1px solid rgba(234,179,8,0.4)',
          borderRadius: 'var(--r)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.875rem',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0 }}>⚡</span>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e', marginBottom: '0.25rem' }}>
              New law from 1 July 2026: Super must be paid every payday — not quarterly.
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.6 }}>
              The ATO&apos;s own clearing house closes 1 July 2026. SAB Account AI calculates your exact super amount per pay run automatically — so you always know what&apos;s due and when.
            </p>
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Generate Payslip
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
            {form.payslip_number} · {getPaygScaleLabel(form.claiming_threshold, form.residency_status, form.medicare_exemption)}
            {' '}· Super {form.use_new_super_rate ? '12%' : '11.5%'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }} className="payslip-grid">

          {/* ── Left: form ──────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Employer */}
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Employer</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="form-grid-2">
                <div>
                  <label className="sab-label">Employer Name</label>
                  <input className="sab-input" placeholder="Your Business Pty Ltd" autoComplete="organization" value={form.employer_name} onChange={e => setField('employer_name', e.target.value)} />
                </div>
                <div>
                  <label className="sab-label">Employer ABN</label>
                  <input className="sab-input" placeholder="12 345 678 901" autoComplete="off" value={form.employer_abn} onChange={e => setField('employer_abn', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Employee Details */}
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Employee Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <AutocompleteDropdown
                  label="Select Employee"
                  placeholder="Search saved employees…"
                  items={employees.map(e => ({ id: e.id, label: e.name, sublabel: `${e.employment_type} · ${e.pay_cycle}` }))}
                  value={form.employee_name}
                  onSelect={item => {
                    const e = employees.find(x => x.id === item.id)
                    if (!e) return
                    setSelectedEmployeeId(e.id)
                    const cycle = e.pay_cycle as PayCycle
                    const period = defaultPeriod(cycle)
                    setForm(prev => ({
                      ...prev,
                      employee_name: e.name,
                      employee_email: e.email ?? '',
                      employment_type: e.employment_type,
                      pay_cycle: cycle,
                      pay_basis: e.pay_basis as PayBasis,
                      annual_salary: e.pay_basis === 'salary' && e.annual_salary ? e.annual_salary : prev.annual_salary,
                      hourly_rate: e.pay_basis === 'hourly' && e.hourly_rate ? e.hourly_rate : prev.hourly_rate,
                      ordinary_hours: e.ordinary_hours ?? DEFAULT_HOURS[cycle],
                      super_fund_name: e.super_fund_name ?? '',
                      member_number: e.member_number ?? '',
                      residency_status: e.residency_status as ResidencyStatus,
                      medicare_exemption: isMedicareExemptByResidency(e.residency_status as ResidencyStatus),
                      pay_period_start: period.start,
                      pay_period_end: period.end,
                    }))
                  }}
                  onChange={v => { setSelectedEmployeeId(null); setField('employee_name', v) }}
                  onClear={() => { setSelectedEmployeeId(null); setField('employee_name', '') }}
                />
                {selectedEmployeeId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#15803d', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                    <span>✓</span>
                    <span><strong>{form.employee_name}</strong> loaded from employee list</span>
                    <button onClick={() => { setSelectedEmployeeId(null); setField('employee_name', '') }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: '#15803d', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="form-grid-2">
                  <div>
                    <label className="sab-label">Employee Name <span style={{ color: 'var(--ember)' }}>*</span></label>
                    <input className="sab-input" placeholder="Jane Smith" autoComplete="name" value={form.employee_name}
                      onChange={e => { setField('employee_name', e.target.value); setSelectedEmployeeId(null) }} />
                  </div>
                  <div>
                    <label className="sab-label">Employee Email <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                    <input className="sab-input" type="email" placeholder="jane@example.com" autoComplete="email" value={form.employee_email}
                      onChange={e => setField('employee_email', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="form-grid-2">
                  <div>
                    <label className="sab-label">Employment Type</label>
                    <select className="sab-input" value={form.employment_type}
                      onChange={e => setField('employment_type', e.target.value)}>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>
                  <div>
                    <label className="sab-label">Pay Cycle</label>
                    <select className="sab-input" value={form.pay_cycle}
                      onChange={e => setField('pay_cycle', e.target.value as PayCycle)}>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="sab-label">Residency status for tax purposes</label>
                  <select className="sab-input" value={form.residency_status}
                    onChange={e => setField('residency_status', e.target.value as ResidencyStatus)}>
                    <option value="citizen_pr">Australian citizen or permanent resident</option>
                    <option value="student">International student (student visa)</option>
                    <option value="temp_work">Temporary work visa (482, 457, etc)</option>
                    <option value="whm">Working holiday maker (417 or 462 visa)</option>
                    <option value="partner">Partner or dependent visa (temporary)</option>
                    <option value="other_temp">Other temporary resident</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="form-grid-2">
                  <div>
                    <label className="sab-label">Super Fund Name <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                    <input className="sab-input" placeholder="AustralianSuper" autoComplete="off" value={form.super_fund_name}
                      onChange={e => setField('super_fund_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="sab-label">Member Number <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                    <input className="sab-input" placeholder="123456789" autoComplete="off" value={form.member_number}
                      onChange={e => setField('member_number', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Settings */}
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Tax Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* WHM warning */}
                {form.residency_status === 'whm' && (
                  <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e', marginBottom: '0.25rem' }}>
                      Working holiday maker — Schedule 15 rates apply
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#78350f', lineHeight: 1.5 }}>
                      Employer must be registered with the ATO for WHM tax. Rate: 15% on first $45,000, then 30% to $135,000, 37% to $190,000, 45% above. No tax-free threshold. No LITO. No Medicare levy.
                    </p>
                  </div>
                )}

                {/* Medicare exempt info box */}
                {isMedicareExemptByResidency(form.residency_status) && (
                  <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534', marginBottom: '0.25rem' }}>
                      Medicare levy exempt
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#166534', lineHeight: 1.5 }}>
                      Temporary residents and international students are not entitled to Medicare benefits and do not pay the 2% levy. Claim your exemption using a Medicare Entitlement Statement (MES) from Services Australia when lodging your tax return.
                    </p>
                  </div>
                )}

                {/* MLS warning — citizen/PR earning above $93k with Medicare */}
                {form.residency_status === 'citizen_pr' && effectiveAnnualSalary > 93000 && !form.medicare_exemption && (
                  <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e', marginBottom: '0.25rem' }}>
                      ⚠️ Medicare Levy Surcharge may apply
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#78350f', lineHeight: 1.5 }}>
                      Your income exceeds $93,000. If you do not hold private hospital cover, the ATO may charge an additional Medicare Levy Surcharge of 1.0%–1.5% when you lodge your tax return. This is NOT included in your PAYG withholding. Speak to your tax agent or visit ato.gov.au/mls
                    </p>
                  </div>
                )}

                {form.residency_status !== 'whm' && (
                  <Toggle
                    label="Claiming tax-free threshold (Scale 2)"
                    hint="Most Australian residents claim this. Untick for second jobs or non-residents (Scale 1)."
                    checked={form.claiming_threshold}
                    onChange={v => setField('claiming_threshold', v)}
                  />
                )}
                <Toggle
                  label="Has HELP / HECS debt"
                  hint="Enables HELP repayment withholding based on ATO 2024-25 thresholds."
                  checked={form.has_help}
                  onChange={v => setField('has_help', v)}
                />
                {form.residency_status === 'citizen_pr' && (
                  <Toggle
                    label="Apply Medicare levy (2%)"
                    hint="Turn off only if employee holds a valid Medicare levy exemption certificate."
                    checked={!form.medicare_exemption}
                    onChange={v => setField('medicare_exemption', !v)}
                  />
                )}
                <Toggle
                  label="Super at 12% (from 1 July 2025)"
                  hint="Untick to use the previous 11.5% rate for periods before 1 July 2025."
                  checked={form.use_new_super_rate}
                  onChange={v => setField('use_new_super_rate', v)}
                />
              </div>
            </div>

            {/* Pay Details */}
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)' }}>Pay Details</h3>
                {/* Pay basis switcher */}
                <div style={{ display: 'flex', background: 'var(--cream2)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                  {(['salary', 'hourly'] as PayBasis[]).map(basis => (
                    <button key={basis}
                      type="button"
                      onClick={() => setField('pay_basis', basis)}
                      style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        border: 'none',
                        cursor: 'pointer',
                        background: form.pay_basis === basis ? '#ffffff' : 'transparent',
                        color: form.pay_basis === basis ? 'var(--char)' : 'var(--text3)',
                        boxShadow: form.pay_basis === basis ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 150ms',
                      }}
                    >
                      {basis === 'salary' ? 'Annual Salary' : 'Hourly Rate'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="form-grid-2">

                {/* ── Annual Salary mode ── */}
                {form.pay_basis === 'salary' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="sab-label">Annual Salary (ex super) <span style={{ color: 'var(--ember)' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                      <input type="number" min={0} step={1000} className="sab-input" placeholder="75000"
                        value={form.annual_salary || ''}
                        onChange={e => setField('annual_salary', parseFloat(e.target.value) || 0)}
                        onWheel={e => (e.target as HTMLInputElement).blur()}
                        style={{ paddingLeft: '1.5rem' }} />
                    </div>
                    {form.annual_salary > 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.25rem' }}>
                        {form.pay_cycle === 'weekly'      && `Weekly: ${formatCurrency(Math.round(form.annual_salary / 52))}`}
                        {form.pay_cycle === 'fortnightly' && `Fortnightly: ${formatCurrency(Math.round(form.annual_salary / 26))}`}
                        {form.pay_cycle === 'monthly'     && `Monthly: ${formatCurrency(Math.round(form.annual_salary / 12))}`}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Hourly Rate mode ── */}
                {form.pay_basis === 'hourly' && (<>
                  <div>
                    <label className="sab-label">Hourly Rate <span style={{ color: 'var(--ember)' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                      <input type="number" min={0} step={0.5} className="sab-input" placeholder="35.00"
                        value={form.hourly_rate || ''}
                        onChange={e => setField('hourly_rate', parseFloat(e.target.value) || 0)}
                        onWheel={e => (e.target as HTMLInputElement).blur()}
                        style={{ paddingLeft: '1.5rem' }} />
                    </div>
                  </div>
                  <div>
                    <label className="sab-label">Ordinary Hours This Period <span style={{ color: 'var(--ember)' }}>*</span></label>
                    <input type="number" min={0} step={0.5} className="sab-input"
                      placeholder={String(DEFAULT_HOURS[form.pay_cycle])}
                      value={form.ordinary_hours || ''}
                      onChange={e => setField('ordinary_hours', parseFloat(e.target.value) || 0)}
                      onWheel={e => (e.target as HTMLInputElement).blur()} />
                  </div>
                  {form.hourly_rate > 0 && form.ordinary_hours > 0 && (
                    <p style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: 'var(--text3)', marginTop: '-0.25rem' }}>
                      Ordinary pay this period: {formatCurrency(form.hourly_rate * form.ordinary_hours)}
                      {' · '}Effective annual: {formatCurrency(Math.round(form.hourly_rate * form.ordinary_hours * PERIODS_PER_YEAR[form.pay_cycle]))}
                    </p>
                  )}
                </>)}

                {/* Shared: salary sacrifice + overtime */}
                <div>
                  <label className="sab-label">Salary Sacrifice to Super (annual amount)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                    <input type="number" min={0} step={form.pay_basis === 'salary' ? 100 : 10} className="sab-input" placeholder="0"
                      value={form.salary_sacrifice || ''}
                      onChange={e => setField('salary_sacrifice', parseFloat(e.target.value) || 0)}
                      onWheel={e => (e.target as HTMLInputElement).blur()}
                      style={{ paddingLeft: '1.5rem' }} />
                  </div>
                </div>
                <div>
                  <label className="sab-label">Overtime Hours (this period)</label>
                  <input type="number" min={0} step={0.5} className="sab-input" placeholder="0"
                    value={form.overtime_hours || ''}
                    onChange={e => setField('overtime_hours', parseFloat(e.target.value) || 0)}
                    onWheel={e => (e.target as HTMLInputElement).blur()} />
                </div>
                {form.overtime_hours > 0 && (
                  <div>
                    <label className="sab-label">Overtime Rate (per hour)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                      <input type="number" min={0} step={0.5} className="sab-input" placeholder="0"
                        value={form.overtime_rate || ''}
                        onChange={e => setField('overtime_rate', parseFloat(e.target.value) || 0)}
                        onWheel={e => (e.target as HTMLInputElement).blur()}
                        style={{ paddingLeft: '1.5rem' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pay Period */}
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Pay Period</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }} className="form-grid-3">
                {([
                  ['pay_period_start', 'Period Start'],
                  ['pay_period_end',   'Period End'],
                  ['payment_date',     'Payment Date'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="sab-label">{label}</label>
                    <input type="date" className="sab-input"
                      value={form[key]}
                      onChange={e => setField(key, e.target.value)} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label className="sab-label">Payslip Number</label>
                <input className="sab-input" value={form.payslip_number}
                  onChange={e => setField('payslip_number', e.target.value)} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', paddingBottom: '2rem' }}>
              <button onClick={handleSave} disabled={saving} className="btn btn-ember" style={{ flex: 1 }}>
                {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
                {saving ? 'Saving…' : 'Save Payslip'}
              </button>
              <button onClick={handleDownloadPDF} className="btn btn-char" style={{ flex: 1 }}>
                ↓ Download PDF
              </button>
            </div>
          </div>

          {/* ── Right: live preview ──────────────────────────────── */}
          <div style={{ position: 'sticky', top: '76px' }} className="payslip-preview-col">
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text2)', marginBottom: '0.75rem' }}>Live Preview</p>
            <div style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
              <PayslipPreview form={form} biz={biz} numbers={displayNumbers} ytdIsActual={ytdIsActual} />
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .payslip-grid { grid-template-columns: 1fr !important; }
            .payslip-preview-col { display: none !important; }
            .form-grid-2 { grid-template-columns: 1fr !important; }
            .form-grid-3 { grid-template-columns: 1fr 1fr !important; }
          }
          @media (max-width: 640px) {
            .form-grid-3 { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>

      <ReferralBanner
        triggerId="payslip_saved"
        trigger={!!savedSlip}
        emoji="🧾"
        title="Payslip generated!"
        description="Help a fellow business owner → Share SAB Account AI → earn free months"
      />
    </PlanGate>
  )
}
