'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import PlanGate from '@/components/ui/PlanGate'
import { formatCurrency, formatDateAU, formatABN } from '@/lib/utils'

interface Payslip {
  id: string
  payslip_number: string
  employee_name: string
  employer_name: string
  employer_abn: string
  employment_type: string
  pay_cycle: string
  super_fund_name: string | null
  member_number: string | null
  pay_period_start: string
  pay_period_end: string
  payment_date: string
  gross_pay: number
  salary_sacrifice: number
  taxable_gross: number
  income_tax: number
  medicare_levy: number
  help_repayment: number
  net_pay: number
  super_sg: number
  super_sal_sac: number
  created_at: string
}

export default function PayslipHistoryPage() {
  const { toast } = useToast()
  useEffect(() => { document.title = 'Payslip History — SAB Account AI' }, [])

  const [payslips, setPayslips]           = useState<Payslip[]>([])
  const [loading, setLoading]             = useState(true)
  const [logoUrl, setLogoUrl]             = useState<string | undefined>()
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [search, setSearch]               = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: psData }, { data: bizData }] = await Promise.all([
        supabase.from('payslips').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('business_profiles').select('logo_url').eq('id', user.id).single(),
      ])
      setPayslips((psData ?? []) as Payslip[])
      setLogoUrl(bizData?.logo_url || undefined)
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this payslip? This cannot be undone.')) return
    setDeletingId(id)
    const supabase = createBrowserClient()
    const { error } = await supabase.from('payslips').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Delete failed', 'error'); return }
    setPayslips(prev => prev.filter(p => p.id !== id))
    toast('Payslip deleted', 'info')
  }

  async function handleDownloadPDF(ps: Payslip) {
    setDownloadingId(ps.id)
    try {
      const { downloadPayslipPDF } = await import('@/lib/pdf')
      const totalDeductions = Number(ps.income_tax) + Number(ps.medicare_levy) + Number(ps.help_repayment)
      const totalSuper      = Number(ps.super_sg) + Number(ps.super_sal_sac)
      const grossPay        = Number(ps.gross_pay)
      await downloadPayslipPDF({
        payslip_number:    ps.payslip_number,
        pay_period_start:  ps.pay_period_start,
        pay_period_end:    ps.pay_period_end,
        payment_date:      ps.payment_date,
        employer_name:     ps.employer_name,
        employer_abn:      ps.employer_abn ? formatABN(ps.employer_abn) : '',
        employee_name:     ps.employee_name,
        employment_type:   ps.employment_type,
        pay_cycle:         ps.pay_cycle,
        pay_basis:         'salary',
        annual_salary:     0,
        hourly_rate:       0,
        ordinary_hours:    0,
        super_fund_name:   ps.super_fund_name ?? '',
        member_number:     ps.member_number   ?? '',
        use_new_super_rate: true,
        claiming_threshold: false,
        has_help:           Number(ps.help_repayment) > 0,
        medicare_exempt:    Number(ps.medicare_levy) === 0,
        logo_url:           logoUrl,
        numbers: {
          ordinaryEarnings: grossPay,
          overtimePay:      0,
          grossPay,
          salarySacrifice:  Number(ps.salary_sacrifice),
          taxableGross:     Number(ps.taxable_gross),
          incomeTax:        Number(ps.income_tax),
          medicareLevy:     Number(ps.medicare_levy),
          helpRepayment:    Number(ps.help_repayment),
          totalDeductions,
          netPay:           Number(ps.net_pay),
          superSG:          Number(ps.super_sg),
          superSalSac:      Number(ps.super_sal_sac),
          totalSuper,
          ytdGross:         grossPay,
          ytdTax:           totalDeductions,
          ytdSuper:         totalSuper,
        },
      })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'PDF generation failed', 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? payslips.filter(p =>
        p.employee_name.toLowerCase().includes(q) ||
        p.payslip_number.toLowerCase().includes(q) ||
        p.employer_name.toLowerCase().includes(q)
      )
    : payslips

  return (
    <PlanGate requiredPlan="pro">
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Payslip History
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
              {payslips.length} payslip{payslips.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <Link href="/payslip" className="btn btn-ember" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
            + New Payslip
          </Link>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '1.25rem' }}>
          <input
            className="sab-input"
            placeholder="Search by employee, payslip number or employer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '380px' }}
          />
        </div>

        {/* Table */}
        <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🧾</p>
              <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.375rem' }}>
                {q ? 'No matching payslips' : 'No payslips yet'}
              </p>
              {!q && (
                <Link href="/payslip" className="btn btn-ember" style={{ textDecoration: 'none', fontSize: '0.875rem', marginTop: '0.75rem', display: 'inline-flex' }}>
                  Generate your first payslip
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                    {['Payslip', 'Employee', 'Pay Period', 'Payment Date', 'Gross Pay', 'Net Pay', ''].map(h => (
                      <th key={h} style={{
                        padding: '0.625rem 1rem',
                        textAlign: h === 'Gross Pay' || h === 'Net Pay' ? 'right' : 'left',
                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)',
                        letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ps, i) => {
                    const isDeleting    = deletingId    === ps.id
                    const isDownloading = downloadingId === ps.id
                    return (
                      <tr key={ps.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--char)', whiteSpace: 'nowrap' }}>
                          {ps.payslip_number}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--char)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ps.employee_name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {formatDateAU(ps.pay_period_start)} – {formatDateAU(ps.pay_period_end)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {formatDateAU(ps.payment_date)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {formatCurrency(ps.gross_pay)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ember)', whiteSpace: 'nowrap' }}>
                          {formatCurrency(ps.net_pay)}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleDownloadPDF(ps)}
                              disabled={isDownloading}
                              style={{ padding: '0.25rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid var(--border)', background: '#fff', color: 'var(--char)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              {isDownloading ? '…' : '↓ PDF'}
                            </button>
                            <button
                              onClick={() => handleDelete(ps.id)}
                              disabled={isDeleting}
                              title="Delete payslip"
                              style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '1rem', border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', lineHeight: 1 }}
                            >
                              {isDeleting ? '…' : '×'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PlanGate>
  )
}
