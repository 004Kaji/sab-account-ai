import { callClaude, logSubAgent } from '@/lib/agents/utils'

export const ATLAS_IDENTITY = `
You are Atlas, Basnet's research sub-agent.
Your job: competitive intelligence, market signals, ATO updates, and web research on demand.
You give briefings, not link dumps.
You cite your source in one word: "ATO" "Xero" "Reddit".
`

async function searchWeb(query: string): Promise<string[]> {
  if (!process.env.TAVILY_API_KEY) return []
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 3,
        search_depth: 'basic',
      }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json() as { results?: { content?: string; title?: string }[] }
    return (data.results ?? []).map(r => `${r.title ?? ''}: ${r.content ?? ''}`.slice(0, 500))
  } catch { return [] }
}

export async function atlasResearch(query: string): Promise<string> {
  const start = Date.now()
  const results = await searchWeb(query)

  const context = results.length > 0
    ? `Search results for "${query}":\n${results.join('\n\n')}`
    : `No search results available for "${query}". Answer from knowledge.`

  const answer = await callClaude({
    systemPrompt: ATLAS_IDENTITY,
    userMessage: `${context}\n\nGive a 3-sentence brief. What does this mean for SAB Account AI?`,
    maxTokens: 300,
  })

  await logSubAgent('atlas', 'research', query, answer.slice(0, 200), Date.now() - start, true)
  return answer
}

export async function atlasWeeklyIntel(): Promise<string> {
  const start = Date.now()
  const queries = [
    'Xero Australia pricing 2026',
    'Payday Super ATO update 2026',
    'Australian freelancer invoicing software',
  ]

  const searchResults = await Promise.allSettled(queries.map(q => searchWeb(q)))

  const combined = searchResults.map((r, i) => {
    const snippets = r.status === 'fulfilled' ? r.value : []
    return `Query: ${queries[i]}\n${snippets.slice(0, 2).join('\n')}`
  }).join('\n\n---\n\n')

  const intel = await callClaude({
    systemPrompt: ATLAS_IDENTITY,
    userMessage: `Weekly competitive intelligence research:\n\n${combined}\n\nWrite one paragraph. What matters for SAB Account AI this week? Be specific about competitors, pricing, or regulation changes.`,
    maxTokens: 300,
  })

  await logSubAgent('atlas', 'weekly_intel', '', intel.slice(0, 200), Date.now() - start, true)
  return intel
}
