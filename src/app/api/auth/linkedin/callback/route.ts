export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// GET /api/auth/linkedin/callback
// Exchanges the LinkedIn auth code for an access token and displays it.
// Only used by Sanjog to manually refresh the LINKEDIN_ACCESS_TOKEN env var.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.json({ error, description: req.nextUrl.searchParams.get('error_description') }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'No code returned from LinkedIn' }, { status: 400 })
  }

  const clientId     = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri  = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'}/api/auth/linkedin/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'LinkedIn credentials not configured' }, { status: 500 })
  }

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  })

  const tokenData = await tokenRes.json() as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!tokenData.access_token) {
    return NextResponse.json({ error: 'Token exchange failed', details: tokenData }, { status: 400 })
  }

  const expiresDate = new Date(Date.now() + (tokenData.expires_in ?? 0) * 1000).toLocaleDateString('en-AU')

  return new NextResponse(`
<!DOCTYPE html>
<html>
<head><title>LinkedIn Token</title>
<style>body{font-family:monospace;padding:40px;background:#0f0f0f;color:#fff;max-width:900px}
h1{color:#0ea5e9}pre{background:#1a1a1a;padding:20px;border-radius:8px;word-break:break-all;white-space:pre-wrap;color:#4ade80;font-size:13px}
p{color:#94a3b8}.label{color:#f59e0b;font-weight:bold}</style>
</head>
<body>
<h1>✅ LinkedIn Token Retrieved</h1>
<p>Expires: <strong>${expiresDate}</strong> (${Math.round((tokenData.expires_in ?? 0) / 86400)} days)</p>
<p class="label">Copy this token and run:</p>
<pre>vercel env rm LINKEDIN_ACCESS_TOKEN production
vercel env add LINKEDIN_ACCESS_TOKEN production</pre>
<p class="label">Token value:</p>
<pre>${tokenData.access_token}</pre>
<p>Then redeploy: <code>git commit --allow-empty -m "refresh linkedin token" && git push</code></p>
</body>
</html>
  `, {
    headers: { 'Content-Type': 'text/html' },
  })
}
