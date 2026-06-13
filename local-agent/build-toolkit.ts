import fs from 'fs'
import path from 'path'
import os from 'os'
import Anthropic from '@anthropic-ai/sdk'
import { execCommand } from './mac-toolkit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PROJECT_DIR = process.env.PROJECT_DIR
  ?? path.join(os.homedir(), 'Desktop', 'sab-account-ai-project')

// ── Generate code with Claude ──────────────────────────────────────────

async function generateCode(task: string, fileType: string): Promise<string> {
  const isHtml = fileType === 'html'
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `You are an expert developer. Generate complete, working code for this task:

"${task}"

File type: ${fileType}

CRITICAL RULES:
- Output ONLY the raw code — no markdown fences, no explanation, nothing else
- 100% complete — no TODOs, no placeholders, last character must close the file
${isHtml
  ? `- Write body HTML first, then a single <style> block — keep CSS under 80 lines
- Max 3 sections: hero, features, CTA — clean and readable
- No complex animations or JS — simple and fast`
  : `- TypeScript for .ts, React Next.js App Router for .tsx, include all imports`
}`,
    }],
  })
  return (res.content[0] as { text: string }).text.trim()
}

// ── Determine file path from task description ──────────────────────────

async function resolveFilePath(task: string): Promise<{ filePath: string; fileType: string; deployable: boolean }> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Given this build task: "${task}"

Decide the output file path relative to project root (${PROJECT_DIR}).
Reply ONLY with valid JSON:
{
  "filePath": "relative/path/to/file.ext",
  "fileType": "tsx|ts|html|css|js|py",
  "deployable": true
}

Rules:
- New Next.js pages: src/app/<name>/page.tsx
- New API routes: src/app/api/<name>/route.ts
- New agents: local-agent/agents/<name>.ts
- HTML games/landing pages: public/<name>.html
- Scripts: local-agent/scripts/<name>.ts
- deployable: true if it's a Next.js page/route that Vercel will serve`,
    }],
  })
  const raw = (res.content[0] as { text: string }).text.trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  return JSON.parse(raw) as { filePath: string; fileType: string; deployable: boolean }
}

// ── Agent management ──────────────────────────────────────────────────

async function createAgent(name: string, description: string): Promise<string> {
  const agentName = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const filePath = path.join(PROJECT_DIR, 'local-agent', 'agents', `${agentName}.ts`)

  const code = await generateCode(
    `Create a local agent called "${name}" that: ${description}. It should export a handleXxx(question, progress, context) function that returns { answer: string }.`,
    'ts'
  )

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, code, 'utf-8')
  return filePath
}

async function deleteAgent(name: string): Promise<boolean> {
  const agentName = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const filePath = path.join(PROJECT_DIR, 'local-agent', 'agents', `${agentName}.ts`)
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath)
    return true
  }
  return false
}

// ── Main build runner ──────────────────────────────────────────────────

export interface BuildResult {
  task: string
  filePath: string
  deployed: boolean
  url?: string
  answer: string
}

// ── List all built apps, pages, and agents ────────────────────────────

export interface BuiltItem {
  name: string
  type: 'html-app' | 'nextjs-page' | 'agent' | 'script'
  path: string
  url?: string
}

export function listBuiltItems(): BuiltItem[] {
  const items: BuiltItem[] = []

  // HTML apps/games in /public
  const publicDir = path.join(PROJECT_DIR, 'public')
  if (fs.existsSync(publicDir)) {
    for (const f of fs.readdirSync(publicDir)) {
      if (f.endsWith('.html')) {
        items.push({ name: f.replace('.html', ''), type: 'html-app', path: `public/${f}`, url: `https://sabaccountai.com/${f}` })
      }
    }
  }

  // Local agents
  const agentsDir = path.join(PROJECT_DIR, 'local-agent', 'agents')
  if (fs.existsSync(agentsDir)) {
    for (const f of fs.readdirSync(agentsDir)) {
      if (f.endsWith('.ts')) {
        items.push({ name: f.replace('.ts', ''), type: 'agent', path: `local-agent/agents/${f}` })
      }
    }
  }

  // Scripts
  const scriptsDir = path.join(PROJECT_DIR, 'local-agent', 'scripts')
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir)) {
      if (f.endsWith('.ts')) {
        items.push({ name: f.replace('.ts', ''), type: 'script', path: `local-agent/scripts/${f}` })
      }
    }
  }

  return items
}

// ── Delete any built item by name ──────────────────────────────────────

export function deleteBuiltItem(name: string): { deleted: boolean; what: string } {
  const items = listBuiltItems()
  const match = items.find(i => i.name.toLowerCase() === name.toLowerCase())
  if (!match) return { deleted: false, what: name }
  const absPath = path.join(PROJECT_DIR, match.path)
  if (fs.existsSync(absPath)) {
    fs.rmSync(absPath)
    return { deleted: true, what: match.path }
  }
  return { deleted: false, what: name }
}

export async function runBuildTask(task: string): Promise<BuildResult> {
  const t = task.toLowerCase()

  // ── List all built items ──────────────────────────────────────────
  if (/(?:list|show|what|check).+(?:built|created|made|apps|agents|games|pages)/i.test(task)
    || /(?:built|created|made).+(?:list|show|what)/i.test(task)) {
    const items = listBuiltItems()
    if (items.length === 0) {
      return { task, filePath: '', deployed: false, answer: 'Nothing built yet. Say "build me a game" or "create an agent" to get started.' }
    }
    const grouped = {
      'HTML Apps/Games': items.filter(i => i.type === 'html-app'),
      'Agents':          items.filter(i => i.type === 'agent'),
      'Scripts':         items.filter(i => i.type === 'script'),
    }
    const lines = Object.entries(grouped)
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => `${k}:\n${v.map(i => `  • ${i.name}${i.url ? ` → ${i.url}` : ''}`).join('\n')}`)
    return { task, filePath: '', deployed: false, answer: lines.join('\n\n') }
  }

  // ── Delete any built item ─────────────────────────────────────────
  const deleteAnyMatch = task.match(/(?:delete|remove)\s+(?:the\s+)?(?:app|page|game|agent|script)?\s*["""]?(\w[\w-]*)["""]?/i)
  if (deleteAnyMatch && /delete|remove/i.test(task)) {
    const [, itemName] = deleteAnyMatch
    const result = deleteBuiltItem(itemName)
    if (!result.deleted) {
      // Try agent-specific delete
      const agentDeleted = await deleteAgent(itemName)
      return {
        task, filePath: '', deployed: false,
        answer: agentDeleted ? `Deleted agent "${itemName}".` : `"${itemName}" not found. Say "list what you built" to see everything.`,
      }
    }
    return { task, filePath: '', deployed: false, answer: `Deleted ${result.what}.` }
  }

  // ── Agent create ──────────────────────────────────────────────────
  const createMatch = task.match(/create\s+(?:a\s+)?(?:new\s+)?agent\s+called\s+["""]?(\w+)["""]?\s+(?:that\s+)?(.+)/i)
    ?? task.match(/(?:new|add)\s+agent[:\s]+["""]?(\w+)["""]?\s+(?:that\s+)?(.+)/i)

  if (createMatch) {
    const [, agentName, description] = createMatch
    const filePath = await createAgent(agentName, description)
    const rel = path.relative(PROJECT_DIR, filePath)
    return {
      task, filePath: rel, deployed: false,
      answer: `Agent "${agentName}" created at ${rel}. Restart local-agent to activate it.`,
    }
  }

  const deleteAgentMatch = task.match(/(?:delete|remove)\s+(?:the\s+)?(?:agent\s+)?["""]?(\w+)["""]?\s+agent/i)
  if (deleteAgentMatch) {
    const [, agentName] = deleteAgentMatch
    const deleted = await deleteAgent(agentName)
    return {
      task, filePath: '', deployed: false,
      answer: deleted ? `Agent "${agentName}" deleted.` : `Agent "${agentName}" not found.`,
    }
  }

  // ── General code build ────────────────────────────────────────────
  const { filePath: relPath, fileType, deployable } = await resolveFilePath(task)
  const absPath = path.join(PROJECT_DIR, relPath)
  const code = await generateCode(task, fileType)

  fs.mkdirSync(path.dirname(absPath), { recursive: true })
  fs.writeFileSync(absPath, code, 'utf-8')

  // Auto-deploy: git commit + push → Vercel picks it up
  let deployed = false
  let url: string | undefined

  if (deployable) {
    const commit = execCommand(
      `git add "${relPath}" && git commit -m "Basnet built: ${task.slice(0, 60)}"`,
      PROJECT_DIR,
    )
    if (commit.exitCode === 0) {
      const push = execCommand('git push origin master', PROJECT_DIR)
      deployed = push.exitCode === 0
      if (deployed) {
        // Derive Vercel URL from file path
        const routePath = relPath
          .replace('src/app', '')
          .replace('/page.tsx', '')
          .replace('/route.ts', '')
        url = `https://sabaccountai.com${routePath}`
      }
    }
  }

  return {
    task,
    filePath: relPath,
    deployed,
    url,
    answer: deployed
      ? `Built and deployed. Live at ${url} in ~30 seconds.`
      : `Built at ${relPath}. ${fileType === 'html' ? `Open at http://localhost:3000/${relPath.replace('public/', '')}` : 'Run git push to deploy.'}`,
  }
}
