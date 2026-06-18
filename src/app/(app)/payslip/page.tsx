'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { useProfile } from '@/app/(app)/profile-context'
import { useToast } from '@/components/ui/Toast'
import PlanGate from '@/components/ui/PlanGate'
import ReferralBanner from '@/components/ui/ReferralBanner'
import AutocompleteDropdown from '@/components/ui/AutocompleteDropdown'
import { calculatePayslip, isMedicareExemptByResidency, getPaygScaleLabel, PERIODS_PER_YEAR, type PayslipNumbers, type ResidencyStatus } from '@/lib/ato'
import { formatCurrency, formatDateAU, todayISO, addDays, formatABN } from '@/lib/utils'
import { getAwardRates, pct } from '@/lib/award-rates'

// ── Types ─────────────────────────────────────────────────────────────
type PayCycle = 'weekly' | 'fortnightly' | 'monthly'
type PayBasis = 'salary' | 'hourly'

interface PayItem {
  id: string
  description: string
  hours: number
  rate: number
}

const DEFAULT_HOURS: Record<PayCycle, number> = { weekly: 38, fortnightly: 76, monthly: 165 }
const LEAVE_LOADING_RATE = 0.175

interface EmployeeRecord {
  id: string
  name: string
  email: string | null
  tfn: string | null
  employment_type: string
  pay_cycle: string
  pay_basis: string
  annual_salary: number | null
  hourly_rate: number | null
  ordinary_hours: number | null
  super_fund_name: string | null
  member_number: string | null
  residency_status: string
  annual_leave_hours: number | null
  personal_leave_hours: number | null
  claiming_threshold: boolean | null
  has_help: boolean | null
}

function calcLeaveAccrual(cycle: PayCycle, ordinaryHours: number) {
  const hoursPerWeek = cycle === 'weekly' ? ordinaryHours
    : cycle === 'fortnightly' ? ordinaryHours / 2
    : ordinaryHours * 12 / 52
  const periods = cycle === 'weekly' ? 52 : cycle === 'fortnightly' ? 26 : 12
  return {
    annual:   Math.round(hoursPerWeek * 4 / periods * 100) / 100,
    personal: Math.round(hoursPerWeek * 2 / periods * 100) / 100,
  }
}

interface PayslipForm {
  payslip_number:       string
  employer_name:        string
  employer_abn:         string
  employer_address:     string
  employee_name:        string
  employee_tfn:         string
  employment_type:      string
  pay_cycle:            PayCycle
  pay_basis:            PayBasis
  residency_status:     ResidencyStatus
  claiming_threshold:   boolean
  has_help:             boolean
  medicare_exemption:   boolean
  annual_salary:        number
  hourly_rate:          number
  ordinary_hours:       number
  salary_sacrifice:     number
  overtime_hours:       number
  overtime_rate:        number
  employee_email:       string
  super_fund_name:      string
  member_number:        string
  pay_period_start:     string
  pay_period_end:       string
  payment_date:         string
  allowances:           Array<{ id: string; description: string; amount: number }>
  payItems:             PayItem[]
  annual_leave_hours:   number | null
  personal_leave_hours: number | null
  annual_leave_taken:   number
  personal_leave_taken: number
  leave_loading_enabled: boolean
}

interface BizProfile {
  business_name: string
  abn: string
  email: string
  logo_url?: string
  industry?: string | null
  sat_rate_mult?: number | null
  sun_rate_mult?: number | null
  ph_rate_mult?: number | null
  evening_rate_mult?: number | null
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

function makeForm(num: string, employerName = '', employerAbn = '', employerAddress = ''): PayslipForm {
  const today  = todayISO()
  const cycle: PayCycle = 'fortnightly'
  const period = defaultPeriod(cycle)
  return {
    payslip_number:       num,
    employer_name:        employerName,
    employer_abn:         employerAbn,
    employer_address:     employerAddress,
    employee_name:        '',
    employee_tfn:         '',
    employment_type:      'full-time',
    pay_cycle:            cycle,
    pay_basis:            'salary',
    residency_status:     'citizen_pr',
    claiming_threshold:   true,
    has_help:             false,
    medicare_exemption:   false,
    annual_salary:        0,
    hourly_rate:          0,
    ordinary_hours:       76,
    salary_sacrifice:     0,
    overtime_hours:       0,
    overtime_rate:        0,
    employee_email:       '',
    super_fund_name:      '',
    member_number:        '',
    pay_period_start:     period.start,
    pay_period_end:       period.end,
    payment_date:         today,
    allowances:           [],
    payItems:             [],
    annual_leave_hours:   null,
    personal_leave_hours: null,
    annual_leave_taken:   0,
    personal_leave_taken: 0,
    leave_loading_enabled: true,
  }
}

// ── Stable sub-components ─────────────────────────────────────────────
function PreviewRow({ label, value, bold, muted, indent }: {
  label: string; value: string; bold?: boolean; muted?: boolean; indent?: boolean
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0',
      paddingLeft: indent ? '0.75rem' : 0, borderBottom: '1px solid #F0EBE3',
      fontSize: '0.8rem', fontWeight: bold ? 700 : 400, color: muted ? '#A09590' : '#1C1917',
    }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  )
}

function PreviewSection({ title }: { title: string }) {
  return (
    <div style={{
      background: '#F5F0E8', padding: '0.3rem 0.5rem',
      fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', color: '#A09590',
      margin: '0.75rem 0 0.25rem', borderRadius: '3px',
    }}>
      {title}
    </div>
  )
}

function PayslipPreview({ form, biz, numbers, ytdIsActual, payItemsThisPeriod, leaveLoadingAmount }: {
  form: PayslipForm
  biz: BizProfile | null
  numbers: PayslipNumbers
  ytdIsActual?: boolean
  payItemsThisPeriod: number
  leaveLoadingAmount: number
}) {
  const superRate  = new Date(form.payment_date) >= new Date('2025-07-01') ? '12%' : '11.5%'
  const allExtras  = payItemsThisPeriod + leaveLoadingAmount

  return (
    <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', fontSize: '0.8125rem', color: '#1C1917' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>{biz?.business_name || 'Your Business'}</p>
          {biz?.abn && <p style={{ fontSize: '0.75rem', color: '#A09590' }}>ABN: {formatABN(biz.abn)}</p>}
        </div>
        <div style={{ background: '#1C1917', color: '#fff', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', padding: '0.25rem 0.625rem', borderRadius: '3px' }}>PAYSLIP</div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E5DDD5', margin: '0.75rem 0' }} />

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

      <PreviewSection title="EARNINGS" />
      <PreviewRow
        label={form.pay_basis === 'hourly' && form.hourly_rate > 0
          ? `Ordinary Earnings (${form.ordinary_hours} hrs @ ${formatCurrency(form.hourly_rate)}/hr)`
          : `Ordinary Earnings (${form.pay_cycle})`}
        value={formatCurrency(numbers.ordinaryEarnings - allExtras)}
      />
      {leaveLoadingAmount > 0 && (
        <PreviewRow label={`Leave Loading (17.5% × ${form.annual_leave_taken} hrs)`} value={formatCurrency(leaveLoadingAmount)} />
      )}
      {form.payItems.filter(i => i.hours > 0 && i.rate > 0).map(item => (
        <PreviewRow key={item.id} label={item.description || 'Additional Earnings'} value={formatCurrency(item.hours * item.rate)} />
      ))}
      <PreviewRow label="Gross Pay" value={formatCurrency(numbers.grossPay)} bold />
      {numbers.salarySacrifice > 0 && (
        <PreviewRow label="Pre-Tax Salary Sacrifice" value={`(${formatCurrency(numbers.salarySacrifice)})`} muted />
      )}
      <PreviewRow label="Taxable Gross" value={formatCurrency(numbers.taxableGross)} bold />

      <PreviewSection title="DEDUCTIONS (PAYG WITHHOLDING)" />
      {numbers.incomeTax    > 0 && <PreviewRow label="Income Tax"             value={`(${formatCurrency(numbers.incomeTax)})`} />}
      {numbers.medicareLevy > 0 && <PreviewRow label="Medicare Levy (2%)"    value={`(${formatCurrency(numbers.medicareLevy)})`} />}
      {numbers.helpRepayment > 0 && <PreviewRow label="HELP / HECS Repayment" value={`(${formatCurrency(numbers.helpRepayment)})`} />}
      {numbers.totalDeductions > 0 && <PreviewRow label="Total Deductions"    value={`(${formatCurrency(numbers.totalDeductions)})`} bold />}

      <div style={{ background: '#C84B2F', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: '4px', margin: '0.75rem 0', fontWeight: 700 }}>
        <span style={{ fontSize: '0.875rem' }}>NET PAY</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>{formatCurrency(numbers.netPay)}</span>
      </div>

      <PreviewSection title={`SUPERANNUATION (${superRate} SG)`} />
      <PreviewRow label="Employer SG Contribution" value={formatCurrency(numbers.superSG)} />
      {numbers.superSalSac > 0 && <PreviewRow label="Salary Sacrifice Super" value={formatCurrency(numbers.superSalSac)} />}
      <PreviewRow label="Total Super This Period"   value={formatCurrency(numbers.totalSuper)} bold />

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

function Toggle({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div onClick={() => onChange(!checked)} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0, background: checked ? 'var(--ember)' : 'var(--border)', position: 'relative', transition: 'background 150ms', marginTop: '2px', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', top: '3px', left: checked ? '19px' : '3px', transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', pointerEvents: 'none' }} />
      </div>
      <div style={{ pointerEvents: 'none' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--char)', lineHeight: 1.3 }}>{label}</p>
        {hint && <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.125rem' }}>{hint}</p>}
      </div>
    </div>
  )
}

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const labels = ['Employee', 'Pay Period', 'Review']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
      {labels.flatMap((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const done   = current > n
        const active = current === n
        const items = [
          <div key={`step-${n}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: done ? '#22c55e' : active ? 'var(--ember)' : 'var(--cream3)',
              color: done || active ? '#fff' : 'var(--text3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8125rem', fontWeight: 700, transition: 'all 200ms',
            }}>
              {done ? '✓' : n}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: active ? 600 : 400, color: active ? 'var(--char)' : 'var(--text3)', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>,
        ]
        if (i < labels.length - 1) {
          items.push(
            <div key={`line-${n}`} style={{ flex: 1, height: 2, background: current > n ? '#22c55e' : 'var(--border)', margin: '0 0.375rem', marginBottom: '1.375rem', transition: 'background 200ms' }} />
          )
        }
        return items
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function PayslipPage() {
  const router = useRouter()
  useProfile()
  const { toast } = useToast()
  useEffect(() => { document.title = 'Payslips — SAB Account AI' }, [])

  // ── State ────────────────────────────────────────────────────────
  const [step, setStep]         = useState<1 | 2 | 3>(1)
  const [hasUnusual, setHasUnusual] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showInlineRateEditor, setShowInlineRateEditor] = useState(false)
  const [standardOrdinaryHours, setStandardOrdinaryHours] = useState(76)
  const [ordinaryHoursOverridden, setOrdinaryHoursOverridden] = useState(false)

  const [biz, setBiz]           = useState<BizProfile | null>(null)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [leaveBalanceBase, setLeaveBalanceBase] = useState<{ annual: number | null; personal: number | null }>({ annual: null, personal: null })
  const [form, setForm]         = useState<PayslipForm>(makeForm('PS-…'))
  const [saving, setSaving]     = useState(false)
  const [savedSlip, setSavedSlip] = useState<{ id: string; number: string } | null>(null)
  const [ytdPrev, setYtdPrev]   = useState<{ gross: number; tax: number; super_: number } | null>(null)
  const [emailTo, setEmailTo]   = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent]       = useState(false)

  // ── Derived values ────────────────────────────────────────────────
  const payItemsThisPeriod = form.payItems.reduce((s, item) => s + item.hours * item.rate, 0)
  const derivedHourlyRate  = form.pay_basis === 'hourly'
    ? form.hourly_rate
    : form.annual_salary / PERIODS_PER_YEAR[form.pay_cycle] / DEFAULT_HOURS[form.pay_cycle]
  const leaveLoadingAmount = (form.leave_loading_enabled && form.annual_leave_taken > 0)
    ? Math.round(derivedHourlyRate * form.annual_leave_taken * LEAVE_LOADING_RATE * 100) / 100
    : 0
  const allExtras = payItemsThisPeriod + leaveLoadingAmount
  const effectiveAnnualSalary = form.pay_basis === 'hourly'
    ? (form.hourly_rate * form.ordinary_hours + allExtras) * PERIODS_PER_YEAR[form.pay_cycle]
    : form.annual_salary + allExtras * PERIODS_PER_YEAR[form.pay_cycle]

  const numbers: PayslipNumbers = calculatePayslip({
    annualSalary:          effectiveAnnualSalary,
    salarySacrifice:       form.salary_sacrifice,
    overtimeHours:         form.overtime_hours,
    overtimeRate:          form.overtime_rate,
    payCycle:              form.pay_cycle,
    claimingThreshold:     form.claiming_threshold,
    hasHELP:               form.has_help,
    medicareLevyExemption: form.medicare_exemption,
    paymentDate:           new Date(form.payment_date),
    residencyStatus:       form.residency_status,
  })

  const ytdIsActual = ytdPrev !== null
  const displayNumbers: PayslipNumbers = ytdIsActual
    ? {
        ...numbers,
        ytdGross: Math.round((ytdPrev!.gross  + numbers.grossPay)       * 100) / 100,
        ytdTax:   Math.round((ytdPrev!.tax    + numbers.totalDeductions) * 100) / 100,
        ytdSuper: Math.round((ytdPrev!.super_ + numbers.totalSuper)      * 100) / 100,
      }
    : numbers

  // ── Data loading ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: { session } } = await supabase.auth.getSession()
      const [{ data: bizData }, { data: lastSlip }, empRes] = await Promise.all([
        supabase.from('business_profiles').select('business_name,abn,address,email,logo_url,industry,sat_rate_mult,sun_rate_mult,ph_rate_mult,evening_rate_mult').eq('id', user.id).single(),
        supabase.from('payslips').select('payslip_number').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        fetch('/api/employees', { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } }),
      ])
      setBiz(bizData ?? null)
      setEmployees(empRes.ok ? (await empRes.json() as EmployeeRecord[]) : [])
      const yr     = new Date().getFullYear()
      const lastSeq = lastSlip?.payslip_number
        ? parseInt(lastSlip.payslip_number.split('-').pop() ?? '0', 10)
        : 0
      const num = `PS-${yr}-${String(lastSeq + 1).padStart(3, '0')}`
      setForm(makeForm(num, bizData?.business_name ?? '', bizData?.abn ?? '', bizData?.address ?? ''))
    }
    load()
  }, [])

  // Fetch real YTD from saved payslips when employee name changes
  useEffect(() => {
    const name = form.employee_name.trim()
    if (!name) { setYtdPrev(null); return }
    const timer = setTimeout(async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
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

  // Auto-subtract penalty pay item hours from ordinary hours for hourly employees
  useEffect(() => {
    if (ordinaryHoursOverridden || form.pay_basis !== 'hourly') return
    const payItemHours = form.payItems.reduce((s, i) => s + (i.hours || 0), 0)
    const computed = Math.max(0, standardOrdinaryHours - payItemHours)
    setForm(prev => ({ ...prev, ordinary_hours: computed }))
  }, [form.payItems, form.pay_basis, standardOrdinaryHours, ordinaryHoursOverridden])

  // ── Field updater ─────────────────────────────────────────────────
  function setField<K extends keyof PayslipForm>(key: K, value: PayslipForm[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'pay_cycle') {
        const period = defaultPeriod(value as PayCycle)
        next.pay_period_start = period.start
        next.pay_period_end   = period.end
        next.ordinary_hours   = DEFAULT_HOURS[value as PayCycle]
        if (leaveBalanceBase.annual != null || leaveBalanceBase.personal != null) {
          const accrual = calcLeaveAccrual(value as PayCycle, DEFAULT_HOURS[value as PayCycle])
          if (leaveBalanceBase.annual   != null) next.annual_leave_hours   = Math.round((leaveBalanceBase.annual   + accrual.annual)   * 100) / 100
          if (leaveBalanceBase.personal != null) next.personal_leave_hours = Math.round((leaveBalanceBase.personal + accrual.personal) * 100) / 100
        }
      }
      if (key === 'ordinary_hours') {
        if (leaveBalanceBase.annual != null || leaveBalanceBase.personal != null) {
          const accrual = calcLeaveAccrual(prev.pay_cycle, Number(value))
          if (leaveBalanceBase.annual   != null) next.annual_leave_hours   = Math.round((leaveBalanceBase.annual   + accrual.annual)   * 100) / 100
          if (leaveBalanceBase.personal != null) next.personal_leave_hours = Math.round((leaveBalanceBase.personal + accrual.personal) * 100) / 100
        }
      }
      if (key === 'residency_status') {
        next.medicare_exemption = isMedicareExemptByResidency(value as ResidencyStatus)
      }
      return next
    })
  }

  // ── Handlers ──────────────────────────────────────────────────────
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
        user_id:          user.id,
        payslip_number:   form.payslip_number,
        employee_name:    form.employee_name,
        employment_type:  form.employment_type,
        pay_cycle:        form.pay_cycle,
        super_fund_name:  form.super_fund_name,
        member_number:    form.member_number,
        employer_name:    form.employer_name || (biz?.business_name ?? ''),
        employer_abn:     form.employer_abn  || (biz?.abn ?? ''),
        pay_period_start: form.pay_period_start,
        pay_period_end:   form.pay_period_end,
        payment_date:     form.payment_date,
        gross_pay:            numbers.grossPay,
        salary_sacrifice:     numbers.salarySacrifice,
        taxable_gross:        numbers.taxableGross,
        income_tax:           numbers.incomeTax,
        medicare_levy:        numbers.medicareLevy,
        help_repayment:       numbers.helpRepayment,
        net_pay:              numbers.netPay,
        super_sg:             numbers.superSG,
        super_sal_sac:        numbers.superSalSac,
        pay_items:            form.payItems.filter(i => i.hours > 0 && i.rate > 0).map(({ description, hours, rate }) => ({ description, hours, rate })),
        allowances:           form.allowances.filter(a => a.amount > 0),
        leave_loading_amount: leaveLoadingAmount > 0 ? leaveLoadingAmount : 0,
      }).select('id').single()

      if (error) throw error
      setSavedSlip({ id: data.id, number: form.payslip_number })
      if (form.employee_email) setEmailTo(form.employee_email)

      if (form.annual_leave_hours  != null && form.annual_leave_taken  > form.annual_leave_hours)
        toast('Annual leave taken exceeds balance — closing balance set to 0', 'warning')
      if (form.personal_leave_hours != null && form.personal_leave_taken > form.personal_leave_hours)
        toast('Personal leave taken exceeds balance — closing balance set to 0', 'warning')

      const resolvedEmpId = selectedEmployeeId ?? null
      if (resolvedEmpId && (form.annual_leave_hours != null || form.personal_leave_hours != null)) {
        const newAnnual   = form.annual_leave_hours   != null ? Math.max(0, Math.round((form.annual_leave_hours   - form.annual_leave_taken)   * 100) / 100) : null
        const newPersonal = form.personal_leave_hours != null ? Math.max(0, Math.round((form.personal_leave_hours - form.personal_leave_taken) * 100) / 100) : null
        await supabase.from('employees').update({
          ...(newAnnual   != null && { annual_leave_hours:   newAnnual }),
          ...(newPersonal != null && { personal_leave_hours: newPersonal }),
        }).eq('id', resolvedEmpId)
        setEmployees(prev => prev.map(e => e.id === resolvedEmpId ? {
          ...e,
          annual_leave_hours:   newAnnual   ?? e.annual_leave_hours,
          personal_leave_hours: newPersonal ?? e.personal_leave_hours,
        } : e))
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  function buildPDFParams() {
    return {
      payslip_number:     form.payslip_number,
      pay_period_start:   form.pay_period_start,
      pay_period_end:     form.pay_period_end,
      payment_date:       form.payment_date,
      employer_name:      form.employer_name || (biz?.business_name ?? ''),
      employer_abn:       (form.employer_abn || biz?.abn) ? formatABN(form.employer_abn || (biz?.abn ?? '')) : '',
      employer_address:   form.employer_address || undefined,
      employee_name:      form.employee_name,
      employee_tfn:       form.employee_tfn || undefined,
      employment_type:    form.employment_type,
      pay_cycle:          form.pay_cycle,
      pay_basis:          form.pay_basis,
      annual_salary:      form.pay_basis === 'salary' ? form.annual_salary : effectiveAnnualSalary,
      hourly_rate:        form.hourly_rate,
      ordinary_hours:     form.ordinary_hours,
      super_fund_name:    form.super_fund_name,
      member_number:      form.member_number,
      claiming_threshold: form.claiming_threshold,
      has_help:           form.has_help,
      medicare_exempt:    form.medicare_exemption,
      residency_status:   form.residency_status,
      ytdIsActual,
      numbers:            displayNumbers,
      logo_url:           biz?.logo_url || undefined,
      allowances:         form.allowances.filter(a => a.amount > 0),
      payItems:           form.payItems.filter(i => i.hours > 0 && i.rate > 0).map(({ description, hours, rate }) => ({ description, hours, rate })),
      leave_loading_amount:  leaveLoadingAmount > 0 ? leaveLoadingAmount : undefined,
      annual_leave_hours:    form.annual_leave_hours   != null ? Math.max(0, Math.round((form.annual_leave_hours   - form.annual_leave_taken)   * 100) / 100) : undefined,
      personal_leave_hours:  form.personal_leave_hours != null ? Math.max(0, Math.round((form.personal_leave_hours - form.personal_leave_taken) * 100) / 100) : undefined,
    }
  }

  async function handleDownloadPDF() {
    try {
      const { downloadPayslipPDF } = await import('@/lib/pdf')
      await downloadPayslipPDF(buildPDFParams())
    } catch (err) {
      toast(err instanceof Error ? err.message : 'PDF generation failed', 'error')
    }
  }

  async function handleSendEmail() {
    if (!emailTo.trim()) { toast('Enter an email address', 'error'); return }
    setEmailSending(true)
    try {
      const { getPayslipPDFBase64 } = await import('@/lib/pdf')
      const pdfBase64 = await getPayslipPDFBase64(buildPDFParams())
      const supabase  = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const payPeriod = `${formatDateAU(form.pay_period_start)} – ${formatDateAU(form.pay_period_end)}`
      const res = await fetch('/api/email/payslip', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ to: emailTo.trim(), employeeName: form.employee_name, employerName: biz?.business_name ?? '', payslipNumber: form.payslip_number, netPay: formatCurrency(displayNumbers.netPay), payPeriod, pdfBase64 }),
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
        <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.25rem' }}>✓</div>
        <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Payslip Saved!</h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
          {savedSlip.number} · Net pay {formatCurrency(displayNumbers.netPay)}
        </p>

        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '1rem', textAlign: 'left' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.625rem' }}>Send payslip by email</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="sab-input" type="email" placeholder="employee@example.com" value={emailTo} onChange={e => { setEmailTo(e.target.value); setEmailSent(false) }} style={{ flex: 1 }} />
            <button onClick={handleSendEmail} disabled={emailSending || emailSent} className="btn btn-char" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              {emailSending && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
              {emailSending ? 'Sending…' : emailSent ? '✓ Sent' : 'Send Email'}
            </button>
          </div>
          {emailSent && <p style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.5rem' }}>Payslip emailed to {emailTo}</p>}
        </div>

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
          <button onClick={handleDownloadPDF} className="btn btn-ember" style={{ width: '100%' }}>Download PDF</button>
          <button
            onClick={() => {
              setSavedSlip(null)
              setEmailTo('')
              setEmailSent(false)
              setSelectedEmployeeId(null)
              setStep(1)
              setHasUnusual(false)
              const yr      = new Date().getFullYear()
              const nextNum = parseInt(savedSlip.number.split('-')[2] ?? '1') + 1
              setForm(makeForm(`PS-${yr}-${String(nextNum).padStart(3, '0')}`, form.employer_name, form.employer_abn))
            }}
            className="btn btn-outline"
            style={{ width: '100%' }}
          >
            Create Another Payslip
          </button>
          <button onClick={() => router.push('/dashboard')} className="btn btn-ghost" style={{ width: '100%' }}>Back to Dashboard</button>
        </div>
      </div>
    )
  }

  // ── Wizard wrapper ────────────────────────────────────────────────
  return (
    <PlanGate requiredPlan="pro">
      <div className="page-pad" style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Payday Super banner */}
        <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: 'var(--r)', padding: '0.875rem 1.25rem', marginBottom: '1.75rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.125rem', lineHeight: 1, flexShrink: 0 }}>⚡</span>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e', marginBottom: '0.125rem' }}>New law from 1 July 2026: Super must be paid every payday — not quarterly.</p>
            <p style={{ fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.5 }}>SAB Account AI calculates your exact super amount per pay run automatically.</p>
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Generate Payslip</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>{form.payslip_number}</p>
        </div>

        <StepIndicator current={step} />

        {/* ── STEP 1: Employee ─────────────────────────────────── */}
        {step === 1 && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>

            {/* Employee card */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Who are you paying?</h3>

              <AutocompleteDropdown
                label="Select Employee"
                placeholder="Search saved employees…"
                items={employees.map(e => ({ id: e.id, label: e.name, sublabel: `${e.employment_type} · ${e.pay_cycle}` }))}
                value={form.employee_name}
                onSelect={item => {
                  const e = employees.find(x => x.id === item.id)
                  if (!e) return
                  setSelectedEmployeeId(e.id)
                  const cycle  = e.pay_cycle as PayCycle
                  const period = defaultPeriod(cycle)
                  const hours  = e.ordinary_hours ?? DEFAULT_HOURS[cycle]
                  const accrual = calcLeaveAccrual(cycle, hours)
                  const isPermanent     = e.employment_type !== 'casual'
                  const openingAnnual   = isPermanent ? (e.annual_leave_hours   ?? 0) : e.annual_leave_hours
                  const openingPersonal = isPermanent ? (e.personal_leave_hours ?? 0) : e.personal_leave_hours
                  setLeaveBalanceBase({ annual: openingAnnual, personal: openingPersonal })
                  const annualLeave   = openingAnnual   != null ? Math.round((openingAnnual   + accrual.annual)   * 100) / 100 : null
                  const personalLeave = openingPersonal != null ? Math.round((openingPersonal + accrual.personal) * 100) / 100 : null
                  // Auto-detect basis: if stored as salary but no salary set and hourly_rate exists, switch
                  const detectedBasis: PayBasis =
                    (e.pay_basis === 'salary' && !(e.annual_salary) && (e.hourly_rate ?? 0) > 0)
                      ? 'hourly'
                      : e.pay_basis as PayBasis
                  const detectedRateOk = detectedBasis === 'salary'
                    ? (e.annual_salary ?? 0) > 0
                    : (e.hourly_rate ?? 0) > 0
                  setShowInlineRateEditor(!detectedRateOk)
                  setStandardOrdinaryHours(hours)
                  setOrdinaryHoursOverridden(false)
                  setForm(prev => ({
                    ...prev,
                    employee_name:        e.name,
                    employee_email:       e.email ?? '',
                    employment_type:      e.employment_type,
                    pay_cycle:            cycle,
                    pay_basis:            detectedBasis,
                    annual_salary:        detectedBasis === 'salary' && e.annual_salary ? e.annual_salary : prev.annual_salary,
                    hourly_rate:          detectedBasis === 'hourly' && e.hourly_rate   ? e.hourly_rate   : prev.hourly_rate,
                    ordinary_hours:       hours,
                    super_fund_name:      e.super_fund_name ?? '',
                    member_number:        e.member_number   ?? '',
                    residency_status:     e.residency_status as ResidencyStatus,
                    medicare_exemption:   isMedicareExemptByResidency(e.residency_status as ResidencyStatus),
                    claiming_threshold:   e.claiming_threshold ?? true,
                    has_help:             e.has_help ?? false,
                    pay_period_start:     period.start,
                    pay_period_end:       period.end,
                    annual_leave_hours:   annualLeave,
                    personal_leave_hours: personalLeave,
                    annual_leave_taken:   0,
                    personal_leave_taken: 0,
                    employee_tfn:         e.tfn ?? '',
                  }))
                }}
                onChange={v => { setSelectedEmployeeId(null); setLeaveBalanceBase({ annual: null, personal: null }); setShowInlineRateEditor(false); setOrdinaryHoursOverridden(false); setField('employee_name', v) }}
                onClear={() => { setSelectedEmployeeId(null); setLeaveBalanceBase({ annual: null, personal: null }); setShowInlineRateEditor(false); setOrdinaryHoursOverridden(false); setField('employee_name', '') }}
              />

              {/* Saved employee summary */}
              {selectedEmployeeId && (() => {
                const rateOk = form.pay_basis === 'salary' ? form.annual_salary > 0 : form.hourly_rate > 0
                const rateDisplay = form.pay_basis === 'salary'
                  ? `$${form.annual_salary.toLocaleString()}/yr`
                  : `$${form.hourly_rate}/hr`
                return (
                  <div style={{ marginTop: '0.875rem', background: 'rgba(34,197,94,0.06)', border: `1px solid ${showInlineRateEditor ? 'rgba(234,179,8,0.4)' : 'rgba(34,197,94,0.25)'}`, borderRadius: '10px', padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--char)', marginBottom: '0.25rem' }}>{form.employee_name}</p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.125rem' }}>
                          {form.employment_type} · {form.pay_cycle}
                          {rateOk
                            ? ` · ${rateDisplay}`
                            : <span style={{ color: '#92400e', fontWeight: 600 }}> · no pay rate set</span>
                          }
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
                          {form.residency_status === 'citizen_pr' ? 'AU Resident' : form.residency_status.replace('_', ' ')}
                          {' · '}{form.claiming_threshold ? 'Threshold claimed' : 'No threshold'}
                          {form.has_help ? ' · HECS' : ''}
                        </p>
                        {form.super_fund_name && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.125rem' }}>
                            Super: {form.super_fund_name}{form.member_number ? ` / ${form.member_number}` : ''}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedEmployeeId(null); setLeaveBalanceBase({ annual: null, personal: null }); setShowInlineRateEditor(false); setField('employee_name', '') }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: '#15803d', textDecoration: 'underline', flexShrink: 0, padding: 0 }}
                      >
                        Change
                      </button>
                    </div>

                    {/* Inline pay rate editor — shown when employee had no rate on select */}
                    {showInlineRateEditor && (
                      <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid rgba(234,179,8,0.3)' }}>
                        <p style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.625rem', fontWeight: 500 }}>Enter this employee&apos;s pay rate to continue:</p>
                        <div style={{ display: 'flex', background: 'var(--cream2)', borderRadius: '8px', padding: '3px', gap: '2px', marginBottom: '0.625rem', width: 'fit-content' }}>
                          {(['salary', 'hourly'] as PayBasis[]).map(basis => (
                            <button key={basis} type="button" onClick={() => setField('pay_basis', basis)}
                              style={{ padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: form.pay_basis === basis ? 600 : 400, border: 'none', cursor: 'pointer', background: form.pay_basis === basis ? '#fff' : 'transparent', color: form.pay_basis === basis ? 'var(--char)' : 'var(--text3)', boxShadow: form.pay_basis === basis ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 150ms' }}>
                              {basis === 'salary' ? 'Annual Salary' : 'Hourly Rate'}
                            </button>
                          ))}
                        </div>
                        {form.pay_basis === 'salary' ? (
                          <div style={{ position: 'relative', maxWidth: 200 }}>
                            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                            <input type="number" min={0} step={1000} className="sab-input" placeholder="75000" value={form.annual_salary || ''} onChange={e => setField('annual_salary', parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} style={{ paddingLeft: '1.5rem' }} autoFocus />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', width: 130 }}>
                              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                              <input type="number" min={0} step={0.5} className="sab-input" placeholder="35.00/hr" value={form.hourly_rate || ''} onChange={e => setField('hourly_rate', parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} style={{ paddingLeft: '1.5rem' }} autoFocus />
                            </div>
                            <input type="number" min={0} step={0.5} className="sab-input" placeholder={`${form.ordinary_hours} hrs/period`} value={form.ordinary_hours || ''} onChange={e => setField('ordinary_hours', parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} style={{ width: 130 }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* New employee: minimal pay fields */}
              {!selectedEmployeeId && form.employee_name.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--cream)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>New employee — enter their pay details:</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="form-grid-2">
                    <div>
                      <label className="sab-label">Employment Type</label>
                      <select className="sab-input" value={form.employment_type} onChange={e => setField('employment_type', e.target.value)}>
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                        <option value="casual">Casual</option>
                      </select>
                    </div>
                    <div>
                      <label className="sab-label">Pay Cycle</label>
                      <select className="sab-input" value={form.pay_cycle} onChange={e => setField('pay_cycle', e.target.value as PayCycle)}>
                        <option value="weekly">Weekly</option>
                        <option value="fortnightly">Fortnightly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', background: 'var(--cream2)', borderRadius: '8px', padding: '3px', gap: '2px', marginBottom: '0.5rem' }}>
                      {(['salary', 'hourly'] as PayBasis[]).map(basis => (
                        <button key={basis} type="button" onClick={() => setField('pay_basis', basis)} style={{ flex: 1, padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: form.pay_basis === basis ? 600 : 400, border: 'none', cursor: 'pointer', background: form.pay_basis === basis ? '#fff' : 'transparent', color: form.pay_basis === basis ? 'var(--char)' : 'var(--text3)', boxShadow: form.pay_basis === basis ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 150ms' }}>
                          {basis === 'salary' ? 'Annual Salary' : 'Hourly Rate'}
                        </button>
                      ))}
                    </div>

                    {form.pay_basis === 'salary' ? (
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                        <input type="number" min={0} step={1000} className="sab-input" placeholder="75000" value={form.annual_salary || ''} onChange={e => setField('annual_salary', parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} style={{ paddingLeft: '1.5rem' }} />
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                          <input type="number" min={0} step={0.5} className="sab-input" placeholder="35.00" value={form.hourly_rate || ''} onChange={e => setField('hourly_rate', parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} style={{ paddingLeft: '1.5rem' }} />
                        </div>
                        <input type="number" min={0} step={0.5} className="sab-input" placeholder="76 hrs/period" value={form.ordinary_hours || ''} onChange={e => setField('ordinary_hours', parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="sab-label">Residency Status</label>
                    <select className="sab-input" value={form.residency_status} onChange={e => setField('residency_status', e.target.value as ResidencyStatus)}>
                      <option value="citizen_pr">Australian citizen or permanent resident</option>
                      <option value="student">International student (student visa)</option>
                      <option value="temp_work">Temporary work visa (482, 457, etc)</option>
                      <option value="whm">Working holiday maker (417 or 462 visa)</option>
                      <option value="partner">Partner or dependent visa (temporary)</option>
                      <option value="other_temp">Other temporary resident</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced section toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text2)', padding: '0.375rem 0', marginBottom: '0.25rem', fontWeight: 500 }}
            >
              <span style={{ fontSize: '0.75rem' }}>{showAdvanced ? '▲' : '▼'}</span>
              Advanced — tax settings, super &amp; employer
            </button>

            {showAdvanced && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* WHM warning */}
                {form.residency_status === 'whm' && (
                  <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e', marginBottom: '0.25rem' }}>Working holiday maker — Schedule 15 rates apply</p>
                    <p style={{ fontSize: '0.75rem', color: '#78350f', lineHeight: 1.5 }}>15% on first $45,000, then 30–45%. No tax-free threshold. No Medicare levy.</p>
                  </div>
                )}

                {/* Medicare exempt info */}
                {isMedicareExemptByResidency(form.residency_status) && (
                  <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534', marginBottom: '0.125rem' }}>Medicare levy exempt</p>
                    <p style={{ fontSize: '0.75rem', color: '#166534', lineHeight: 1.5 }}>Temporary residents and international students do not pay the 2% Medicare levy.</p>
                  </div>
                )}

                {/* Tax toggles */}
                {form.residency_status !== 'whm' && (
                  <Toggle label="Claiming tax-free threshold (Scale 2)" hint="Most Australian residents claim this. Untick for second jobs." checked={form.claiming_threshold} onChange={v => setField('claiming_threshold', v)} />
                )}
                <Toggle label="Has HELP / HECS debt" hint="Enables HELP repayment withholding based on ATO thresholds." checked={form.has_help} onChange={v => setField('has_help', v)} />
                {form.residency_status === 'citizen_pr' && (
                  <Toggle label="Apply Medicare levy (2%)" hint="Turn off only if employee holds a valid Medicare levy exemption certificate." checked={!form.medicare_exemption} onChange={v => setField('medicare_exemption', !v)} />
                )}
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

                {/* Super fund */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="form-grid-2">
                  <div>
                    <label className="sab-label">Super Fund <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                    <input className="sab-input" placeholder="AustralianSuper" value={form.super_fund_name} onChange={e => setField('super_fund_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="sab-label">Member Number <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                    <input className="sab-input" placeholder="123456789" value={form.member_number} onChange={e => setField('member_number', e.target.value)} />
                  </div>
                </div>

                {/* Employee email + TFN */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="form-grid-2">
                  <div>
                    <label className="sab-label">Employee Email <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                    <input className="sab-input" type="email" placeholder="jane@example.com" value={form.employee_email} onChange={e => setField('employee_email', e.target.value)} />
                  </div>
                  <div>
                    <label className="sab-label">TFN <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                    <input className="sab-input" placeholder="XXX XXX XXX" value={form.employee_tfn} onChange={e => setField('employee_tfn', e.target.value)} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.25rem' }}>Shown masked on payslip (XXX-XXX-123)</p>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

                {/* Employer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="form-grid-2">
                  <div>
                    <label className="sab-label">Employer Name</label>
                    <input className="sab-input" placeholder="Your Business Pty Ltd" value={form.employer_name} onChange={e => setField('employer_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="sab-label">Employer ABN</label>
                    <input className="sab-input" placeholder="12 345 678 901" value={form.employer_abn} onChange={e => setField('employer_abn', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="sab-label">Employer Address <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                  <input className="sab-input" placeholder="123 Main St, Sydney NSW 2000" value={form.employer_address} onChange={e => setField('employer_address', e.target.value)} />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (!form.employee_name.trim()) { toast('Enter or select an employee to continue', 'error'); return }
                const hasEarnings = form.pay_basis === 'hourly' ? form.hourly_rate > 0 : form.annual_salary > 0
                if (!hasEarnings) { toast('Enter a pay rate to continue', 'error'); return }
                setStep(2)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="btn btn-ember"
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2: Pay Period ───────────────────────────────── */}
        {step === 2 && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>

            {/* Pay dates */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>When are you paying them?</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }} className="form-grid-3">
                {([
                  ['pay_period_start', 'Period Start'],
                  ['pay_period_end',   'Period End'],
                  ['payment_date',     'Payment Date'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="sab-label">{label}</label>
                    <input type="date" className="sab-input" value={form[key]} onChange={e => setField(key, e.target.value)} />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <label className="sab-label">Payslip Number</label>
                <input className="sab-input" value={form.payslip_number} onChange={e => setField('payslip_number', e.target.value)} style={{ maxWidth: 200 }} />
              </div>
            </div>

            {/* Unusual toggle card */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => setHasUnusual(v => !v)}>
                <div style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, background: hasUnusual ? 'var(--ember)' : 'var(--border)', position: 'relative', transition: 'background 150ms', marginTop: 2, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#fff', top: 3, left: hasUnusual ? 19 : 3, transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', pointerEvents: 'none' }} />
                </div>
                <div style={{ pointerEvents: 'none' }}>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', lineHeight: 1.3 }}>Anything unusual this period?</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginTop: '0.125rem' }}>Leave taken, overtime, allowances, or salary sacrifice</p>
                </div>
              </label>

              {hasUnusual && (
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Ordinary hours override — hourly employees only */}
                  {form.pay_basis === 'hourly' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)' }}>Ordinary Hours This Period</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>override for this pay run only</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <input
                          type="number" min={0} step={0.5} className="sab-input"
                          placeholder={String(standardOrdinaryHours)}
                          value={form.ordinary_hours || ''}
                          onChange={e => {
                            const n = parseFloat(e.target.value)
                            setOrdinaryHoursOverridden(true)
                            setField('ordinary_hours', isNaN(n) ? 0 : n)
                          }}
                          onWheel={e => (e.target as HTMLInputElement).blur()}
                          style={{ width: 110 }}
                        />
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>
                          hrs × {formatCurrency(form.hourly_rate)}/hr = {formatCurrency(form.ordinary_hours * form.hourly_rate)} base
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.375rem', lineHeight: 1.5 }}>
                        {ordinaryHoursOverridden
                          ? `Auto-subtract disabled — you manually set ${form.ordinary_hours} hrs.`
                          : `Auto-calculated: ${standardOrdinaryHours} standard − ${form.payItems.reduce((s,i)=>s+(i.hours||0),0)} penalty hrs = ${form.ordinary_hours} hrs ordinary.`
                        }
                        {' '}Penalty rate hours (evening/weekend) replace ordinary — do not double-count.
                      </p>
                    </div>
                  )}

                  {/* Annual Leave */}
                  {form.employment_type !== 'casual' && (
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.625rem' }}>Annual Leave</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }} className="form-grid-2">
                        <div>
                          <label className="sab-label">Opening balance (hrs)</label>
                          <input type="number" min={0} step={0.01} className="sab-input" placeholder="e.g. 152.00" value={form.annual_leave_hours ?? ''} onChange={e => setField('annual_leave_hours', e.target.value === '' ? null : parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} />
                        </div>
                        <div>
                          <label className="sab-label">Leave taken this period (hrs)</label>
                          <input type="number" min={0} step={0.01} className="sab-input" placeholder="0" value={form.annual_leave_taken || ''} onChange={e => setField('annual_leave_taken', parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} />
                        </div>
                      </div>
                      {form.annual_leave_taken > 0 && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                          <input type="checkbox" checked={form.leave_loading_enabled} onChange={e => setField('leave_loading_enabled', e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--ember)', cursor: 'pointer' }} />
                          <span style={{ color: 'var(--char)', fontWeight: 500 }}>Include leave loading (17.5%)</span>
                          {form.leave_loading_enabled && leaveLoadingAmount > 0 && (
                            <span style={{ color: 'var(--ember)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginLeft: 'auto' }}>+ {formatCurrency(leaveLoadingAmount)}</span>
                          )}
                        </label>
                      )}
                      {form.annual_leave_hours != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', background: 'var(--cream)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                          <span style={{ color: 'var(--text2)' }}>{form.annual_leave_hours.toFixed(2)} hrs</span>
                          <span style={{ color: 'var(--text3)' }}>−</span>
                          <span style={{ color: 'var(--text2)' }}>{form.annual_leave_taken.toFixed(2)} taken</span>
                          <span style={{ color: 'var(--text3)' }}>=</span>
                          <span style={{ fontWeight: 700, color: 'var(--char)' }}>{Math.max(0, Math.round((form.annual_leave_hours - form.annual_leave_taken) * 100) / 100).toFixed(2)} hrs balance</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Personal Leave */}
                  {form.employment_type !== 'casual' && (
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.625rem' }}>Personal / Sick Leave</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }} className="form-grid-2">
                        <div>
                          <label className="sab-label">Opening balance (hrs)</label>
                          <input type="number" min={0} step={0.01} className="sab-input" placeholder="e.g. 76.00" value={form.personal_leave_hours ?? ''} onChange={e => setField('personal_leave_hours', e.target.value === '' ? null : parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} />
                        </div>
                        <div>
                          <label className="sab-label">Leave taken this period (hrs)</label>
                          <input type="number" min={0} step={0.01} className="sab-input" placeholder="0" value={form.personal_leave_taken || ''} onChange={e => setField('personal_leave_taken', parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} />
                        </div>
                      </div>
                      {form.personal_leave_hours != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', background: 'var(--cream)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                          <span style={{ color: 'var(--text2)' }}>{form.personal_leave_hours.toFixed(2)} hrs</span>
                          <span style={{ color: 'var(--text3)' }}>−</span>
                          <span style={{ color: 'var(--text2)' }}>{form.personal_leave_taken.toFixed(2)} taken</span>
                          <span style={{ color: 'var(--text3)' }}>=</span>
                          <span style={{ fontWeight: 700, color: 'var(--char)' }}>{Math.max(0, Math.round((form.personal_leave_hours - form.personal_leave_taken) * 100) / 100).toFixed(2)} hrs balance</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Overtime / Penalty rates */}
                  <div>
                    {(() => {
                      const awards = biz?.industry ? getAwardRates(biz.industry) : null
                      const satMult     = biz?.sat_rate_mult     ?? awards?.saturday
                      const sunMult     = biz?.sun_rate_mult     ?? awards?.sunday
                      const phMult      = biz?.ph_rate_mult      ?? awards?.publicHoliday
                      const eveningMult = biz?.evening_rate_mult ?? awards?.evening?.mult
                      const eveningLabel = awards?.evening?.label ?? 'Evening penalty'
                      const hasCustom = biz?.sat_rate_mult || biz?.sun_rate_mult || biz?.ph_rate_mult || biz?.evening_rate_mult

                      const hourlyShortcuts: { label: string; desc: string; rate: number }[] = (awards || satMult) ? [
                        ...(eveningMult ? [{
                          label: `Evening ${pct(eveningMult)}`,
                          desc: eveningLabel,
                          rate: Math.round(derivedHourlyRate * eveningMult * 100) / 100,
                        }] : []),
                        ...(satMult ? [{ label: `Saturday ${pct(satMult)}`, desc: 'Saturday penalty', rate: Math.round(derivedHourlyRate * satMult * 100) / 100 }] : []),
                        ...(sunMult ? [{ label: `Sunday ${pct(sunMult)}`,   desc: 'Sunday penalty',   rate: Math.round(derivedHourlyRate * sunMult * 100) / 100 }] : []),
                        ...(phMult  ? [{ label: `P.Holiday ${pct(phMult)}`, desc: 'Public holiday',   rate: Math.round(derivedHourlyRate * phMult  * 100) / 100 }] : []),
                      ] : [
                        { label: 'Evening ~115%+', desc: 'Evening rate',    rate: Math.round(derivedHourlyRate * 1.15 * 100) / 100 },
                        { label: 'Saturday ~125%+', desc: 'Saturday penalty', rate: Math.round(derivedHourlyRate * 1.25 * 100) / 100 },
                        { label: 'Sunday ~175%+',  desc: 'Sunday penalty',   rate: Math.round(derivedHourlyRate * 1.75 * 100) / 100 },
                        { label: 'P.Holiday ~225%+', desc: 'Public holiday', rate: Math.round(derivedHourlyRate * 2.25 * 100) / 100 },
                      ]

                      const salaryShortcuts = [
                        { label: 'Sat +50%',  desc: 'Saturday loading', rate: Math.round(derivedHourlyRate * 0.5 * 100) / 100 },
                        { label: 'Sun +100%', desc: 'Sunday loading',   rate: Math.round(derivedHourlyRate * 1.0 * 100) / 100 },
                      ]

                      const shortcuts = [
                        ...(form.pay_basis === 'salary' ? salaryShortcuts : hourlyShortcuts),
                        { label: '+ Custom', desc: 'Custom rate', rate: 0 },
                      ]

                      return (
                        <>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.125rem' }}>Overtime &amp; Penalty Rates</p>
                            {awards ? (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', lineHeight: 1.4 }}>
                                {hasCustom ? <><strong>Custom rates</strong> applied (override {awards.awardShort})</> : <>Pre-filled from <strong>{awards.awardName}</strong></>}
                                {awards.note && !hasCustom && <span> — {awards.note}</span>}
                              </p>
                            ) : (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', lineHeight: 1.4 }}>
                                Set your <strong>industry in Settings</strong> to auto-fill your Fair Work Award rates.
                                Generic estimates shown — check <span style={{ color: 'var(--ember)' }}>fairwork.gov.au</span>
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
                            {form.pay_basis === 'salary' && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text3)', alignSelf: 'center', whiteSpace: 'nowrap' }}>Salary loading:</span>
                            )}
                            {shortcuts.map(shortcut => (
                              <button
                                key={shortcut.label}
                                type="button"
                                onClick={() => setField('payItems', [
                                  ...form.payItems,
                                  { id: Math.random().toString(36).slice(2), description: shortcut.desc, hours: 0, rate: shortcut.rate },
                                ])}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: 6, border: '1px solid var(--border)', background: awards && shortcut.label !== '+ Custom' ? 'var(--ember-pale, #FFF3EE)' : 'var(--cream)', color: 'var(--char)', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}
                              >
                                {shortcut.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )
                    })()}

                    {form.payItems.length === 0 ? (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>No additional earnings — use the shortcuts above to add penalty rates.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 70px 32px', gap: '0.5rem' }}>
                          {['Description', 'Hours', 'Rate/hr', 'Total', ''].map(h => (
                            <span key={h} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', textAlign: h === 'Total' ? 'right' : 'left' }}>{h}</span>
                          ))}
                        </div>
                        {form.payItems.map((item, i) => (
                          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 70px 32px', gap: '0.5rem', alignItems: 'center' }}>
                            <input className="sab-input" placeholder="e.g. Evening rate" value={item.description} onChange={e => setField('payItems', form.payItems.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                            <input type="number" min={0} step={0.5} className="sab-input" placeholder="0" value={item.hours || ''} onChange={e => setField('payItems', form.payItems.map((x, j) => j === i ? { ...x, hours: parseFloat(e.target.value) || 0 } : x))} onWheel={e => (e.target as HTMLInputElement).blur()} />
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.8125rem' }}>$</span>
                              <input type="number" min={0} step={0.01} className="sab-input" placeholder="0.00" value={item.rate || ''} onChange={e => setField('payItems', form.payItems.map((x, j) => j === i ? { ...x, rate: parseFloat(e.target.value) || 0 } : x))} onWheel={e => (e.target as HTMLInputElement).blur()} style={{ paddingLeft: '1.375rem' }} />
                            </div>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(item.hours * item.rate)}</span>
                            <button type="button" onClick={() => setField('payItems', form.payItems.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '1.125rem', lineHeight: 1, padding: '0 4px' }}>×</button>
                          </div>
                        ))}
                        {payItemsThisPeriod > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 40, borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ember)', fontFamily: 'var(--font-mono)' }}>+ {formatCurrency(payItemsThisPeriod)} additional</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Allowances */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)' }}>Allowances <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></p>
                      <button type="button" onClick={() => setField('allowances', [...form.allowances, { id: Math.random().toString(36).slice(2), description: '', amount: 0 }])} style={{ fontSize: '0.8125rem', color: 'var(--ember)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Add allowance</button>
                    </div>
                    {form.allowances.length === 0 ? (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>No allowances — click &ldquo;+ Add allowance&rdquo; for travel, tool, or uniform allowances.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {form.allowances.map((a, i) => (
                          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: '0.5rem', alignItems: 'center' }}>
                            <input className="sab-input" placeholder="e.g. Travel allowance" value={a.description} onChange={e => setField('allowances', form.allowances.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                              <input type="number" min={0} step={0.01} className="sab-input" placeholder="0.00" value={a.amount || ''} onChange={e => setField('allowances', form.allowances.map((x, j) => j === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))} onWheel={e => (e.target as HTMLInputElement).blur()} style={{ paddingLeft: '1.5rem' }} />
                            </div>
                            <button type="button" onClick={() => setField('allowances', form.allowances.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '1.125rem', lineHeight: 1, padding: '0 4px' }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Salary sacrifice */}
                  <div>
                    <label className="sab-label">Salary Sacrifice to Super (annual amount) <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                    <div style={{ position: 'relative', maxWidth: 200 }}>
                      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                      <input type="number" min={0} step={100} className="sab-input" placeholder="0" value={form.salary_sacrifice || ''} onChange={e => setField('salary_sacrifice', parseFloat(e.target.value) || 0)} onWheel={e => (e.target as HTMLInputElement).blur()} style={{ paddingLeft: '1.5rem' }} />
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Nav */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="btn btn-outline" style={{ flex: 1 }}>← Back</button>
              <button
                type="button"
                onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="btn btn-ember"
                style={{ flex: 2 }}
              >
                Review →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & Generate ────────────────────────── */}
        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 340px', gap: '1.5rem', alignItems: 'start' }} className="review-grid">

            {/* Left: live preview */}
            <div style={{ position: 'sticky', top: '76px' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text2)', marginBottom: '0.75rem' }}>Live Preview</p>
              <div style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
                <PayslipPreview form={form} biz={biz} numbers={displayNumbers} ytdIsActual={ytdIsActual} payItemsThisPeriod={payItemsThisPeriod} leaveLoadingAmount={leaveLoadingAmount} />
              </div>
            </div>

            {/* Right: actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.25rem' }}>Review &amp; Generate</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>{form.employee_name} · {form.payslip_number}</p>
              </div>

              {/* Summary numbers */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                {[
                  { label: 'Gross Pay',      value: formatCurrency(numbers.grossPay),        muted: false },
                  { label: 'PAYG Tax',       value: `(${formatCurrency(numbers.totalDeductions)})`, muted: true  },
                  { label: 'Net Pay',        value: formatCurrency(numbers.netPay),           muted: false },
                  { label: 'Super (SG)',     value: formatCurrency(numbers.superSG),          muted: true  },
                ].map((row, i) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', background: row.label === 'Net Pay' ? 'rgba(200,75,47,0.04)' : 'transparent' }}>
                    <span style={{ fontSize: '0.8125rem', color: row.muted ? 'var(--text3)' : 'var(--char)', fontWeight: row.label === 'Net Pay' ? 700 : 400 }}>{row.label}</span>
                    <span style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontWeight: row.label === 'Net Pay' ? 700 : 500, color: row.label === 'Net Pay' ? 'var(--ember)' : row.muted ? 'var(--text3)' : 'var(--char)' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* STP notice */}
              <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#92400e', lineHeight: 1.5 }}>
                <strong>STP:</strong> This generates an ATO-compliant payslip but does not submit payroll data to the ATO. Report separately via STP-enabled software each pay run.
              </div>

              {/* Actions */}
              <button onClick={handleSave} disabled={saving} className="btn btn-ember" style={{ width: '100%' }}>
                {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
                {saving ? 'Saving…' : 'Save Payslip'}
              </button>
              <button onClick={handleDownloadPDF} className="btn btn-char" style={{ width: '100%' }}>
                ↓ Download PDF
              </button>
              <button type="button" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="btn btn-ghost" style={{ width: '100%' }}>
                ← Back
              </button>
            </div>
          </div>
        )}

        <style>{`
          @media (max-width: 900px) {
            .review-grid { grid-template-columns: 1fr !important; }
            .review-grid > div:first-child { position: static !important; order: 2; }
            .review-grid > div:last-child  { order: 1; }
          }
          @media (max-width: 768px) {
            .form-grid-2 { grid-template-columns: 1fr !important; }
          }
          @media (max-width: 480px) {
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
