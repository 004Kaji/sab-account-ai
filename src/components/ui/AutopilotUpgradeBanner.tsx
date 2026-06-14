'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const DISMISS_KEY = 'autopilot_banner_dismissed_at'
const REDISPLAY_DAYS = 7

export function AutopilotUpgradeBanner({ plan }: { plan: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (plan === 'autopilot') return
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed) {
      const days = (Date.now() - parseInt(dismissed)) / 86400000
      if (days < REDISPLAY_DAYS) return
    }
    setVisible(true)
  }, [plan])

  if (!visible || plan === 'autopilot') return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  return (
    <div style={{
      borderRadius: 'var(--r)',
      border: '1px solid rgba(245,158,11,0.3)',
      background: 'rgba(245,158,11,0.05)',
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem',
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ✦ New — Autopilot
        </p>
        <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)' }}>
          One message. Invoices sent. Payslips done. BAS prepared.
        </p>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.5 }}>
          SAB Chat knows your business and takes action for you — all from one message.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <Link
          href="/settings?tab=subscription"
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#D97706',
            border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: '8px',
            padding: '0.375rem 0.875rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Upgrade $49/mo →
        </Link>
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '1rem', padding: 0 }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
