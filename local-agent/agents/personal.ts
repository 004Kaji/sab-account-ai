import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { tavilySearch, getSystemInfo, readFile, fileExists } from '../mac-toolkit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MASTER_PATH = `${process.env.HOME}/Desktop/sab-account-ai-project/SANJOG_MASTER.md`
const BOOKKEEPING_PATH = `${process.env.HOME}/Desktop/Basnet-Bookkeeping.json`

export type ProgressFn = (agent: string, message: string) => void

function readMaster(): string {
  try {
    if (!fileExists(MASTER_PATH)) return ''
    const full = readFile(MASTER_PATH)
    // Always include the agent system section even if it's past the 3000-char mark
    const agentIdx = full.indexOf('## BASNET AI AGENT SYSTEM')
    const agentSection = agentIdx !== -1 ? '\n\n' + full.slice(agentIdx, agentIdx + 2000) : ''
    return full.slice(0, 3000) + agentSection
  } catch { return '' }
}

// ── Bookkeeping ───────────────────────────────────────────────────────

function loadBookkeeping(): object[] {
  try {
    if (fs.existsSync(BOOKKEEPING_PATH)) {
      return JSON.parse(fs.readFileSync(BOOKKEEPING_PATH, 'utf-8'))
    }
  } catch { }
  return []
}

function saveBookkeeping(records: object[]): void {
  fs.writeFileSync(BOOKKEEPING_PATH, JSON.stringify(records, null, 2), 'utf-8')
}

const MONEY_TRIGGERS = ['spent', 'paid', 'bought', 'cost', 'earned', 'received', 'charged',
  'invoice', 'income', 'expense', 'subscri', 'revenue', '$', 'dollar']

function isBookkeepingEntry(q: string): boolean {
  const lower = q.toLowerCase()
  // 'aud' checked as whole word to avoid matching 'claude', 'audio', etc.
  const hasAud = /\baud\b/.test(lower)
  return hasAud || MONEY_TRIGGERS.some(t => lower.includes(t))
}

async function recordBookkeeping(question: string, progress: ProgressFn): Promise<string> {
  progress('RELAY', 'Detecting financial transaction...')
  const existing = loadBookkeeping()

  const raw = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: `Extract a bookkeeping record from this statement. Return ONLY valid JSON with:
- date: today's date (${new Date().toISOString().split('T')[0]})
- time: current time approx
- description: what happened, verbatim
- amount: number (negative=expense, positive=income). null if unclear
- currency: "AUD" default
- type: "expense" | "income" | "transfer" | "note"
- tags: array of 2-3 relevant tags (infer from context, don't predefine)
No explanation. JSON only.`,
    messages: [{ role: 'user', content: question }],
  })

  try {
    const block = raw.content.find(b => b.type === 'text')
    const text = block?.type === 'text' ? block.text : '{}'
    const record = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
    const records = [...existing, { id: existing.length + 1, ...record }]
    progress('RELAY', `Saving record to ~/Desktop/Basnet-Bookkeeping.json...`)
    saveBookkeeping(records)
    return `Recorded: ${record.description}${record.amount ? ` (${record.amount > 0 ? '+' : ''}$${Math.abs(record.amount)} AUD)` : ''}. Total records: ${records.length}.`
  } catch {
    return 'Could not parse as a financial record.'
  }
}

// ── System info detection ─────────────────────────────────────────────

const MAC_TRIGGERS = ['memory', 'ram', 'disk', 'cpu', 'battery', 'uptime', 'ssd', 'hard drive', 'my mac', 'space', 'free space']
const WEB_TRIGGERS = ['visa', 'job', 'jobs', 'darwin', 'sydney', 'melbourne', 'brisbane', 'perth',
  'weather', 'price of', 'cost of', 'how much does', 'find me', 'salary', 'wage',
  'uni course', 'assignment', 'ato deadline', 'tax deadline', 'super deadline',
  'latest news', 'news about', 'hire', 'hiring', 'what is the', 'where is', 'how do i', 'how to get',
  'claude', 'claude code', 'anthropic', 'sonnet', 'haiku', 'opus', 'latest model', 'llm', 'ai model',
  'openai', 'gemini', 'gpt', 'cursor', 'windsurf', 'ai tool', 'mcp server']

function needsSystemInfo(q: string): boolean { return MAC_TRIGGERS.some(t => q.includes(t)) }
function needsWebSearch(q: string): boolean { return WEB_TRIGGERS.some(t => q.includes(t)) }

// ── Main handler ──────────────────────────────────────────────────────

export interface AgentResult {
  answer: string
  url?: string
  webSearchUsed: boolean
  suggestion?: string
  nextAction?: string
}

export async function handlePersonal(question: string, progress: ProgressFn, filePaths?: string[], memoryContext?: string): Promise<AgentResult> {
  const q = question.toLowerCase()
  const master = readMaster()

  // Bookkeeping shortcut
  if (isBookkeepingEntry(q)) {
    const answer = await recordBookkeeping(question, progress)
    return { answer, webSearchUsed: false }
  }

  let fileContext = ''
  if (filePaths?.length) {
    for (const p of filePaths.slice(0, 3)) {
      if (fileExists(p)) fileContext += `\n\nFile: ${p}\n${readFile(p).slice(0, 2000)}`
    }
  }

  let systemContext = ''
  if (needsSystemInfo(q)) {
    progress('RELAY', 'Reading Mac system info...')
    const info = getSystemInfo()
    systemContext = `\n\nLive Mac system info (${info.hostname}):
- Disk: ${info.disk.used} used of ${info.disk.total} total, ${info.disk.free} free (${info.disk.percent} full)
- Memory: ${info.memory.used} active, ${info.memory.free} free of ~${info.memory.total} total
- Battery: ${info.battery}
- Uptime: ${info.uptime}
- Top processes: ${info.topProcesses.join(', ')}`
  }

  let webContext = ''
  let topUrl: string | undefined
  if (needsWebSearch(q)) {
    progress('RELAY', `Searching the web for: "${question}"...`)
    // For Claude/AI tool questions, target Anthropic docs directly
    const isClaudeQuery = /claude|anthropic|sonnet|haiku|opus|claude code/i.test(question)
    const searchQuery = isClaudeQuery
      ? `${question} site:docs.anthropic.com OR site:anthropic.com 2025`
      : `${question} Australia 2026`
    const results = await tavilySearch(searchQuery, 3)
    topUrl = results.results[0]?.url
    if (results.answer) {
      webContext = `\n\nWeb: ${results.answer}`
      progress('RELAY', `Found web results from ${topUrl ?? 'multiple sources'}`)
    } else if (results.results.length) {
      webContext = `\n\nWeb:\n${results.results.slice(0, 2).map(r => `- ${r.title}: ${r.content.slice(0, 200)}`).join('\n')}`
      progress('RELAY', `Found web results from ${topUrl ?? 'multiple sources'}`)
    }
  }

  // Detect open-browser intent and extract URL or app keyword
  const openTriggers: [RegExp, string][] = [
    [/n8n|workflow|automation/i,           'http://localhost:5678'],
    [/supabase/i,                          'https://supabase.com/dashboard'],
    [/vercel/i,                            'https://vercel.com/dashboard'],
    [/stripe/i,                            'https://dashboard.stripe.com'],
    [/sentry/i,                            'https://sentry.io'],
    [/github/i,                            'https://github.com/004Kaji/sab-account-ai'],
    [/resend/i,                            'https://resend.com/emails'],
    [/sab.*(site|app|dashboard|account)/i, 'https://sabaccountai.com/dashboard'],
  ]
  let openUrl: string | undefined
  for (const [pattern, url] of openTriggers) {
    if (pattern.test(question) && /open|check|show|go to|look at/i.test(question + ' ' + (memoryContext ?? ''))) {
      openUrl = url
      break
    }
  }

  progress('RELAY', 'Thinking...')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: `You are Basnet — Sanjog's AI co-founder running locally on his Mac. This is a VOICE interface.
Sanjog: Nepali international student, student visa 500, max 48h/fortnight work during semester.
North star: Permanent Residency → million-dollar SaaS (SAB Account AI) → financial independence.

HARD RULES:
- 2 sentences max. Plain spoken English. No markdown, no bullet points.
- NEVER say "paste", "copy", "type", "send me" — voice only.
- NEVER promise future actions ("give me 30 seconds", "checking now", "I'll look into it").
- NEVER diagnose something as broken unless you have actual evidence in your context.
- If you don't know, say "I don't have that data right now" — don't guess.
- If asked to open something and it's in the browser list, say "Opening it now."
${openUrl ? `\n- IMPORTANT: Tell Sanjog you are opening ${openUrl} right now.` : ''}
${master ? `\n\nContext:\n${master}` : ''}${memoryContext ? `\n\nMemory + conversation:\n${memoryContext}` : ''}${fileContext}${systemContext}${webContext}`,
    messages: [{ role: 'user', content: question }],
  })

  const block = msg.content.find(b => b.type === 'text')
  progress('RELAY', 'Done.')
  return {
    answer: block?.type === 'text' ? block.text : 'No response',
    url: openUrl ?? topUrl,
    webSearchUsed: !!webContext,
  }
}
