// SAB Marketing agent toolkit
// Access: Twitter/X, LinkedIn, Instagram, Tavily web search, Resend, Supabase (content/outreach tables), Claude
// No access: GitHub, Mac files, personal data

export {
  readMasterContext,
  readAgentLearnings,
  sendAlert,
  sendTelegram,
  logAgentAction,
  logSubAgent,
  callClaude,
  getSABMetrics,
  getStripeMetrics,
  isRateLimited,
  getBaseUrl,
  type LogAgentActionParams,
} from '@/lib/agents/utils'

import { createServiceClient } from '@/lib/supabase'
import { TwitterApi } from 'twitter-api-v2'

// ── Tavily web search ──────────────────────────────────────────────────

export interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

export async function tavilySearch(
  query: string,
  options?: { maxResults?: number; includeAnswer?: boolean },
): Promise<{ query: string; results: TavilyResult[]; answer?: string }> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return { query, results: [] }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: options?.maxResults ?? 5,
        include_answer: options?.includeAnswer ?? true,
        search_depth: 'basic',
      }),
    })
    if (!res.ok) return { query, results: [] }
    type RawResult = { title?: string; url?: string; content?: string; score?: number }
    const data = (await res.json()) as { results?: RawResult[]; answer?: string }
    return {
      query,
      results: (data.results ?? []).map((r: RawResult) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        content: r.content ?? '',
        score: r.score ?? 0,
      })),
      answer: data.answer,
    }
  } catch { return { query, results: [] } }
}

// ── Marketing approval queue (DB) ─────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'posted' | 'failed'
export type SocialPlatform = 'twitter' | 'linkedin' | 'instagram' | 'tiktok'

export interface MarketingApproval {
  id: string
  platform: SocialPlatform
  content: string
  mediaUrls: string[]
  status: ApprovalStatus
  createdAt: string
  weekStart?: string
}

export async function saveApprovalDraft(params: {
  platform: SocialPlatform
  content: string
  mediaUrls?: string[]
  weekStart?: string
}): Promise<string> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('marketing_approvals')
    .insert({
      platform: params.platform,
      content: params.content,
      media_urls: params.mediaUrls ?? [],
      week_start: params.weekStart ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`saveApprovalDraft failed: ${error?.message}`)
  return data.id as string
}

export async function getApprovalQueue(): Promise<MarketingApproval[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('marketing_approvals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20)

  type Row = { id: string; platform: string; content: string; media_urls: string[] | null; status: string; created_at: string; week_start: string | null }
  return (data ?? []).map((r: Row) => ({
    id: r.id,
    platform: r.platform as SocialPlatform,
    content: r.content,
    mediaUrls: r.media_urls ?? [],
    status: r.status as ApprovalStatus,
    createdAt: r.created_at,
    weekStart: r.week_start ?? undefined,
  }))
}

export async function updateApprovalStatus(
  id: string,
  status: ApprovalStatus,
  postUrl?: string,
): Promise<void> {
  const supabase = createServiceClient()
  const update: Record<string, unknown> = { status }
  if (status === 'approved') update.approved_at = new Date().toISOString()
  if (status === 'posted') {
    update.posted_at = new Date().toISOString()
    if (postUrl) update.post_url = postUrl
  }
  await supabase.from('marketing_approvals').update(update).eq('id', id)
}

// ── Twitter / X posting ────────────────────────────────────────────────

function getTwitterClient(): TwitterApi {
  const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET } = process.env
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    throw new Error('Twitter credentials not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET.')
  }
  return new TwitterApi({
    appKey: TWITTER_API_KEY,
    appSecret: TWITTER_API_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_SECRET,
  })
}

export async function twitterPost(content: string): Promise<{ id: string; url: string }> {
  const client = getTwitterClient()
  const tweet = await client.v2.tweet(content)
  const tweetId = tweet.data.id
  const url = `https://x.com/i/web/status/${tweetId}`
  return { id: tweetId, url }
}

// ── LinkedIn posting ───────────────────────────────────────────────────

async function getLinkedInAuthorUrn(token: string): Promise<string> {
  // Use configured URN if available
  if (process.env.LINKEDIN_AUTHOR_URN) return process.env.LINKEDIN_AUTHOR_URN

  // Auto-fetch via token introspection (gets authorized_for_member claim)
  const introspect = await fetch('https://www.linkedin.com/oauth/v2/introspectToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.LINKEDIN_CLIENT_ID ?? '',
      client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? '',
      token,
    }),
  })
  if (introspect.ok) {
    const data = (await introspect.json()) as { authorized_for_member?: string; sub?: string }
    const memberId = data.authorized_for_member ?? data.sub
    if (memberId) return `urn:li:person:${memberId}`
  }

  throw new Error('Could not determine LinkedIn Author URN. Set LINKEDIN_AUTHOR_URN in .env.local.')
}

export async function linkedinPost(content: string): Promise<{ id: string; url: string }> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  if (!token) throw new Error('LINKEDIN_ACCESS_TOKEN not configured.')

  const authorUrn = await getLinkedInAuthorUrn(token)

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: authorUrn,
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

  if (!res.ok) throw new Error(`LinkedIn post failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { id: string }
  return { id: data.id, url: `https://www.linkedin.com/feed/update/${data.id}/` }
}

// ── Instagram posting (via Facebook Graph API) ─────────────────────────

export async function instagramPost(
  content: string,
  imageUrl?: string,
): Promise<{ id: string; url: string }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID

  if (!token || !accountId) {
    throw new Error('Instagram credentials not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID.')
  }

  if (!imageUrl) {
    throw new Error('Instagram requires an image. Provide imageUrl.')
  }

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${accountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: content,
        access_token: token,
      }),
    },
  )
  if (!containerRes.ok) throw new Error(`Instagram media container failed: ${containerRes.status}`)
  const container = (await containerRes.json()) as { id: string }

  // Step 2: Publish container
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${accountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    },
  )
  if (!publishRes.ok) throw new Error(`Instagram publish failed: ${publishRes.status}`)
  const post = (await publishRes.json()) as { id: string }
  return { id: post.id, url: `https://www.instagram.com/p/${post.id}/` }
}
