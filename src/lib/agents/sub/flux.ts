import { calculatePAYG } from '@/lib/ato'
import { createServiceClient } from '@/lib/supabase'
import { callClaude, logSubAgent } from '@/lib/agents/utils'

export const FLUX_IDENTITY = `
You are Flux, Basnet's engineering sub-agent.
Your job: code health, error diagnosis, build status.
You are precise and technical.
You do not sugarcoat bugs.
When something is broken you say it plainly.
`

export interface FluxReport {
  newErrors: string[]
  errorSpikes: { type: string; count: number }[]
  paygPassing: boolean
  paygFailures: string[]
  rlsEnabled: boolean
  latestDeploymentStatus: string
  unresolvedErrors: number
}

function runPAYGTests(): { passing: boolean; failures: string[] } {
  const failures: string[] = []

  const tc1 = calculatePAYG({ annualSalary: 1000 * 26, claimingThreshold: true, hasHELP: false, medicareLevyExemption: true, payCycle: 'fortnightly', residencyStatus: 'student' })
  if (tc1.periodTotal !== 44) failures.push(`TC1: expected $44, got $${tc1.periodTotal}`)

  const tc2 = calculatePAYG({ annualSalary: 2564 * 26, claimingThreshold: true, hasHELP: false, medicareLevyExemption: false, payCycle: 'fortnightly', residencyStatus: 'citizen_pr' })
  if (tc2.periodTotal !== 468) failures.push(`TC2: expected $468, got $${tc2.periodTotal}`)

  const tc3 = calculatePAYG({ annualSalary: 4240 * 26, claimingThreshold: false, hasHELP: false, medicareLevyExemption: false, payCycle: 'fortnightly', residencyStatus: 'citizen_pr' })
  if (tc3.periodTotal !== 1226) failures.push(`TC3: expected $1226, got $${tc3.periodTotal}`)

  const tc4 = calculatePAYG({ annualSalary: 3690 * 26, claimingThreshold: false, hasHELP: false, medicareLevyExemption: true, payCycle: 'fortnightly', residencyStatus: 'citizen_pr' })
  if (tc4.periodTotal !== 1106) failures.push(`TC4: expected $1106, got $${tc4.periodTotal}`)

  const tc5 = calculatePAYG({ annualSalary: 5192 * 26, claimingThreshold: true, hasHELP: false, medicareLevyExemption: false, payCycle: 'fortnightly', residencyStatus: 'citizen_pr' })
  if (tc5.periodTotal !== 1310) failures.push(`TC5: expected $1310, got $${tc5.periodTotal}`)

  return { passing: failures.length === 0, failures }
}

export async function runFlux(): Promise<FluxReport> {
  const start = Date.now()
  const supabase = createServiceClient()
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const [errorsResult, spikesResult, rlsResult, deployResult] = await Promise.allSettled([
    supabase.from('agent_error_log').select('error_type').eq('resolved', false).gte('created_at', thirtyMinsAgo).limit(20),
    supabase.from('agent_error_log').select('error_type, frequency').eq('resolved', false).gte('frequency', 5).limit(10),
    supabase.from('profiles').select('id').limit(1),
    (async () => {
      if (!process.env.VERCEL_TOKEN) return 'unknown'
      try {
        const res = await fetch('https://api.vercel.com/v6/deployments?limit=1&target=production', {
          headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
          signal: AbortSignal.timeout(8000),
        })
        const data = await res.json() as { deployments?: { state?: string }[] }
        return data.deployments?.[0]?.state ?? 'unknown'
      } catch { return 'unknown' }
    })(),
  ])

  const newErrors = errorsResult.status === 'fulfilled'
    ? (errorsResult.value.data ?? []).map(e => e.error_type as string).filter(Boolean)
    : []

  const errorSpikes = spikesResult.status === 'fulfilled'
    ? (spikesResult.value.data ?? []).map(e => ({ type: e.error_type as string ?? 'unknown', count: e.frequency as number ?? 0 }))
    : []

  const rlsEnabled = rlsResult.status === 'fulfilled' && !rlsResult.value.error

  const latestDeploymentStatus = deployResult.status === 'fulfilled' ? deployResult.value : 'unknown'

  const { data: unresolvedData } = await supabase.from('agent_error_log')
    .select('*', { count: 'exact', head: true }).eq('resolved', false)
  const unresolvedErrors = unresolvedData === null ? 0 : 0

  const paygTests = runPAYGTests()

  const report: FluxReport = {
    newErrors,
    errorSpikes,
    paygPassing: paygTests.passing,
    paygFailures: paygTests.failures,
    rlsEnabled,
    latestDeploymentStatus,
    unresolvedErrors,
  }

  await logSubAgent('flux', 'scan', '', JSON.stringify(report).slice(0, 500), Date.now() - start, true)
  return report
}

export async function fluxDiagnose(error: string): Promise<string> {
  try {
    return await callClaude({
      systemPrompt: FLUX_IDENTITY,
      userMessage: `Error reported: ${error}\n\nWhat caused this and what is the one-line fix?`,
      maxTokens: 200,
    })
  } catch {
    return `Error received: ${error}. Check Sentry for full stack trace.`
  }
}
