'use client'

import { useState } from 'react'

export default function PartnerApplyForm() {
  const [fields, setFields] = useState({ name: '', firm: '', email: '', phone: '', referrals: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/partner-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'rgba(74,112,85,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#4a7055" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem' }}>Application received!</h3>
        <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Check your inbox — we sent a confirmation to <strong>{fields.email}</strong>.<br />
          You&apos;ll get your referral link within 1 business day.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label className="sab-label">Your name *</label>
        <input
          type="text"
          required
          value={fields.name}
          onChange={e => set('name', e.target.value)}
          className="sab-input"
          placeholder="Jane Smith"
        />
      </div>
      <div>
        <label className="sab-label">Business / firm name *</label>
        <input
          type="text"
          required
          value={fields.firm}
          onChange={e => set('firm', e.target.value)}
          className="sab-input"
          placeholder="Smith & Co Accounting"
        />
      </div>
      <div>
        <label className="sab-label">Email address *</label>
        <input
          type="email"
          required
          value={fields.email}
          onChange={e => set('email', e.target.value)}
          className="sab-input"
          placeholder="jane@smithaccounting.com.au"
        />
      </div>
      <div>
        <label className="sab-label">Phone number</label>
        <input
          type="tel"
          value={fields.phone}
          onChange={e => set('phone', e.target.value)}
          className="sab-input"
          placeholder="0400 000 000"
        />
      </div>
      <div>
        <label className="sab-label">How many clients do you think you could refer?</label>
        <select
          value={fields.referrals}
          onChange={e => set('referrals', e.target.value)}
          className="sab-input"
          style={{ cursor: 'pointer' }}
        >
          <option value="">Select an option</option>
          <option value="1-5">1–5 clients</option>
          <option value="6-20">6–20 clients</option>
          <option value="21-50">21–50 clients</option>
          <option value="50+">50+ clients</option>
        </select>
      </div>
      <div>
        <label className="sab-label">Anything else you&apos;d like us to know?</label>
        <textarea
          rows={3}
          value={fields.notes}
          onChange={e => set('notes', e.target.value)}
          className="sab-input"
          style={{ resize: 'vertical', minHeight: '80px' }}
          placeholder="Optional — any questions, or how you found us"
        />
      </div>

      {error && (
        <p style={{ fontSize: '0.875rem', color: 'var(--ember)', background: 'rgba(200,75,47,0.08)', border: '1px solid rgba(200,75,47,0.3)', borderRadius: 'var(--r)', padding: '0.75rem 1rem' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
        {loading ? 'Sending…' : 'Send application'}
      </button>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
        Or email us directly at{' '}
        <a href="mailto:basnet@sabaccountai.com" style={{ color: 'var(--ember)' }}>basnet@sabaccountai.com</a>
      </p>
    </form>
  )
}
