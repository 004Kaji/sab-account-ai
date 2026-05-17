'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { ProfileContext, type Profile } from './profile-context'
import { initials } from '@/lib/utils'
import { ToastProvider } from '@/components/ui/Toast'

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/dashboard',  proOnly: false },
  { label: 'Create Invoice', href: '/invoice',    proOnly: false },
  { label: 'Payslips',       href: '/payslip',    proOnly: true  },
  { label: 'Records',        href: '/records',    proOnly: false },
  { label: 'Clients',        href: '/clients',    proOnly: false },
  { label: 'Employers',      href: '/employers',  proOnly: false },
  { label: 'Settings',       href: '/settings',   proOnly: false },
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

  useEffect(() => {
    const supabase = createBrowserClient()

    async function init() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.replace('/login')
          return
        }

        const [{ data: prof }, { data: biz }] = await Promise.all([
          supabase.from('profiles').select('plan, subscription_status, trial_ends_at').eq('id', user.id).single(),
          supabase.from('business_profiles').select('business_name').eq('id', user.id).single(),
        ])

        setProfile({
          id:                  user.id,
          email:               user.email ?? '',
          plan:                (prof?.plan ?? 'free') as Profile['plan'],
          subscription_status: prof?.subscription_status ?? null,
          trial_ends_at:       prof?.trial_ends_at ?? null,
          business_name:       biz?.business_name ?? null,
        })
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
                <span style={{
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
              <a href="mailto:support@sabaccountai.com" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Support</a>
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
            zIndex: 100,
          }} className="mobile-bottom-nav">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
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
                  <span style={{ fontSize: '1.25rem' }}>
                    {item.label === 'Dashboard'      && '◻'}
                    {item.label === 'Create Invoice' && '📄'}
                    {item.label === 'Payslips'       && '💵'}
                    {item.label === 'Records'        && '📊'}
                    {item.label === 'Clients'        && '👥'}
                    {item.label === 'Employers'      && '🏢'}
                    {item.label === 'Settings'       && '⚙'}
                  </span>
                  {item.label === 'Create Invoice' ? 'Invoice' : item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .desktop-nav { display: none !important; }
            .mobile-menu-btn { display: flex !important; }
            .mobile-bottom-nav { display: flex !important; }
            main { padding-bottom: 4rem; }
            .app-footer { display: none !important; }
          }
        `}</style>
      </ToastProvider>
    </ProfileContext.Provider>
  )
}
