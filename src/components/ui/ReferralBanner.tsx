'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { safeStorage } from '@/lib/utils'

interface Props {
  triggerId: string
  trigger: boolean
  emoji: string
  title: string
  description: string
}

export default function ReferralBanner({ triggerId, trigger, emoji, title, description }: Props) {
  const [visible, setVisible] = useState(false)
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!trigger || !mounted) return
    const key = `ref_banner_${triggerId}`
    if (safeStorage.get(key)) return

    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.code) {
            setLink(`https://sabaccountai.com/signup?ref=${data.code}`)
            setVisible(true)
          }
        })
    })
  }, [trigger, triggerId, mounted])

  function dismiss() {
    safeStorage.set(`ref_banner_${triggerId}`, '1')
    setVisible(false)
  }

  function copyLink() {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!visible || !link) return null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          width: 'calc(100% - 3rem)',
          maxWidth: '540px',
          background: 'var(--char)',
          borderRadius: 'var(--r)',
          border: '1px solid rgba(200,75,47,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
          animation: 'slideUp 300ms ease',
        }}
      >
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', marginBottom: '0.125rem' }}>
            {title}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem' }}>{description}</p>
        </div>
        <button
          onClick={copyLink}
          style={{
            flexShrink: 0,
            padding: '0.4rem 0.875rem',
            borderRadius: '8px',
            background: copied ? 'rgba(34,197,94,0.2)' : 'var(--ember)',
            border: 'none',
            color: '#ffffff',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 150ms',
          }}
        >
          {copied ? 'Copied! ✓' : 'Copy my link'}
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            flexShrink: 0,
            width: '1.75rem',
            height: '1.75rem',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
          }}
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(1rem); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }
      `}</style>
    </>
  )
}
