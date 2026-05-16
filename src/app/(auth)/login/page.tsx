'use client'

// Login page — split layout with dark hero panel on the left, auth card on the right.
// Handles email/password sign-in and Google OAuth.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

// The document icon used in the logo
function DocIcon({ color = 'currentColor', size = 28 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

// Google colour logo for the OAuth button
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.233 17.64 11.925 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    createBrowserClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard')
    })
  }, [router])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [notConfirmed, setNotConfirmed] = useState(false)

  // Sign in with email + password
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.toLowerCase().includes('email not confirmed')) {
        setNotConfirmed(true)
        setError('')
      } else if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect email or password. If you don\'t have an account yet, click "Create Account" above.')
      } else {
        setError(msg || 'Sign in failed. Check your email and password.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign in with Google OAuth — redirects to Google then back to /auth/callback
  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign in failed.')
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* ── Left hero panel (hidden on mobile) ─────────────────── */}
      <aside style={{
        display: 'none',
        flexDirection: 'column',
        width: '44%',
        background: 'var(--char)',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }} className="lg-flex">

        {/* Subtle background pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(200,75,47,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: 'auto' }}>
          <DocIcon color="var(--ember)" size={26} />
          <span className="font-display" style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.02em' }}>
            SAB Account AI
          </span>
        </div>

        {/* Main message */}
        <div style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
          <h1 className="font-display" style={{
            color: '#ffffff',
            fontSize: '2.25rem',
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            marginBottom: '1.125rem',
          }}>
            Smart Invoicing for<br />
            <em style={{ color: 'var(--ember)', fontStyle: 'italic' }}>Australian Business</em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.65, marginBottom: '2rem' }}>
            Create professional tax invoices with AI, run ATO-compliant
            payslips, and track GST — all from one dashboard.
          </p>

          {/* Feature bullets */}
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              'AI generates invoice from plain-English job description',
              'PAYG withholding using ATO Scale 1 & 2 tables',
              'Super at 12% from 1 July 2025',
              'GST tracking and BAS estimates built in',
            ].map((item) => (
              <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{
                  width: '1.125rem',
                  height: '1.125rem',
                  borderRadius: '50%',
                  background: 'rgba(200,75,47,0.2)',
                  border: '1px solid rgba(200,75,47,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.125rem',
                }}>
                  <svg width="8" height="8" fill="none" viewBox="0 0 8 8">
                    <path d="M1.5 4l2 2 3-3" stroke="var(--ember)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.5 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom note */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
            SAB Account AI · Smart Invoicing for Australian Small Business
          </p>
        </div>
      </aside>

      {/* ── Right auth panel ────────────────────────────────────── */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        background: 'var(--cream)',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Mobile logo (only visible on small screens) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }} className="mobile-logo">
            <DocIcon color="var(--ember)" size={22} />
            <span className="font-display" style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.9375rem' }}>
              SAB Account AI
            </span>
          </div>

          {/* Tab bar */}
          <div style={{
            display: 'inline-flex',
            gap: '0.25rem',
            background: 'var(--cream2)',
            borderRadius: 'var(--r)',
            padding: '0.25rem',
            marginBottom: '2rem',
          }}>
            {/* Sign In — active */}
            <span style={{
              padding: '0.5rem 1.125rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: '#ffffff',
              color: 'var(--char)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              cursor: 'default',
            }}>
              Sign In
            </span>
            {/* Create Account — links to signup */}
            <a href="/signup" style={{
              padding: '0.5rem 1.125rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text2)',
              textDecoration: 'none',
            }}>
              Create Account
            </a>
          </div>

          <h2 className="font-display" style={{ color: 'var(--char)', fontSize: '1.75rem', letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
            Welcome back
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Sign in to your SAB Account AI account
          </p>

          {/* Google OAuth button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="btn btn-outline"
            style={{ width: '100%', marginBottom: '1.25rem', gap: '0.75rem' }}
          >
            {googleLoading ? <span className="spinner" /> : <GoogleIcon />}
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>or continue with email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Sign in form */}
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label className="sab-label">Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com.au"
                className="sab-input"
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <label className="sab-label" style={{ margin: 0 }}>Password</label>
                <a href="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--ember)', textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="sab-input"
              />
            </div>

            {/* Remember me */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text2)' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--ember)', width: '1rem', height: '1rem' }}
              />
              Remember me for 30 days
            </label>

            {/* Email not confirmed banner */}
            {notConfirmed && (
              <div style={{ background: 'rgba(201,147,58,0.1)', border: '1px solid rgba(201,147,58,0.3)', borderRadius: 'var(--r)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#7a5a10' }}>
                <strong>Please confirm your email first.</strong> Check your inbox for a confirmation link from SAB Account AI, then try signing in again.
              </div>
            )}

            {/* Error message */}
            {error && (
              <div style={{
                background: 'rgba(200,75,47,0.08)',
                border: '1px solid rgba(200,75,47,0.25)',
                borderRadius: 'var(--r)',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                color: 'var(--ember)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-ember"
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text2)' }}>
            No account yet?{' '}
            <a href="/signup" style={{ color: 'var(--ember)', fontWeight: 500, textDecoration: 'none' }}>
              Create one free →
            </a>
          </p>
        </div>
      </main>

      {/* Responsive styles for the left panel */}
      <style>{`
        @media (min-width: 1024px) {
          .lg-flex { display: flex !important; }
          .mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  )
}
