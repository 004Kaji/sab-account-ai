'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

interface PartnerData {
  name: string
  firm: string
  ref_code: string
  conversions_count: number
  status: string
  created_at: string
}

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<PartnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      try {
        const res = await fetch('/api/partner/stats', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await res.json() as { partner: PartnerData | null }
        setPartner(json.partner ?? null)
      } catch {
        // ignore — show not-a-partner state
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div style={{ padding: '3rem', color: 'var(--text2)', fontSize: '0.9rem' }}>Loading…</div>
  }

  if (!partner) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-fraunces)', fontSize: '1.75rem',
          color: 'var(--char)', marginBottom: '1.5rem',
        }}>
          Partner Program
        </h1>
        <div style={{
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center',
        }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>
            You&apos;re not in the partner program yet
          </p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Earn 20% ongoing monthly commission for every client you refer to SAB Account AI — no cap, no expiry.
          </p>
          <Link href="/partners" style={{
            display: 'inline-block', background: 'var(--ember)', color: 'white',
            padding: '0.75rem 1.75rem', borderRadius: 'var(--r)', fontWeight: 600,
            textDecoration: 'none', fontSize: '0.9rem',
          }}>
            Apply now
          </Link>
        </div>
      </div>
    )
  }

  const referralUrl = `https://sabaccountai.com/signup?ref=${partner.ref_code}`
  const estMonthly = Math.round(partner.conversions_count * 19 * 0.2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-fraunces)', fontSize: '1.75rem',
          color: 'var(--char)', marginBottom: '0.4rem',
        }}>
          Partner Dashboard
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
          {partner.name} · {partner.firm}
          {partner.status === 'pending' && (
            <span style={{
              marginLeft: '0.75rem',
              background: '#FEF3C7', color: '#92400E',
              fontSize: '0.7rem', fontWeight: 700,
              padding: '0.2rem 0.6rem', borderRadius: 20,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Under review
            </span>
          )}
          {partner.status === 'approved' && (
            <span style={{
              marginLeft: '0.75rem',
              background: '#D1FAE5', color: '#065F46',
              fontSize: '0.7rem', fontWeight: 700,
              padding: '0.2rem 0.6rem', borderRadius: 20,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Active
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem', marginBottom: '1.75rem',
      }}>
        {[
          { label: 'Clients referred',        value: partner.conversions_count.toString() },
          { label: 'Est. monthly commission',  value: `$${estMonthly}` },
          { label: 'Your commission rate',     value: '20%' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--r2)', padding: '1.25rem',
          }}>
            <div style={{
              fontSize: '1.75rem', fontWeight: 700,
              color: 'var(--char)', lineHeight: 1, marginBottom: '0.4rem',
            }}>
              {value}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 'var(--r2)', padding: '1.5rem', marginBottom: '1.5rem',
      }}>
        <p style={{
          fontWeight: 600, color: 'var(--char)',
          fontSize: '0.875rem', marginBottom: '0.875rem',
        }}>
          Your referral link
        </p>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
          <code style={{
            flex: 1, minWidth: 0,
            background: 'var(--cream)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', padding: '0.6rem 0.875rem',
            fontSize: '0.825rem', color: 'var(--char)',
            wordBreak: 'break-all', lineHeight: 1.5,
          }}>
            {referralUrl}
          </code>
          <button
            onClick={handleCopy}
            style={{
              flexShrink: 0,
              background: copied ? 'var(--ember)' : 'white',
              color: copied ? 'white' : 'var(--ember)',
              border: '1.5px solid var(--ember)',
              padding: '0.6rem 1.125rem',
              borderRadius: 'var(--r)',
              fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: '0.78rem', marginTop: '0.75rem' }}>
          Code: <strong style={{ color: 'var(--char)' }}>{partner.ref_code}</strong> · Every signup using your link is tracked automatically.
        </p>
      </div>

      {/* How commissions work */}
      <div style={{
        background: 'var(--ember-p)',
        border: '1px solid rgba(200,75,47,0.15)',
        borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem',
      }}>
        <p style={{
          fontWeight: 700, color: 'var(--ember)',
          fontSize: '0.8rem', textTransform: 'uppercase',
          letterSpacing: '0.05em', marginBottom: '0.625rem',
        }}>
          How commissions work
        </p>
        <ul style={{
          color: 'var(--char)', fontSize: '0.875rem',
          lineHeight: 1.9, paddingLeft: '1.25rem', margin: 0,
        }}>
          <li>Client signs up via your link → referral is tracked automatically</li>
          <li>Client upgrades to a paid plan → you earn 20% of their monthly subscription</li>
          <li>Commission is ongoing — no cap, no expiry, paid monthly</li>
          <li>Questions? Email <a href="mailto:basnet@sabaccountai.com" style={{ color: 'var(--ember)' }}>basnet@sabaccountai.com</a></li>
        </ul>
      </div>

    </div>
  )
}
