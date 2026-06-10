import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

const FACTS_PATH = path.join(process.env.HOME ?? '', 'Desktop', 'Basnet-Facts.json')

export interface MemoryEntry { q: string; a: string; agent?: string; date?: string }
export interface Fact { fact: string; date: string; source: string }

// ── Supabase history ──────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key)
}

export async function loadRecentHistory(limit = 15): Promise<MemoryEntry[]> {
  try {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('agent_conversations')
      .select('question, answer, agent_name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!data) return []
    return data.reverse().map(r => ({
      q:     r.question,
      a:     r.answer,
      agent: r.agent_name,
      date:  r.created_at ? new Date(r.created_at).toLocaleDateString('en-AU') : undefined,
    }))
  } catch {
    return []
  }
}

// ── Facts file ────────────────────────────────────────────────────────

export function loadFacts(): Fact[] {
  try {
    if (fs.existsSync(FACTS_PATH)) return JSON.parse(fs.readFileSync(FACTS_PATH, 'utf-8'))
  } catch { }
  return []
}

function saveFacts(facts: Fact[]): void {
  fs.writeFileSync(FACTS_PATH, JSON.stringify(facts, null, 2), 'utf-8')
}

export async function extractAndSaveFacts(question: string, answer: string): Promise<void> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const existing  = loadFacts()

  try {
    const raw = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: `Extract any new concrete facts about Sanjog from this exchange.
Facts = things he mentions about himself, his life, plans, preferences, dates, goals.
NOT general info. NOT things already obvious.
Return ONLY a JSON array of strings, each a short fact. Empty array [] if nothing new.
Examples: ["Has a meeting on Friday 13 June", "Prefers to work at night", "Visa expires March 2027"]`,
      messages: [{ role: 'user', content: `Q: ${question}\nA: ${answer}` }],
    })

    const block = raw.content.find(b => b.type === 'text')
    const text  = block?.type === 'text' ? block.text.trim() : '[]'
    const newFacts: string[] = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())

    if (newFacts.length === 0) return

    const today  = new Date().toISOString().split('T')[0]
    const merged = [
      ...existing,
      ...newFacts.map(f => ({ fact: f, date: today, source: question.slice(0, 60) })),
    ]
    // Keep last 100 facts
    saveFacts(merged.slice(-100))
  } catch { }
}

// ── Format memory for agent context ──────────────────────────────────

export function formatMemoryContext(history: MemoryEntry[], facts: Fact[]): string {
  const lines: string[] = []

  if (facts.length > 0) {
    lines.push('Facts about Sanjog:')
    facts.slice(-20).forEach(f => lines.push(`- ${f.fact} (${f.date})`))
  }

  if (history.length > 0) {
    lines.push('\nRecent conversation history:')
    history.slice(-10).forEach(h => {
      lines.push(`[${h.date ?? 'prev session'}] Q: ${h.q}`)
      lines.push(`A: ${h.a.slice(0, 150)}`)
    })
  }

  return lines.join('\n')
}
