import fs from 'fs'
import path from 'path'
import os from 'os'

// ── Allowed paths (security allowlist) ────────────────────────────────
// Only these directories can be read or written. Prevents arbitrary filesystem access.

const ALLOWED_ROOTS = [
  path.join(os.homedir(), 'Documents'),
  path.join(os.homedir(), 'Desktop'),
  path.join(os.homedir(), 'Downloads'),
]

function assertAllowed(filePath: string): void {
  const resolved = path.resolve(filePath)
  const allowed = ALLOWED_ROOTS.some(root => resolved.startsWith(root + path.sep) || resolved === root)
  if (!allowed) {
    throw new Error(`Access denied: ${resolved} is outside allowed directories (${ALLOWED_ROOTS.join(', ')})`)
  }
}

// ── File operations ────────────────────────────────────────────────────

export function listDirectory(dirPath: string): string[] {
  assertAllowed(dirPath)
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  return entries.map(e => `${e.isDirectory() ? '[DIR] ' : ''}${e.name}`)
}

export function readFile(filePath: string): string {
  assertAllowed(filePath)
  return fs.readFileSync(filePath, 'utf-8')
}

export function writeFile(filePath: string, content: string): void {
  assertAllowed(filePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
}

export function fileExists(filePath: string): boolean {
  try {
    assertAllowed(filePath)
    return fs.existsSync(filePath)
  } catch { return false }
}

// ── Tavily web search ──────────────────────────────────────────────────

export async function tavilySearch(
  query: string,
  maxResults = 5,
): Promise<{ results: { title: string; url: string; content: string }[]; answer?: string }> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return { results: [] }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults, include_answer: true }),
    })
    if (!res.ok) return { results: [] }
    type R = { title?: string; url?: string; content?: string }
    const data = (await res.json()) as { results?: R[]; answer?: string }
    return {
      results: (data.results ?? []).map((r: R) => ({ title: r.title ?? '', url: r.url ?? '', content: r.content ?? '' })),
      answer: data.answer,
    }
  } catch { return { results: [] } }
}
