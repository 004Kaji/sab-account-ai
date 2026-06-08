'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserClient()

  async function signInWithGoogle() {
    setLoading(true)
    // Tell the auth callback to redirect back to /admin after sign-in
    localStorage.setItem('post_auth_redirect', '/admin')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--char)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        padding: '0 1.5rem',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '1.5rem',
            color: 'white',
            margin: '0 0 0.4rem',
            letterSpacing: '-0.02em',
          }}>
            SAB Account AI
          </p>
          <span style={{
            display: 'inline-block',
            background: 'var(--ember-p)',
            color: 'var(--ember)',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '0.25rem 0.7rem',
            borderRadius: 12,
          }}>
            Admin Access
          </span>
        </div>

        {/* Sign in card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--r2)',
          padding: '2rem 1.75rem',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}>
            Restricted access. Sign in with your admin Google account.
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1.5rem',
              background: loading ? 'rgba(255,255,255,0.06)' : 'white',
              color: loading ? 'rgba(255,255,255,0.3)' : 'var(--char)',
              border: 'none',
              borderRadius: 'var(--r)',
              fontFamily: 'var(--font-dm-sans)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {!loading && (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Redirecting…' : 'Sign in with Google'}
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          Only authorised accounts can access this area.
        </p>
      </div>
    </div>
  )
}
