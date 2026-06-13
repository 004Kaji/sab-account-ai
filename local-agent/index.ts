import './env' // must be first — loads .env.local before any agent module initializes
import http from 'http'
import os from 'os'
import { listDirectory, readFile, writeFile, fileExists, getSystemInfo, execCommand, openApp, openUrl, closeApp, listRunningApps } from './mac-toolkit'
import { runBrowserTask, extractPageText, resolveTaskToUrl } from './browser-toolkit'
import { runBuildTask, listBuiltItems, deleteBuiltItem } from './build-toolkit'
import { handlePersonal } from './agents/personal'
import { handleMarketing } from './agents/marketing'
import { handleIntel } from './agents/intel'
import { handleHealth } from './agents/health'
import { handleTechnical } from './agents/technical'
import { loadRecentHistory, loadFacts, extractAndSaveFacts, formatMemoryContext } from './memory'
import type { MemoryEntry } from './memory'

const PORT   = parseInt(process.env.LOCAL_AGENT_PORT ?? '3099', 10)
const SECRET = process.env.AGENT_WEBHOOK_SECRET

function isAuthorized(req: http.IncomingMessage): boolean {
  if (!SECRET) return true
  return req.headers['x-agent-secret'] === SECRET
}

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

function json(res: http.ServerResponse, statusCode: number, data: unknown) {
  const body = JSON.stringify(data)
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

// ── Legacy file/system handlers ────────────────────────────────────────

function handleSystem() {
  return { info: getSystemInfo() }
}

function handleFiles(body: unknown) {
  const req = body as { path?: string }
  return { entries: listDirectory(req.path ?? os.homedir() + '/Documents') }
}

function handleRead(body: unknown) {
  const req = body as { path?: string }
  if (!req.path) throw new Error('path required')
  return { content: readFile(req.path) }
}

function handleWrite(body: unknown) {
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
    const { question, filePaths } = body as { question?: string; filePaths?: string[] }

    // ── Memory: load history ──────────────────────────────────────────
    if (req.url === '/history') {
      const history = await loadRecentHistory(15)
      const facts   = loadFacts()
      json(res, 200, { success: true, history, facts, count: history.length })

    // ── Streaming route — NDJSON, live progress ───────────────────────
    } else if (req.url === '/stream') {
      const { question: q, route, mem_context, history: sessionHistory } = body as {
        question?: string; route?: string; history?: {q:string;a:string}[]; mem_context?: string
      }
      if (!q) throw new Error('question required')

      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      })

      const progress = (agent: string, message: string) => {
        res.write(JSON.stringify({ type: 'progress', agent, message }) + '\n')
      }

      const memoryContext = mem_context ?? ''
      const historyText  = (sessionHistory ?? [])
        .map(h => `Q: ${h.q}\nA: ${h.a}`)
        .join('\n\n')
      const fullContext  = [memoryContext, historyText ? `Recent conversation:\n${historyText}` : '']
        .filter(Boolean).join('\n\n')

      let result
      const r = route ?? 'ask'
      if      (r === 'marketing')    result = await handleMarketing(q, progress, fullContext)
      else if (r === 'intel')        result = await handleIntel(q, progress, fullContext)
      else if (r === 'health-check') result = await handleHealth(q, progress, fullContext)
      else if (r === 'technical')    result = await handleTechnical(q, progress)
      else                           result = await handlePersonal(q, progress, undefined, fullContext)

      const out = result as { answer: string; url?: string; suggestion?: string; nextAction?: string }
      res.write(JSON.stringify({
        type: 'result', success: true,
        answer: out.answer, url: out.url,
        suggestion: out.suggestion,
        nextAction: out.nextAction,
      }) + '\n')
      res.end()

    // ── Shell command execution ───────────────────────────────────────
    } else if (req.url === '/exec') {
      const { command, cwd } = body as { command?: string; cwd?: string }
      if (!command) throw new Error('command required')
      const result = execCommand(command, cwd)
      json(res, 200, { success: true, ...result })

    // ── App control ───────────────────────────────────────────────────
    } else if (req.url === '/app') {
      const { action, name, url } = body as { action?: string; name?: string; url?: string }
      if (!action) throw new Error('action required')
      if (action === 'open' && name)  { openApp(name);  json(res, 200, { success: true, opened: name }) }
      else if (action === 'open' && url)  { openUrl(url);  json(res, 200, { success: true, opened: url }) }
      else if (action === 'close' && name) { closeApp(name); json(res, 200, { success: true, closed: name }) }
      else if (action === 'list')          { json(res, 200, { success: true, apps: listRunningApps() }) }
      else throw new Error('action must be open/close/list + name or url')

    // ── Code build + deploy ───────────────────────────────────────────
    } else if (req.url === '/build') {
      const { task } = body as { task?: string }
      if (!task) throw new Error('task required')
      const result = await runBuildTask(task)
      json(res, 200, { success: true, ...result })

    } else if (req.url === '/build/list') {
      json(res, 200, { success: true, items: listBuiltItems() })

    } else if (req.url === '/build/delete') {
      const { name } = body as { name?: string }
      if (!name) throw new Error('name required')
      const result = deleteBuiltItem(name)
      json(res, 200, { success: true, ...result })

    // ── Browser automation ────────────────────────────────────────────
    } else if (req.url === '/browse') {
      const { task, url } = body as { task?: string; url?: string }
      if (!task) throw new Error('task required')
      const startUrl = url ?? resolveTaskToUrl(task)
      const result = await runBrowserTask(task, startUrl)
      json(res, 200, { success: true, answer: result })

    // ── Routed single-agent dispatch (used by n8n orchestrator) ──────
    } else if (req.url === '/route') {
      const { question: q, route: r } = body as { question?: string; route?: string }
      if (!q) throw new Error('question required')
      const noop = () => {}
      let result: { answer: string; url?: string; webSearchUsed?: boolean }
      if      (r === 'technical')    result = await handleTechnical(q, noop)
      else if (r === 'health')       result = await handleHealth(q, noop)
      else if (r === 'intel')        result = await handleIntel(q, noop)
      else if (r === 'marketing')    result = await handleMarketing(q, noop)
      else                           result = await handlePersonal(q, noop, filePaths)
      json(res, 200, { success: true, answer: result.answer, url: result.url })

    // ── Agent routes (non-streaming fallback) ─────────────────────────
    } else if (req.url === '/ask') {
      if (!question) throw new Error('question required')
      const noop = () => {}
      const result = await handlePersonal(question, noop, filePaths)
      json(res, 200, { success: true, answer: result.answer, url: result.url, webSearchUsed: result.webSearchUsed })

    } else if (req.url === '/marketing') {
      if (!question) throw new Error('question required')
      const result = await handleMarketing(question, () => {})
      json(res, 200, { success: true, answer: result.answer, url: result.url, webSearchUsed: result.webSearchUsed })

    } else if (req.url === '/intel') {
      if (!question) throw new Error('question required')
      const result = await handleIntel(question, () => {})
      json(res, 200, { success: true, answer: result.answer, url: result.url, webSearchUsed: result.webSearchUsed })

    } else if (req.url === '/health-check') {
      if (!question) throw new Error('question required')
      const result = await handleHealth(question, () => {})
      json(res, 200, { success: true, answer: result.answer, webSearchUsed: result.webSearchUsed })

    } else if (req.url === '/technical') {
      if (!question) throw new Error('question required')
      const result = await handleTechnical(question, () => {})
      json(res, 200, { success: true, answer: result.answer, webSearchUsed: result.webSearchUsed })

    // ── Legacy utility routes ──────────────────────────────────────────
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
    const msg = err instanceof Error ? err.message : String(err)
    if (!res.headersSent) {
      json(res, 500, { success: false, error: msg })
    } else {
      // Stream already started — write error as NDJSON line then close
      try {
        res.write(JSON.stringify({ type: 'error', error: msg }) + '\n')
        res.end()
      } catch { /* ignore — connection already dead */ }
    }
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Basnet local agent running on http://127.0.0.1:${PORT}`)
  console.log(`Auth: ${SECRET ? 'enabled' : 'disabled (dev mode)'}`)
  console.log('Agents: /ask (personal+mac)  /marketing  /intel  /health-check  /technical')
  console.log('Utils:  /system  /files  /read  /write  /health')
})

process.on('SIGTERM', () => server.close())
process.on('SIGINT',  () => server.close())
