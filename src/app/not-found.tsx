import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      gap: '1rem',
      background: '#fafaf8'
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 800, color: '#1a1a1a', margin: 0 }}>404</h1>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#555', margin: 0 }}>Page Not Found</h2>
      <p style={{ color: '#888', margin: 0 }}>The page you are looking for does not exist.</p>
      <Link
        href="/dashboard"
        style={{
          padding: '0.5rem 1.5rem',
          borderRadius: '8px',
          background: '#1a1a1a',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
          marginTop: '0.5rem'
        }}
      >
        Go to Dashboard
      </Link>
    </div>
  )
}
