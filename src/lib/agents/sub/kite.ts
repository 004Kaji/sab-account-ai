import { createServiceClient } from '@/lib/supabase'
import { callClaude, sendAlert, logAgentAction, logSubAgent } from '@/lib/agents/utils'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'

export const KITE_IDENTITY = `
${BASNET_PERSONALITY}
You are Kite, Basnet's customer-finding sub-agent.
Job: find Australians actively asking for payroll, payslip, and super help right now — then draft a genuine, helpful reply for each one.
You answer their actual question first. SAB Account AI comes second.
Tone: knowledgeable friend, not salesperson. Never pitch. Never say "I'm an AI".
`

// ── Types ──────────────────────────────────────────────────────────────

export interface KitePost {
  sourceUrl:       string
  sourcePlatform:  'reddit' | 'linkedin' | 'facebook' | 'other'
  originalSnippet: string
  query:           string
}

export interface KiteReply {
  post:       KitePost
  draftReply: string
}

export interface KiteReport {
  timestamp:      Date
  postsFound:     number
  repliesDrafted: number
  savedIds:       string[]
  summary:        string
}

// ── Search configuration ───────────────────────────────────────────────

const INTENT_QUERIES = [
  'how do I do payslips australia',
  'payday super confused small business',
  'ATO payroll help australia',
  'how to pay employees australia',
  'payslip generator australia',
  'super compliance july 2026',
]

const INTENT_DOMAINS = ['reddit.com', 'linkedin.com', 'facebook.com']

// ── Private Tavily wrapper with domain filtering ───────────────────────
// The shared tavilySearch() in sab-marketing-toolkit doesn't expose
// include_domains, so Kite calls the API directly to get platform-scoped results.

async function tavilyIntentSearch(
  query:      string,
  domains:    string[],
  maxResults: number = 3,
): Promise<{ url: string; title: string; content: string }[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        api_key:         apiKey,
        query,
        max_results:     maxResults,
        include_domains: domains,
        search_depth:    'advanced',
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return []
    type RawResult = { url?: string; title?: string; content?: string }
    const data = (await res.json()) as { results?: RawResult[] }
    return (data.results ?? []).map((r: RawResult) => ({
      url:     r.url     ?? '',
      title:   r.title   ?? '',
      content: r.content ?? '',
    }))
  } catch { return [] }
}

function detectPlatform(url: string): KitePost['sourcePlatform'] {
  if (url.includes('reddit.com'))   return 'reddit'
  if (url.includes('linkedin.com')) return 'linkedin'
  if (url.includes('facebook.com')) return 'facebook'
  return 'other'
}

// ── 1. kiteSearchIntent ────────────────────────────────────────────────
// Runs all intent queries in parallel across Reddit, LinkedIn, Facebook.
// Returns up to 3 unique posts per query, deduplicated by URL.

export async function kiteSearchIntent(): Promise<KitePost[]> {
  const seenUrls = new Set<string>()
  const posts: KitePost[] = []

  const results = await Promise.allSettled(
    INTENT_QUERIES.map(q => tavilyIntentSearch(q, INTENT_DOMAINS, 3))
  )

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status !== 'fulfilled') continue
    for (const item of r.value) {
      if (!item.url || seenUrls.has(item.url)) continue
      seenUrls.add(item.url)
      posts.push({
        sourceUrl:       item.url,
        sourcePlatform:  detectPlatform(item.url),
        originalSnippet: item.content.slice(0, 500),
        query:           INTENT_QUERIES[i],
      })
    }
  }

  return posts
}

// ── 2. kiteDraftReply ─────────────────────────────────────────────────
// Asks Claude to write a genuine reply for one post.
// Answers the question first — mention of SAB is natural, not forced.

export async function kiteDraftReply(post: KitePost): Promise<string> {
  try {
    return await callClaude({
      systemPrompt: KITE_IDENTITY,
      userMessage:  `Someone posted this on ${post.sourcePlatform} asking for help:

"${post.originalSnippet}"

Write a helpful reply. Rules:
- Actually answer their question first — give them real, useful information
- Mention SAB Account AI naturally as a tool that solves this specific problem
- Include sabaccountai.com.au at the end
- Under 100 words
- Sound like a knowledgeable stranger, not a salesperson
- No greetings like "Hey!" or "Great question!"

Return only the reply text. No labels, no formatting.`,
      maxTokens: 200,
    })
  } catch {
    return `For payslips and super in Australia, you need to withhold PAYG tax based on the ATO tax tables and pay super at 11.5% per pay run (Payday Super from July 2026). SAB Account AI handles all of this automatically — PAYG calculations, payslip PDFs, and super tracking. sabaccountai.com.au`
  }
}

// ── 3. kiteSaveToQueue ────────────────────────────────────────────────
// Inserts each draft reply into kite_replies with status='draft'.
// Never auto-posts — manual review required before any reply goes live.

export async function kiteSaveToQueue(replies: KiteReply[]): Promise<string[]> {
  const supabase = createServiceClient()
  const savedIds: string[] = []

  for (const { post, draftReply } of replies) {
    try {
      const { data } = await supabase
        .from('kite_replies')
        .insert({
          source_url:            post.sourceUrl,
          source_platform:       post.sourcePlatform,
          original_post_snippet: post.originalSnippet,
          draft_reply:           draftReply,
          status:                'draft',
        })
        .select('id')
        .single()
      if (data?.id) savedIds.push(data.id as string)
    } catch { /* non-fatal — continue saving remaining */ }
  }

  return savedIds
}

// ── 4. runKite ────────────────────────────────────────────────────────
// Main entry point. Searches intent → drafts replies → saves to queue.
// Logs results to agent_logs. Never auto-posts anything.

export async function runKite(): Promise<KiteReport> {
  const start    = Date.now()
  const supabase = createServiceClient()

  try {
    const posts = await kiteSearchIntent()

    if (posts.length === 0) {
      const summary = 'No intent signals found this run.'
      await logSubAgent('kite', 'daily_scan', '', summary, Date.now() - start, true)
      return { timestamp: new Date(), postsFound: 0, repliesDrafted: 0, savedIds: [], summary }
    }

    // Draft replies for all posts concurrently
    const replyResults = await Promise.allSettled(
      posts.map(async post => {
        const draftReply = await kiteDraftReply(post)
        return { post, draftReply } as KiteReply
      })
    )

    const replies = replyResults
      .filter((r): r is PromiseFulfilledResult<KiteReply> => r.status === 'fulfilled')
      .map(r => r.value)

    const savedIds = await kiteSaveToQueue(replies)

    const summary = `Kite found ${posts.length} intent signal${posts.length !== 1 ? 's' : ''} across ${[...new Set(posts.map(p => p.sourcePlatform))].join(', ')}. Drafted ${replies.length} replies, saved ${savedIds.length} to queue.`

    await logAgentAction({
      agentName:    'kite',
      triggerType:  'daily_intent_scan',
      actionsTaken: {
        postsFound:     posts.length,
        repliesDrafted: replies.length,
        saved:          savedIds.length,
        platforms:      [...new Set(posts.map(p => p.sourcePlatform))],
      } as unknown as Record<string, unknown>,
      outcome:   summary,
      durationMs: Date.now() - start,
    })

    await logSubAgent('kite', 'daily_scan', '', summary, Date.now() - start, true)

    return {
      timestamp:      new Date(),
      postsFound:     posts.length,
      repliesDrafted: replies.length,
      savedIds,
      summary,
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    try {
      await supabase.from('agent_error_log').insert({
        error_type:    'kite_runtime_error',
        error_message: errorMessage.slice(0, 500),
        file_name:     'kite.ts',
        frequency:     1,
        severity:      'warning',
        alerted:       false,
        resolved:      false,
      })
    } catch { /* best-effort */ }

    await sendAlert('Kite: runtime error', errorMessage, 'warning', 'kite').catch(() => {})

    return {
      timestamp:      new Date(),
      postsFound:     0,
      repliesDrafted: 0,
      savedIds:       [],
      summary:        `Kite failed: ${errorMessage}`,
    }
  }
}
