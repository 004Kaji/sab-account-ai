import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

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

export function deleteFile(filePath: string): void {
  assertAllowed(filePath)
  fs.rmSync(filePath, { recursive: true, force: true })
}

export function deleteFilesMatching(dirPath: string, predicate: (name: string) => boolean): string[] {
  assertAllowed(dirPath)
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const deleted: string[] = []
  for (const e of entries) {
    if (predicate(e.name)) {
      const full = path.join(dirPath, e.name)
      assertAllowed(full)
      fs.rmSync(full, { recursive: true, force: true })
      deleted.push(e.name)
    }
  }
  return deleted
}

// ── System monitoring ─────────────────────────────────────────────────

function runCmd(cmd: string): string {
  try { return execSync(cmd, { timeout: 5000 }).toString().trim() } catch { return '' }
}

export interface SystemInfo {
  disk: { total: string; used: string; free: string; percent: string }
  memory: { total: string; used: string; free: string }
  battery: string
  topProcesses: string[]
  uptime: string
  hostname: string
}

export function getSystemInfo(): SystemInfo {
  // Disk — use / volume
  const dfLine = runCmd("df -h / | tail -1")
  const dfParts = dfLine.split(/\s+/)
  const disk = {
    total:   dfParts[1] ?? 'unknown',
    used:    dfParts[2] ?? 'unknown',
    free:    dfParts[3] ?? 'unknown',
    percent: dfParts[4] ?? 'unknown',
  }

  // Memory — vm_stat gives pages; 1 page = 16384 bytes
  const pageSize = 16384
  const vmstat = runCmd('vm_stat')
  const getPages = (label: string) => {
    const m = vmstat.match(new RegExp(`${label}[^:]*:\\s+(\\d+)`))
    return m ? parseInt(m[1]) * pageSize : 0
  }
  const memFreeBytes  = getPages('Pages free') + getPages('Pages inactive')
  const memActiveBytes = getPages('Pages active') + getPages('Pages wired down')
  const memTotalBytes = memFreeBytes + memActiveBytes + getPages('Pages speculative')
  const toGB = (b: number) => `${(b / 1073741824).toFixed(1)}GB`
  const memory = {
    total: toGB(memTotalBytes),
    used:  toGB(memActiveBytes),
    free:  toGB(memFreeBytes),
  }

  // Battery
  const batteryRaw = runCmd('pmset -g batt | grep -o "[0-9]*%; [a-z]*"')
  const battery = batteryRaw || 'unknown'

  // Top 5 processes by CPU
  const psRaw = runCmd("ps -Arceo pid,pcpu,comm | head -6 | tail -5")
  const topProcesses = psRaw.split('\n').map(l => l.trim()).filter(Boolean)

  // Uptime
  const uptime = runCmd('uptime | sed "s/.*up /up /" | sed "s/,  [0-9]* user.*//"')

  return { disk, memory, battery, topProcesses, uptime, hostname: os.hostname() }
}

// ── Shell command execution ────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//, /sudo\s+rm/, /chmod\s+777\s+\//, /mkfs/,
  /dd\s+if=/, />\s*\/dev\//, /format\s+[a-z]:/, /shutdown/, /reboot/,
]

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
}

export function execCommand(command: string, cwd?: string): ExecResult {
  const start = Date.now()
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) throw new Error(`Blocked: command matches unsafe pattern`)
  }
  try {
    const { execSync } = require('child_process') as typeof import('child_process')
    const stdout = execSync(command, {
      timeout: 30000,
      cwd: cwd ?? os.homedir(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString().trim()
    return { stdout, stderr: '', exitCode: 0, durationMs: Date.now() - start }
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; status?: number }
    return {
      stdout: e.stdout?.toString().trim() ?? '',
      stderr: e.stderr?.toString().trim() ?? '',
      exitCode: e.status ?? 1,
      durationMs: Date.now() - start,
    }
  }
}

// ── App control ────────────────────────────────────────────────────────

export function openApp(name: string): void {
  const { execSync } = require('child_process') as typeof import('child_process')
  execSync(`open -a "${name.replace(/"/g, '')}"`, { timeout: 5000 })
}

export function openUrl(url: string): void {
  const { execSync } = require('child_process') as typeof import('child_process')
  if (!/^https?:\/\//.test(url)) throw new Error('URL must start with http:// or https://')
  execSync(`open "${url.replace(/"/g, '')}"`, { timeout: 5000 })
}

export function closeApp(name: string): void {
  const { execSync } = require('child_process') as typeof import('child_process')
  execSync(`osascript -e 'quit app "${name.replace(/"/g, '')}"'`, { timeout: 5000 })
}

export function listRunningApps(): string[] {
  const { execSync } = require('child_process') as typeof import('child_process')
  try {
    const out = execSync(`osascript -e 'tell application "System Events" to get name of every process whose background only is false'`, { timeout: 5000 }).toString().trim()
    return out.split(', ').map(s => s.trim()).filter(Boolean)
  } catch { return [] }
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
