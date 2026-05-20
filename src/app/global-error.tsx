'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en-AU">
      <body style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h2>
        <p style={{ color: '#666' }}>{error?.message ?? 'An unexpected error occurred.'}</p>
        <button
          onClick={() => reset()}
          style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
