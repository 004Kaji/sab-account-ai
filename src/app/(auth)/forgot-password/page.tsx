'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

function DocIcon() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--ember)" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (err) throw err
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '2.5rem' }}>
          <DocIcon />
          <span className="font-display" style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.9375rem' }}>
            SAB Account AI
          </span>
        </a>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.25rem' }}>
              ✉
            </div>
            <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              Check your email
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              We've sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
            </p>
            <a href="/login" className="btn btn-ember" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Back to Sign In
            </a>
          </div>
        ) : (
          <>
            <h2 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
              Reset password
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="sab-label">Email address</label>
                <input
                  type="text"
                  required
                  autoComplete="email"
                  placeholder="you@business.com.au"
                  className="sab-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(200,75,47,0.08)', border: '1px solid rgba(200,75,47,0.25)', borderRadius: 'var(--r)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--ember)' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-ember" style={{ width: '100%' }}>
                {loading && <span className="spinner" />}
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text2)' }}>
              <a href="/login" style={{ color: 'var(--ember)', fontWeight: 500, textDecoration: 'none' }}>
                ← Back to Sign In
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
