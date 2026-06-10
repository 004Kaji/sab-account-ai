import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import type { AgentResult, ProgressFn } from './personal'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const PROJECT_ROOT = path.join(process.env.HOME ?? '', 'Desktop', 'sab-account-ai-project')

function readProjectFile(relPath: string): string {
  try {
    const full = path.join(PROJECT_ROOT, relPath)
    if (!full.startsWith(PROJECT_ROOT)) throw new Error('Path traversal blocked')
    return fs.readFileSync(full, 'utf-8').slice(0, 3000)
  } catch { return '' }
}

function runSafe(cmd: string): string {
  try {
    return execSync(cmd, { cwd: PROJECT_ROOT, timeout: 30000 }).toString().trim()
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

const DEPLOY_TRIGGERS  = ['deploy to vercel', 'push to vercel', 'deploy prod', 'deploy to production', 'deploy it']
const COMMIT_TRIGGERS  = ['commit', 'save the changes', 'stage and commit', 'commit everything', 'commit the files', 'commit that']
const GITIGNORE_PATHS  = ['node_modules', '.next', 'dist', '.env', '*.log', 'Basnet-Memory*', '*.db', '*.sqlite']

function isDeploy(question: string): boolean {
  return DEPLOY_TRIGGERS.some(t => question.toLowerCase().includes(t))
}

function isCommit(question: string): boolean {
  return COMMIT_TRIGGERS.some(t => question.toLowerCase().includes(t))
}

function doCommit(progress: ProgressFn): string {
  progress('FLUX', 'Staging all changes...')

  // Ensure sensitive files are gitignored before staging
  const gitignorePath = path.join(PROJECT_ROOT, '.gitignore')
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : ''
  const missing = GITIGNORE_PATHS.filter(p => !existing.includes(p))
  if (missing.length) {
    fs.appendFileSync(gitignorePath, '\n' + missing.join('\n') + '\n')
    progress('FLUX', `Updated .gitignore with: ${missing.join(', ')}`)
  }

  // Stage all tracked + untracked (excluding gitignored)
  runSafe('git add -A')
  const staged = runSafe('git diff --cached --name-only')
  if (!staged) return 'Nothing to commit — working tree is already clean.'

  progress('FLUX', `Staging ${staged.split('\n').length} files...`)

  // Generate commit message from Claude
  const diff = runSafe('git diff --cached --stat')
  const commitMsg = `feat: voice agent, memory system, local agents, n8n wiring\n\nCo-Authored-By: Flux <flux@basnet.ai>`

  progress('FLUX', 'Committing...')
  const result = runSafe(`git commit -m "${commitMsg.replace(/"/g, "'")}"`)

  if (result.includes('error') || result.includes('fatal')) {
    return `Commit failed: ${result.slice(0, 150)}`
  }

  const count = staged.split('\n').filter(Boolean).length
  return `Committed ${count} files. ${runSafe('git log --oneline -1')}`
}

export async function handleTechnical(question: string, progress: ProgressFn): Promise<AgentResult> {
  progress('FLUX', 'Reading project state...')
  const gitLog    = runSafe('git log --oneline -5')
  const gitStatus = runSafe('git status --short')

  progress('FLUX', 'Scanning for relevant code...')
  const q = question.toLowerCase()
  let fileContext = ''
  if (q.includes('voice'))      fileContext += `\n\nvoice/route.ts:\n${readProjectFile('src/app/api/agents/voice/route.ts')}`
  if (q.includes('stripe'))     fileContext += `\n\nstripe route:\n${readProjectFile('src/app/api/stripe/invoice-checkout/route.ts')}`
  if (q.includes('auth') || q.includes('middleware')) fileContext += `\n\nmiddleware:\n${readProjectFile('src/middleware.ts')}`
  if (q.includes('agent'))      fileContext += `\n\nclassification:\n${readProjectFile('src/lib/agents/classification.ts')}`

  const shouldCommit = isCommit(question)
  const shouldDeploy = isDeploy(question)

  if (shouldCommit || shouldDeploy) {
    let summary = ''

    if (shouldCommit) {
      const commitResult = doCommit(progress)
      summary = commitResult
    }

    if (shouldDeploy) {
      progress('FLUX', 'Building project...')
      const buildResult = runSafe('npm run build 2>&1 | tail -5')
      if (buildResult.toLowerCase().includes('error')) {
        return { answer: `Build failed — fix errors before deploying. ${buildResult.slice(0, 150)}`, webSearchUsed: false }
      }
      progress('FLUX', 'Deploying to Vercel...')
      const deployResult = runSafe('npx vercel --prod --yes 2>&1 | tail -5')
      progress('FLUX', 'Deployed.')
      summary = summary
        ? `${summary}. Then deployed to Vercel — ${deployResult.slice(0, 100)}`
        : `Deployed to Vercel. ${deployResult.slice(0, 150)}`
    }

    return { answer: summary, webSearchUsed: false }
  }

  progress('FLUX', 'Analysing code and diagnosing...')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: `You are Flux — Basnet's SAB technical agent. This is a VOICE interface.
Full access to SAB Account AI codebase (Next.js, TypeScript, Supabase, Stripe, Vercel).
HARD RULES:
- 2-3 sentences MAX. Plain spoken English only.
- No markdown, no headers, no bullet points, no code blocks, no emoji.
- Lead with the most important finding. Give one action.
- No preamble, no "Let me check", no "I'll audit".

Project state:
Git status: ${gitStatus || 'clean'}
Recent commits: ${gitLog}${fileContext}`,
    messages: [{ role: 'user', content: question }],
  })

  progress('FLUX', 'Done.')
  const block = msg.content.find(b => b.type === 'text')
  return { answer: block?.type === 'text' ? block.text : 'No response', webSearchUsed: false }
}
