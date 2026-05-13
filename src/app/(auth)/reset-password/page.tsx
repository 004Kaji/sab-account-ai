'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

function DocIcon() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--ember)" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [ready, setReady]         = useState(false)

  // Supabase sends the token in the URL hash — this event fires when it's processed
  useEffect(() => {
    const supabase = createBrowserClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed. Try requesting a new link.')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>Verifying reset link…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
          <DocIcon />
          <span className="font-display" style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.9375rem' }}>
            SAB Account AI
          </span>
        </div>

        <h2 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
          Choose a new password
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '2rem' }}>
          Must be at least 8 characters.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="sab-label">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className="sab-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="sab-label">Confirm Password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Repeat password"
              className="sab-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(200,75,47,0.08)', border: '1px solid rgba(200,75,47,0.25)', borderRadius: 'var(--r)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--ember)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-ember" style={{ width: '100%', marginTop: '0.25rem' }}>
            {loading && <span className="spinner" />}
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
