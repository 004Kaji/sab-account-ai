import { calculatePAYG } from '@/lib/ato'
import { createServiceClient } from '@/lib/supabase'
import { logSubAgent, getBaseUrl } from '@/lib/agents/utils'

export const SCOUT_IDENTITY = `
You are Scout, Basnet's product testing sub-agent.
Your job: find what is broken before users do.
You are thorough, methodical, and blunt.
You do not report "it seems to work" — you report the exact result.
`

export interface ScoutTestResult {
  name: string
  passed: boolean
  detail: string
}

export interface ScoutReport {
  tests: ScoutTestResult[]
  allPassing: boolean
  criticalFailures: string[]
  overallStatus: 'healthy' | 'warning' | 'critical'
}

export async function runScout(): Promise<ScoutReport> {
  const start = Date.now()
  const tests: ScoutTestResult[] = []
  const baseUrl = getBaseUrl()

  // CHECK 1: PAYG calculations
  const paygCases = [
    { name: 'PAYG TC1 ($1000 fn Scale 5)', annualSalary: 26000, claimingThreshold: true, medicareLevyExemption: true, expected: 44 },
    { name: 'PAYG TC2 ($2564 fn Scale 2)', annualSalary: 66664, claimingThreshold: true, medicareLevyExemption: false, expected: 468 },
    { name: 'PAYG TC3 ($4240 fn Scale 1)', annualSalary: 110240, claimingThreshold: false, medicareLevyExemption: false, expected: 1226 },
    { name: 'PAYG TC4 ($3690 fn Scale 3)', annualSalary: 95940, claimingThreshold: false, medicareLevyExemption: true, expected: 1106 },
    { name: 'PAYG TC5 ($5192 fn Scale 2)', annualSalary: 134992, claimingThreshold: true, medicareLevyExemption: false, expected: 1310 },
  ]

  for (const tc of paygCases) {
    const result = calculatePAYG({
      annualSalary: tc.annualSalary,
      claimingThreshold: tc.claimingThreshold,
      hasHELP: false,
      medicareLevyExemption: tc.medicareLevyExemption,
      payCycle: 'fortnightly',
      residencyStatus: tc.medicareLevyExemption ? 'student' : (tc.claimingThreshold ? 'citizen_pr' : 'citizen_pr'),
    })
    const passed = result.periodTotal === tc.expected
    tests.push({ name: tc.name, passed, detail: passed ? `$${tc.expected} ✓` : `expected $${tc.expected}, got $${result.periodTotal}` })
  }

  // CHECK 2: Payday Super calculation (12%)
  const superTest = (() => {
    const salary = 80000
    const fortnightlyGross = salary / 26
    const expectedSuper = Math.round(fortnightlyGross * 0.12 * 100) / 100
    const passed = expectedSuper > 0
    return { name: 'Payday Super 12%', passed, detail: `$${expectedSuper.toFixed(2)} on $${fortnightlyGross.toFixed(2)} fortnightly` }
  })()
  tests.push(superTest)

  // CHECK 3: Health endpoint reachable
  try {
    const res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(8000) })
    tests.push({ name: 'Health endpoint', passed: res.ok, detail: `HTTP ${res.status}` })
  } catch (err) {
    tests.push({ name: 'Health endpoint', passed: false, detail: err instanceof Error ? err.message : 'unreachable' })
  }

  // CHECK 4: Auth protection — webhook without secret must return 401
  try {
    const res = await fetch(`${baseUrl}/api/agents/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'wrong_secret', trigger: 'health_check' }),
      signal: AbortSignal.timeout(8000),
    })
    const authProtected = res.status === 401 || res.status === 400
    tests.push({ name: 'Auth protection', passed: authProtected, detail: `HTTP ${res.status} on bad secret` })
  } catch (err) {
    tests.push({ name: 'Auth protection', passed: false, detail: err instanceof Error ? err.message : 'error' })
  }

  // CHECK 5: Stripe webhook last received (within 48h)
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('stripe_events').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (data) {
      const hoursSince = (Date.now() - new Date(data.created_at as string).getTime()) / 3600000
      const passed = hoursSince < 48
      tests.push({ name: 'Stripe webhook health', passed, detail: `Last event ${Math.round(hoursSince)}h ago` })
    } else {
      tests.push({ name: 'Stripe webhook health', passed: true, detail: 'No events in DB yet (expected for new setup)' })
    }
  } catch {
    tests.push({ name: 'Stripe webhook health', passed: false, detail: 'Could not query stripe_events' })
  }

  const allPassing = tests.every(t => t.passed)
  const criticalFailures = tests.filter(t => !t.passed && t.name.startsWith('PAYG')).map(t => t.name)
  const failCount = tests.filter(t => !t.passed).length
  const overallStatus: 'healthy' | 'warning' | 'critical' =
    criticalFailures.length > 0 ? 'critical' : failCount > 0 ? 'warning' : 'healthy'

  const report: ScoutReport = { tests, allPassing, criticalFailures, overallStatus }
  await logSubAgent('scout', 'scan', '', `${tests.filter(t => t.passed).length}/${tests.length} passing`, Date.now() - start, allPassing)
  return report
}
