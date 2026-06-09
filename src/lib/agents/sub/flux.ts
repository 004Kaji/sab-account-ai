import { calculatePAYG } from '@/lib/ato'
import { createServiceClient } from '@/lib/supabase'
import {
  callClaude, sendAlert, logSubAgent,
  githubReadFile, githubGetDefaultBranch, githubCreateBranch,
  githubUpdateFile, githubCreatePR, githubCreateIssue, sentryGetRecentErrors,
  saveGithubPR,
} from '@/lib/agents/toolkits/sab-tech-toolkit'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'

export const FLUX_IDENTITY = `
${BASNET_PERSONALITY}
You are Flux, Basnet's engineering sub-agent.
Job: code health, error diagnosis, PAYG verification.
Precise and technical. Never sugarcoat bugs.
`

export interface FluxReport {
  timestamp:    Date
  payg: {
    allPassing: boolean
    results:    { tc: string; expected: number; actual: number; pass: boolean }[]
  }
  sentry: {
    newErrors:  { type: string; file: string; count: number }[]
    hasUrgent:  boolean
  }
  stripe: {
    webhookHealthy:   boolean
    lastWebhookHours: number
  }
  supabase: {
    rlsEnabled: boolean
    tablesOk:   string[]
    tablesFail: string[]
  }
  overall: 'healthy' | 'warning' | 'critical'
}

function runPAYGTests(): FluxReport['payg'] {
  const cases = [
    { tc: 'TC1', annualSalary: 1000 * 26,  ct: true,  mle: true,  residency: 'student'    as const, expected: 44   },
    { tc: 'TC2', annualSalary: 2564 * 26,  ct: true,  mle: false, residency: 'citizen_pr' as const, expected: 468  },
    { tc: 'TC3', annualSalary: 4240 * 26,  ct: false, mle: false, residency: 'citizen_pr' as const, expected: 1226 },
    { tc: 'TC4', annualSalary: 3690 * 26,  ct: false, mle: true,  residency: 'citizen_pr' as const, expected: 1106 },
    { tc: 'TC5', annualSalary: 5192 * 26,  ct: true,  mle: false, residency: 'citizen_pr' as const, expected: 1310 },
  ]
  const results = cases.map(c => {
    const r = calculatePAYG({
      annualSalary: c.annualSalary,
      claimingThreshold: c.ct,
      hasHELP: false,
      medicareLevyExemption: c.mle,
      payCycle: 'fortnightly',
      residencyStatus: c.residency,
    })
    return { tc: c.tc, expected: c.expected, actual: r.periodTotal, pass: r.periodTotal === c.expected }
  })
  return { allPassing: results.every(r => r.pass), results }
}

export async function runFlux(): Promise<FluxReport> {
  const start = Date.now()
  const supabase = createServiceClient()
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Run all checks in parallel
  const [newErrR, spikesR, webhookR, rlsR] = await Promise.allSettled([
    supabase.from('agent_error_log').select('error_type, file_name, frequency')
      .eq('resolved', false).gte('created_at', thirtyMinsAgo).limit(20),
    supabase.from('agent_error_log').select('error_type, frequency')
      .eq('resolved', false).gte('frequency', 5).limit(10),
    supabase.from('stripe_events').select('created_at')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('invoices').select('id').limit(1),
  ])

  // PAYG tests
  const payg = runPAYGTests()

  // Sentry errors
  type ErrRow = { error_type: string | null; file_name: string | null; frequency: number | null }
  const newErrors = newErrR.status === 'fulfilled'
    ? (newErrR.value.data ?? []).map((e: ErrRow) => ({
        type: e.error_type ?? 'unknown',
        file: e.file_name ?? '',
        count: e.frequency ?? 1,
      }))
    : []
  const hasUrgent = spikesR.status === 'fulfilled' && (spikesR.value.data ?? []).length > 0

  // Stripe webhook health
  let webhookHealthy = true
  let lastWebhookHours = 0
  if (webhookR.status === 'fulfilled' && webhookR.value.data) {
    lastWebhookHours = (Date.now() - new Date(webhookR.value.data.created_at as string).getTime()) / 3600000
    webhookHealthy = lastWebhookHours < 24
  }

  // RLS check (if accessible via service role → OK)
  const rlsEnabled = rlsR.status === 'fulfilled' && !rlsR.value.error
  const tablesOk = rlsEnabled ? ['invoices'] : []
  const tablesFail = rlsEnabled ? [] : ['invoices']

  // Overall health
  let overall: FluxReport['overall'] = 'healthy'
  if (!payg.allPassing) overall = 'critical'
  else if (!webhookHealthy || hasUrgent || newErrors.length > 0) overall = 'warning'

  const report: FluxReport = {
    timestamp: new Date(),
    payg,
    sentry: { newErrors, hasUrgent },
    stripe: { webhookHealthy, lastWebhookHours },
    supabase: { rlsEnabled, tablesOk, tablesFail },
    overall,
  }

  // If PAYG critical — alert immediately
  if (!payg.allPassing) {
    const failing = payg.results.filter(r => !r.pass)
      .map(r => `${r.tc}: expected $${r.expected}, got $${r.actual}`)
      .join('\n')
    await sendAlert(
      'CRITICAL: PAYG calculation broken',
      `Failing tests:\n${failing}\n\nFix src/lib/ato.ts immediately.`,
      'urgent', 'flux',
    )
  }

  await logSubAgent('flux', 'scan', '', JSON.stringify({ overall, paygPassing: payg.allPassing }).slice(0, 200), Date.now() - start, overall !== 'critical')
  return report
}

export async function fluxDiagnose(errorMessage: string, fileName?: string): Promise<string> {
  try {
    const context = fileName ? `File: ${fileName}\nError: ${errorMessage}` : `Error: ${errorMessage}`
    const result = await callClaude({
      systemPrompt: FLUX_IDENTITY,
      userMessage: `${context}\n\nOne sentence: what caused this. One sentence: the fix. Maximum 2 sentences total.`,
      maxTokens: 150,
    })
    return result
  } catch {
    return `Error in ${fileName ?? 'unknown'}: ${errorMessage}. Check logs for stack trace.`
  }
}

// Day at dawning - used by basnet head agent via watcher
export function paygAllPassing(): boolean {
  return runPAYGTests().allPassing
}

// ── GitHub: audit code and create issue ───────────────────────────────

const KEY_FILES = [
  'src/lib/ato.ts',
  'src/app/api/stripe/webhooks/route.ts',
  'src/lib/supabase.ts',
  'src/app/api/agents/basnet/route.ts',
]

export async function fluxAuditCode(): Promise<{ issueUrl: string; findings: string }> {
  const start = Date.now()

  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
    return { issueUrl: '', findings: 'GitHub not configured — set GITHUB_TOKEN and GITHUB_REPO.' }
  }

  const fileContents = await Promise.allSettled(KEY_FILES.map(f => githubReadFile(f)))
  const codeContext = KEY_FILES
    .map((f, i) => {
      const r = fileContents[i]
      return r.status === 'fulfilled'
        ? `### ${f}\n\`\`\`typescript\n${r.value.slice(0, 1500)}\n\`\`\``
        : `### ${f}\n(failed to read)`
    })
    .join('\n\n')

  const errors = await sentryGetRecentErrors(5)
  const errorContext = errors.length
    ? errors.map(e => `- ${e.type} in ${e.file} (count: ${e.count}, severity: ${e.severity})`).join('\n')
    : 'No recent errors.'

  const findings = await callClaude({
    systemPrompt: `${FLUX_IDENTITY}
You are auditing the SAB Account AI codebase.
Focus on: security issues, PAYG calculation correctness, Stripe webhook safety, auth gaps.
Be concise. Use bullet points. Max 400 words.`,
    userMessage: `Code audit request.

Recent errors:
${errorContext}

Key files:
${codeContext}

Return a markdown audit report with:
1. Critical issues (if any)
2. Warnings
3. Recommended next action (one sentence)`,
    maxTokens: 600,
  })

  const issue = await githubCreateIssue(
    `[Flux] Code audit — ${new Date().toISOString().split('T')[0]}`,
    `${findings}\n\n---\n*Auto-generated by Flux agent*`,
    ['agent-reported', 'audit'],
  )

  await logSubAgent('flux', 'audit_code', '', findings.slice(0, 200), Date.now() - start, true)
  return { issueUrl: issue.url, findings }
}

// ── GitHub: propose a fix for a specific error ────────────────────────

export async function fluxProposeFix(params: {
  errorMessage: string
  filePath: string
}): Promise<{ prUrl: string; summary: string }> {
  const start = Date.now()

  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
    return { prUrl: '', summary: 'GitHub not configured — set GITHUB_TOKEN and GITHUB_REPO.' }
  }

  const [fileContent, defaultBranch] = await Promise.all([
    githubReadFile(params.filePath).catch(() => ''),
    githubGetDefaultBranch(),
  ])

  if (!fileContent) {
    return { prUrl: '', summary: `Could not read ${params.filePath} from GitHub.` }
  }

  const fix = await callClaude({
    systemPrompt: `${FLUX_IDENTITY}
You propose minimal, safe code fixes. Never break existing functionality.
Return ONLY valid JSON: { "summary": "one sentence", "fixedCode": "complete fixed file content" }`,
    userMessage: `Error: ${params.errorMessage}
File: ${params.filePath}

Current code:
\`\`\`typescript
${fileContent.slice(0, 3000)}
\`\`\`

Propose a minimal fix. Return the complete corrected file content.`,
    maxTokens: 2000,
    expectJson: true,
  })

  type FixJSON = { summary: string; fixedCode: string }
  let parsed: FixJSON
  try {
    parsed = JSON.parse(fix) as FixJSON
  } catch {
    return { prUrl: '', summary: 'Claude returned unparseable fix. Check logs.' }
  }

  const branchName = `flux/fix-${Date.now()}`
  await githubCreateBranch(branchName, defaultBranch.sha)
  await githubUpdateFile(
    params.filePath,
    parsed.fixedCode,
    `fix: ${parsed.summary} [Flux agent]`,
    branchName,
  )

  const pr = await githubCreatePR(
    `[Flux] ${parsed.summary}`,
    `## Auto-proposed fix\n\n**Error:** ${params.errorMessage}\n**File:** \`${params.filePath}\`\n\n**Summary:** ${parsed.summary}\n\n---\n*Proposed by Flux agent — review before merging*`,
    branchName,
  )

  await saveGithubPR({
    prUrl: pr.url,
    prTitle: `[Flux] ${parsed.summary}`,
    branchName,
    agentName: 'flux',
    triggerType: 'propose_fix',
  })

  await sendAlert(
    `Flux proposed fix: ${parsed.summary}`,
    `PR opened: ${pr.url}\nFile: ${params.filePath}\nError: ${params.errorMessage}`,
    'info', 'flux',
  )

  await logSubAgent('flux', 'propose_fix', params.errorMessage.slice(0, 100), parsed.summary, Date.now() - start, true)
  return { prUrl: pr.url, summary: parsed.summary }
}
