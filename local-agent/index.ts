import http from 'http'
import os from 'os'
import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { listDirectory, readFile, writeFile, fileExists, tavilySearch, getSystemInfo } from './mac-toolkit'

// Load env vars from parent project's .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, '')
    if (key && val && !process.env[key]) process.env[key] = val
  }
}

const PORT = parseInt(process.env.LOCAL_AGENT_PORT ?? '3099', 10)
const SECRET = process.env.AGENT_WEBHOOK_SECRET

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Auth check ────────────────────────────────────────────────────────

function isAuthorized(req: http.IncomingMessage): boolean {
  if (!SECRET) return true // dev mode: no secret set = open
  return req.headers['x-agent-secret'] === SECRET
}

// ── Request body parser ────────────────────────────────────────────────

function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += String(chunk) })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

// ── JSON response helper ───────────────────────────────────────────────

function json(res: http.ServerResponse, statusCode: number, data: unknown) {
  const body = JSON.stringify(data)
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

// ── Routes ────────────────────────────────────────────────────────────

const MAC_SYSTEM_TRIGGERS = ['memory', 'ram', 'disk', 'storage', 'space', 'cpu', 'battery',
  'process', 'running', 'app', 'system', 'computer', 'mac', 'slow', 'performance', 'uptime']

function needsSystemInfo(question: string): boolean {
  const q = question.toLowerCase()
  return MAC_SYSTEM_TRIGGERS.some(t => q.includes(t))
}

async function handleAsk(body: unknown): Promise<{ answer: string; webSearchUsed: boolean }> {
  const req = body as { question?: string; filePaths?: string[] }
  if (!req.question) throw new Error('question required')

  let fileContext = ''
  if (req.filePaths?.length) {
    for (const p of req.filePaths.slice(0, 3)) {
      if (fileExists(p)) {
        const content = readFile(p)
        fileContext += `\n\nFile: ${p}\n${content.slice(0, 2000)}`
      }
    }
  }

  // Add real system info for Mac/system queries
  let systemContext = ''
  if (needsSystemInfo(req.question)) {
    const info = getSystemInfo()
    systemContext = `\n\nLive Mac system info (${info.hostname}):
- Disk: ${info.disk.used} used of ${info.disk.total} total, ${info.disk.free} free (${info.disk.percent} full)
- Memory: ${info.memory.used} active, ${info.memory.free} free of ~${info.memory.total} total
- Battery: ${info.battery}
- Uptime: ${info.uptime}
- Top processes: ${info.topProcesses.join(', ')}`
  }

  const search = await tavilySearch(req.question, 3)
  const webContext = search.answer ? `\n\nWeb search: ${search.answer}` : ''

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: `You are Relay, Basnet's personal agent running locally on Sanjog's Mac.
You have access to his files, system info, and web search.
Answer concisely. Flag visa risks. Respect 14hr/week work limit.${fileContext}${systemContext}${webContext}`,
    messages: [{ role: 'user', content: req.question }],
  })

  const block = msg.content.find(b => b.type === 'text')
  return {
    answer: block?.type === 'text' ? block.text : 'No response',
    webSearchUsed: search.results.length > 0,
  }
}

function handleSystem(): { info: ReturnType<typeof getSystemInfo> } {
  return { info: getSystemInfo() }
}

function handleFiles(body: unknown): { entries: string[] } {
  const req = body as { path?: string }
  const dirPath = req.path ?? os.homedir() + '/Documents'
  return { entries: listDirectory(dirPath) }
}

function handleRead(body: unknown): { content: string } {
  const req = body as { path?: string }
  if (!req.path) throw new Error('path required')
  return { content: readFile(req.path) }
}

function handleWrite(body: unknown): { success: boolean } {
  const req = body as { path?: string; content?: string }
  if (!req.path || req.content === undefined) throw new Error('path and content required')
  writeFile(req.path, req.content)
  return { success: true }
}

// ── HTTP server ────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'GET' && req.url === '/health') {
    json(res, 200, { status: 'ok', mac: os.hostname() })
    return
  }

  if (!isAuthorized(req)) {
    json(res, 401, { error: 'Unauthorized' })
    return
  }

  if (req.method !== 'POST') {
    json(res, 405, { error: 'POST only' })
    return
  }

  let body: unknown
  try {
    body = await parseBody(req)
  } catch {
    json(res, 400, { error: 'Invalid JSON body' })
    return
  }

  try {
    if (req.url === '/ask') {
      const result = await handleAsk(body)
      json(res, 200, { success: true, answer: result.answer, webSearchUsed: result.webSearchUsed })
    } else if (req.url === '/system') {
      const result = handleSystem()
      json(res, 200, { success: true, ...result })
    } else if (req.url === '/files') {
      const result = handleFiles(body)
      json(res, 200, { success: true, entries: result.entries })
    } else if (req.url === '/read') {
      const result = handleRead(body)
      json(res, 200, { success: true, content: result.content })
    } else if (req.url === '/write') {
      handleWrite(body)
      json(res, 200, { success: true })
    } else {
      json(res, 404, { error: `Unknown route: ${req.url ?? '/'}` })
    }
  } catch (err) {
    json(res, 500, { success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Basnet local agent running on http://127.0.0.1:${PORT}`)
  console.log(`Auth: ${SECRET ? 'enabled (AGENT_WEBHOOK_SECRET)' : 'disabled (dev mode)'}`)
  console.log('Endpoints: /health  /ask  /system  /files  /read  /write')
})

process.on('SIGTERM', () => server.close())
process.on('SIGINT',  () => server.close())
