'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { useProfile } from '@/app/(app)/profile-context'
import { formatCurrency, formatDateAU } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────
interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  issue_date: string
  due_date: string
  status: string
  total_inc_gst: number
  total_gst: number
}

interface KPIs {
  invoicedThisMonth: number
  outstanding: number
  gstToRemit: number
  superOwing: number
}

// ── Helpers ──────────────────────────────────────────────────────────
function fyRange() {
  const now   = new Date()
  const month = now.getMonth() + 1
  const yr    = month >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return { fy_start: `${yr}-07-01`, fy_end: `${yr + 1}-06-30`, fy_label: `FY${yr}–${String(yr + 1).slice(2)}` }
}

function monthRange() {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = now.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = new Date(y, m + 1, 0).getDate()
  return {
    start: `${y}-${pad(m + 1)}-01`,
    end:   `${y}-${pad(m + 1)}-${pad(lastDay)}`,
  }
}

function currentQuarterRange() {
  const now   = new Date()
  const month = now.getMonth() // 0-based
  const yr    = now.getFullYear()
  // ATO quarters: Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
  // Index by calendar month (0=Jan … 11=Dec)
  const quarterStart = [
    [0, 0], [0, 0], [0, 0],   // Jan Feb Mar → Q3 starts 1 Jan
    [3, 0], [3, 0], [3, 0],   // Apr May Jun → Q4 starts 1 Apr
    [6, 0], [6, 0], [6, 0],   // Jul Aug Sep → Q1 starts 1 Jul
    [9, 0], [9, 0], [9, 0],   // Oct Nov Dec → Q2 starts 1 Oct
  ][month]
  const quarterEnd = [
    [2, 0], [2, 0], [2, 0],   // Jan Feb Mar → Q3 ends 31 Mar
    [5, 0], [5, 0], [5, 0],   // Apr May Jun → Q4 ends 30 Jun
    [8, 0], [8, 0], [8, 0],   // Jul Aug Sep → Q1 ends 30 Sep
    [11,0], [11,0], [11,0],   // Oct Nov Dec → Q2 ends 31 Dec
  ][month]
  const startDate = new Date(yr, quarterStart[0], 1)
  const endDate   = new Date(yr, quarterEnd[0] + 1, 0)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return { start: fmt(startDate), end: fmt(endDate) }
}

function nextBasDue(): string {
  const now   = new Date()
  const month = now.getMonth()
  // ATO quarterly BAS due dates
  if (month <= 1 || month === 11) return 'Feb 28 — Q2 BAS'
  if (month <= 3)                  return 'Apr 28 — Q3 BAS'
  if (month <= 6)                  return 'Jul 28 — Q4 BAS'
  return 'Oct 28 — Q1 BAS'
}

function nextSuperDue(): string {
  const now   = new Date()
  const month = now.getMonth()
  if (month <= 0)  return 'Jan 28 — Q2 super'   // Jan
  if (month <= 3)  return 'Apr 28 — Q3 super'   // Feb–Apr
  if (month <= 6)  return 'Jul 28 — Q4 super'   // May–Jul
  if (month <= 9)  return 'Oct 28 — Q1 super'   // Aug–Oct
  return 'Jan 28 — Q2 super'                     // Nov–Dec (Oct 28 has passed)
}

// ── Status badge ─────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  draft:   { bg: 'var(--cream2)',          color: 'var(--text3)'  },
  pending: { bg: 'rgba(59,130,246,0.08)',  color: '#1d4ed8'       },
  paid:    { bg: 'rgba(34,197,94,0.1)',    color: '#15803d'       },
  overdue: { bg: 'rgba(200,75,47,0.08)',   color: 'var(--ember)'  },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft
  return (
    <span style={{
      fontSize: '0.6875rem',
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      padding: '0.2rem 0.625rem',
      borderRadius: '999px',
      background: s.bg,
      color: s.color,
    }}>
      {status}
    </span>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 'var(--r)',
      border: `1px solid ${accent ? 'rgba(200,75,47,0.2)' : 'var(--border)'}`,
      padding: '1.25rem 1.5rem',
    }}>
      <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text3)', marginBottom: '0.5rem' }}>{label}</p>
      <p style={{
        fontSize: '1.625rem',
        fontWeight: 700,
        color: accent ? 'var(--ember)' : 'var(--char)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        marginBottom: sub ? '0.375rem' : 0,
      }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{sub}</p>}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const profile = useProfile()
  const [invoices, setInvoices]   = useState<Invoice[]>([])
  const [kpis, setKpis]           = useState<KPIs>({ invoicedThisMonth: 0, outstanding: 0, gstToRemit: 0, superOwing: 0 })
  const [loading, setLoading]     = useState(true)

  useEffect(() => { document.title = 'Dashboard — SAB Account AI' }, [])

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { fy_start, fy_end } = fyRange()
      const { start: mStart, end: mEnd } = monthRange()
      const { start: qStart, end: qEnd } = currentQuarterRange()

      // Fetch all invoices for current FY
      const { data: fyInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_name, issue_date, due_date, status, total_inc_gst, total_gst')
        .eq('user_id', user.id)
        .gte('issue_date', fy_start)
        .lte('issue_date', fy_end)
        .order('created_at', { ascending: false })

      const all: Invoice[] = fyInvoices ?? []

      // KPI: invoiced this month (non-draft)
      const invoicedThisMonth = all
        .filter(inv => inv.issue_date >= mStart && inv.issue_date <= mEnd && inv.status !== 'draft')
        .reduce((s, inv) => s + Number(inv.total_inc_gst), 0)

      // KPI: outstanding (pending + overdue)
      const outstanding = all
        .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
        .reduce((s, inv) => s + Number(inv.total_inc_gst), 0)

      // KPI: GST collected this FY (non-draft)
      const gstCollected = all
        .filter(inv => inv.status !== 'draft')
        .reduce((s, inv) => s + Number(inv.total_gst), 0)

      // KPI: GST credits from expense records this FY
      const { data: expenseRecs } = await supabase
        .from('records')
        .select('gst_amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', fy_start)
        .lte('date', fy_end)

      const gstCredits = (expenseRecs ?? []).reduce((s, r) => s + Number(r.gst_amount), 0)

      // KPI: super owing this quarter (Pro plan, from payslips)
      let superOwing = 0
      if (profile.plan === 'pro') {
        const { data: payslips } = await supabase
          .from('payslips')
          .select('super_sg')
          .eq('user_id', user.id)
          .gte('pay_period_end', qStart)
          .lte('pay_period_end', qEnd)

        superOwing = (payslips ?? []).reduce((s, p) => s + Number(p.super_sg), 0)
      }

      setKpis({
        invoicedThisMonth,
        outstanding,
        gstToRemit: Math.max(0, gstCollected - gstCredits),
        superOwing,
      })

      // Recent 8 invoices
      setInvoices(all.slice(0, 8))
      setLoading(false)
    }

    load()
  }, [profile.plan])

  const fyLabel = fyRange().fy_label

  const monthName = new Date().toLocaleString('en-AU', { month: 'long' })

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            {profile.business_name ? `${profile.business_name}` : 'Dashboard'}
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
            {fyLabel} · {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <Link href="/records" className="btn btn-outline" style={{ fontSize: '0.875rem', padding: '0.45rem 1rem' }}>
            Add Record
          </Link>
          <Link href="/invoice" className="btn btn-ember" style={{ fontSize: '0.875rem', padding: '0.45rem 1rem' }}>
            + New Invoice
          </Link>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KpiCard
          label={`Invoiced in ${monthName}`}
          value={formatCurrency(kpis.invoicedThisMonth)}
          sub="Sent invoices this month"
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrency(kpis.outstanding)}
          sub="Pending + overdue"
          accent={kpis.outstanding > 0}
        />
        <KpiCard
          label={`GST to Remit (${fyLabel})`}
          value={formatCurrency(kpis.gstToRemit)}
          sub="Collected minus credits"
        />
        <KpiCard
          label="Super Owing (this quarter)"
          value={profile.plan === 'pro' ? formatCurrency(kpis.superOwing) : '—'}
          sub={profile.plan === 'pro' ? 'From payslips this quarter' : 'Pro plan feature'}
        />
      </div>

      {/* ── Main grid: invoices + sidebar ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }} className="dashboard-grid">

        {/* Recent invoices */}
        <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)' }}>Recent Invoices</h2>
            <Link href="/invoice" style={{ fontSize: '0.8125rem', color: 'var(--ember)', textDecoration: 'none', fontWeight: 500 }}>
              + New
            </Link>
          </div>

          {invoices.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
              <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.375rem', fontSize: '0.9375rem' }}>No invoices yet</p>
              <p style={{ color: 'var(--text3)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                Create your first invoice with AI — just describe the job.
              </p>
              <Link href="/invoice" className="btn btn-ember" style={{ fontSize: '0.875rem', padding: '0.45rem 1.125rem' }}>
                Create Invoice
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                    {['Invoice', 'Client', 'Issued', 'Due', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{
                        padding: '0.625rem 1rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text3)',
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr
                      key={inv.id}
                      style={{
                        borderBottom: i < invoices.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.client_name}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                        {formatDateAU(inv.issue_date)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: inv.status === 'overdue' ? 'var(--ember)' : 'var(--text2)', whiteSpace: 'nowrap' }}>
                        {formatDateAU(inv.due_date)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(inv.total_inc_gst)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Quick actions */}
          <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.875rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link href="/invoice" className="btn btn-ember" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', textAlign: 'center' }}>
                + New Invoice
              </Link>
              <Link href="/records" className="btn btn-outline" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', textAlign: 'center' }}>
                Add Income / Expense
              </Link>
              {profile.plan === 'pro' && (
                <Link href="/payslip" className="btn btn-char" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', textAlign: 'center' }}>
                  Generate Payslip
                </Link>
              )}
              <Link href="/settings" className="btn btn-ghost" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', textAlign: 'center' }}>
                Business Settings
              </Link>
            </div>
          </div>

          {/* ATO compliance */}
          <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.875rem' }}>ATO Deadlines</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Next BAS due', value: nextBasDue(), icon: '📋' },
                { label: 'Super due',    value: nextSuperDue(), icon: '🏦' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.625rem',
                  padding: '0.75rem',
                  background: 'var(--cream)',
                  borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '0.125rem' }}>{item.label}</p>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)' }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade nudge — shown to free/starter users */}
          {profile.plan !== 'pro' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(200,75,47,0.06) 0%, rgba(200,75,47,0.02) 100%)',
              border: '1px solid rgba(200,75,47,0.2)',
              borderRadius: 'var(--r)',
              padding: '1.25rem',
            }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.375rem' }}>
                Unlock Payslips & More
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.875rem', lineHeight: 1.5 }}>
                Pro plan includes PAYG payslips, ATO Scale 2, super tracking, and priority support.
              </p>
              <Link href="/settings?tab=subscription" className="btn btn-ember" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem' }}>
                Upgrade to Pro →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Responsive grid collapse */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
