'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', gap: '1rem', padding: '2rem',
    }}>
      <p style={{ fontSize: '2rem' }}>⚠️</p>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--char)', margin: 0 }}>
        Something went wrong
      </h2>
      <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', textAlign: 'center', maxWidth: 360, margin: 0 }}>
        {error?.message ?? 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="btn btn-ember"
        style={{ marginTop: '0.5rem', padding: '0.5rem 1.5rem' }}
      >
        Try again
      </button>
    </div>
  )
}
