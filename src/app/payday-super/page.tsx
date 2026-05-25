'use client'

import { useState } from 'react'
import Link from 'next/link'

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Payday Super?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Payday Super is a new Australian law that requires employers to pay superannuation at the same time as wages — every payday — instead of quarterly. It takes effect from 1 July 2026.',
      },
    },
    {
      '@type': 'Question',
      name: 'When does Payday Super start?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Payday Super starts on 1 July 2026. From that date, super contributions must be received by the employee\'s super fund within 7 business days of each payday.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if I miss a Payday Super payment?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Missing a Payday Super payment triggers the Super Guarantee Charge (SGC), which includes the unpaid super, 10% interest per annum, and a $20 admin fee per employee per quarter. The SGC is not tax deductible.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I calculate Payday Super?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Multiply the employee\'s ordinary time earnings for the pay period by 12% (the 2025–26 Super Guarantee rate). For example, a weekly gross of $1,500 requires $180 in super ($1,500 × 12%). SAB Account AI calculates this automatically on every payslip.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is SuperStream and do I need it for Payday Super?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SuperStream is the ATO\'s electronic system for paying super contributions. All employers must use SuperStream-compliant software or a clearing house to pay super. The ATO\'s free Small Business Superannuation Clearing House closes on 1 July 2026, so employers need an alternative SuperStream solution before that date.',
      },
    },
  ],
}

const PERIODS = [
  { label: 'Weekly',     weeks: 1,    key: 'weekly'     },
  { label: 'Fortnightly', weeks: 2,   key: 'fortnightly'},
  { label: 'Monthly',    weeks: 4.333, key: 'monthly'   },
]

function formatCurrency(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function PaydaySuperPage() {
  const [mode, setMode] = useState<'annual' | 'hourly' | 'casual'>('annual')

  // Annual / Hourly mode state
  const [salary, setSalary] = useState('')
  const [basis, setBasis] = useState<'annual' | 'hourly'>('annual')
  const [hours, setHours] = useState('38')

  // Casual (this pay run) mode state
  const [casualRate, setCasualRate] = useState('')
  const [casualHours, setCasualHours] = useState('')

  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Annual / Hourly results
  const annualSalary = basis === 'annual'
    ? parseFloat(salary) || 0
    : (parseFloat(salary) || 0) * (parseFloat(hours) || 38) * 52
  const annualSuper = annualSalary * 0.12
  const results = PERIODS.map(p => ({
    label: p.label,
    super: (annualSuper / 52) * p.weeks,
  }))

  // Casual / this pay run results
  const casualGross = (parseFloat(casualRate) || 0) * (parseFloat(casualHours) || 0)
  const casualSuper = casualGross * 0.12

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  const MODES = [
    { key: 'annual',  label: 'Annual salary' },
    { key: 'hourly',  label: 'Hourly (fixed)' },
    { key: 'casual',  label: 'This pay run' },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      {/* Nav */}
      <header style={{ background: 'var(--char)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 1.5rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ember)" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem' }}>SAB Account AI</span>
        </Link>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', alignItems: 'center' }}>
          <Link href="/blog" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Blog</Link>
          <Link href="/signup" style={{ color: 'var(--ember)', textDecoration: 'none', fontWeight: 600 }}>Try free</Link>
        </div>
      </header>

      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        {/* Urgency badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '999px', padding: '0.3rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, color: '#92400e', marginBottom: '1.25rem' }}>
          ⚡ New law from 1 July 2026
        </div>

        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          Payday Super Calculator 2026
        </h1>

        <p style={{ fontSize: '1.0625rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          From <strong>1 July 2026</strong>, Australian employers must pay super every payday — not quarterly. Calculate exactly how much super you owe per pay run, and see what changes for your business.
        </p>

        <Link href="/blog/payday-super-2026" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--ember)', fontWeight: 500, textDecoration: 'none', marginBottom: '2.5rem' }}>
          Read the full Payday Super 2026 employer guide →
        </Link>

        {/* Calculator */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1.25rem' }}>
            Calculate your Payday Super
          </h2>

          {/* Mode tabs */}
          <div style={{ display: 'flex', background: 'var(--cream)', borderRadius: '8px', padding: '3px', marginBottom: '1.25rem', width: 'fit-content', flexWrap: 'wrap', gap: '2px' }}>
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); if (m.key !== 'casual') setBasis(m.key as 'annual' | 'hourly') }}
                style={{ padding: '0.375rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, background: mode === m.key ? '#ffffff' : 'transparent', color: mode === m.key ? 'var(--char)' : 'var(--text2)', boxShadow: mode === m.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 150ms' }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* ── Annual / Hourly (fixed) inputs ── */}
          {mode !== 'casual' && (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--char)', marginBottom: '0.375rem' }}>
                    {mode === 'annual' ? 'Annual salary (AUD)' : 'Hourly rate (AUD)'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                    <input
                      type="number"
                      className="sab-input"
                      placeholder={mode === 'annual' ? '75000' : '35.00'}
                      value={salary}
                      onChange={e => setSalary(e.target.value)}
                      style={{ paddingLeft: '1.5rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                {mode === 'hourly' && (
                  <div style={{ width: '140px' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--char)', marginBottom: '0.375rem' }}>Hours per week</label>
                    <input
                      type="number"
                      className="sab-input"
                      value={hours}
                      onChange={e => setHours(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              {annualSalary > 0 ? (
                <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '1.25rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '0.875rem' }}>
                    Super due each pay run (12% SG)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {results.map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9375rem', color: 'var(--text2)' }}>{r.label}</span>
                        <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--char)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(r.super)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.625rem', marginTop: '0.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9375rem', color: 'var(--text2)' }}>Annual total</span>
                      <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--ember)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(annualSuper)}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.875rem' }}>
                    Based on {formatCurrency(annualSalary)} annual salary · 12% SG rate · due within 7 business days of each payday
                  </p>
                </div>
              ) : (
                <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '1.25rem', textAlign: 'center', color: 'var(--text3)', fontSize: '0.875rem' }}>
                  Enter a salary above to see your super obligations
                </div>
              )}
            </>
          )}

          {/* ── This pay run (casual / variable hours) ── */}
          {mode === 'casual' && (
            <>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '1rem', lineHeight: 1.6 }}>
                Casual or variable hours? Enter the actual hours worked and rate for <strong>this specific pay period</strong> to get the exact super owed.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--char)', marginBottom: '0.375rem' }}>Hourly rate (AUD)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                    <input
                      type="number"
                      className="sab-input"
                      placeholder="36.25"
                      value={casualRate}
                      onChange={e => setCasualRate(e.target.value)}
                      style={{ paddingLeft: '1.5rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: '0.25rem' }}>Include casual loading (usually +25%)</p>
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--char)', marginBottom: '0.375rem' }}>Hours worked this period</label>
                  <input
                    type="number"
                    className="sab-input"
                    placeholder="28"
                    value={casualHours}
                    onChange={e => setCasualHours(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                  <p style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: '0.25rem' }}>Actual hours — can change each run</p>
                </div>
              </div>

              {casualGross > 0 ? (
                <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '1.25rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '0.875rem' }}>
                    This pay run
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9375rem', color: 'var(--text2)' }}>Gross pay</span>
                      <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--char)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(casualGross)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.625rem' }}>
                      <span style={{ fontSize: '0.9375rem', color: 'var(--text2)' }}>Super owed (12%)</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ember)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(casualSuper)}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.875rem', padding: '0.75rem', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: '6px' }}>
                    <p style={{ fontSize: '0.8125rem', color: '#92400e', fontWeight: 600, marginBottom: '0.125rem' }}>⚡ Due within 7 business days of payday (from 1 Jul 2026)</p>
                    <p style={{ fontSize: '0.75rem', color: '#78350f' }}>Each pay run has a different super amount — that&apos;s normal for casuals. Pay via SuperStream every time.</p>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.75rem' }}>
                    {formatCurrency(parseFloat(casualRate) || 0)}/hr × {casualHours} hrs = {formatCurrency(casualGross)} gross · 12% SG
                  </p>
                </div>
              ) : (
                <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '1.25rem', textAlign: 'center', color: 'var(--text3)', fontSize: '0.875rem' }}>
                  Enter hourly rate and hours worked to calculate super for this pay run
                </div>
              )}
            </>
          )}
        </div>

        {/* Email capture */}
        <div style={{ background: 'rgba(200,75,47,0.04)', border: '1px solid rgba(200,75,47,0.15)', borderRadius: 'var(--r)', padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.375rem' }}>
            Get Payday Super reminders
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            We&apos;ll remind you before each pay run what super is due and when. No spam — just one email per pay cycle.
          </p>
          {submitted ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontSize: '0.9375rem', fontWeight: 500 }}>
              <span>✓</span> Got it! We&apos;ll be in touch before 1 July 2026.
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="email"
                className="sab-input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ flex: 1, minWidth: '200px' }}
              />
              <button type="submit" className="btn btn-ember" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                Send me reminders
              </button>
            </form>
          )}
        </div>

        {/* Main CTA */}
        <div style={{ background: 'var(--char)', borderRadius: 'var(--r)', padding: '2rem', marginBottom: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Handle Payday Super automatically
          </p>
          <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.65)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            SAB Account AI calculates your exact super amount on every payslip — so you always know what&apos;s due, to which fund, and by when. Try free today.
          </p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: '#fff', padding: '0.75rem 1.75rem', borderRadius: 'var(--r)', fontSize: '0.9375rem', fontWeight: 600, textDecoration: 'none' }}>
            Try SAB Account AI free →
          </Link>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.75rem' }}>No credit card required · Free plan available</p>
        </div>

        {/* Further reading */}
        <Link href="/blog/payday-super-2026" style={{ textDecoration: 'none', display: 'block', marginBottom: '2.5rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#7c3aed', marginBottom: '0.375rem' }}>Full guide</p>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.25rem' }}>Payday Super 2026: What Every Australian Employer Must Know Before 1 July</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>7-day rule, SuperStream, penalties, preparation checklist — 9 min read</p>
            </div>
            <span style={{ color: 'var(--ember)', fontSize: '1.25rem', flexShrink: 0 }}>→</span>
          </div>
        </Link>

        {/* FAQ */}
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
          Payday Super — Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {FAQ_SCHEMA.mainEntity.map((q, i) => (
            <details key={i} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.125rem 1.25rem' }}>
              <summary style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                {q.name}
                <span style={{ color: 'var(--text3)', flexShrink: 0, fontSize: '1rem' }}>+</span>
              </summary>
              <p style={{ marginTop: '0.875rem', fontSize: '0.9375rem', color: 'var(--text2)', lineHeight: 1.7 }}>
                {q.acceptedAnswer.text}
              </p>
            </details>
          ))}
        </div>

        <div style={{ marginTop: '3rem', padding: '1.25rem', background: 'var(--cream)', borderRadius: 'var(--r)', fontSize: '0.8125rem', color: 'var(--text3)', lineHeight: 1.6 }}>
          <strong>Disclaimer:</strong> This calculator provides estimates only based on the 12% Super Guarantee rate. Actual obligations may vary. Consult a registered tax agent for advice specific to your situation. Super rules are subject to change by the ATO and Government.
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text3)' }}>
        © {new Date().getFullYear()} SAB Account AI ·{' '}
        <Link href="/terms" style={{ color: 'var(--text3)' }}>Terms</Link> ·{' '}
        <Link href="/privacy" style={{ color: 'var(--text3)' }}>Privacy</Link> ·{' '}
        <Link href="/blog" style={{ color: 'var(--text3)' }}>Australian tax guides</Link>
      </footer>
    </div>
  )
}
