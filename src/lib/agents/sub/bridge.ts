import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'
import { callClaude, sendAlert, logAgentAction, logSubAgent } from '@/lib/agents/utils'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'

export const BRIDGE_IDENTITY = `
${BASNET_PERSONALITY}
You are Bridge, Basnet's accountant partnership sub-agent.
Job: build genuine, lasting relationships with verified Australian tax practitioners.
Unlike broadcast outreach, every communication you write is hyper-personalised to the specific practitioner.
Lead with compliance urgency (Payday Super, July 1). Commission is a secondary mention.
Tone: colleague to colleague — one professional to another. Direct, specific, respectful.
Never use: "innovative", "cutting-edge", "excited to share", "I hope this finds you well".
`

// ── Types ──────────────────────────────────────────────────────────────

export interface BridgeReport {
  timestamp:        Date
  tpbFound:         number
  tpbAdded:         number
  states:           string[]
  emailsSent:       number
  referralReport: {
    accountantsActive:  number
    totalConversions:   number
    totalCommission:    number
    topReferrer:        string | null
  }
  digestSent:       boolean
  summary:          string
}

// ── State rotation ─────────────────────────────────────────────────────
// Bridge runs weekly. Each run covers 2-3 states so all 8 are visited
// over a 3-week cycle without hammering Tavily.

const AU_STATE_GROUPS = [
  ['NSW', 'VIC'],
  ['QLD', 'WA'],
  ['SA', 'TAS', 'NT', 'ACT'],
] as const

function currentStateGroup(): readonly string[] {
  const epochWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return AU_STATE_GROUPS[epochWeek % AU_STATE_GROUPS.length]
}

// ── Email-quality helpers (private to Bridge) ──────────────────────────
// Mirrors the filters in spark.ts — not exported there, so defined locally.

const GENERIC_EMAIL =
  /^(info|hello|contact|support|enquiries|admin|noreply|no-reply|sales|team|office|mail|reception|accounts|accounting)@/i

function isPersonalEmail(email: string): boolean {
  const atIdx = email.indexOf('@')
  if (atIdx < 0) return false
  const local  = email.slice(0, atIdx)
  const domain = email.slice(atIdx + 1)
  if (/gov\.au/i.test(domain)) return false
  if (/franchise|group/i.test(domain)) return false
  if (!/^[a-z]+([._-][a-z]+)?$/i.test(local)) return false
  if (local.length < 3) return false
  return true
}

// ── Private Tavily helpers ─────────────────────────────────────────────

async function tavilyExtract(url: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return ''
  try {
    const res = await fetch('https://api.tavily.com/extract', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ api_key: apiKey, urls: [url] }),
      signal:  AbortSignal.timeout(12000),
    })
    if (!res.ok) return ''
    type ExtractRes = { results?: Array<{ raw_content?: string }> }
    const data = await res.json() as ExtractRes
    return data.results?.[0]?.raw_content ?? ''
  } catch { return '' }
}

async function tavilySearchRaw(
  query: string,
  maxResults = 4,
): Promise<Array<{ url: string; title: string; content: string }>> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ api_key: apiKey, query, max_results: maxResults, search_depth: 'basic' }),
      signal:  AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    type Raw = { url?: string; title?: string; content?: string }
    const data = await res.json() as { results?: Raw[] }
    return (data.results ?? []).map((r: Raw) => ({
      url: r.url ?? '', title: r.title ?? '', content: r.content ?? '',
    }))
  } catch { return [] }
}

async function findEmailForPractitioner(
  name: string,
  businessName: string,
  suburb: string,
  state: string,
): Promise<string | null> {
  const EMAIL_RE = /[\w.+]+@[\w.-]+\.(com|com\.au|net\.au|org\.au|au)\b/gi
  const query = `"${name}" ${businessName ? `"${businessName}"` : ''} ${suburb} ${state} Australia accountant contact email`
  const results = await tavilySearchRaw(query, 4)

  for (const result of results) {
    const snippet = result.content + ' ' + result.title
    const emails = (snippet.match(EMAIL_RE) ?? []).map(e => e.toLowerCase())
    const found = emails.find(e => !GENERIC_EMAIL.test(e) && isPersonalEmail(e))
    if (found) return found

    // Try full-page extract as fallback
    const raw = await tavilyExtract(result.url)
    if (!raw) continue
    const extracted = (raw.match(EMAIL_RE) ?? []).map(e => e.toLowerCase())
    const fromPage = extracted.find(e => !GENERIC_EMAIL.test(e) && isPersonalEmail(e))
    if (fromPage) return fromPage
  }
  return null
}

// ── 1. bridgeFindTPBContacts ───────────────────────────────────────────
// Scrapes tpb.gov.au/public-register for the current week's state group.
// Stores verified practitioners in accountant_outreach as tpb_register.
// Only adds contacts not already in the table (deduped by email).

export async function bridgeFindTPBContacts(): Promise<{
  found:  number
  added:  number
  states: string[]
}> {
  const start    = Date.now()
  const supabase = createServiceClient()
  const apiKey   = process.env.TAVILY_API_KEY
  if (!apiKey) return { found: 0, added: 0, states: [] }

  const states = [...currentStateGroup()]

  type Practitioner = {
    name:             string
    businessName:     string
    suburb:           string
    state:            string
    registrationType: string
  }

  const practitioners: Practitioner[] = []
  const seenNames = new Set<string>()

  // Extract TPB register pages for each state × registration type
  const pages = states.flatMap(state => [
    { url: `https://www.tpb.gov.au/public-register?state=${state}&registration_type=bas_agent`,            type: 'BAS agent', state },
    { url: `https://www.tpb.gov.au/public-register?state=${state}&registration_type=registered_tax_agent`, type: 'tax agent', state },
  ])

  for (const page of pages) {
    const content = await tavilyExtract(page.url)
    if (!content || content.length < 200) continue

    try {
      const parsed = await callClaude({
        systemPrompt: `Extract practitioner records from TPB public register text. Return ONLY valid JSON — no markdown, no explanation.`,
        userMessage:  `From this TPB register page (${page.type}s in ${page.state}), extract all individual practitioner entries.
Return a JSON array: [{"name":"Full Name","businessName":"Practice Name or empty string","suburb":"Suburb or empty string"}]
Only include entries where a real person's full name is clearly shown.
Content: ${content.slice(0, 4000)}`,
        maxTokens: 1200,
        expectJson: true,
      })

      const list = JSON.parse(parsed) as Array<{ name: string; businessName: string; suburb: string }>
      for (const p of list) {
        if (!p.name || seenNames.has(p.name.toLowerCase())) continue
        seenNames.add(p.name.toLowerCase())
        practitioners.push({ ...p, state: page.state, registrationType: page.type })
      }
    } catch { /* skip unparseable page */ }
  }

  let added = 0

  for (const p of practitioners.slice(0, 15)) {
    try {
      const email = await findEmailForPractitioner(p.name, p.businessName, p.suburb, p.state)
      if (!email) continue

      // Skip if already in outreach table
      const { count } = await supabase
        .from('accountant_outreach')
        .select('id', { count: 'exact', head: true })
        .eq('email', email)
      if ((count ?? 0) > 0) continue

      await supabase.from('accountant_outreach').insert({
        name:          p.name,
        email,
        practice_type: p.registrationType,
        location:      [p.suburb, p.state].filter(Boolean).join(', '),
        status:        'pending',
        source:        'tpb_register',
      })
      added++
    } catch { /* skip individual failures */ }
  }

  await logSubAgent(
    'bridge', 'find_tpb_contacts', states.join(','),
    `Practitioners: ${practitioners.length}, added: ${added}`,
    Date.now() - start, added >= 0,
  )
  return { found: practitioners.length, added, states }
}

// ── 2. bridgePersonaliseOutreach ───────────────────────────────────────
// For each pending TPB contact, writes and sends a hyper-personalised
// first email. Marks emailed_at and sets up the follow-up schedule.
// Hard limit: 5 emails per run — depth over volume.

export async function bridgePersonaliseOutreach(): Promise<{ sent: number; names: string[] }> {
  const start    = Date.now()
  const supabase = createServiceClient()
  if (!process.env.RESEND_API_KEY) return { sent: 0, names: [] }

  const { data: targets } = await supabase
    .from('accountant_outreach')
    .select('id, name, email, practice_type, location, source')
    .eq('source', 'tpb_register')
    .eq('status', 'pending')
    .is('emailed_at', null)
    .order('created_at', { ascending: true })
    .limit(5)

  if (!targets?.length) return { sent: 0, names: [] }

  const resend   = new Resend(process.env.RESEND_API_KEY)
  const sent: string[] = []

  for (const contact of targets as Array<{
    id: string; name: string; email: string
    practice_type: string | null; location: string | null
  }>) {
    try {
      const suburb = contact.location?.split(',')[0]?.trim() ?? 'your area'
      const regType = contact.practice_type ?? 'tax agent'

      const emailRaw = await callClaude({
        systemPrompt: BRIDGE_IDENTITY,
        userMessage:  `Write a hyper-personalised partnership email to a verified ${regType} in ${contact.location ?? 'Australia'}.

Practitioner details:
- Name: ${contact.name}
- Registration type: ${regType}
- Location: ${contact.location ?? 'Australia'}
- Suburb: ${suburb}

Email rules:
- Subject line: personalised to them — reference their suburb or registration type, not generic
- Open with Payday Super July 1 compliance urgency — their clients need help NOW
- Mention SAB Account AI as a tool that makes compliance easy for their small business clients
- Reference 30% recurring commission as a secondary mention — one natural sentence
- Link to sabaccountai.com/partners for the partnership
- Signature: Sanjog Basnet, Founder, SAB Account AI, basnet@sabaccountai.com, 0415 304 090
- Under 120 words total
- Three short paragraphs max
- Sound like a real person writing one email — not a template

Return ONLY valid JSON: {"subject": "string", "body": "string"}`,
        maxTokens:  350,
        expectJson: true,
      })

      type EmailJSON = { subject: string; body: string }
      const emailJSON = JSON.parse(emailRaw) as EmailJSON

      const { error } = await resend.emails.send({
        from:    'Sanjog Basnet <basnet@sabaccountai.com>',
        to:      contact.email,
        subject: emailJSON.subject,
        text:    emailJSON.body,
        html:    `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;font-size:15px;line-height:1.7;color:#1f2937">${emailJSON.body.replace(/\n/g, '<br>')}</div>`,
      })

      if (error) { console.error('[bridge] send error:', error); continue }

      const followUpDue = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      await supabase
        .from('accountant_outreach')
        .update({
          emailed_at:     new Date().toISOString(),
          status:         'emailed',
          sequence_step:  1,
          follow_up_due:  followUpDue,
          email_subject:  emailJSON.subject,
        })
        .eq('id', contact.id)

      sent.push(contact.name)
    } catch { /* skip individual failures */ }
  }

  await logSubAgent('bridge', 'personalise_outreach', '', `Sent: ${sent.length}`, Date.now() - start, sent.length > 0)
  return { sent: sent.length, names: sent }
}

// ── 3. bridgeTrackReferrals ────────────────────────────────────────────
// Weekly referral report: which accountants drove signups,
// how much commission is owed. Saves to bridge_referral_reports.

export async function bridgeTrackReferrals(): Promise<{
  accountantsActive:  number
  totalConversions:   number
  totalCommission:    number
  topReferrer:        string | null
}> {
  const start    = Date.now()
  const supabase = createServiceClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const weekStart    = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Get all accountants who were emailed by Bridge or Spark
  const { data: emailedAccountants } = await supabase
    .from('accountant_outreach')
    .select('name, email')
    .not('emailed_at', 'is', null)
    .limit(200)

  if (!emailedAccountants?.length) {
    return { accountantsActive: 0, totalConversions: 0, totalCommission: 0, topReferrer: null }
  }

  const accountantEmails = emailedAccountants.map((a: { email: string }) => a.email)

  // Find profiles matching accountant emails
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, plan')
    .in('email', accountantEmails)

  if (!profiles?.length) {
    return { accountantsActive: 0, totalConversions: 0, totalCommission: 0, topReferrer: null }
  }

  const profileIds = profiles.map((p: { id: string }) => p.id)

  // Get this week's referral conversions for accountant-partners
  const { data: weekReferrals } = await supabase
    .from('referrals')
    .select('referrer_id, referred_email, status')
    .in('referrer_id', profileIds)
    .eq('status', 'converted')
    .gte('created_at', sevenDaysAgo)

  const conversionsByReferrer = new Map<string, number>()
  for (const r of (weekReferrals ?? []) as Array<{ referrer_id: string }>) {
    conversionsByReferrer.set(r.referrer_id, (conversionsByReferrer.get(r.referrer_id) ?? 0) + 1)
  }

  // Get referred users' plans to calculate accurate commission
  const referredEmails = (weekReferrals ?? []).map((r: { referred_email: string }) => r.referred_email)
  const { data: referredProfiles } = referredEmails.length
    ? await supabase.from('profiles').select('email, plan').in('email', referredEmails)
    : { data: [] }
  const planByEmail = new Map<string, string>()
  for (const p of (referredProfiles ?? []) as Array<{ email: string; plan: string }>) {
    planByEmail.set(p.email, p.plan)
  }

  const commissionRate = (plan: string): number =>
    plan === 'pro' ? 5.70 : 2.70  // 30% of $19 or $9

  let totalConversions = 0
  let totalCommission  = 0
  let topReferrer: string | null = null
  let topCount = 0

  type ProfileRow = { id: string; email: string; plan: string }

  // Build per-accountant rows and save to bridge_referral_reports
  for (const profile of profiles as ProfileRow[]) {
    const conversions = conversionsByReferrer.get(profile.id) ?? 0
    if (conversions === 0) continue

    const accountantName = emailedAccountants.find(
      (a: { email: string }) => a.email === profile.email
    )?.name ?? profile.email

    // Commission from this accountant's conversions this week
    const commission = (weekReferrals ?? [])
      .filter((r: { referrer_id: string }) => r.referrer_id === profile.id)
      .reduce((acc: number, r: { referred_email: string }) => {
        const plan = planByEmail.get(r.referred_email) ?? 'starter'
        return acc + commissionRate(plan)
      }, 0)

    totalConversions += conversions
    totalCommission  += commission

    if (conversions > topCount) {
      topCount = conversions
      topReferrer = accountantName
    }

    try {
      await supabase.from('bridge_referral_reports').insert({
        week_starting:    weekStart,
        accountant_email: profile.email,
        referral_count:   conversions,
        commission_owed:  Math.round(commission * 100) / 100,
        top_referrer:     topReferrer,
      })
    } catch { /* non-fatal */ }
  }

  const accountantsActive = conversionsByReferrer.size

  await logSubAgent(
    'bridge', 'track_referrals', '',
    `Active: ${accountantsActive}, conversions: ${totalConversions}, commission: $${totalCommission.toFixed(2)}`,
    Date.now() - start, true,
  )

  return { accountantsActive, totalConversions, totalCommission: Math.round(totalCommission * 100) / 100, topReferrer }
}

// ── 4. bridgeWeeklyDigest ──────────────────────────────────────────────
// Monday morning email to basnet@sabaccountai.com.au summarising
// the week's Bridge activity: new contacts, emails, referrals, commission.

export async function bridgeWeeklyDigest(report: BridgeReport): Promise<{ sent: boolean }> {
  if (!process.env.RESEND_API_KEY) return { sent: false }

  const { tpbFound, tpbAdded, states, emailsSent, referralReport } = report
  const { accountantsActive, totalConversions, totalCommission, topReferrer } = referralReport

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin-top:0">🤝 Bridge weekly report</h2>
  <p style="color:#6b7280;margin-top:-8px">Week ending ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

  <table style="width:100%;border-collapse:collapse;margin:20px 0">
    <tr style="background:#f9fafb">
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600">States scraped this week</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb">${states.join(', ') || '—'}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600">New TPB practitioners found</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb">${tpbFound}</td>
    </tr>
    <tr style="background:#f9fafb">
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600">New contacts added to queue</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb">${tpbAdded}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600">Personalised emails sent</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb">${emailsSent}</td>
    </tr>
    <tr style="background:#f9fafb">
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600">Accountants with referrals</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb">${accountantsActive}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600">New conversions this week</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb">${totalConversions}</td>
    </tr>
    <tr style="background:#f0fdf4">
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#166534">Commission owed this week</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:700;color:#166534">$${totalCommission.toFixed(2)}/month recurring</td>
    </tr>
    ${topReferrer ? `
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600">Top referrer this week</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb">⭐ ${topReferrer}</td>
    </tr>` : ''}
  </table>

  <p style="margin-top:24px">
    <a href="https://sabaccountai.com.au/dashboard" style="background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">
      View dashboard →
    </a>
  </p>

  <p style="color:#9ca3af;font-size:12px;margin-top:32px">SAB Account AI · Sent by Bridge agent every Monday</p>
</div>`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from:    'Basnet <basnet@sabaccountai.com>',
      to:      'basnet@sabaccountai.com.au',
      subject: `🤝 Bridge weekly — ${tpbAdded} new contacts, ${emailsSent} emails, $${totalCommission.toFixed(2)} commission`,
      html,
    })
    return { sent: true }
  } catch (err) {
    console.error('[bridge] digest send failed:', err)
    return { sent: false }
  }
}

// ── 5. runBridge ──────────────────────────────────────────────────────
// Main orchestrator. Runs all four functions in sequence,
// builds the weekly report, logs everything.

export async function runBridge(): Promise<BridgeReport> {
  const start    = Date.now()
  const supabase = createServiceClient()

  try {
    const [tpbResult, outreachResult] = await Promise.allSettled([
      bridgeFindTPBContacts(),
      bridgePersonaliseOutreach(),
    ])

    const tpb = tpbResult.status === 'fulfilled'
      ? tpbResult.value
      : { found: 0, added: 0, states: [] }

    const outreach = outreachResult.status === 'fulfilled'
      ? outreachResult.value
      : { sent: 0, names: [] }

    const referralReport = await bridgeTrackReferrals()

    const report: BridgeReport = {
      timestamp:     new Date(),
      tpbFound:      tpb.found,
      tpbAdded:      tpb.added,
      states:        [...tpb.states],
      emailsSent:    outreach.sent,
      referralReport,
      digestSent:    false,
      summary:       '',
    }

    const { sent: digestSent } = await bridgeWeeklyDigest(report)
    report.digestSent = digestSent

    report.summary = [
      `States: ${tpb.states.join(', ') || 'none'}.`,
      `TPB: ${tpb.found} found, ${tpb.added} new.`,
      `Emails: ${outreach.sent} personalised.`,
      `Referrals: ${referralReport.accountantsActive} active partners, ${referralReport.totalConversions} conversions, $${referralReport.totalCommission.toFixed(2)} commission.`,
      referralReport.topReferrer ? `Top: ${referralReport.topReferrer}.` : '',
    ].filter(Boolean).join(' ')

    await logAgentAction({
      agentName:    'bridge',
      triggerType:  'weekly_run',
      actionsTaken: {
        tpbFound:    tpb.found,
        tpbAdded:    tpb.added,
        emailsSent:  outreach.sent,
        conversions: referralReport.totalConversions,
        commission:  referralReport.totalCommission,
      } as unknown as Record<string, unknown>,
      outcome:   report.summary,
      durationMs: Date.now() - start,
    })

    await logSubAgent('bridge', 'weekly_run', '', report.summary, Date.now() - start, true)

    return report

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    try {
      await supabase.from('agent_error_log').insert({
        error_type:    'bridge_runtime_error',
        error_message: errorMessage.slice(0, 500),
        file_name:     'bridge.ts',
        frequency:     1,
        severity:      'warning',
        alerted:       false,
        resolved:      false,
      })
    } catch { /* best-effort */ }

    await sendAlert('Bridge: runtime error', errorMessage, 'warning', 'bridge').catch(() => {})

    return {
      timestamp:     new Date(),
      tpbFound:      0,
      tpbAdded:      0,
      states:        [],
      emailsSent:    0,
      referralReport: { accountantsActive: 0, totalConversions: 0, totalCommission: 0, topReferrer: null },
      digestSent:    false,
      summary:       `Bridge failed: ${errorMessage}`,
    }
  }
}
