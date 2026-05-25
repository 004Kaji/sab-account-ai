'use client'

import { useEffect, useState } from 'react'
import type { AbnVerifyResult } from '@/app/api/abn/verify/route'

interface Props {
  abn: string
}

export default function AbnVerifyBadge({ abn }: Props) {
  const [result, setResult]   = useState<AbnVerifyResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const digits = abn.replace(/\s/g, '')

    // Only look up when we have 11 digits
    if (digits.length !== 11) {
      setResult(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/abn/verify?abn=${digits}`)
        const data = await res.json() as AbnVerifyResult
        setResult(data)
      } catch {
        setResult(null)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [abn])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
        <span className="spinner" style={{ width: '0.75rem', height: '0.75rem', borderWidth: '1.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Checking ABN…</span>
      </div>
    )
  }

  if (!result || result.status === 'not_configured' || result.status === 'error') {
    return null
  }

  if (result.status === 'active') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
        <span style={{ color: '#15803d', fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0 }}>✓</span>
        <span style={{ fontSize: '0.8125rem', color: '#15803d', fontWeight: 500 }}>{result.name}</span>
        {result.entityType && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>· {result.entityType}</span>
        )}
      </div>
    )
  }

  if (result.status === 'cancelled') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
        <span style={{ color: 'var(--ember)', fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0 }}>✕</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--ember)' }}>
          ABN cancelled — {result.name}
        </span>
      </div>
    )
  }

  if (result.status === 'not_found') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
        <span style={{ color: 'var(--ember)', fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0 }}>✕</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--ember)' }}>ABN not found in the ABR</span>
      </div>
    )
  }

  return null
}
