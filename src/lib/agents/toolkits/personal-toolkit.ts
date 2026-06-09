// Personal agent toolkit
// Access: SANJOG_MASTER.md, Tavily web search, Supabase (personal tables), Claude
// No access: GitHub, social media, SAB code

export {
  readMasterContext,
  sendAlert,
  sendTelegram,
  logAgentAction,
  logSubAgent,
  callClaude,
  isRateLimited,
  getBaseUrl,
  type LogAgentActionParams,
} from '@/lib/agents/utils'

// ── Tavily web search ──────────────────────────────────────────────────

export interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

export interface TavilySearchResponse {
  query: string
  results: TavilyResult[]
  answer?: string
}

export async function tavilySearch(
  query: string,
  options?: { maxResults?: number; includeAnswer?: boolean },
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    return { query, results: [], answer: 'Tavily API key not configured' }
  }

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

    if (!res.ok) {
      console.error('Tavily search failed:', res.status, await res.text())
      return { query, results: [] }
    }

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
  } catch (err) {
    console.error('tavilySearch error:', err)
    return { query, results: [] }
  }
}
