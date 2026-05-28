'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { safeStorage } from '@/lib/utils'

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent)
    const isStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    const dismissed = safeStorage.get('ios-install-dismissed')
    if (isIOS && isSafari && !isStandalone && !dismissed) setVisible(true)
  }, [])

  function dismiss() {
    safeStorage.set('ios-install-dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes bounce-down {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        .ios-arrow { animation: bounce-down 1.2s ease-in-out infinite; }
      `}</style>

      {/* Overlay backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.45)',
        }}
      />

      {/* Banner */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 9999,
        background: '#1C1917',
        borderRadius: '20px 20px 0 0',
        padding: '24px 24px 36px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.2)',
          margin: '0 auto 20px',
        }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <Image
            src="/apple-touch-icon.png"
            alt="SAB Account AI"
            width={52}
            height={52}
            style={{ borderRadius: 12, flexShrink: 0 }}
          />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
              Install SAB Account AI
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', marginTop: 2 }}>
              Add to your home screen — works like an app
            </div>
          </div>
          <button
            onClick={dismiss}
            style={{
              marginLeft: 'auto', background: 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: '50%', color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', width: 28, height: 28, fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {/* Step 1 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#C84B2F', color: '#fff',
              fontWeight: 800, fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>1</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>
                Tap <span style={{ letterSpacing: 2 }}>•••</span> at the bottom of Safari
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                Then tap{' '}
                <svg style={{ display: 'inline', verticalAlign: 'middle' }}
                  width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.6)" strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                {' '}<strong style={{ color: 'rgba(255,255,255,0.7)' }}>Share</strong> in the menu
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#C84B2F', color: '#fff',
              fontWeight: 800, fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>2</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>
                Tap &quot;Add to Home Screen&quot;
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                Scroll down in the share menu to find it
              </div>
            </div>
          </div>
        </div>

        {/* Bouncing arrow pointing down to Safari toolbar */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: 8 }}>
            Share button is down here
          </div>
          <div className="ios-arrow" style={{ color: '#C84B2F' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>
        </div>
      </div>
    </>
  )
}
