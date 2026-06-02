'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useProfile } from '@/app/(app)/profile-context'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { buildQuarters, currentQuarterIndex } from '@/lib/tax-quarters'
import type { Quarter } from '@/lib/tax-quarters'

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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TaxSuperPage() {
  const profile   = useProfile()
  const quarters  = buildQuarters()
  const [qIdx, setQIdx]         = useState(() => currentQuarterIndex(quarters))
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { document.title = 'Tax & Super — SAB Account AI' }, [])

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
          .select('employee_name, income_tax, super_sg, super_sal_sac')
          .eq('user_id', user.id)
          .gte('pay_period_end', q.start)
          .lte('pay_period_end', q.end),
      ])

      const gstCollected = (invoices ?? []).reduce((s, r) => s + Number(r.total_gst), 0)
      const gstCredits   = (expenseRecs ?? []).reduce((s, r) => s + Number(r.gst_amount), 0)
      const netGST       = gstCollected - gstCredits
      const paygWithheld = (payslips ?? []).reduce((s, p) => s + Number(p.income_tax), 0)

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

  const q = quarters[qIdx]

  if (profile.plan !== 'pro') {
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

      {/* Quarter selector */}
      <div style={{ marginBottom: '2rem' }}>
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
                <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', margin: '0.2rem 0 0' }}>Super due: {q.superDue} · Rate: 11.5%</p>
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
                  <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.5rem' }}>
                    Pay via SuperStream to each employee&apos;s nominated fund by the due date.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── Disclaimer ───────────────────────────────────────────────── */}
          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', lineHeight: 1.6, textAlign: 'center' }}>
            These figures are calculated from your invoices, expense records and payslips in SAB Account AI.
            Always verify against your records before lodging with the ATO. For personalised tax advice, consult a registered tax agent.
          </p>

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
