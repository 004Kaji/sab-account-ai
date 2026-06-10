import Anthropic from '@anthropic-ai/sdk'
import { tavilySearch } from '../mac-toolkit'
import type { AgentResult, ProgressFn } from './personal'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CLAUDE_TRIGGERS = ['claude', 'anthropic', 'sonnet', 'haiku', 'opus', 'claude code',
  'mcp', 'ai sdk', 'cursor', 'windsurf', 'copilot', 'llm', 'openai', 'gemini', 'gpt']

function isClaudeQuery(q: string): boolean {
  return CLAUDE_TRIGGERS.some(t => q.toLowerCase().includes(t))
}

export async function handleIntel(question: string, progress: ProgressFn, memoryContext?: string): Promise<AgentResult> {
  progress('ATLAS', `Searching web for: "${question}"...`)

  // Target Anthropic/AI docs for Claude-related queries
  const searchQuery = isClaudeQuery(question)
    ? `${question} site:docs.anthropic.com OR site:anthropic.com OR site:github.com/anthropics 2025`
    : `${question} Australia 2026`

  const search = await tavilySearch(searchQuery, 5)
  const topUrl = search.results[0]?.url

  progress('ATLAS', `Found ${search.results.length} sources. Analysing...`)
  const webContext = search.answer
    ? `Live intelligence:\n${search.answer}\n\nSources:\n${search.results.slice(0, 3).map(r => `- ${r.title} (${r.url}): ${r.content.slice(0, 150)}`).join('\n')}`
    : search.results.length
      ? `Sources:\n${search.results.slice(0, 3).map(r => `- ${r.title} (${r.url}): ${r.content.slice(0, 200)}`).join('\n')}`
      : 'No web results found.'

  progress('ATLAS', 'Compiling intelligence...')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You are Atlas — Basnet's market and technology intelligence agent. VOICE interface.
SAB Account AI competes with Xero, MYOB, QuickBooks, Rounded in the Australian small business market.
Give Sanjog real, specific intelligence — name actual competitors, prices, features, model versions.
Flag ATO rule changes or AI tool updates that affect SAB or Sanjog's workflow.
2-3 sentences MAX. Plain spoken English. No markdown, no bullet points.
Lead with the most important finding.`,
    messages: [{
      role: 'user',
      content: [
        memoryContext ? `Memory + conversation:\n${memoryContext}\n\n` : '',
        `Question: ${question}\n\n${webContext}`,
      ].filter(Boolean).join(''),
    }],
  })

  progress('ATLAS', 'Done.')
  const block = msg.content.find(b => b.type === 'text')
  return {
    answer: block?.type === 'text' ? block.text : 'No response',
    url: topUrl,
    webSearchUsed: true,
    suggestion: 'Want me to dig deeper into any of these or search for something specific?',
    nextAction: 'deep_dive',
  }
}
