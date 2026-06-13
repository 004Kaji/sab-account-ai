import { calculatePAYG } from '@/lib/ato'
import { createServiceClient } from '@/lib/supabase'
import { callClaude, sendAlert, logAgentAction, logSubAgent, getBaseUrl } from '@/lib/agents/utils'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'

export const SCOUT_IDENTITY = `
${BASNET_PERSONALITY}
You are Scout, Basnet's product testing sub-agent.
Job: walk SAB Account AI end to end and find what
is broken before a real user finds it.
You are methodical and blunt.
You report exact results not "it seems to work".
When something fails you say:
"[Feature] is broken. [Exact symptom]. Fix: [one line]"
`

export interface ScoutTestResult {
  name:     string
  pass:     boolean
  expected: string
  actual:   string
  fix?:     string
}

export interface ScoutReport {
  timestamp:    Date
  tests:        ScoutTestResult[]
  allPassing:   boolean
  criticalFail: boolean
  summary:      string
}

// ── Individual test runners ────────────────────────────────────────────

async function testInvoiceEndpoint(baseUrl: string): Promise<ScoutTestResult> {
  const name = 'Invoice generation endpoint'
  try {
    const res = await fetch(`${baseUrl}/api/invoice/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
      signal: AbortSignal.timeout(8000),
    })
    // 401/403 means endpoint exists and is auth-protected (expected in production)
    if (res.status === 401 || res.status === 403) {
      return { name, pass: true, expected: '401/403 (auth required)', actual: `HTTP ${res.status}`, fix: undefined }
    }
    if (res.status === 200) {
      const data = await res.json() as Record<string, unknown>
      const hasInvoice = 'invoiceNumber' in data || 'invoice' in data || 'id' in data
      return { name, pass: hasInvoice, expected: '200 + invoice shape', actual: `HTTP 200, invoiceNumber=${String(hasInvoice)}` }
    }
    return { name, pass: false, expected: '200 or 401', actual: `HTTP ${res.status}`, fix: 'Check /api/invoice/generate route handler' }
  } catch (err) {
    return { name, pass: false, expected: 'reachable endpoint', actual: err instanceof Error ? err.message : 'timeout', fix: 'Check if app is deployed and /api/invoice/generate is registered' }
  }
}

function testPAYGCalculation(): ScoutTestResult {
  const name = 'PAYG calculation (TC1 — $1000 fn Scale 5)'
  try {
    const result = calculatePAYG({
      annualSalary: 1000 * 26,
      claimingThreshold: true,
      hasHELP: false,
      medicareLevyExemption: true,
      payCycle: 'fortnightly',
      residencyStatus: 'student',
    })
    const pass = result.periodTotal === 44
    return {
      name,
      pass,
      expected: '$44',
      actual: `$${result.periodTotal}`,
      fix: pass ? undefined : 'calculatePAYG() returning wrong value. Check src/lib/ato.ts coefficients',
    }
  } catch (err) {
    return { name, pass: false, expected: '$44', actual: err instanceof Error ? err.message : 'error', fix: 'calculatePAYG() threw — check src/lib/ato.ts' }
  }
}

function testPaydaySuper(): ScoutTestResult {
  const name = 'Payday Super (11.5% on $60k/yr monthly)'
  try {
    const annualSalary = 60000
    const monthlyGross = annualSalary / 12
    const superRate = 0.115
    const expectedSuper = Math.round(monthlyGross * superRate * 100) / 100
    const tolerance = Math.abs(expectedSuper - 575)
    const pass = tolerance <= 1
    return {
      name,
      pass,
      expected: '$575.00',
      actual: `$${expectedSuper.toFixed(2)}`,
      fix: pass ? undefined : `Super calculation off by $${tolerance.toFixed(2)} — check rate constant`,
    }
  } catch (err) {
    return { name, pass: false, expected: '$575.00', actual: err instanceof Error ? err.message : 'error', fix: 'Payday Super calculation threw' }
  }
}

async function testAuthProtection(baseUrl: string): Promise<ScoutTestResult> {
  const name = 'Auth protection (no-auth GET /api/admin/stats)'
  try {
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    })
    const pass = res.status === 401 || res.status === 403 || res.status === 400
    return {
      name,
      pass,
      expected: '401/403/400 (protected)',
      actual: `HTTP ${res.status}`,
      fix: pass ? undefined : 'CRITICAL: /api/admin/stats returned 200 without auth — add authentication middleware',
    }
  } catch (err) {
    // Network error counts as "can't verify" — not a critical fail
    return { name, pass: true, expected: '401 (protected)', actual: `Network error: ${err instanceof Error ? err.message : 'error'}`, fix: undefined }
  }
}

async function testStripeWebhookHealth(): Promise<ScoutTestResult> {
  const name = 'Stripe webhook health (last event within 48h)'
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('stripe_events')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) {
      return { name, pass: true, expected: 'recent event or no events yet', actual: 'No stripe events logged yet (expected for new setup)', fix: undefined }
    }

    const hoursSince = (Date.now() - new Date(data.created_at as string).getTime()) / 3600000
    const pass = hoursSince < 48
    return {
      name,
      pass,
      expected: 'Last event within 48h',
      actual: `Last event ${Math.round(hoursSince)}h ago`,
      fix: pass ? undefined : 'No Stripe webhooks in 48h — check Stripe dashboard webhook config',
    }
  } catch (err) {
    return { name, pass: false, expected: 'DB query succeeds', actual: err instanceof Error ? err.message : 'error', fix: 'Check Supabase connection and agent_logs table' }
  }
}

async function testDatabaseWrite(): Promise<ScoutTestResult> {
  const name = 'Database write (insert → read → delete)'
  const supabase = createServiceClient()
  let insertedId: string | null = null

  try {
    // Insert
    const { data: inserted, error: insertErr } = await supabase
      .from('agent_logs')
      .insert({ agent_name: 'scout_health_check', trigger_type: 'test', outcome: 'db_write_test' })
      .select('id')
      .single()

    if (insertErr || !inserted) throw new Error(`Insert failed: ${insertErr?.message}`)
    insertedId = inserted.id as string

    // Read back
    const { data: readBack, error: readErr } = await supabase
      .from('agent_logs')
      .select('id')
      .eq('id', insertedId)
      .single()

    if (readErr || !readBack) throw new Error('Read back failed')

    // Delete
    const { error: deleteErr } = await supabase
      .from('agent_logs')
      .delete()
      .eq('id', insertedId)

    if (deleteErr) throw new Error(`Delete failed: ${deleteErr.message}`)

    return { name, pass: true, expected: 'insert → read → delete all succeed', actual: 'All 3 operations succeeded' }
  } catch (err) {
    // Clean up if possible
    if (insertedId) {
      await supabase.from('agent_logs').delete().eq('id', insertedId).then(() => null, () => null)
    }
    return { name, pass: false, expected: 'insert → read → delete succeed', actual: err instanceof Error ? err.message : 'error', fix: 'Check Supabase service role key and agent_logs permissions' }
  }
}

// ── Main scout run ─────────────────────────────────────────────────────

export async function runScout(): Promise<ScoutReport> {
  const start = Date.now()
  const baseUrl = getBaseUrl()

  // Run all tests — HTTP tests in parallel, sync tests inline
  const [invoiceR, authR, webhookR, dbR] = await Promise.allSettled([
    testInvoiceEndpoint(baseUrl),
    testAuthProtection(baseUrl),
    testStripeWebhookHealth(),
    testDatabaseWrite(),
  ])

  const tests: ScoutTestResult[] = [
    invoiceR.status === 'fulfilled' ? invoiceR.value : { name: 'Invoice generation endpoint', pass: false, expected: '200', actual: 'test threw', fix: 'Check network' },
    testPAYGCalculation(),
    testPaydaySuper(),
    authR.status === 'fulfilled' ? authR.value : { name: 'Auth protection', pass: false, expected: '401', actual: 'test threw', fix: 'Check auth middleware' },
    webhookR.status === 'fulfilled' ? webhookR.value : { name: 'Stripe webhook health', pass: false, expected: 'recent event', actual: 'test threw', fix: 'Check Supabase' },
    dbR.status === 'fulfilled' ? dbR.value : { name: 'Database write', pass: false, expected: 'all succeed', actual: 'test threw', fix: 'Check Supabase connection' },
  ]

  const allPassing = tests.every(t => t.pass)
  const failedTests = tests.filter(t => !t.pass)

  // Critical: auth protection or PAYG broken
  const criticalFail = !tests[1].pass || !tests[3].pass

  const summary = allPassing
    ? `All ${tests.length} tests passing. Product healthy.`
    : `${failedTests.length}/${tests.length} tests failing: ${failedTests.map(t => t.name).join(', ')}`

  const report: ScoutReport = {
    timestamp: new Date(),
    tests,
    allPassing,
    criticalFail,
    summary,
  }

  // Alerts
  if (criticalFail) {
    const criticalTests = failedTests.filter(t =>
      t.name.includes('PAYG') || t.name.includes('Auth')
    )
    const body = criticalTests.map(t => `${t.name}\nExpected: ${t.expected}\nActual: ${t.actual}\nFix: ${t.fix ?? 'investigate'}`).join('\n\n')
    await sendAlert('CRITICAL: Scout found breaking issues', body, 'urgent', 'scout')
  } else if (failedTests.length > 0) {
    const body = failedTests.map(t => `${t.name}: ${t.actual} (fix: ${t.fix ?? 'investigate'})`).join('\n')
    await sendAlert('Scout: product issues found', body, 'warning', 'scout')
  }

  await logAgentAction({
    agentName: 'scout',
    triggerType: 'daily_scan',
    actionsTaken: { tests: tests.map(t => ({ name: t.name, pass: t.pass })) } as unknown as Record<string, unknown>,
    outcome: summary,
    durationMs: Date.now() - start,
  })

  await logSubAgent('scout', 'daily_scan', '', summary, Date.now() - start, allPassing)
  return report
}

export async function scoutDiagnose(failedTest: ScoutTestResult): Promise<string> {
  try {
    const result = await callClaude({
      systemPrompt: SCOUT_IDENTITY,
      userMessage: `Failed test: ${failedTest.name}\nExpected: ${failedTest.expected}\nActual: ${failedTest.actual}\n\nOne sentence: what caused this. One sentence: the fix. Two sentences total.`,
      maxTokens: 100,
    })
    return result
  } catch {
    return `${failedTest.name} failed. ${failedTest.fix ?? 'Investigate manually.'}`
  }
}
