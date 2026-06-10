import Anthropic from '@anthropic-ai/sdk'
import { tavilySearch, fileExists, readFile } from '../mac-toolkit'
import type { AgentResult, ProgressFn } from './personal'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

async function postToLinkedIn(content: string, progress: ProgressFn): Promise<string | null> {
  const token  = process.env.LINKEDIN_ACCESS_TOKEN
  const author = process.env.LINKEDIN_AUTHOR_URN
  if (!token || !author) return null

  try {
    progress('SPARK', 'Posting to LinkedIn...')
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
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json() as { id?: string }
    progress('SPARK', 'LinkedIn post published.')
    return `https://www.linkedin.com/feed/`
  } catch (e) {
    progress('SPARK', `LinkedIn post failed: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }
}

async function postToInstagram(content: string, progress: ProgressFn): Promise<string | null> {
  const token     = process.env.INSTAGRAM_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  if (!token || !accountId) return null

  try {
    progress('SPARK', 'Creating Instagram post...')
    // Instagram requires an image for feed posts — caption only for now (Stories/Reels need media)
    // This posts a text-only caption via the Graph API which works for some account types
    const createRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media?caption=${encodeURIComponent(content)}&media_type=REELS&access_token=${token}`,
      { method: 'POST' }
    )
    const createData = await createRes.json() as { id?: string; error?: { message: string } }
    if (createData.error) throw new Error(createData.error.message)
    if (!createData.id) throw new Error('No media ID returned')

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media_publish?creation_id=${createData.id}&access_token=${token}`,
      { method: 'POST' }
    )
    const publishData = await publishRes.json() as { id?: string; error?: { message: string } }
    if (publishData.error) throw new Error(publishData.error.message)
    progress('SPARK', 'Instagram post published.')
    return `https://www.instagram.com/`
  } catch (e) {
    progress('SPARK', `Instagram post failed: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }
}

const POST_TRIGGERS = ['post this', 'post it', 'publish this', 'publish it', 'share this',
  'tweet this', 'put this on', 'post to', 'post on']

function isPostRequest(q: string): boolean {
  return POST_TRIGGERS.some(t => q.toLowerCase().includes(t))
}

// ── Main handler ──────────────────────────────────────────────────────

export async function handleMarketing(question: string, progress: ProgressFn, memoryContext?: string): Promise<AgentResult> {
  const master = readMaster()

  // If user wants to post content directly
  if (isPostRequest(question)) {
    const q = question.toLowerCase()
    const wantsTwitter   = q.includes('twitter') || q.includes('tweet') || q.includes('x')
    const wantsLinkedIn  = q.includes('linkedin')
    const wantsInstagram = q.includes('instagram')
    const postAll        = !wantsTwitter && !wantsLinkedIn && !wantsInstagram

    // Extract the content to post (everything after "post this:" or similar)
    const contentMatch = question.match(/(?:post|tweet|publish|share)\s+(?:this|it)?[:\s]+(.+)/i)
    const content = contentMatch ? contentMatch[1].trim() : question

    const urls: string[] = []
    if (wantsTwitter || postAll)  { const u = await postToTwitter(content, progress);   if (u) urls.push(u) }
    if (wantsLinkedIn || postAll) { const u = await postToLinkedIn(content, progress);  if (u) urls.push(u) }
    if (wantsInstagram)           { const u = await postToInstagram(content, progress); if (u) urls.push(u) }

    return {
      answer: urls.length
        ? `Posted to ${urls.length} platform${urls.length > 1 ? 's' : ''}. ${urls.join(' ')}`
        : 'Could not post — check API credentials.',
      url: urls[0],
      webSearchUsed: false,
    }
  }

  // Generate content ideas by searching what's trending
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
  }
}
