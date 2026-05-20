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

  async function openShareSheet() {
    try {
      await navigator.share({
        title: 'SAB Account AI',
        text: 'AI-powered invoicing for Australian small business',
        url: window.location.href,
      })
    } catch {
      // user cancelled or share not supported — do nothing
    }
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

      {/* Text + share button */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>
          Install SAB Account AI
        </div>
        <button
          onClick={openShareSheet}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#C84B2F',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 600,
            padding: '6px 12px',
          }}
        >
          {/* iOS share icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Tap Share → Add to Home Screen
        </button>
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
