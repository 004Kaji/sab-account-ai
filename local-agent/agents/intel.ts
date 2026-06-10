import Anthropic from '@anthropic-ai/sdk'
import { tavilySearch } from '../mac-toolkit'
import type { AgentResult, ProgressFn } from './personal'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function handleIntel(question: string, progress: ProgressFn): Promise<AgentResult> {
  progress('ATLAS', `Searching web for: "${question}"...`)
  const search = await tavilySearch(`${question} Australia 2026`, 5)
  const topUrl = search.results[0]?.url

  progress('ATLAS', `Found ${search.results.length} sources. Analysing...`)
  const webContext = search.answer
    ? `Live intelligence:\n${search.answer}\n\nSources:\n${search.results.slice(0, 3).map(r => `- ${r.title} (${r.url}): ${r.content.slice(0, 150)}`).join('\n')}`
    : search.results.length
      ? `Sources:\n${search.results.slice(0, 3).map(r => `- ${r.title} (${r.url}): ${r.content.slice(0, 200)}`).join('\n')}`
      : 'No web results found.'

  progress('ATLAS', 'Compiling market intelligence...')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You are Atlas — Basnet's market intelligence agent.
SAB Account AI competes with Xero, MYOB, QuickBooks, Rounded in the Australian small business market.
Give Sanjog real, specific intelligence — name actual competitors, prices, features.
Flag ATO rule changes that affect SAB's customers. Lead with the most important finding. No preamble.`,
    messages: [{ role: 'user', content: `Question: ${question}\n\n${webContext}` }],
  })

  progress('ATLAS', 'Done.')
  const block = msg.content.find(b => b.type === 'text')
  return {
    answer: block?.type === 'text' ? block.text : 'No response',
    url: topUrl,
    webSearchUsed: true,
  }
}
