'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'sab_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(calc(100vw - 2rem), 560px)',
      background: 'var(--char)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 'var(--r)',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      flexWrap: 'wrap',
      zIndex: 9999,
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    }}>
      <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, flex: 1, minWidth: 0 }}>
        We use session cookies for authentication and analytics to improve the service. No advertising trackers.{' '}
        <Link href="/privacy" style={{ color: 'var(--ember)', textDecoration: 'none' }}>Privacy Policy</Link>
      </p>
      <button
        onClick={accept}
        style={{
          background: 'var(--ember)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--r)',
          padding: '0.5rem 1rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Got it
      </button>
    </div>
  )
}
