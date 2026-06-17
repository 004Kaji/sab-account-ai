// SAB Technical agent toolkit
// Access: GitHub API, Sentry, Supabase (SAB tables), Claude
// No access: social media, Mac files, personal data

export {
  readMasterContext,
  sendAlert,
  sendTelegram,
  logAgentAction,
  logSubAgent,
  callClaude,
  getSABMetrics,
  getStripeMetrics,
  isRateLimited,
  getBaseUrl,
  type LogAgentActionParams,
} from '@/lib/agents/utils'

import { createServiceClient } from '@/lib/supabase'

// ── GitHub API ─────────────────────────────────────────────────────────

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

function githubRepo(): string {
  const repo = process.env.GITHUB_REPO
  if (!repo) throw new Error('GITHUB_REPO env var not set (format: owner/repo)')
  return repo
}

export async function githubReadFile(filePath: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${githubRepo()}/contents/${filePath}`,
    { headers: githubHeaders() },
  )
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status} ${filePath}`)
  const data = (await res.json()) as { content?: string; encoding?: string }
  if (!data.content) return ''
  return Buffer.from(data.content, (data.encoding ?? 'base64') as BufferEncoding).toString('utf-8')
}

export async function githubGetDefaultBranch(): Promise<{ name: string; sha: string }> {
  const res = await fetch(
    `https://api.github.com/repos/${githubRepo()}`,
    { headers: githubHeaders() },
  )
  if (!res.ok) throw new Error(`GitHub repo fetch failed: ${res.status}`)
  const repo = (await res.json()) as { default_branch: string }
  const branchName = repo.default_branch

  const branchRes = await fetch(
    `https://api.github.com/repos/${githubRepo()}/branches/${branchName}`,
    { headers: githubHeaders() },
  )
  if (!branchRes.ok) throw new Error(`GitHub branch fetch failed: ${branchRes.status}`)
  const branch = (await branchRes.json()) as { commit: { sha: string } }
  return { name: branchName, sha: branch.commit.sha }
}

export async function githubCreateBranch(branchName: string, fromSha: string): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${githubRepo()}/git/refs`,
    {
      method: 'POST',
      headers: githubHeaders(),
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: fromSha }),
    },
  )
  if (!res.ok) throw new Error(`GitHub create branch failed: ${res.status}`)
}

export async function githubUpdateFile(
  filePath: string,
  content: string,
  commitMessage: string,
  branch: string,
): Promise<void> {
  // Get current file SHA to update it
  const fileRes = await fetch(
    `https://api.github.com/repos/${githubRepo()}/contents/${filePath}?ref=${branch}`,
    { headers: githubHeaders() },
  )

  let currentSha: string | undefined
  if (fileRes.ok) {
    const fileData = (await fileRes.json()) as { sha?: string }
    currentSha = fileData.sha
  }

  const body: Record<string, unknown> = {
    message: commitMessage,
    content: Buffer.from(content).toString('base64'),
    branch,
  }
  if (currentSha) body.sha = currentSha

  const res = await fetch(
    `https://api.github.com/repos/${githubRepo()}/contents/${filePath}`,
    { method: 'PUT', headers: githubHeaders(), body: JSON.stringify(body) },
  )
  if (!res.ok) throw new Error(`GitHub update file failed: ${res.status}`)
}

export async function githubCreatePR(
  title: string,
  body: string,
  head: string,
  base?: string,
  draft?: boolean,
): Promise<{ number: number; url: string }> {
  const { name: defaultBranch } = base ? { name: base } : await githubGetDefaultBranch()
  const res = await fetch(
    `https://api.github.com/repos/${githubRepo()}/pulls`,
    {
      method: 'POST',
      headers: githubHeaders(),
      body: JSON.stringify({ title, body, head, base: defaultBranch, draft: draft ?? false }),
    },
  )
  if (!res.ok) throw new Error(`GitHub create PR failed: ${res.status}`)
  const pr = (await res.json()) as { number: number; html_url: string }
  return { number: pr.number, url: pr.html_url }
}

export async function githubCreateIssue(
  title: string,
  body: string,
  labels?: string[],
): Promise<{ number: number; url: string }> {
  const res = await fetch(
    `https://api.github.com/repos/${githubRepo()}/issues`,
    {
      method: 'POST',
      headers: githubHeaders(),
      body: JSON.stringify({ title, body, labels: labels ?? ['agent-reported'] }),
    },
  )
  if (!res.ok) throw new Error(`GitHub create issue failed: ${res.status}`)
  const issue = (await res.json()) as { number: number; html_url: string }
  return { number: issue.number, url: issue.html_url }
}

export async function githubListIssues(state: 'open' | 'closed' | 'all' = 'open'): Promise<
  { number: number; title: string; url: string; labels: string[] }[]
> {
  const res = await fetch(
    `https://api.github.com/repos/${githubRepo()}/issues?state=${state}&per_page=20`,
    { headers: githubHeaders() },
  )
  if (!res.ok) return []
  type IssueRaw = { number: number; title: string; html_url: string; labels: { name: string }[]; pull_request?: unknown }
  const issues = (await res.json()) as IssueRaw[]
  return issues
    .filter(i => !i.pull_request)
    .map(i => ({ number: i.number, title: i.title, url: i.html_url, labels: i.labels.map(l => l.name) }))
}

// ── GitHub PR tracking in DB ───────────────────────────────────────────

export async function saveGithubPR(params: {
  prUrl: string
  prTitle: string
  branchName: string
  agentName: string
  triggerType: string
}): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('github_prs').insert({
      pr_url: params.prUrl,
      pr_title: params.prTitle,
      branch_name: params.branchName,
      agent_name: params.agentName,
      trigger_type: params.triggerType,
      status: 'pending_review',
    })
  } catch (err) {
    console.error('saveGithubPR failed (non-fatal):', err)
  }
}

// ── Sentry errors (via DB — Sentry webhook writes to agent_error_log) ──

export async function sentryGetRecentErrors(limit = 10): Promise<
  { type: string; file: string; count: number; severity: string }[]
> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('agent_error_log')
      .select('error_type, file_name, frequency, severity')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    type ErrRow = { error_type: string | null; file_name: string | null; frequency: number | null; severity: string | null }
    return (data ?? []).map((e: ErrRow) => ({
      type: e.error_type ?? 'unknown',
      file: e.file_name ?? '',
      count: e.frequency ?? 1,
      severity: e.severity ?? 'low',
    }))
  } catch {
    return []
  }
}
