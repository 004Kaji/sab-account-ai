import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { callClaude, sendAlert, logAgentAction, logSubAgent } from '@/lib/agents/utils'
import { BASNET_PERSONALITY, applyPersonality } from '@/lib/agents/personality'

export const ATLAS_IDENTITY = `
${BASNET_PERSONALITY}
You are Atlas, Basnet's intelligence sub-agent.
Job: competitive monitoring, ATO law changes,
market signals, and web research on demand.
You give briefings not link dumps.
Cite source in one word: "ATO" "Xero" "Reddit".
Always end with: what this means for SAB Account AI.
`

export interface AtlasIntel {
  category:  'competitor' | 'ato' | 'market' | 'brand' | 'opportunity'
  source:    string
  finding:   string
  relevance: string
  urgency:   'low' | 'medium' | 'high'
}

export interface AtlasReport {
  timestamp:  Date
  intel:      AtlasIntel[]
  summary:    string
  actionItem: string | null
}

// ── Claude with web_search tool ────────────────────────────────────────

async function callClaudeWithWebSearch(
  systemPrompt: string,
  userMessage:  string,
  maxTokens:    number = 1500,
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // web_search_20250305 is Anthropic's built-in search tool
  const tools = [{ type: 'web_search_20250305', name: 'web_search' }] as unknown as Anthropic.Tool[]

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system:     systemPrompt,
    tools,
    messages:   [{ role: 'user', content: userMessage }],
  })

  // Extract all text content blocks (Claude synthesises after searching)
  const textBlocks = response.content.filter(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  )
  return textBlocks.map(b => b.text).join('\n').trim()
}

// ── Weekly market intelligence ─────────────────────────────────────────

export async function atlasWeeklyIntel(): Promise<AtlasReport> {
  const start = Date.now()

  const raw = await callClaudeWithWebSearch(
    ATLAS_IDENTITY,
    `Search for these topics and report findings relevant to SAB Account AI,
an Australian invoicing and payroll SaaS targeting small businesses,
freelancers, and migrant workers.

Search 1: "Xero Australia pricing 2026"
Search 2: "ATO payday super update 2026"
Search 3: "Australian payroll software 2026"
Search 4: "MYOB price increase 2026"
Search 5: "SAB Account AI"

For each finding report what changed, how urgent for SAB, one recommended action.

Return as JSON (no markdown):
{
  "intel": [
    {
      "category": "competitor|ato|market|brand|opportunity",
      "source": "one word",
      "finding": "what changed",
      "relevance": "why it matters for SAB",
      "urgency": "low|medium|high"
    }
  ],
  "summary": "3 sentences max",
  "actionItem": "one sentence or null"
}`,
    2000,
  ).catch(async () => {
    // Fallback to Claude without web search if tool not available
    return await callClaude({
      systemPrompt: ATLAS_IDENTITY,
      userMessage: `Generate a weekly competitive intelligence brief for SAB Account AI.
Consider: Xero/MYOB pricing, ATO payday super updates, Australian payroll trends.
Return JSON: { "intel": [], "summary": "No live search available this week — using knowledge base.", "actionItem": null }`,
      maxTokens: 1000,
      expectJson: true,
    })
  })

  type RawReport = { intel?: AtlasIntel[]; summary?: string; actionItem?: string | null }
  let parsed: RawReport
  try {
    // Strip any markdown if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    parsed = JSON.parse(cleaned) as RawReport
  } catch {
    parsed = {
      intel: [],
      summary: 'Atlas weekly intel ran. JSON parse failed — raw output saved.',
      actionItem: null,
    }
  }

  const report: AtlasReport = {
    timestamp:  new Date(),
    intel:      parsed.intel ?? [],
    summary:    parsed.summary ?? 'No summary generated.',
    actionItem: parsed.actionItem ?? null,
  }

  // Alert on high-urgency findings
  const highUrgency = report.intel.filter(i => i.urgency === 'high')
  for (const item of highUrgency) {
    await sendAlert(
      `Atlas: urgent market signal`,
      `${item.finding}\n\nRelevance: ${item.relevance}\nSource: ${item.source}`,
      'warning',
      'atlas',
    )
  }

  await logAgentAction({
    agentName:    'atlas',
    triggerType:  'weekly_intel',
    actionsTaken: { intelCount: report.intel.length, highUrgency: highUrgency.length } as unknown as Record<string, unknown>,
    outcome:      report.summary.slice(0, 200),
    durationMs:   Date.now() - start,
  })

  await logSubAgent('atlas', 'weekly_intel', '', report.summary.slice(0, 200), Date.now() - start, true)
  return report
}

// ── On-demand research ─────────────────────────────────────────────────

export async function atlasResearch(query: string): Promise<string> {
  const start = Date.now()

  const result = await callClaudeWithWebSearch(
    ATLAS_IDENTITY,
    `${query}\n\nReturn 3 sentences. End with: what this means for SAB Account AI.`,
    400,
  ).catch(async () => {
    // Fallback without web search
    return await callClaude({
      systemPrompt: ATLAS_IDENTITY,
      userMessage:  `${query}\n\nReturn 3 sentences from knowledge. End with: what this means for SAB Account AI.`,
      maxTokens:    300,
    })
  })

  const answer = applyPersonality(result)

  try {
    const supabase = createServiceClient()
    await supabase.from('agent_conversations').insert({
      agent_name: 'atlas',
      question:   query,
      answer:     answer.slice(0, 1000),
      context_used: { type: 'on_demand_research' },
    })
  } catch { /* non-fatal */ }

  await logSubAgent('atlas', 'research', query.slice(0, 100), answer.slice(0, 200), Date.now() - start, true)
  return answer
}

// ── Brand monitoring ───────────────────────────────────────────────────

export async function atlasMonitorBrand(): Promise<void> {
  const start = Date.now()

  const result = await callClaudeWithWebSearch(
    ATLAS_IDENTITY,
    `Search for "SAB Account AI" mentions online.
Report any reviews, social posts, forum mentions, or news.
Classify sentiment as positive/neutral/negative.
If no mentions found: say "No new brand mentions found."
Return 2-3 sentences.`,
    400,
  ).catch(async () => {
    return await callClaude({
      systemPrompt: ATLAS_IDENTITY,
      userMessage:  'SAB Account AI brand monitor — no web search available this run.',
      maxTokens:    100,
    })
  })

  const hasNegative = result.toLowerCase().includes('negative') ||
    result.toLowerCase().includes('complaint') ||
    result.toLowerCase().includes('poor')

  const hasMentions = !result.toLowerCase().includes('no new brand mentions')

  if (hasMentions) {
    await sendAlert(
      'Brand mention found',
      result,
      hasNegative ? 'warning' : 'info',
      'atlas',
    )
  }

  await logAgentAction({
    agentName:   'atlas',
    triggerType: 'brand_monitor',
    outcome:     result.slice(0, 200),
    durationMs:  Date.now() - start,
  })
}
