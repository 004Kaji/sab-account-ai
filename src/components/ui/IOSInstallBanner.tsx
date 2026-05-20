'use client'

import { useEffect, useState } from 'react'
import { safeStorage } from '@/lib/utils'

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent)
    const isStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    const dismissed = safeStorage.get('ios-install-dismissed')

    if (isIOS && isSafari && !isStandalone && !dismissed) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    safeStorage.set('ios-install-dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: '#1C1917',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
    }}>
      {/* App icon */}
      <img
        src="/apple-touch-icon.png"
        alt="SAB Account AI"
        style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem', marginBottom: 3 }}>
          Install SAB Account AI
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', lineHeight: 1.4 }}>
          Tap{' '}
          <svg
            style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}
            width="15" height="15" viewBox="0 0 24 24"
            fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {' '}then <strong style={{ color: 'rgba(255,255,255,0.8)' }}>"Add to Home Screen"</strong>
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: 'none',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          fontSize: '1.1rem',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
