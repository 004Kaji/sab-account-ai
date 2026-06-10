// Run: node linkedin-auth.mjs
// Opens LinkedIn auth in browser, catches the callback, saves token to .env.local automatically

import http from 'http'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

const CLIENT_ID     = '86ybbkwds753b6'
const CLIENT_SECRET = 'WPL_AP1.7yBKlES2QkNK8Bo7.MDlr+w=='
const REDIRECT_URI  = 'http://localhost:3100/callback'
const ENV_FILE      = path.join(import.meta.dirname, '.env.local')

const SCOPES = [
  'openid', 'profile', 'email',
  'w_member_social',       // post to personal profile
  // w_organization_social requires LinkedIn "Marketing Developer Platform" approval
  // Apply at: linkedin.com/developers/apps → your app → Products tab
].join(' ')

const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
  `response_type=code&client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES)}`

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3100')
  if (url.pathname !== '/callback') { res.end('waiting...'); return }

  const code = url.searchParams.get('code')
  if (!code) { res.end('No code received.'); return }

  console.log('\n✅ Got auth code — exchanging for token...')

  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    })
    const data = await tokenRes.json()
    if (!data.access_token) throw new Error(JSON.stringify(data))

    // Save new token to .env.local
    let env = fs.readFileSync(ENV_FILE, 'utf-8')
    env = env.replace(/^LINKEDIN_ACCESS_TOKEN=.*/m, `LINKEDIN_ACCESS_TOKEN="${data.access_token}"`)
    fs.writeFileSync(ENV_FILE, env)

    console.log('✅ Token saved to .env.local')
    console.log(`   Expires in: ${Math.round(data.expires_in / 86400)} days`)

    // Get profile to confirm it worked
    const me = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${data.access_token}` }
    })
    const profile = await me.json()
    console.log(`   Logged in as: ${profile.name} (${profile.email})`)
    console.log('\n🎉 Done! Restart start-basnet.sh and Basnet can now post to the SAB Account AI page.')

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<h2 style="font-family:sans-serif;color:green">✅ Done! Token saved.<br><br>You can close this tab.</h2>`)
    server.close()
    process.exit(0)
  } catch (e) {
    console.error('❌ Token exchange failed:', e.message)
    res.end('Error: ' + e.message)
    server.close()
    process.exit(1)
  }
})

server.listen(3100, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Basnet LinkedIn Auth')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Opening LinkedIn in your browser...')
  console.log('Just click Approve — the rest is automatic.\n')
  exec(`open "${authUrl}"`)
})
