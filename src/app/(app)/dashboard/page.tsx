'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { useProfile } from '@/app/(app)/profile-context'
import { formatCurrency, formatDateAU, todayISO } from '@/lib/utils'

interface TopClient {
  client_name: string
  total: number
  count: number
}

// ── Types ────────────────────────────────────────────────────────────
type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue'

interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  issue_date: string
  due_date: string
  status: InvoiceStatus
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
  const month = now.getMonth()
  const yr    = now.getFullYear()
  const quarterStart = [
    [0, 0], [0, 0], [0, 0],
    [3, 0], [3, 0], [3, 0],
    [6, 0], [6, 0], [6, 0],
    [9, 0], [9, 0], [9, 0],
  ][month]
  const quarterEnd = [
    [2, 0], [2, 0], [2, 0],
    [5, 0], [5, 0], [5, 0],
    [8, 0], [8, 0], [8, 0],
    [11,0], [11,0], [11,0],
  ][month]
  const startDate = new Date(yr, quarterStart[0], 1)
  const endDate   = new Date(yr, quarterEnd[0] + 1, 0)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return { start: fmt(startDate), end: fmt(endDate) }
}

// ATO quarterly deadlines in calendar order (month is 0-indexed).
// BAS: Q1=Oct 28, Q2=Feb 28, Q3=Apr 28, Q4=Jul 28
// Super follows the same dates per user spec.
const QUARTERLY_DEADLINES = [
  { month: 1,  day: 28, bas: 'Q2 BAS (Oct–Dec)',   super: 'Q2 super (Oct–Dec)'  },
  { month: 3,  day: 28, bas: 'Q3 BAS (Jan–Mar)',   super: 'Q3 super (Jan–Mar)'  },
  { month: 6,  day: 28, bas: 'Q4 BAS (Apr–Jun)',   super: 'Q4 super (Apr–Jun)'  },
  { month: 9,  day: 28, bas: 'Q1 BAS (Jul–Sep)',   super: 'Q1 super (Jul–Sep)'  },
]

const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function nextQuarterlyDeadline(key: 'bas' | 'super'): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yr = today.getFullYear()

  // Check current year then next year so we never return a past date
  for (const offset of [0, 1]) {
    for (const d of QUARTERLY_DEADLINES) {
      const due = new Date(yr + offset, d.month, d.day)
      if (due >= today) {
        return `${d.day} ${M[d.month]} ${yr + offset} — ${d[key]}`
      }
    }
  }
  return 'See ATO website'
}

function nextBasDue():   string { return nextQuarterlyDeadline('bas')   }
function nextSuperDue(): string { return nextQuarterlyDeadline('super') }

function nextMonthlyBasDue(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Monthly BAS is due the 21st of the following month
  // If the 21st of this month is still upcoming, that's the next deadline
  const thisMonth21 = new Date(today.getFullYear(), today.getMonth(), 21)
  const due = today <= thisMonth21 ? thisMonth21 : new Date(today.getFullYear(), today.getMonth() + 1, 21)
  return `${due.getDate()} ${M[due.getMonth()]} ${due.getFullYear()} — Monthly BAS`
}

// Which statuses a user can switch to from each current status
const NEXT_STATUSES: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft:   ['pending'],
  pending: ['paid', 'overdue'],
  overdue: ['paid', 'pending'],
  paid:    ['pending'],
}

// ── Status styles ─────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  draft:   { bg: 'var(--cream2)',          color: 'var(--text3)'  },
  pending: { bg: 'rgba(59,130,246,0.08)',  color: '#1d4ed8'       },
  paid:    { bg: 'rgba(34,197,94,0.1)',    color: '#15803d'       },
  overdue: { bg: 'rgba(200,75,47,0.08)',   color: 'var(--ember)'  },
}

// ── Clickable status dropdown ─────────────────────────────────────────
function StatusDropdown({ invoice, onStatusChange, updating }: {
  invoice: Invoice
  onStatusChange: (id: string, status: InvoiceStatus) => void
  updating: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const s = STATUS_STYLE[invoice.status] ?? STATUS_STYLE.draft
  const options = NEXT_STATUSES[invoice.status] ?? []

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => { if (!updating && options.length > 0) setOpen(o => !o) }}
        disabled={updating}
        style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          padding: '0.2rem 0.5rem 0.2rem 0.625rem',
          borderRadius: '999px',
          background: s.bg,
          color: s.color,
          border: 'none',
          cursor: updating ? 'wait' : options.length > 0 ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: '0.2rem',
          transition: 'opacity 150ms',
          opacity: updating ? 0.6 : 1,
        }}
      >
        {updating ? '…' : invoice.status}
        {!updating && options.length > 0 && (
          <span style={{ fontSize: '0.5rem', opacity: 0.7, lineHeight: 1 }}>▾</span>
        )}
      </button>

      {open && options.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 50,
          minWidth: '140px',
          overflow: 'hidden',
        }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text3)', padding: '0.5rem 0.875rem 0.25rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Change status
          </p>
          {options.map((status, i) => {
            const os = STATUS_STYLE[status]
            return (
              <button
                key={status}
                onClick={() => { onStatusChange(invoice.id, status); setOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  width: '100%',
                  padding: '0.5rem 0.875rem',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--char)',
                  background: 'none',
                  border: 'none',
                  borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cream)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.04em',
                  textTransform: 'uppercase', padding: '0.15rem 0.5rem',
                  borderRadius: '999px', background: os.bg, color: os.color,
                }}>
                  {status}
                </span>
                Mark as {status}
              </button>
            )
          })}
        </div>
      )}
    </div>
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

// ── Derive KPIs from invoice list ─────────────────────────────────────
function calcKPIs(all: Invoice[], gstCredits: number, superOwing: number, mStart: string, mEnd: string): KPIs {
  const invoicedThisMonth = all
    .filter(inv => inv.issue_date >= mStart && inv.issue_date <= mEnd && inv.status !== 'draft')
    .reduce((s, inv) => s + Number(inv.total_inc_gst), 0)

  const outstanding = all
    .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
    .reduce((s, inv) => s + Number(inv.total_inc_gst), 0)

  const gstCollected = all
    .filter(inv => inv.status !== 'draft')
    .reduce((s, inv) => s + Number(inv.total_gst), 0)

  return {
    invoicedThisMonth,
    outstanding,
    gstToRemit: Math.max(0, gstCollected - gstCredits),
    superOwing,
  }
}

// ── Main page ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const profile = useProfile()
  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [kpis, setKpis]             = useState<KPIs>({ invoicedThisMonth: 0, outstanding: 0, gstToRemit: 0, superOwing: 0 })
  const [loading, setLoading]       = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Keep gstCredits and superOwing stable so KPIs can be recalculated on status change
  const gstCreditsRef  = useRef(0)
  const superOwingRef  = useRef(0)
  const monthRangeRef  = useRef({ start: '', end: '' })

  useEffect(() => { document.title = 'Dashboard — SAB Account AI' }, [])

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { fy_start, fy_end } = fyRange()
      const mr = monthRange()
      monthRangeRef.current = mr
      const { start: qStart, end: qEnd } = currentQuarterRange()
      const today = todayISO()

      // Fetch all invoices for current FY
      const { data: fyInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_name, issue_date, due_date, status, total_inc_gst, total_gst')
        .eq('user_id', user.id)
        .gte('issue_date', fy_start)
        .lte('issue_date', fy_end)
        .order('created_at', { ascending: false })

      let all: Invoice[] = (fyInvoices ?? []) as Invoice[]

      // ── Auto-overdue: mark pending invoices past their due date ──
      const overdueIds = all
        .filter(inv => inv.status === 'pending' && inv.due_date < today)
        .map(inv => inv.id)

      if (overdueIds.length > 0) {
        await supabase
          .from('invoices')
          .update({ status: 'overdue' })
          .in('id', overdueIds)

        all = all.map(inv =>
          overdueIds.includes(inv.id) ? { ...inv, status: 'overdue' as InvoiceStatus } : inv
        )
      }

      // GST credits from expense records
      const { data: expenseRecs } = await supabase
        .from('records')
        .select('gst_amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', fy_start)
        .lte('date', fy_end)

      gstCreditsRef.current = (expenseRecs ?? []).reduce((s, r) => s + Number(r.gst_amount), 0)

      // Super owing this quarter (Pro plan)
      if (profile.plan === 'pro') {
        const { data: payslips } = await supabase
          .from('payslips')
          .select('super_sg')
          .eq('user_id', user.id)
          .gte('pay_period_end', qStart)
          .lte('pay_period_end', qEnd)

        superOwingRef.current = (payslips ?? []).reduce((s, p) => s + Number(p.super_sg), 0)
      }

      // Compute top 3 clients from FY invoices
      const clientMap = new Map<string, { total: number; count: number }>()
      for (const inv of all) {
        if (!inv.client_name || inv.status === 'draft') continue
        const entry = clientMap.get(inv.client_name) ?? { total: 0, count: 0 }
        clientMap.set(inv.client_name, { total: entry.total + Number(inv.total_inc_gst), count: entry.count + 1 })
      }
      const sorted = [...clientMap.entries()]
        .map(([client_name, v]) => ({ client_name, ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
      setTopClients(sorted)

      setKpis(calcKPIs(all, gstCreditsRef.current, superOwingRef.current, mr.start, mr.end))
      setInvoices(all.slice(0, 8))
      setLoading(false)
    }

    load()
  }, [profile.plan])

  // ── Status change handler ─────────────────────────────────────────
  const handleStatusChange = useCallback(async (id: string, newStatus: InvoiceStatus) => {
    setUpdatingId(id)
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setInvoices(prev => {
        const updated = prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv)
        setKpis(calcKPIs(updated, gstCreditsRef.current, superOwingRef.current, monthRangeRef.current.start, monthRangeRef.current.end))
        return updated
      })
    }
    setUpdatingId(null)
  }, [])

  const fyLabel   = fyRange().fy_label
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
            {profile.business_name ?? 'Dashboard'}
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
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)' }}>Recent Invoices</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.125rem' }}>Click a status badge to update it</p>
            </div>
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
                      style={{ borderBottom: i < invoices.length - 1 ? '1px solid var(--border)' : 'none' }}
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
                        <StatusDropdown
                          invoice={inv}
                          onStatusChange={handleStatusChange}
                          updating={updatingId === inv.id}
                        />
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
                { label: 'Quarterly BAS',  value: nextBasDue(),        icon: '📋', href: undefined },
                { label: 'Monthly BAS',    value: nextMonthlyBasDue(), icon: '🗓', href: undefined },
                { label: 'Super due',      value: nextSuperDue(),      icon: '🏦', href: undefined },
                { label: 'Payday Super',   value: 'Within 7 business days of each payday — from 1 Jul 2026', icon: '⚡', href: '/payday-super' },
              ].map(item => {
                const inner = (
                  <>
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.75rem', color: item.href ? 'var(--ember)' : 'var(--text3)', marginBottom: '0.125rem' }}>{item.label}</p>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)' }}>{item.value}</p>
                    </div>
                    {item.href && <span style={{ fontSize: '0.75rem', color: 'var(--ember)', alignSelf: 'center' }}>→</span>}
                  </>
                )
                const sharedStyle: React.CSSProperties = {
                  display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                  padding: '0.75rem', background: 'var(--cream)', borderRadius: '8px',
                  textDecoration: 'none', cursor: item.href ? 'pointer' : 'default',
                }
                return item.href ? (
                  <Link key={item.label} href={item.href} style={sharedStyle}>
                    {inner}
                  </Link>
                ) : (
                  <div key={item.label} style={sharedStyle}>
                    {inner}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upgrade nudge */}
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

      {/* ── Top Clients ────────────────────────────────────────── */}
      {topClients.length > 0 && (
        <div style={{ marginTop: '1.5rem', background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)' }}>Top Clients — {fyLabel}</h2>
            <Link href="/clients" style={{ fontSize: '0.8125rem', color: 'var(--ember)', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${topClients.length}, 1fr)` }}>
            {topClients.map((client, i) => (
              <div
                key={client.client_name}
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRight: i < topClients.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {client.client_name}
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ember)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                  {formatCurrency(client.total)}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.25rem' }}>
                  {client.count} {client.count === 1 ? 'invoice' : 'invoices'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
