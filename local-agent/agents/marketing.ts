import Anthropic from '@anthropic-ai/sdk'
import { tavilySearch, fileExists, readFile } from '../mac-toolkit'
import type { AgentResult, ProgressFn } from './personal'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const N8N_WEBHOOK = 'http://localhost:5678/webhook/basnet-social'

async function postViaN8n(
  platform: 'linkedin' | 'facebook' | 'instagram',
  content: string,
  progress: ProgressFn,
  opts: { authorUrn?: string; pageId?: string; igAccountId?: string; imageUrl?: string } = {}
): Promise<string | null> {
  const token = platform === 'linkedin'
    ? process.env.LINKEDIN_ACCESS_TOKEN
    : process.env.INSTAGRAM_ACCESS_TOKEN

  if (!token) { progress('SPARK', `No token for ${platform}`); return null }

  const body: Record<string, string> = {
    platform,
    content,
    access_token: token,
    ...(opts.authorUrn   && { author_urn: opts.authorUrn }),
    ...(opts.pageId      && { page_id: opts.pageId }),
    ...(opts.igAccountId && { ig_account_id: opts.igAccountId }),
    ...(opts.imageUrl    && { image_url: opts.imageUrl }),
  }

  try {
    progress('SPARK', `Sending to n8n → ${platform}...`)
    const r = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const err = await r.text()
      progress('SPARK', `n8n error: ${err.slice(0, 100)}`)
      return null
    }
    progress('SPARK', `Posted to ${platform} ✓`)
    return platform === 'linkedin' ? 'https://www.linkedin.com/company/131163955/'
      : platform === 'facebook'   ? `https://www.facebook.com/${opts.pageId}`
      : 'https://www.instagram.com/'
  } catch (e) {
    progress('SPARK', `n8n unreachable: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }
}

const MASTER_PATH = `${process.env.HOME}/Desktop/sab-account-ai-project/SANJOG_MASTER.md`

function readMaster(): string {
  try {
    return fileExists(MASTER_PATH) ? readFile(MASTER_PATH).slice(0, 2000) : ''
  } catch { return '' }
}

// ── Social media posting ──────────────────────────────────────────────

async function postToTwitter(content: string, progress: ProgressFn): Promise<string | null> {
  const key    = process.env.TWITTER_API_KEY
  const secret = process.env.TWITTER_API_SECRET
  const token  = process.env.TWITTER_ACCESS_TOKEN
  const tSecret = process.env.TWITTER_ACCESS_SECRET
  if (!key || !secret || !token || !tSecret) return null

  try {
    progress('SPARK', 'Posting to Twitter/X...')
    const { TwitterApi } = await import('twitter-api-v2')
    const client = new TwitterApi({ appKey: key, appSecret: secret, accessToken: token, accessSecret: tSecret })
    const tweet = await client.v2.tweet(content.slice(0, 280))
    return `https://twitter.com/i/web/status/${tweet.data.id}`
  } catch (e) {
    progress('SPARK', `Twitter post failed: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }
}

async function getLinkedInAuthorUrn(token: string): Promise<string | null> {
  try {
    const r = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!r.ok) return null
    const data = await r.json() as { sub?: string }
    return data.sub ? `urn:li:person:${data.sub}` : null
  } catch { return null }
}

async function postToLinkedIn(content: string, progress: ProgressFn, useCompanyPage = false): Promise<string | null> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  if (!token) return null

  // Use company page URN if requested, else personal profile
  const companyId = process.env.LINKEDIN_COMPANY_ID
  let author: string
  if (useCompanyPage && companyId) {
    author = `urn:li:organization:${companyId}`
  } else {
    let personalUrn = process.env.LINKEDIN_AUTHOR_URN
    if (!personalUrn) {
      progress('SPARK', 'Fetching LinkedIn profile...')
      personalUrn = await getLinkedInAuthorUrn(token) ?? ''
      if (personalUrn) process
