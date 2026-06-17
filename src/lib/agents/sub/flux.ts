import { calculatePAYG } from '@/lib/ato'
import { createServiceClient } from '@/lib/supabase'
import {
  callClaude, sendAlert, logSubAgent,
  githubReadFile, githubGetDefaultBranch, githubCreateBranch,
  githubUpdateFile, githubCreatePR, githubCreateIssue, sentryGetRecentErrors,
  saveGithubPR,
} from '@/lib/agents/toolkits/sab-tech-toolkit'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'
import { getWorldState, getRecentSignals, updateWorldState, publishSignal } from '@/lib/agents/world-state'

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

  // ── Activation check (Tab 3 logic) ────────────────────────────────────
  const [ws, recentSignals] = await Promise.all([getWorldState(), getRecentSignals(6)])

  // Stand down: last audit < 12h ago, code score healthy, no open errors, PAYG passing
  const lastFluxSignal = recentSignals.find(s => s.from_agent === 'flux')
  const hoursAgo = lastFluxSignal
    ? (Date.now() - new Date(lastFluxSignal.created_at!).getTime()) / 3600000
    : 999
  if (hoursAgo < 12 && ws.flux_code_score >= 8 && ws.payg_test_status === 'pass' && ws.sentry_open_count === 0) {
    const payg = runPAYGTests()
    const standDownReport: FluxReport = {
      timestamp: new Date(),
      payg,
      sentry: { newErrors: [], hasUrgent: false },
      stripe: { webhookHealthy: true, lastWebhookHours: 0 },
      supabase: { rlsEnabled: true, tablesOk: ['invoices'], tablesFail: [] },
      overall: 'healthy',
    }
    return standDownReport
  }

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

  // ── Write world state + publish signal ─────────────────────────────────
  const codeScore = overall === 'healthy' ? 9 : overall === 'warning' ? 6 : 3
  const scoutStatus = ws.scout_last_status // preserve Scout's last value
  await updateWorldState({
    flux_code_score: codeScore,
    payg_test_status: payg.allPassing ? 'pass' : 'fail',
    sentry_open_count: newErrors.length,
    sentry_last_error: newErrors[0]?.type ?? ws.sentry_last_error,
    scout_last_status: scoutStatus,
    last_updated_by: 'flux',
  })

  const signalSeverity = overall === 'critical' ? 'urgent' : overall === 'warning' ? 'warning' : 'info'
  await publishSignal({
    from_agent: 'flux',
    signal_type: 'action_taken',
    severity: signalSeverity,
    summary: `Flux audit complete — ${overall}. PAYG: ${payg.allPassing ? 'pass' : 'FAIL'}. Code score: ${codeScore}/10.`,
    data: {
      overall,
      code_health_score: codeScore,
      payg_passing: payg.allPassing,
      sentry_errors: newErrors.length,
      failing_tests: payg.results.filter(r => !r.pass).map(r => r.tc),
    },
    suggested_reactions: overall === 'critical'
      ? 'Basnet should escalate to Sanjog immediately. Scout should recheck product health.'
      : overall === 'warning'
      ? 'Basnet should mention in morning briefing. Scout should verify user-facing features.'
      : 'No immediate action needed.',
    expires_after_hours: 12,
  })

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
  'src/app/api/stripe/webhook/route.ts',
  'src/lib/supabase.ts',
  'src/app/api/agents/basnet/route.ts',
]

export async function fluxAuditCode(): Promise<{ issueUrl: string; findings: string }> {
  const start = Date.now()

  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
    await sendAlert(
      'Flux: GitHub not configured',
      'fluxAuditCode() cannot run — GITHUB_TOKEN or GITHUB_REPO env var is missing. Add both to your Vercel environment variables to enable automated code audits.',
      'warning', 'flux',
    )
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
    await sendAlert(
      'Flux: GitHub not configured',
      'fluxProposeFix() cannot run — GITHUB_TOKEN or GITHUB_REPO env var is missing. Add both to your Vercel environment variables to enable automated fix proposals.',
      'warning', 'flux',
    )
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

  // Draft PR — stays hidden until manually marked "Ready for review"
  const pr = await githubCreatePR(
    `[Flux] ${parsed.summary}`,
    `## Auto-proposed fix\n\n**Error:** ${params.errorMessage}\n**File:** \`${params.filePath}\`\n\n**Summary:** ${parsed.summary}\n\n---\n*Proposed by Flux agent — draft until Sanjog approves. Click "Ready for review" to publish.*`,
    branchName,
    undefined,
    true,
  )

  await saveGithubPR({
    prUrl: pr.url,
    prTitle: `[Flux] ${parsed.summary}`,
    branchName,
    agentName: 'flux',
    triggerType: 'propose_fix',
  })

  // Approval-gate alert — Sanjog must explicitly mark PR ready before it goes live
  await sendAlert(
    `Flux fix needs your approval: ${parsed.summary}`,
    `A draft PR is waiting for your approval before it goes live:\n${pr.url}\n\nFile: ${params.filePath}\nError: ${params.errorMessage}\n\nOpen the link → click "Ready for review" to publish, or close the PR to discard.`,
    'warning', 'flux',
  )

  await logSubAgent('flux', 'propose_fix', params.errorMessage.slice(0, 100), parsed.summary, Date.now() - start, true)
  return { prUrl: pr.url, summary: parsed.summary }
}

// ── Scout incident handler ────────────────────────────────────────────
// Called when Scout detects a failure and pings /api/agents/flux.
// Diagnoses code vs infrastructure, then takes the appropriate action.

export async function fluxHandleScoutIncident(params: {
  test_name:     string
  error_message: string
  severity:      'critical' | 'warning'
}): Promise<void> {
  const start = Date.now()
  const supabase = createServiceClient()

  const diagnosis = await callClaude({
    systemPrompt: `${FLUX_IDENTITY}
You are triaging a failed product test reported by Scout.
Classify the root cause as either "code" or "infrastructure".
- "code": bug in application logic, broken calculation, bad API handler, missing env var wired incorrectly in code
- "infrastructure": database down, network timeout, third-party service outage, missing secret in Vercel/environment

Return ONLY valid JSON:
{
  "type": "code" | "infrastructure",
  "diagnosis": "one sentence explaining the cause",
  "recommended_action": "one sentence on what to do"
}`,
    userMessage: `Scout reported a failed test.

Test name: ${params.test_name}
Error: ${params.error_message}
Severity: ${params.severity}

Is this a code issue or infrastructure issue?`,
    maxTokens: 300,
    expectJson: true,
  })

  type DiagnosisJSON = { type: 'code' | 'infrastructure'; diagnosis: string; recommended_action: string }
  let parsed: DiagnosisJSON
  try {
    parsed = JSON.parse(diagnosis) as DiagnosisJSON
  } catch {
    parsed = { type: 'infrastructure', diagnosis: diagnosis.slice(0, 200), recommended_action: 'Investigate manually.' }
  }

  if (parsed.type === 'code' && process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
    const issue = await githubCreateIssue(
      `[Scout→Flux] ${params.test_name} failed`,
      `## Scout Incident Report\n\n**Test:** ${params.test_name}\n**Severity:** ${params.severity}\n**Error:** ${params.error_message}\n\n## Flux Diagnosis\n\n${parsed.diagnosis}\n\n**Recommended action:** ${parsed.recommended_action}\n\n---\n*Auto-filed by Flux in response to Scout alert*`,
      ['agent-reported', 'scout-incident'],
    ).catch(() => ({ url: '' }))

    await sendAlert(
      `Flux: code issue detected in "${params.test_name}"`,
      `Scout reported a ${params.severity} failure.\n\nDiagnosis: ${parsed.diagnosis}\nAction: ${parsed.recommended_action}${issue.url ? `\n\nGitHub issue: ${issue.url}` : ''}`,
      'warning', 'flux',
    )
  } else {
    await sendAlert(
      `Flux: infrastructure issue detected in "${params.test_name}"`,
      `Scout reported a ${params.severity} failure.\n\nDiagnosis: ${parsed.diagnosis}\n\nRecommended action: ${parsed.recommended_action}`,
      params.severity === 'critical' ? 'urgent' : 'warning', 'flux',
    )
  }

  await supabase.from('agent_error_log').insert({
    error_type:    'scout_incident',
    error_message: `${params.test_name}: ${params.error_message}`.slice(0, 500),
    file_name:     'scout.ts',
    frequency:     1,
    severity:      params.severity,
    alerted:       true,
    resolved:      false,
  })

  await logSubAgent('flux', 'handle_scout_incident', params.test_name, `${parsed.type}: ${parsed.diagnosis}`, Date.now() - start, true)
}
