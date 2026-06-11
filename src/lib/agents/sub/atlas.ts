import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { callClaude, sendAlert, logAgentAction, logSubAgent } from '@/lib/agents/utils'
import { tavilySearch } from '@/lib/agents/toolkits/sab-marketing-toolkit'
import { BASNET_PERSONALITY, applyPersonality } from '@/lib/agents/personality'
import { getWorldState, getRecentSignals, updateWorldState, publishSignal } from '@/lib/agents/world-state'

export const ATLAS_IDENTITY = `
${BASNET_PERSONALITY}
You are Atlas, Basnet's intelligence sub-agent.
Job: competitive monitoring, ATO law changes,
market signals, and web research on demand.
You give briefings not link dumps.
Cite source in one word: "ATO" "Xero" "Reddit".
Always end with: what this means for SAB Account AI.
`

export interface AtlasIntel {
  category:  'competitor' | 'ato' | 'market' | 'brand' | 'opportunity' | 'compliance'
  source:    string
  finding:   string
  relevance: string
  urgency:   'low' | 'medium' | 'high'
}

export interface AtlasSparkBrief {
  blog_topic:        string        // exact SEO blog title Spark should write
  blog_angle:        string        // why this topic matters RIGHT NOW
  social_hook:       string        // best hook line for social posts
  social_angle:      string        // what angle to take across all platforms
  campaign_idea:     string        // short campaign concept (1-2 sentences)
  campaign_urgency:  'low' | 'medium' | 'high'
  source_finding:    string        // the Atlas finding that triggered this brief
  auto_publish:      boolean       // true = Spark should publish without waiting
}

export interface AtlasReport {
  timestamp:  Date
  intel:      AtlasIntel[]
  summary:    string
  actionItem: string | null
}

// ── Claude with web_search tool ────────────────────────────────────────

async function callClaudeWithWebSearch(
  systemPrompt: string,
  userMessage:  string,
  maxTokens:    number = 1500,
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // web_search_20250305 is Anthropic's built-in search tool
  const tools = [{ type: 'web_search_20250305', name: 'web_search' }] as unknown as Anthropic.Tool[]

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system:     systemPrompt,
    tools,
    messages:   [{ role: 'user', content: userMessage }],
  })

  // Extract all text content blocks (Claude synthesises after searching)
  const textBlocks = response.content.filter(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  )
  return textBlocks.map(b => b.text).join('\n').trim()
}

// ── Weekly market intelligence ─────────────────────────────────────────

export async function atlasWeeklyIntel(): Promise<AtlasReport> {
  const start = Date.now()

  // ── Activation check (Tab 3 logic) ────────────────────────────────────
  const [ws, recentSignals] = await Promise.all([getWorldState(), getRecentSignals(24)])
  const lastAtlasSignal = recentSignals.find(s => s.from_agent === 'atlas')
  const hoursAgo = lastAtlasSignal
    ? (Date.now() - new Date(lastAtlasSignal.created_at!).getTime()) / 3600000
    : 999
  // Stand down: ran < 24h ago and no signup anomaly and no special conditions
  const july1Urgent = ws.july1_countdown > 0 && ws.july1_countdown <= 30
  const signupAnomaly = ws.signups_today < ws.signups_baseline * 0.5
  if (hoursAgo < 24 && !july1Urgent && !signupAnomaly) {
    return {
      timestamp: new Date(),
      intel: [],
      summary: `Stand down — last Atlas scan ${hoursAgo.toFixed(1)}h ago, no anomalies.`,
      actionItem: null,
    }
  }

  // Run 5 Tavily searches in parallel (same approach as sparkDraftSocialPosts)
  const month = new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  const [xeroR, atoR, fairWorkR, superR, marketR] = await Promise.allSettled([
    tavilySearch(`Xero OR MYOB Australia pricing feature update ${month}`, { maxResults: 3, includeAnswer: true }),
    tavilySearch(`site:ato.gov.au payroll tax super BAS update ${new Date().getFullYear()}`, { maxResults: 3, includeAnswer: true }),
    tavilySearch(`site:fairwork.gov.au minimum wage payslip casual loading ${new Date().getFullYear()}`, { maxResults: 3, includeAnswer: true }),
    tavilySearch(`Australia super guarantee rate payday super update ${new Date().getFullYear()}`, { maxResults: 3, includeAnswer: true }),
    tavilySearch(`Australian small business accounting invoicing payroll news ${month}`, { maxResults: 3, includeAnswer: true }),
  ])

  const searchContext = [
    xeroR.status    === 'fulfilled' && xeroR.value.answer    ? `COMPETITOR: ${xeroR.value.answer}`    : '',
    atoR.status     === 'fulfilled' && atoR.value.answer     ? `ATO: ${atoR.value.answer}`             : '',
    fairWorkR.status=== 'fulfilled' && fairWorkR.value.answer? `FAIR WORK: ${fairWorkR.value.answer}`  : '',
    superR.status   === 'fulfilled' && superR.value.answer   ? `SUPER: ${superR.value.answer}`         : '',
    marketR.status  === 'fulfilled' && marketR.value.answer  ? `MARKET: ${marketR.value.answer}`       : '',
  ].filter(Boolean).join('\n\n')

  const raw = await callClaude({
    systemPrompt: ATLAS_IDENTITY,
    userMessage: `You have just received live intelligence from web searches. Analyse and return findings as JSON.

LIVE SEARCH RESULTS:
${searchContext || 'No search results available this run.'}

Return ONLY valid JSON (no markdown, no preamble):
{"intel":[{"category":"competitor|ato|market|brand|opportunity|compliance","source":"ATO|FairWork|Treasury|Xero|MYOB|Reddit|News","finding":"what changed or was announced","relevance":"why it matters for SAB Account AI","urgency":"low|medium|high"}],"summary":"3 sentences max","actionItem":"one sentence or null"}

Rules:
- Only include REAL findings from the search results above
- Mark urgency "high" if it affects: payroll calculations, super rates, BAS dates, payslip requirements, minimum wage
- If no findings, return: {"intel":[],"summary":"No significant changes found this week.","actionItem":null}`,
    maxTokens: 1500,
    expectJson: true,
  })

  type RawReport = { intel?: AtlasIntel[]; summary?: string; actionItem?: string | null }
  let parsed: RawReport = { intel: [], summary: '', actionItem: null }
  const tryParseJson = (text: string): RawReport | null => {
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s === -1 || e === -1) return null
    try { return JSON.parse(text.slice(s, e + 1)) as RawReport } catch { return null }
  }

  parsed = tryParseJson(raw) ?? {}
  if (!parsed.intel) {
    // Claude returned natural language — ask it to reformat as JSON
    const reformatted = await callClaude({
      systemPrompt: 'You extract structured data from text and return ONLY valid JSON. No explanation, no markdown.',
      userMessage: `Extract all findings from this research text and return ONLY this JSON (no markdown, no preamble):
{"intel":[{"category":"competitor|ato|market|brand|opportunity|compliance","source":"ATO|FairWork|Treasury|Xero|MYOB|Reddit|News","finding":"what changed","relevance":"why it matters for SAB Account AI","urgency":"low|medium|high"}],"summary":"3 sentences max","actionItem":"one sentence or null"}

RESEARCH TEXT:
${raw.slice(0, 3000)}`,
      maxTokens: 1500,
      expectJson: true,
    })
    parsed = tryParseJson(reformatted) ?? {
      intel: [],
      summary: raw.slice(0, 200),
      actionItem: null,
    }
  }

  const report: AtlasReport = {
    timestamp:  new Date(),
    intel:      parsed.intel ?? [],
    summary:    parsed.summary ?? 'No summary generated.',
    actionItem: parsed.actionItem ?? null,
  }

  // One digest email for all high-urgency findings
  const highUrgency = report.intel.filter(i => i.urgency === 'high')
  if (highUrgency.length > 0) {
    const body = highUrgency.map((item, i) =>
      `${i + 1}. [${item.source}] ${item.finding}\n   → ${item.relevance}`
    ).join('\n\n')
    await sendAlert(
      `Atlas: ${highUrgency.length} urgent signal${highUrgency.length > 1 ? 's' : ''} this week`,
      `${body}\n\nSummary: ${report.summary}`,
      'warning',
      'atlas',
    )
  }

  await logAgentAction({
    agentName:    'atlas',
    triggerType:  'weekly_intel',
    actionsTaken: { intelCount: report.intel.length, highUrgency: highUrgency.length } as unknown as Record<string, unknown>,
    outcome:      report.summary.slice(0, 200),
    durationMs:   Date.now() - start,
  })

  await logSubAgent('atlas', 'weekly_intel', '', report.summary.slice(0, 200), Date.now() - start, true)

  // ── Write world state + publish signal ─────────────────────────────────
  const topFinding = report.intel.find(i => i.urgency === 'high') ?? report.intel[0]
  await updateWorldState({
    atlas_last_finding: topFinding?.finding.slice(0, 200) ?? report.summary.slice(0, 200),
    atlas_last_run: new Date().toISOString(),
    last_updated_by: 'atlas',
  })

  if (report.intel.length > 0) {
    const severity = highUrgency.length > 0 ? 'warning' : 'info'
    await publishSignal({
      from_agent: 'atlas',
      signal_type: 'finding',
      severity,
      summary: report.summary.slice(0, 200),
      data: {
        intel_count: report.intel.length,
        high_urgency: highUrgency.length,
        top_finding: topFinding?.finding ?? '',
        action_item: report.actionItem ?? '',
      },
      suggested_reactions: highUrgency.length > 0
        ? 'Spark should generate counter-positioning content. Basnet should elevate acquisition priority.'
        : report.actionItem
        ? `Spark: ${report.actionItem}`
        : 'No immediate action needed.',
      expires_after_hours: 168,
    })

    // Generate Spark brief from findings and auto-trigger if high urgency
    const sparkBrief = await atlasGenerateSparkBrief(report.intel, report.summary)
    if (sparkBrief?.auto_publish) {
      await autoTriggerSpark(sparkBrief)
    }
  }

  return report
}

// ── Compliance watch — ATO, Fair Work, Treasury, legislation ──────────

export async function atlasComplianceWatch(): Promise<{ findings: AtlasIntel[]; summary: string }> {
  const start = Date.now()

  // 4 parallel Tavily searches targeting Australian regulatory sources
  const yr = new Date().getFullYear()
  const [atoR, fairWorkR, superR, treasuryR] = await Promise.allSettled([
    tavilySearch(`site:ato.gov.au BAS dates PAYG withholding super guarantee rate ${yr}`, { maxResults: 4, includeAnswer: true }),
    tavilySearch(`site:fairwork.gov.au minimum wage payslip casual loading leave entitlements ${yr}`, { maxResults: 4, includeAnswer: true }),
    tavilySearch(`Australia super guarantee rate increase payday super ${yr}`, { maxResults: 4, includeAnswer: true }),
    tavilySearch(`Australia treasury budget small business payroll tax compliance announcement ${yr}`, { maxResults: 3, includeAnswer: true }),
  ])

  const complianceContext = [
    atoR.status      === 'fulfilled' && atoR.value.answer      ? `ATO: ${atoR.value.answer}`          : '',
    fairWorkR.status === 'fulfilled' && fairWorkR.value.answer  ? `FAIR WORK: ${fairWorkR.value.answer}`: '',
    superR.status    === 'fulfilled' && superR.value.answer     ? `SUPER: ${superR.value.answer}`       : '',
    treasuryR.status === 'fulfilled' && treasuryR.value.answer  ? `TREASURY: ${treasuryR.value.answer}` : '',
  ].filter(Boolean).join('\n\n')

  type RawCompliance = { findings?: AtlasIntel[]; summary?: string }
  const tryParseCompliance = (text: string): RawCompliance | null => {
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s === -1 || e === -1) return null
    try { return JSON.parse(text.slice(s, e + 1)) as RawCompliance } catch { return null }
  }

  const complianceRaw = await callClaude({
    systemPrompt: ATLAS_IDENTITY,
    userMessage: `Analyse these live search results and return compliance findings as JSON.

LIVE SEARCH RESULTS:
${complianceContext || 'No search results available.'}

Return ONLY valid JSON (no markdown, no preamble):
{"findings":[{"category":"ato|compliance|super|fairwork|legislation","source":"ATO|FairWork|Treasury|Legislation","finding":"exact change or announcement with effective date if known","relevance":"how this affects SAB Account AI product or users","urgency":"low|medium|high"}],"summary":"2-3 sentences on the most important compliance changes"}

Rules:
- Only include REAL findings from the search results above
- Mark HIGH urgency if it affects: super rates, BAS dates, minimum wage, payslip requirements, PAYG calculations
- If nothing material found: {"findings":[],"summary":"No new compliance changes detected this watch."}`,
    maxTokens: 1200,
    expectJson: true,
  })

  const parsed: RawCompliance = tryParseCompliance(complianceRaw) ?? { findings: [], summary: complianceContext.slice(0, 200) }

  const findings = parsed.findings ?? []
  const summary  = parsed.summary ?? 'No compliance changes detected.'

  // One digest email for all compliance findings
  const urgent = findings.filter(f => f.urgency === 'high')
  if (findings.length > 0) {
    const urgentLines = urgent.map((f, i) =>
      `${i + 1}. [${f.source}] ${f.finding}\n   → ${f.relevance}`
    ).join('\n\n')
    const medLow = findings.filter(f => f.urgency !== 'high')
    const medLowLines = medLow.length > 0
      ? `\n\nOther findings:\n${medLow.map(f => `• [${f.source}] ${f.finding}`).join('\n')}`
      : ''
    await sendAlert(
      urgent.length > 0
        ? `⚠️ ${urgent.length} urgent compliance change${urgent.length > 1 ? 's' : ''} — action needed`
        : `Atlas compliance watch — ${findings.length} finding${findings.length > 1 ? 's' : ''}`,
      `${urgentLines}${medLowLines}\n\nSummary: ${summary}`,
      urgent.length > 0 ? 'urgent' : 'info',
      'atlas',
    )
  }

  if (findings.length > 0) {
    await publishSignal({
      from_agent:   'atlas',
      signal_type:  'finding',
      severity:     urgent.length > 0 ? 'urgent' : 'info',
      summary:      `Compliance watch: ${summary.slice(0, 150)}`,
      data:         { findings_count: findings.length, urgent_count: urgent.length, findings },
      suggested_reactions: urgent.length > 0
        ? 'Basnet must review immediately. Spark should update blog content if rules changed. Check if SAB Account AI calculations need updating.'
        : 'Review in next morning briefing.',
      expires_after_hours: 168,
    })

    // Generate Spark brief from compliance findings — always auto-publish on urgent
    const sparkBrief = await atlasGenerateSparkBrief(
      findings.map(f => ({ ...f, category: 'compliance' as const })),
      summary,
    )
    if (sparkBrief?.auto_publish) {
      await autoTriggerSpark(sparkBrief)
    }
  }

  await logSubAgent('atlas', 'compliance_watch', '', summary.slice(0, 200), Date.now() - start, true)
  return { findings, summary }
}

// ── On-demand research ─────────────────────────────────────────────────

export async function atlasResearch(query: string): Promise<string> {
  const start = Date.now()

  const result = await callClaudeWithWebSearch(
    ATLAS_IDENTITY,
    `${query}\n\nReturn 3 sentences. End with: what this means for SAB Account AI.`,
    400,
  ).catch(async () => {
    // Fallback without web search
    return await callClaude({
      systemPrompt: ATLAS_IDENTITY,
      userMessage:  `${query}\n\nReturn 3 sentences from knowledge. End with: what this means for SAB Account AI.`,
      maxTokens:    300,
    })
  })

  const answer = applyPersonality(result)

  try {
    const supabase = createServiceClient()
    await supabase.from('agent_conversations').insert({
      agent_name: 'atlas',
      question:   query,
      answer:     answer.slice(0, 1000),
      context_used: { type: 'on_demand_research' },
    })
  } catch { /* non-fatal */ }

  await logSubAgent('atlas', 'research', query.slice(0, 100), answer.slice(0, 200), Date.now() - start, true)
  return answer
}

// ── Auto-trigger Spark when Atlas finds high-urgency content ───────────
// Fire-and-forget: POSTs to the SAB API as a separate Vercel function
// invocation so Atlas doesn't wait for Spark's 2-3 min blog generation.

async function autoTriggerSpark(brief: AtlasSparkBrief): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://sabaccountai.com'

    // Fire both triggers without awaiting — separate Vercel function invocations
    fetch(`${baseUrl}/api/agents/sab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger: 'marketing_run',
        data: {
          marketingTrigger: 'write_blog_post',
          topic: brief.blog_topic,
          angle: brief.blog_angle,
          atlasBrief: true,
        },
      }),
    }).catch(() => {})

    fetch(`${baseUrl}/api/agents/sab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger: 'marketing_run',
        data: {
          marketingTrigger: 'draft_social_posts',
          topicOverride: brief.social_angle,
          hookOverride:  brief.social_hook,
          atlasBrief: true,
        },
      }),
    }).catch(() => {})

    await sendAlert(
      'Atlas auto-triggered Spark',
      `High-urgency compliance finding. Spark is writing:\n• Blog: "${brief.blog_topic}"\n• Social posts (4 platforms)\n\nSource: ${brief.source_finding}`,
      'info',
      'atlas',
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await sendAlert('Atlas auto-trigger failed', msg, 'warning', 'atlas').catch(() => {})
  }
}

// ── Atlas → Spark intelligence brief ──────────────────────────────────
// Called after every scan. Produces a structured brief that Spark reads
// before choosing blog topics, social hooks, or campaign angles.

export async function atlasGenerateSparkBrief(
  findings: AtlasIntel[],
  contextSummary: string,
): Promise<AtlasSparkBrief | null> {
  if (findings.length === 0) return null

  const topFindings = findings
    .sort((a, b) => (b.urgency === 'high' ? 1 : 0) - (a.urgency === 'high' ? 1 : 0))
    .slice(0, 5)

  const highUrgency = findings.filter(f => f.urgency === 'high')

  const raw = await callClaude({
    systemPrompt: `${ATLAS_IDENTITY}
You are generating a content brief for Spark (SAB Account AI's marketing sub-agent).
Spark will use this brief to write a blog post, draft social media posts, and plan a marketing campaign.
The brief must be grounded in REAL findings — no generic advice.`,
    userMessage: `Based on these intelligence findings, generate a content brief for Spark.

FINDINGS:
${topFindings.map((f, i) => `${i + 1}. [${f.urgency.toUpperCase()}] ${f.source}: ${f.finding}\n   Why it matters: ${f.relevance}`).join('\n')}

CONTEXT: ${contextSummary}

Generate a JSON brief (no markdown):
{
  "blog_topic": "exact SEO blog title — specific, timely, 8-12 words, includes Australian context",
  "blog_angle": "1-2 sentences: why this topic is urgent RIGHT NOW for Australian small businesses",
  "social_hook": "first line of a social post — must be provocative or surprising, under 20 words",
  "social_angle": "the core message across all platforms — what do we want Australian SMBs to feel or do",
  "campaign_idea": "1-2 sentence campaign concept tying blog + social + CTA (try it free → sabaccountai.com)",
  "campaign_urgency": "low|medium|high",
  "source_finding": "the single most important finding that drives this brief",
  "auto_publish": ${highUrgency.length > 0 ? 'true' : 'false'}
}`,
    maxTokens: 600,
    expectJson: true,
  })

  try {
    const s = raw.indexOf('{')
    const e = raw.lastIndexOf('}')
    if (s === -1 || e === -1) throw new Error('no JSON object found')
    const brief = JSON.parse(raw.slice(s, e + 1)) as AtlasSparkBrief

    // Publish as a recommendation signal so Spark can read it
    await publishSignal({
      from_agent:    'atlas',
      signal_type:   'recommendation',
      severity:      brief.campaign_urgency === 'high' ? 'urgent' : brief.campaign_urgency === 'medium' ? 'warning' : 'info',
      summary:       `Spark brief: ${brief.blog_topic}`,
      data:          brief as unknown as Record<string, unknown>,
      suggested_reactions: brief.auto_publish
        ? 'Spark: auto-publish blog post and social posts based on this brief immediately.'
        : 'Spark: use this brief as topic/hook guidance for next blog and social posts.',
      expires_after_hours: 168,
    })

    return brief
  } catch {
    return null
  }
}

// ── Brand monitoring ───────────────────────────────────────────────────

export async function atlasMonitorBrand(): Promise<void> {
  const start = Date.now()

  const result = await callClaudeWithWebSearch(
    ATLAS_IDENTITY,
    `Search for "SAB Account AI" mentions online.
Report any reviews, social posts, forum mentions, or news.
Classify sentiment as positive/neutral/negative.
If no mentions found: say "No new brand mentions found."
Return 2-3 sentences.`,
    400,
  ).catch(async () => {
    return await callClaude({
      systemPrompt: ATLAS_IDENTITY,
      userMessage:  'SAB Account AI brand monitor — no web search available this run.',
      maxTokens:    100,
    })
  })

  const hasNegative = result.toLowerCase().includes('negative') ||
    result.toLowerCase().includes('complaint') ||
    result.toLowerCase().includes('poor')

  const hasMentions = !result.toLowerCase().includes('no new brand mentions')

  if (hasMentions) {
    await sendAlert(
      'Brand mention found',
      result,
      hasNegative ? 'warning' : 'info',
      'atlas',
    )
  }

  await logAgentAction({
    agentName:   'atlas',
    triggerType: 'brand_monitor',
    outcome:     result.slice(0, 200),
    durationMs:  Date.now() - start,
  })
}
