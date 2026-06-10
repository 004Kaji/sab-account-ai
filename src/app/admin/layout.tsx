'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

const ADMIN_EMAILS = ['sanjog.basnet02@gmail.com', 'basnet@sabaccountai.com']

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [ready, setReady]   = useState(false)
  const [denied, setDenied] = useState(false)
  const [supabase] = useState(() => createBrowserClient())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        if (pathname !== '/admin/login') router.replace('/admin/login')
        else setReady(true)
        return
      }
      if (!ADMIN_EMAILS.includes(session.user.email ?? '')) {
        setDenied(true)
        return
      }
      if (pathname === '/admin/login') {
        router.replace('/admin')
        return
      }
      setReady(true)
    })
  }, [pathname])

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  // Login page is public — render immediately, no spinner
  if (pathname === '/admin/login') return <>{children}</>

  if (denied) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--char)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '1rem' }}>Access denied.</p>
          <a href="/dashboard" style={{ color: 'var(--ember)', fontSize: '0.85rem' }}>Go to dashboard</a>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--char)' }}>
        <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'var(--ember)' }} />
      </div>
    )
  }


  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      {/* Minimal admin header */}
      <header style={{
        background: 'var(--char)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 1.5rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: 'white', fontFamily: 'var(--font-fraunces)', fontSize: '1rem', letterSpacing: '-0.02em' }}>
            SAB Account AI
          </span>
          <span style={{
            background: 'var(--ember-p)', color: 'var(--ember)',
            fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '0.2rem 0.6rem', borderRadius: 10,
          }}>
            Admin
          </span>
        </div>
        <button
          onClick={signOut}
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.6)', padding: '0.35rem 0.9rem',
            borderRadius: 'var(--r)', fontSize: '0.8rem', cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans)', transition: 'all 0.15s',
          }}
        >
          Sign out
        </button>
      </header>

      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
