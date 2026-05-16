'use client'

// The signup form — handles all field state, validation, and Supabase auth.
// Displayed by the signup page.tsx server component.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { validateABN, validateEmail } from '@/lib/utils'

type Plan = 'free' | 'starter' | 'pro'

// Plan options displayed in the plan picker
const PLANS: Array<{
  id: Plan
  name: string
  price: string
  desc: string
  features: string[]
  recommended?: boolean
}> = [
  {
    id: 'free',
    name: 'Free',
    price: '$0/mo',
    desc: 'Basic invoicing to get started.',
    features: ['3 invoices/month', 'PDF download', 'GST calculation'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$9/mo',
    desc: 'For freelancers who invoice regularly.',
    features: ['Unlimited invoices', 'AI generation', 'Income & expense records'],
    recommended: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19/mo',
    desc: 'Full ATO compliance for growing businesses.',
    features: ['Everything in Starter', 'ATO payslips', 'BAS estimates', 'Super tracking'],
  },
]

// Reuse the same document icon from login
function DocIcon({ color = 'currentColor', size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

export default function SignupForm({ initialPlan }: { initialPlan: Plan }) {
  const router = useRouter()

  // Form field state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [abn, setAbn] = useState('')
  const [password, setPassword] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<Plan>(initialPlan)

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Validate all fields — returns true only if everything is correct
  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    // Names: required + letters only (no numbers or symbols)
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required'
    } else if (!/^[a-zA-Z\s'\-]+$/.test(firstName.trim())) {
      newErrors.firstName = 'First name must contain letters only'
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    } else if (!/^[a-zA-Z\s'\-]+$/.test(lastName.trim())) {
      newErrors.lastName = 'Last name must contain letters only'
    }

    // Email: required + valid format (must have @ and a dot after it)
    if (!email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Enter a valid email address (e.g. you@example.com)'
    }

    // Business name: required
    if (!businessName.trim()) {
      newErrors.businessName = 'Business name is required'
    }

    // ABN: optional but must be valid 11-digit number if provided
    if (abn.trim() && !validateABN(abn)) {
      newErrors.abn = 'Invalid ABN — must be 11 digits (e.g. 12 345 678 901)'
    }

    // Password: minimum 8 characters
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    setErrors(newErrors)

    // Scroll to the top of the form so the user sees the errors
    if (Object.keys(newErrors).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const supabase = createBrowserClient()

      // Sign up with Supabase Auth — extra info stored in user metadata
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            business_name: businessName.trim(),
            abn: abn.trim() || null,
            plan: selectedPlan,
          },
        },
      })

      if (authError) throw authError

      // Supabase returns a user even when email confirmation is required.
      // The difference: with confirmation OFF → data.session is set (signed in immediately).
      //                 with confirmation ON  → data.session is null (must confirm email).

      if (data.user) {
        if (data.session) {
          // Email confirmation is OFF — user is signed in, save business details now
          await supabase.from('business_profiles').upsert({
            id: data.user.id,
            email,
            business_name: businessName.trim(),
            abn: abn.trim() || null,
          })
          router.push('/dashboard')
          return
        }
        // Email confirmation is ON — save business details for when they confirm
        // (stored in user metadata, dashboard will pick it up on first login)
      }

      // Show "check your email" screen
      setDone(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.'
      // Surface "User already registered" as a friendlier message
      const friendly = msg.includes('already registered')
        ? 'An account with that email already exists. Try signing in instead.'
        : msg
      setErrors({ submit: friendly })
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen (email confirmation required) ─────────────
  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--cream)' }}>
        <div className="sab-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
          {/* Check circle */}
          <div style={{
            width: '3.5rem', height: '3.5rem', borderRadius: '50%',
            background: 'rgba(74,112,85,0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--sage)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--char)', marginBottom: '0.75rem' }}>Check your email</h2>
          <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            We sent a confirmation link to{' '}
            <strong style={{ color: 'var(--char)' }}>{email}</strong>.
            Click it to activate your account.
          </p>
          <a href="/login" className="btn btn-outline" style={{ display: 'inline-flex' }}>
            Back to sign in
          </a>
        </div>
      </div>
    )
  }

  // ── Main signup form ─────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* ── Left hero panel ──────────────────────────────────── */}
      <aside style={{
        display: 'none',
        flexDirection: 'column',
        width: '44%',
        background: 'var(--char)',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }} className="lg-flex">
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(200,75,47,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: 'auto' }}>
          <DocIcon color="var(--ember)" size={26} />
          <span className="font-display" style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>SAB Account AI</span>
        </div>

        <div style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
          <h1 className="font-display" style={{ color: '#fff', fontSize: '2.25rem', lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: '1.125rem' }}>
            Join thousands of<br />
            <em style={{ color: 'var(--ember)', fontStyle: 'italic' }}>Australian businesses</em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.65, marginBottom: '2rem' }}>
            Set up your account in under 2 minutes. No credit card required for the free plan.
          </p>

          {/* Social proof / reassurance */}
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '🔒', text: 'Your data is encrypted and never sold' },
              { icon: '📋', text: 'ATO-compliant invoices and payslips' },
              { icon: '💳', text: '14-day free trial — cancel anytime' },
            ].map((item) => (
              <li key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <span style={{ fontSize: '1.125rem' }}>{item.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
            SAB Account AI · Smart Invoicing for Australian Small Business
          </p>
        </div>
      </aside>

      {/* ── Right form panel ─────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--cream)', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto', paddingTop: '1rem', paddingBottom: '3rem' }}>

          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }} className="mobile-logo">
            <DocIcon color="var(--ember)" size={22} />
            <span className="font-display" style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.9375rem' }}>SAB Account AI</span>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'inline-flex', gap: '0.25rem', background: 'var(--cream2)', borderRadius: 'var(--r)', padding: '0.25rem', marginBottom: '2rem' }}>
            <a href="/login" style={{ padding: '0.5rem 1.125rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text2)', textDecoration: 'none' }}>
              Sign In
            </a>
            <span style={{ padding: '0.5rem 1.125rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, background: '#fff', color: 'var(--char)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'default' }}>
              Create Account
            </span>
          </div>

          <h2 className="font-display" style={{ color: 'var(--char)', fontSize: '1.75rem', letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
            Create your account
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Get started free — no credit card required
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Error summary banner — shows when any field has an error */}
            {Object.keys(errors).filter(k => k !== 'submit').length > 0 && (
              <div style={{
                background: 'rgba(200,75,47,0.08)',
                border: '1.5px solid rgba(200,75,47,0.4)',
                borderRadius: 'var(--r)',
                padding: '0.875rem 1rem',
              }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ember)', marginBottom: '0.375rem' }}>
                  Please fix the following errors:
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {Object.entries(errors).filter(([k]) => k !== 'submit').map(([, msg]) => (
                    <li key={msg} style={{ fontSize: '0.8125rem', color: 'var(--ember)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span>•</span> {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="sab-label">First name</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (errors.firstName) setErrors(prev => { const n = {...prev}; delete n.firstName; return n })
                  }}
                  placeholder="Jane"
                  className={`sab-input${errors.firstName ? ' error' : ''}`}
                />
                {errors.firstName && <p style={{ fontSize: '0.75rem', color: 'var(--ember)', marginTop: '0.25rem', fontWeight: 500 }}>{errors.firstName}</p>}
              </div>
              <div>
                <label className="sab-label">Last name</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (errors.lastName) setErrors(prev => { const n = {...prev}; delete n.lastName; return n })
                  }}
                  placeholder="Smith"
                  className={`sab-input${errors.lastName ? ' error' : ''}`}
                />
                {errors.lastName && <p style={{ fontSize: '0.75rem', color: 'var(--ember)', marginTop: '0.25rem' }}>{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="sab-label">Email address</label>
              <input
                type="text"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors(prev => { const n = {...prev}; delete n.email; return n })
                }}
                placeholder="you@business.com.au"
                className={`sab-input${errors.email ? ' error' : ''}`}
              />
              {errors.email && <p style={{ fontSize: '0.75rem', color: 'var(--ember)', marginTop: '0.25rem', fontWeight: 500 }}>{errors.email}</p>}
            </div>

            {/* Business name */}
            <div>
              <label className="sab-label">Business name</label>
              <input
                type="text"
                autoComplete="organization"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value)
                  if (errors.businessName) setErrors(prev => { const n = {...prev}; delete n.businessName; return n })
                }}
                placeholder="Your Business Pty Ltd"
                className={`sab-input${errors.businessName ? ' error' : ''}`}
              />
              {errors.businessName && <p style={{ fontSize: '0.75rem', color: 'var(--ember)', marginTop: '0.25rem', fontWeight: 500 }}>{errors.businessName}</p>}
            </div>

            {/* ABN (optional) */}
            <div>
              <label className="sab-label">
                ABN <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                value={abn}
                onChange={(e) => {
                  setAbn(e.target.value)
                  if (errors.abn) setErrors(prev => { const n = {...prev}; delete n.abn; return n })
                }}
                placeholder="12 345 678 901"
                className={`sab-input${errors.abn ? ' error' : ''}`}
                maxLength={14}
              />
              {errors.abn && <p style={{ fontSize: '0.75rem', color: 'var(--ember)', marginTop: '0.25rem', fontWeight: 500 }}>{errors.abn}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="sab-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors(prev => { const n = {...prev}; delete n.password; return n })
                  }}
                  placeholder="Min. 8 characters"
                  className={`sab-input${errors.password ? ' error' : ''}`}
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.125rem',
                    color: 'var(--text3)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p style={{ fontSize: '0.75rem', color: 'var(--ember)', marginTop: '0.25rem', fontWeight: 500 }}>{errors.password}</p>}
            </div>

            {/* ── Plan picker ───────────────────────────────── */}
            <div style={{ marginTop: '0.5rem' }}>
              <label className="sab-label" style={{ marginBottom: '0.75rem' }}>Choose your plan</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id
                  return (
                    <label
                      key={plan.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.875rem',
                        padding: '0.875rem 1rem',
                        borderRadius: 'var(--r)',
                        border: isSelected ? '2px solid var(--ember)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(200,75,47,0.04)' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'border-color 150ms ease, background 150ms ease',
                        position: 'relative',
                      }}
                    >
                      {/* Recommended badge */}
                      {plan.recommended && (
                        <div style={{
                          position: 'absolute',
                          top: '-1px',
                          right: '0.75rem',
                          background: 'var(--ember)',
                          color: '#fff',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '0 0 6px 6px',
                          letterSpacing: '0.04em',
                        }}>
                          POPULAR
                        </div>
                      )}

                      {/* Radio button */}
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={isSelected}
                        onChange={() => setSelectedPlan(plan.id)}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--ember)', width: '1rem', height: '1rem', flexShrink: 0 }}
                      />

                      {/* Plan details */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--char)' }}>{plan.name}</span>
                          <span className="font-mono" style={{ fontSize: '0.875rem', color: isSelected ? 'var(--ember)' : 'var(--text2)', fontWeight: 600 }}>
                            {plan.price}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.5rem' }}>{plan.desc}</p>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {plan.features.map((f) => (
                            <li key={f} style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
                                <path d="M2 5l2 2 4-4" stroke={isSelected ? 'var(--ember)' : 'var(--sage)'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Submit error */}
            {errors.submit && (
              <div style={{ background: 'rgba(200,75,47,0.08)', border: '1px solid rgba(200,75,47,0.25)', borderRadius: 'var(--r)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--ember)' }}>
                {errors.submit}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-ember"
              style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.9375rem', padding: '0.75rem' }}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Creating account…' : `Create account${selectedPlan !== 'free' ? ' — start free trial' : ''}`}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text3)', lineHeight: 1.5 }}>
              By creating an account you agree to our{' '}
              <a href="/terms" style={{ color: 'var(--ember)', textDecoration: 'none' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" style={{ color: 'var(--ember)', textDecoration: 'none' }}>Privacy Policy</a>.
              {selectedPlan !== 'free' && ' 14-day free trial, then billed monthly (AUD + GST). Cancel anytime.'}
            </p>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text2)' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: 'var(--ember)', fontWeight: 500, textDecoration: 'none' }}>
              Sign in →
            </a>
          </p>
        </div>
      </main>

      <style>{`
        @media (min-width: 1024px) {
          .lg-flex { display: flex !important; }
          .mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  )
}
