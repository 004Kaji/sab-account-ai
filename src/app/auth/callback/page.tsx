'use client'

// OAuth callback page — handles the redirect from Google after sign-in.
// Supabase automatically processes the token from the URL and fires
// onAuthStateChange with SIGNED_IN, at which point we redirect to /dashboard.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createBrowserClient()

    // Listen for Supabase to process the OAuth token from the URL fragment
    // Read and clear the redirect target once — avoids race between
    // onAuthStateChange and getSession() both calling getRedirect()
    const stored = localStorage.getItem('post_auth_redirect')
    localStorage.removeItem('post_auth_redirect')
    const destination = stored?.startsWith('/') ? stored : '/dashboard'

    let redirected = false
    function doRedirect() {
      if (redirected) return
      redirected = true
      router.push(destination)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        doRedirect()
      } else if (event === 'SIGNED_OUT') {
        setError('Sign in failed. Please try again.')
      }
    })

    // Fallback: if there's already a session (e.g. PKCE code exchange happened),
    // redirect immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) doRedirect()
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Show a loading state while OAuth completes
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      background: 'var(--cream)',
    }}>
      {error ? (
        <>
          <p style={{ color: 'var(--ember)', fontSize: '0.9375rem' }}>{error}</p>
          <a href="/login" className="btn btn-outline">Back to sign in</a>
        </>
      ) : (
        <>
          <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--border)', borderTopColor: 'var(--ember)' }} />
          <p style={{ color: 'var(--text2)', fontSize: '0.9375rem' }}>Completing sign in…</p>
        </>
      )}
    </div>
  )
}
