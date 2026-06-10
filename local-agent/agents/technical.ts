/**
 * Flux — autonomous SAB engineering agent.
 * Scans for errors → diagnoses → writes fixes → opens GitHub PR → reports back.
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import type { AgentResult, ProgressFn } from './personal'

const anthropic    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const PROJECT_ROOT = path.join(process.env.HOME ?? '', 'Desktop', 'sab-account-ai-project')
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? ''
const GITHUB_REPO  = process.env.GITHUB_REPO  ?? ''

// ── Shell helpers ──────────────────────────────────────────────────────

function run(cmd: string, cwd = PROJECT_ROOT): string {
  try {
    return execSync(cmd, { cwd, timeout: 60000, stdio: ['pipe','pipe','pipe'] }).toString().trim()
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; stderr?: Buffer; message?: string }
    return ((err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '') || err.message || String(e)).trim()
  }
}

function readLocal(relPath: string): string {
  try {
    const full = path.join(PROJECT_ROOT, relPath)
    if (!full.startsWith(PROJECT_ROOT)) throw new Error('blocked')
    return fs.readFileSync(full, 'utf-8')
  } catch { return '' }
}

function writeLocal(relPath: string, content: string): void {
  const full = path.join(PROJECT_ROOT, relPath)
  if (!full.startsWith(PROJECT_ROOT)) throw new Error('path traversal blocked')
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}

// ── GitHub API ─────────────────────────────────────────────────────────

function ghHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

async function ghGet<T>(endpoint: string): Promise<T> {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}${endpoint}`, { headers: ghHeaders() })
  if (!r.ok) throw new Error(`GitHub GET ${endpoint}: ${r.status}`)
  return r.json() as Promise<T>
}

async function ghPost<T>(endpoint: string, body: unknown): Promise<T> {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}${endpoint}`, {
    method: 'POST', headers: ghHeaders(), body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`GitHub POST ${endpoint}: ${r.status} ${await r.text()}`)
  return r.json() as Promise<T>
}

async function ghPut(endpoint: string, body: unknown): Promise<void> {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}${endpoint}`, {
    method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`GitHub PUT ${endpoint}: ${r.status} ${await r.text()}`)
}

async function getDefaultBranch(): Promise<{ name: string; sha: string }> {
  const repo = await ghGet<{ default_branch: string }>('')
  const branch = await ghGet<{ commit: { sha: string } }>(`/branches/${repo.default_branch}`)
  return { name: repo.default_branch, sha: branch.commit.sha }
}

async function createBranch(name: string, sha: string): Promise<void> {
  await ghPost('/git/refs', { ref: `refs/heads/${name}`, sha })
}

async function getFileSha(filePath: string, branch: string): Promise<string | undefined> {
  try {
    const f = await ghGet<{ sha?: string }>(`/contents/${filePath}?ref=${branch}`)
    return f.sha
  } catch { return undefined }
}

async function updateFile(filePath: string, content: string, message: string, branch: string): Promise<void> {
  const sha = await getFileSha(filePath, branch)
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  }
  if (sha) body.sha = sha
  await ghPut(`/contents/${filePath}`, body)
}

async function createPR(title: string, body: string, head: string, base: string): Promise<{ number: number; url: string }> {
  const pr = await ghPost<{ number: number; html_url: string }>('/pulls', { title, body, head, base })
  return { number: pr.number, url: pr.html_url }
}

// ── Scanning ───────────────────────────────────────────────────────────

interface ScanResult {
  tsErrors:    { file: string; line: number; message: string }[]
  buildErrors: string[]
  gitStatus:   string
  gitLog:      string
}

function scanProject(progress: ProgressFn): ScanResult {
  progress('FLUX', 'Running TypeScript check...')
  const tsRaw = run('npx tsc --noEmit 2>&1 | head -60')

  const tsErrors: ScanResult['tsErrors'] = []
  for (const line of tsRaw.split('\n')) {
    const m = line.match(/^(.+?)\((\d+),\d+\):\s+error\s+TS\d+:\s+(.+)$/)
    if (m) {
      tsErrors.push({
        file:    m[1].replace(PROJECT_ROOT + '/', ''),
        line:    parseInt(m[2]),
        message: m[3],
      })
    }
  }

  progress('FLUX', `TypeScript: ${tsErrors.length} error(s). Checking build...`)
  const buildRaw   = run('npm run build 2>&1 | tail -20')
  const buildErrors = buildRaw.includes('error') || buildRaw.includes('Error')
    ? buildRaw.split('\n').filter(l => l.toLowerCase().includes('error')).slice(0, 5)
    : []

  progress('FLUX', `Build: ${buildErrors.length === 0 ? 'clean' : `${buildErrors.length} error(s)`}. Reading git state...`)
  const gitStatus = run('git status --short')
  const gitLog    = run('git log --oneline -5')

  return { tsErrors, buildErrors, gitStatus, gitLog }
}

// ── Fix generation ─────────────────────────────────────────────────────

interface Fix {
  filePath:    string
  fixedCode:   string
  summary:     string
}

async function generateFix(error: ScanResult['tsErrors'][0], progress: ProgressFn): Promise<Fix | null> {
  const currentCode = readLocal(error.file)
  if (!currentCode) return null

  progress('FLUX', `Generating fix for ${error.file}:${error.line}...`)

  try {
    const raw = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: `You are Flux — an autonomous TypeScript fixer for SAB Account AI.
Return ONLY valid JSON: { "summary": "one sentence describing the fix", "fixedCode": "complete corrected file content" }
Rules:
- Fix ONLY the reported error. Do not refactor or add features.
- Return the COMPLETE file content, not just the changed lines.
- The fix must be minimal and safe.`,
      messages: [{
        role: 'user',
        content: `File: ${error.file}
Line: ${error.line}
Error: ${error.message}

Current file content:
${currentCode.slice(0, 4000)}

Return JSON with the fixed file.`,
      }],
    })

    const block = raw.content.find(b => b.type === 'text')
    const text  = block?.type === 'text' ? block.text : ''
    const json  = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as Fix & { fixedCode: string }
    return { filePath: error.file, fixedCode: json.fixedCode, summary: json.summary }
  } catch {
    return null
  }
}

// ── PR creation ────────────────────────────────────────────────────────

async function openPR(fixes: Fix[], scan: ScanResult, progress: ProgressFn): Promise<string> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return 'GitHub not configured.'

  progress('FLUX', 'Creating fix branch on GitHub...')
  const { name: base, sha } = await getDefaultBranch()
  const branch = `flux/fix-${Date.now()}`
  await createBranch(branch, sha)

  progress('FLUX', `Pushing ${fixes.length} fixed file(s)...`)
  for (const fix of fixes) {
    await updateFile(
      fix.filePath,
      fix.fixedCode,
      `fix: ${fix.summary} [Flux]`,
      branch,
    )
  }

  const prBody = [
    '## Flux Auto-Fix',
    '',
    '### Errors found',
    ...scan.tsErrors.map(e => `- \`${e.file}:${e.line}\` — ${e.message}`),
    '',
    '### Fixes applied',
    ...fixes.map(f => `- **${f.filePath}**: ${f.summary}`),
    '',
    '### Build status before fix',
    scan.buildErrors.length ? scan.buildErrors.join('\n') : 'Build was passing',
    '',
    '---',
    '*Auto-generated by Flux agent — review before merging*',
  ].join('\n')

  progress('FLUX', 'Opening GitHub PR...')
  const pr = await createPR(
    `[Flux] Fix ${fixes.length} TypeScript error(s)`,
    prBody,
    branch,
    base,
  )

  return pr.url
}

// ── Commit helper (local) ──────────────────────────────────────────────

const GITIGNORE_GUARD = ['node_modules', '.next', 'dist', '*.log', 'Basnet-Memory*', '*.db', '*.sqlite']

function doCommit(progress: ProgressFn): string {
  progress('FLUX', 'Staging all changes...')
  const giPath   = path.join(PROJECT_ROOT, '.gitignore')
  const existing = fs.existsSync(giPath) ? fs.readFileSync(giPath, 'utf-8') : ''
  const missing  = GITIGNORE_GUARD.filter(p => !existing.includes(p))
  if (missing.length) fs.appendFileSync(giPath, '\n' + missing.join('\n') + '\n')

  run('git add -A')
  const staged = run('git diff --cached --name-only')
  if (!staged.trim()) return 'Nothing to commit — working tree is already clean.'

  const count = staged.split('\n').filter(Boolean).length
  progress('FLUX', `Committing ${count} files...`)
  run(`git commit -m "feat: voice agent, memory system, local agents, n8n wiring\n\nCo-Authored-By: Flux <flux@basnet.ai>"`)
  return `Committed ${count} files. ${run('git log --oneline -1')}`
}

// ── Intent detection ───────────────────────────────────────────────────

const SCAN_TRIGGERS   = ['check', 'error', 'bug', 'condition', 'status', 'broken', 'any issues', 'health', 'audit']
const FIX_TRIGGERS    = ['fix', 'repair', 'resolve', 'solve']
const COMMIT_TRIGGERS = ['commit', 'save the changes', 'stage and commit', 'commit everything']
const DEPLOY_TRIGGERS = ['deploy to vercel', 'push to vercel', 'deploy prod', 'deploy to production', 'deploy it', 'and deploy', ' deploy', 'commit and deploy']

function wants(question: string, triggers: string[]): boolean {
  const q = question.toLowerCase()
  return triggers.some(t => q.includes(t))
}

// ── Main handler ───────────────────────────────────────────────────────

export async function handleTechnical(question: string, progress: ProgressFn): Promise<AgentResult> {
  const shouldScan   = wants(question, SCAN_TRIGGERS)
  const shouldFix    = wants(question, FIX_TRIGGERS)
  const shouldCommit = wants(question, COMMIT_TRIGGERS)
  const shouldDeploy = wants(question, DEPLOY_TRIGGERS)

  // ── Commit only ──────────────────────────────────────────────────────
  if (shouldCommit && !shouldScan && !shouldFix) {
    const result = doCommit(progress)
    return { answer: result, webSearchUsed: false }
  }

  // ── Full autonomous flow: scan → fix → PR (→ deploy) ─────────────────
  if (shouldScan || shouldFix) {
    const scan = scanProject(progress)

    const hasErrors = scan.tsErrors.length > 0 || scan.buildErrors.length > 0

    if (!hasErrors) {
      let answer = 'No TypeScript errors, build is clean, codebase is healthy.'

      // Commit if requested
      if (shouldCommit) {
        const commitResult = doCommit(progress)
        answer += ` ${commitResult}`
      }

      // Deploy if requested
      if (shouldDeploy) {
        progress('FLUX', 'Deploying to Vercel...')
        const deployResult = run('npx vercel --prod --yes 2>&1 | tail -5')
        answer += ` Deployed to Vercel — ${deployResult.slice(0, 100)}`
      }

      return { answer, webSearchUsed: false }
    }

    // Errors found — report if not fixing
    if (!shouldFix) {
      const summary = [
        scan.tsErrors.length ? `${scan.tsErrors.length} TypeScript error(s) in: ${[...new Set(scan.tsErrors.map(e => e.file))].join(', ')}.` : '',
        scan.buildErrors.length ? `Build failing.` : '',
        'Say "fix the errors" to have Flux repair and open a PR.',
      ].filter(Boolean).join(' ')
      return { answer: summary, webSearchUsed: false }
    }

    // Generate fixes for each unique file with errors
    progress('FLUX', `Found ${scan.tsErrors.length} error(s). Generating fixes...`)
    const uniqueErrors = scan.tsErrors.filter((e, i, arr) => arr.findIndex(x => x.file === e.file) === i)
    const fixes: Fix[] = []

    for (const error of uniqueErrors.slice(0, 3)) { // cap at 3 files per run
      const fix = await generateFix(error, progress)
      if (fix) {
        writeLocal(fix.filePath, fix.fixedCode)
        fixes.push(fix)
        progress('FLUX', `Fixed: ${fix.filePath}`)
      }
    }

    if (fixes.length === 0) {
      return { answer: `Found ${scan.tsErrors.length} errors but could not generate fixes automatically. Check ${scan.tsErrors[0].file}:${scan.tsErrors[0].line} — ${scan.tsErrors[0].message}`, webSearchUsed: false }
    }

    // Verify fixes
    progress('FLUX', 'Verifying fixes...')
    const checkAfter = run('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l').trim()
    const remaining  = parseInt(checkAfter) || 0

    // Open PR with fixes
    let prUrl = ''
    if (GITHUB_TOKEN && GITHUB_REPO) {
      try {
        prUrl = await openPR(fixes, scan, progress)
      } catch (e) {
        progress('FLUX', `PR creation failed: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Also commit if requested
    if (shouldCommit) doCommit(progress)

    // Deploy if requested and build is clean
    let deployNote = ''
    if (shouldDeploy) {
      if (remaining === 0) {
        progress('FLUX', 'Deploying to Vercel...')
        const deployResult = run('npx vercel --prod --yes 2>&1 | tail -3')
        deployNote = ` Deployed to Vercel.`
      } else {
        deployNote = ` Skipped deploy — ${remaining} error(s) still remaining.`
      }
    }

    const fixSummaries = fixes.map(f => f.summary).join('; ')
    const answer = [
      `Fixed ${fixes.length} of ${scan.tsErrors.length} error(s): ${fixSummaries}.`,
      remaining === 0 ? 'Build is now clean.' : `${remaining} error(s) still need attention.`,
      prUrl ? `PR open for review: ${prUrl}` : '',
      deployNote,
    ].filter(Boolean).join(' ')

    return { answer, url: prUrl || undefined, webSearchUsed: false }
  }

  // ── Commit + deploy without scan ─────────────────────────────────────
  if (shouldCommit || shouldDeploy) {
    let summary = ''
    if (shouldCommit) summary = doCommit(progress)
    if (shouldDeploy) {
      progress('FLUX', 'Building...')
      const build = run('npm run build 2>&1 | tail -3')
      if (build.toLowerCase().includes('error')) {
        return { answer: `Build failed — commit done but deploy skipped. ${build.slice(0, 120)}`, webSearchUsed: false }
      }
      progress('FLUX', 'Deploying to Vercel...')
      const deploy = run('npx vercel --prod --yes 2>&1 | tail -3')
      summary = summary ? `${summary}. Deployed to Vercel.` : `Deployed to Vercel. ${deploy.slice(0, 100)}`
    }
    return { answer: summary, webSearchUsed: false }
  }

  // ── General code question ─────────────────────────────────────────────
  progress('FLUX', 'Reading project state...')
  const gitLog    = run('git log --oneline -5')
  const gitStatus = run('git status --short')

  const q = question.toLowerCase()
  let fileContext = ''
  if (q.includes('voice'))    fileContext += `\n\nvoice route:\n${readLocal('src/app/api/agents/voice/route.ts').slice(0, 2000)}`
  if (q.includes('stripe'))   fileContext += `\n\nstripe route:\n${readLocal('src/app/api/stripe/invoice-checkout/route.ts').slice(0, 2000)}`
  if (q.includes('auth'))     fileContext += `\n\nmiddleware:\n${readLocal('src/middleware.ts').slice(0, 2000)}`
  if (q.includes('agent'))    fileContext += `\n\nclassification:\n${readLocal('src/lib/agents/classification.ts').slice(0, 2000)}`
  if (q.includes('payg'))     fileContext += `\n\nato.ts:\n${readLocal('src/lib/ato.ts').slice(0, 2000)}`

  progress('FLUX', 'Analysing...')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: `You are Flux — SAB Account AI's engineering agent. VOICE interface.
2-3 sentences MAX. Plain English. No markdown, no code blocks.
Lead with the most important finding. Give one concrete action.
Project: Git status: ${gitStatus || 'clean'} | Recent: ${gitLog}${fileContext}`,
    messages: [{ role: 'user', content: question }],
  })

  progress('FLUX', 'Done.')
  const block = msg.content.find(b => b.type === 'text')
  return { answer: block?.type === 'text' ? block.text : 'No response', webSearchUsed: false }
}
