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
    const isCompany = opts.authorUrn?.includes('organization')
    return platform === 'linkedin'
      ? (isCompany ? 'https://www.linkedin.com/company/131163955/' : 'https://www.linkedin.com/feed/')
      : platform === 'facebook' ? `https://www.facebook.com/${opts.pageId}`
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
    // LinkedIn requires Marketing Developer Platform approval for company page posting.
    // Copy content to clipboard and open the page so user can paste manually.
    const { execSync } = await import('child_process')
    try {
      execSync(`echo ${JSON.stringify(content)} | pbcopy`)
      progress('SPARK', 'Post copied to clipboard — opening SAB Account AI page...')
      execSync(`open "https://www.linkedin.com/company/${companyId}/admin/posts/"`)
    } catch { }
    return `https://www.linkedin.com/company/${companyId}/admin/posts/`
  } else {
    let personalUrn = process.env.LINKEDIN_AUTHOR_URN
    if (!personalUrn) {
      progress('SPARK', 'Fetching LinkedIn profile...')
      personalUrn = await getLinkedInAuthorUrn(token) ?? ''
      if (personalUrn) process.env.LINKEDIN_AUTHOR_URN = personalUrn
    }
    author = personalUrn
  }

  if (!author) return null

  if (process.env.MARKETING_DRY_RUN === 'true') {
    progress('SPARK', `[DRY RUN] Would post as ${author}: ${content.slice(0, 60)}...`)
    return 'https://www.linkedin.com/feed/'
  }

  try {
    progress('SPARK', useCompanyPage ? 'Posting to SAB Account AI page...' : 'Posting to LinkedIn...')
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      progress('SPARK', `LinkedIn error: ${err.slice(0, 120)}`)
      return null
    }
    progress('SPARK', 'LinkedIn post published ✓')
    return useCompanyPage
      ? `https://www.linkedin.com/company/${companyId ?? '131163955'}/`
      : 'https://www.linkedin.com/feed/'
  } catch (e) {
    progress('SPARK', `LinkedIn failed: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }
}

// ── Post request detection ────────────────────────────────────────────

const POST_TRIGGERS = ['post this', 'post it', 'publish this', 'publish it', 'share this',
  'tweet this', 'put this on', 'post to', 'post on',
  'post the above', 'post that', 'post the last', 'share that', 'share the above',
  'go ahead and post', 'yes post', 'post it to', 'share it on', 'share it to',
  'above post', 'that post', 'the post', 'post now', 'just post', 'post it now']

const WRITE_TRIGGERS = ['write', 'create', 'generate', 'make', 'draft', 'give me', 'suggest']

function isPostRequest(q: string): boolean {
  const lower = q.toLowerCase()
  // "write a post and post it" — generate first, don't immediately post
  if (WRITE_TRIGGERS.some(t => lower.includes(t))) return false
  return POST_TRIGGERS.some(t => lower.includes(t))
}

function extractPreviousPost(memoryContext: string): string {
  const matches = [...memoryContext.matchAll(/(?:^|\n)A: ([\s\S]+?)(?=\n\nQ: |\n\nRecent|\n\nMemory|$)/g)]
  if (!matches.length) return ''
  const last = matches[matches.length - 1][1].trim()
  return last.length > 100 ? last : ''
}

// ── Main handler ──────────────────────────────────────────────────────

export async function handleMarketing(question: string, progress: ProgressFn, memoryContext?: string): Promise<AgentResult> {
  const master = readMaster()

  if (isPostRequest(question)) {
    const q = question.toLowerCase()
    const wantsTwitter    = q.includes('twitter') || q.includes('tweet')
    const wantsLinkedIn   = q.includes('linkedin') || q.includes('linked in')
    const wantsInstagram  = q.includes('instagram')
    const postAll         = !wantsTwitter && !wantsLinkedIn && !wantsInstagram
    const wantsCompanyPage = /sab page|company page|sab account ai page|the page|our page/i.test(question)

    const inlineMatch = question.match(/(?:post|tweet|publish|share)\s+(?:this|it)?[:\s]+(.+)/is)
    const inlineContent = inlineMatch ? inlineMatch[1].trim() : ''
    const prevContent   = memoryContext ? extractPreviousPost(memoryContext) : ''
    const content       = inlineContent || prevContent || question

    if (!inlineContent && prevContent) progress('SPARK', 'Using the post I just generated...')

    const urls: string[] = []
    if (wantsTwitter || postAll)  { const u = await postToTwitter(content, progress);                    if (u) urls.push(u) }
    if (wantsLinkedIn || postAll) { const u = await postToLinkedIn(content, progress, wantsCompanyPage); if (u) urls.push(u) }
    if (wantsInstagram)           { const u = await postViaN8n('instagram', content, progress, { igAccountId: process.env.INSTAGRAM_ACCOUNT_ID ?? '' }); if (u) urls.push(u) }

    return {
      answer: urls.length
        ? `Posted to ${urls.length} platform${urls.length > 1 ? 's' : ''}. Check your feed.`
        : 'Could not post — check your token or LinkedIn scope.',
      url: urls[0],
      webSearchUsed: false,
    }
  }

  progress('SPARK', 'Searching trending content in accounting/small business...')
  const search = await tavilySearch(`${question} Australia small business accounting 2026`, 3)
  const topUrl = search.results[0]?.url
  const webContext = search.answer
    ? `\n\nTrending context: ${search.answer}`
    : search.results.length
      ? `\n\nSearch results:\n${search.results.slice(0, 2).map(r => `- ${r.title}: ${r.content.slice(0, 200)}`).join('\n')}`
      : ''

  progress('SPARK', 'Generating content ideas...')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You are Spark — Basnet's marketing agent.
SAB Account AI: invoicing and accounting SaaS for Australian sole traders, freelancers, small businesses.
Audience: tradespeople, freelancers, new small business owners who hate paperwork.
Key channels: TikTok, Instagram Reels, LinkedIn.
Give one specific hook or post idea with the actual text ready to post. No preamble.
${master ? `\n\nContext:\n${master}` : ''}${webContext}`,
    messages: [{ role: 'user', content: `${memoryContext ? `Memory:\n${memoryContext}\n\n` : ''}${question}` }],
  })

  progress('SPARK', 'Done.')
  const block = msg.content.find(b => b.type === 'text')
  return {
    answer: block?.type === 'text' ? block.text : 'No response',
    url: topUrl,
    webSearchUsed: !!webContext,
    suggestion: 'Want me to post this? Say yes for your personal profile, or say SAB page for the company page.',
    nextAction: 'post',
  }
}
