'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { ProfileContext, type Profile } from './profile-context'
import { initials, safeStorage } from '@/lib/utils'
import { ToastProvider } from '@/components/ui/Toast'

const NAV_ITEMS = [
  { label: 'Dashboard',       href: '/dashboard',        proOnly: false },
  { label: 'Invoices',        href: '/invoices',         proOnly: false },
  { label: 'New Invoice',     href: '/invoice',          proOnly: false },
  { label: 'Payslips',        href: '/payslip-history',  proOnly: true  },
  { label: 'New Payslip',     href: '/payslip',          proOnly: true  },
  { label: 'ABN Pay',         href: '/abn-payments',     proOnly: true  },
  { label: 'Records',         href: '/records',          proOnly: false },
  { label: 'Clients',         href: '/clients',          proOnly: false },
  { label: 'Employees',       href: '/employees',        proOnly: true  },
  { label: 'Settings',        href: '/settings',         proOnly: false },
]

// Bottom nav limited to 5 items so they all fit on small screens
const MOBILE_NAV_ITEMS = [
  { label: 'Dashboard',  href: '/dashboard'       },
  { label: 'Invoices',   href: '/invoices'        },
  { label: 'Payslips',   href: '/payslip-history' },
  { label: 'Records',    href: '/records'         },
  { label: 'Settings',   href: '/settings'        },
]

const PLAN_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  free:    { bg: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', label: 'Free'    },
  starter: { bg: 'rgba(201,147,58,0.25)', color: '#E8B86D',               label: 'Starter' },
  pro:     { bg: 'rgba(200,75,47,0.3)',   color: '#E8856D',               label: 'Pro'     },
}

function DocIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ember)" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  )
}

const NAV_ICONS: Record<string, React.ReactElement> = {
  Invoices: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  Dashboard: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  Invoice: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  Payslips: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Records: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  Settings: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile>({
    id: '', email: '', plan: 'free',
    subscription_status: null, trial_ends_at: null,
    business_name: null,
  })
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [referralLink, setReferralLink] = useState('')

  useEffect(() => {
    const supabase = createBrowserClient()

    async function init() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.replace('/login')
          return
        }

        const [{ data: prof }, { data: biz }, { data: { session } }] = await Promise.all([
          supabase.from('profiles').select('plan, subscription_status, trial_ends_at').eq('id', user.id).single(),
          supabase.from('business_profiles').select('business_name').eq('id', user.id).single(),
          supabase.auth.getSession(),
        ])

        setProfile({
          id:                  user.id,
          email:               user.email ?? '',
          plan:                (prof?.plan ?? 'free') as Profile['plan'],
          subscription_status: prof?.subscription_status ?? null,
          trial_ends_at:       prof?.trial_ends_at ?? null,
          business_name:       biz?.business_name ?? null,
        })

        if (session?.access_token) {
          // Silently ensure referral code exists
          fetch('/api/referral/ensure-code', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }).then(async (res) => {
            if (res.ok) {
              const { code } = await res.json() as { code: string }
              if (code) setReferralLink(`https://sabaccountai.com/signup?ref=${code}`)
            }
          }).catch(() => {})

          // Track referral signup if pending from email-confirm flow
          const pendingRef = safeStorage.get('referral_ref')
          if (pendingRef) {
            fetch('/api/referral/track-signup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ refCode: pendingRef }),
            }).then(() => safeStorage.remove('referral_ref')).catch(() => {})
          }
        }

        // Track login count for 5th-login referral nudge
        const loginKey = `login_count_${user.id}`
        const count = parseInt(safeStorage.get(loginKey) ?? '0', 10) + 1
        safeStorage.set(loginKey, String(count))
        if (count === 5 && !safeStorage.get(`ref_modal_shown_${user.id}`)) {
          setShowReferralModal(true)
        }
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>Loading SAB Account AI…</p>
        </div>
      </div>
    )
  }

  const planStyle = PLAN_STYLES[profile.plan] ?? PLAN_STYLES.free
  const userInitials = initials(profile.business_name || profile.email || 'U')

  return (
    <ProfileContext.Provider value={profile}>
      <ToastProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cream)' }}>

          <header style={{
            background: 'var(--char)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            paddingTop: 'env(safe-area-inset-top)',
          }}>
            <div style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: '0 1.5rem',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', flexShrink: 0, marginRight: '1rem' }}>
                <DocIcon />
                <span className="font-display" style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  SAB Account AI
                </span>
              </Link>

              <nav style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', flex: 1 }} className="desktop-nav">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const isLocked = item.proOnly && profile.plan !== 'pro'
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.4rem 0.875rem',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                        background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        transition: 'color 150ms, background 150ms',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)' }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)' }}
                    >
                      {item.label}
                      {isLocked && (
                        <span style={{ fontSize: '0.625rem', background: 'rgba(200,75,47,0.3)', color: '#E8856D', padding: '0.1rem 0.375rem', borderRadius: '4px', fontWeight: 600 }}>
                          PRO
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginLeft: 'auto', flexShrink: 0 }}>
                <span className="plan-badge" style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.625rem',
                  borderRadius: '999px',
                  background: planStyle.bg,
                  color: planStyle.color,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}>
                  {planStyle.label}
                </span>

                {profile.plan !== 'pro' && (
                  <Link
                    href="/settings?tab=subscription"
                    className="upgrade-btn"
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      padding: '0.375rem 0.875rem',
                      borderRadius: '8px',
                      background: 'var(--ember)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Upgrade
                  </Link>
                )}

                <div style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  {userInitials}
                </div>

                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'color 150ms, background 150ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <SignOutIcon />
                </button>

                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="mobile-menu-btn"
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2rem',
                    height: '2rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    borderRadius: '6px',
                  }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                  </svg>
                </button>
              </div>
            </div>

            {menuOpen && (
              <div style={{
                background: 'var(--char2)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '0.5rem 1rem 1rem',
              }} className="mobile-menu">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href
                  const isLocked = item.proOnly && profile.plan !== 'pro'
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0.5rem',
                        fontSize: '0.9375rem',
                        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
                        textDecoration: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      {item.label}
                      {isLocked && <span style={{ fontSize: '0.75rem', color: '#E8856D' }}>Pro only</span>}
                    </Link>
                  )
                })}
                <button
                  onClick={handleSignOut}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 0.5rem', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', marginTop: '0.25rem' }}
                >
                  <SignOutIcon /> Sign out
                </button>
              </div>
            )}
          </header>

          {profile.subscription_status === 'past_due' && (
            <div style={{
              background: 'rgba(220,60,40,0.1)',
              borderBottom: '1px solid rgba(220,60,40,0.25)',
              padding: '0.625rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--ember)', fontWeight: 500, margin: 0 }}>
                ⚠ Payment failed — please update your payment method to keep your plan active.
              </p>
              <Link
                href="/settings?tab=subscription"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--ember)',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                }}
              >
                Update payment →
              </Link>
            </div>
          )}

          <main style={{ flex: 1 }}>
            {children}
          </main>

          <footer style={{
            borderTop: '1px solid var(--border)',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text3)',
          }} className="app-footer">
            <span>© {new Date().getFullYear()} SAB Account AI · Smart Invoicing for Australian Business</span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/terms"   style={{ color: 'var(--text3)', textDecoration: 'none' }}>Terms</Link>
              <Link href="/privacy" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Privacy</Link>
              <a href="mailto:basnet@sabaccountai.com" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Support</a>
            </div>
          </footer>

          <nav style={{
            display: 'none',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--char)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '0.5rem 0',
            paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))',
            zIndex: 100,
          }} className="mobile-bottom-nav">
            {MOBILE_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                    padding: '0.25rem 0.5rem',
                    flex: 1,
                    textDecoration: 'none',
                    fontSize: '0.625rem',
                    fontWeight: 500,
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {NAV_ICONS[item.label]}
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .desktop-nav { display: none !important; }
            .mobile-menu-btn { display: flex !important; }
            .mobile-bottom-nav { display: flex !important; }
            main { padding-bottom: calc(5rem + env(safe-area-inset-bottom)); }
            .app-footer { display: none !important; }
          }
          @media (max-width: 480px) {
            .plan-badge { display: none !important; }
            .upgrade-btn { font-size: 0.75rem !important; padding: 0.3rem 0.625rem !important; }
          }
        `}</style>

        {/* 5th-login referral modal */}
        {showReferralModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}>
            <div style={{
              background: '#fff', borderRadius: 'var(--r)',
              padding: '2rem', maxWidth: '420px', width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎁</div>
              <h2 className="font-display" style={{ fontSize: '1.375rem', color: 'var(--char)', marginBottom: '0.625rem' }}>
                You've been using SAB Account AI for a while!
              </h2>
              <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Have you shared it with a friend yet? Refer 1 friend and get <strong>1 month FREE</strong> when they upgrade.
              </p>
              {referralLink && (
                <div style={{
                  background: 'var(--cream)', borderRadius: 'var(--r)',
                  border: '1px solid var(--border)', padding: '0.625rem 0.875rem',
                  fontSize: '0.8125rem', fontFamily: 'var(--font-mono)',
                  color: 'var(--char)', marginBottom: '1rem',
                  wordBreak: 'break-all', textAlign: 'left',
                }}>
                  {referralLink}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button
                  onClick={() => {
                    if (referralLink) navigator.clipboard.writeText(referralLink)
                    safeStorage.set(`ref_modal_shown_${profile.id}`, '1')
                    setShowReferralModal(false)
                  }}
                  className="btn btn-ember"
                  style={{ flex: 1, fontSize: '0.875rem' }}
                >
                  Copy my link
                </button>
                <button
                  onClick={() => {
                    safeStorage.set(`ref_modal_shown_${profile.id}`, '1')
                    setShowReferralModal(false)
                  }}
                  className="btn btn-outline"
                  style={{ fontSize: '0.875rem' }}
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        )}
      </ToastProvider>
    </ProfileContext.Provider>
  )
}
