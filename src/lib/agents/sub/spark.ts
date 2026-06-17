import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'
import {
  callClaude, logSubAgent, readMasterContext, readAgentLearnings, sendAlert,
  tavilySearch, saveApprovalDraft, updateApprovalStatus,
  twitterPost, linkedinPost, instagramPost,
  type SocialPlatform,
} from '@/lib/agents/toolkits/sab-marketing-toolkit'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'
import { getWorldState, getRecentSignals, updateWorldState, publishSignal } from '@/lib/agents/world-state'

// ── Spark mode detection (Tab 3) ──────────────────────────────────────
type SparkMode = 'ACQUISITION' | 'RETENTION' | 'COUNTER_POSITIONING' | 'URGENCY'

async function detectSparkMode(): Promise<{ mode: SparkMode; reason: string }> {
  const [ws, signals] = await Promise.all([getWorldState(), getRecentSignals(168)])
  const july1 = ws.july1_countdown

  if (july1 > 0 && july1 <= 14) {
    return { mode: 'URGENCY', reason: `July 1 Payday Super deadline in ${july1} days — shift all content` }
  }
  const competitorSignal = signals.find(
    s => s.from_agent === 'atlas' && (s.data?.high_urgency as number) > 0
  )
  if (competitorSignal) {
    return { mode: 'COUNTER_POSITIONING', reason: `Atlas flagged competitor threat: ${competitorSignal.summary}` }
  }
  if (ws.churn_risk_score >= 6) {
    return { mode: 'RETENTION', reason: `Churn risk score is ${ws.churn_risk_score}/10 — retention over acquisition` }
  }
  const urgentLiftSignal = signals.find(
    s => s.from_agent === 'lift' && s.severity === 'urgent' &&
    (Date.now() - new Date(s.created_at!).getTime()) < 24 * 3600 * 1000
  )
  if (urgentLiftSignal) {
    return { mode: 'RETENTION', reason: `Lift urgent signal: ${urgentLiftSignal.summary}` }
  }
  return { mode: 'ACQUISITION', reason: 'No retention or competitor signals — default acquisition mode' }
}

export const SPARK_IDENTITY = `
${BASNET_PERSONALITY}
You are Spark, Basnet's marketing sub-agent.
Job: content strategy, accountant outreach, growth.
You know Sanjog's 14hr/week budget.
Never suggest more than 3 content pieces per week.
Always tie content to real SAB metrics.
`

export interface SparkBrief {
  weekFocus:            string
  blogTitle:            string
  blogOutline:          string[]
  tiktokHook1:          string
  tiktokHook2:          string
  facebookPostAngle:    string
  accountantEmailAngle: string
  urgentFlag:           boolean
  urgentReason?:        string
}

export async function sparkWeeklyBrief(metrics: {
  newSignups:      number
  mrr:             number
  mrrChange:       number
  topBlogPost?:    string
  churnThisWeek:   number
  liftAtRiskCount?: number
  atlasIntel?:     string
}): Promise<SparkBrief> {
  const start = Date.now()
  const supabase = createServiceClient()

  // ── Mode detection (Tab 3) ─────────────────────────────────────────────
  const { mode, reason: modeReason } = await detectSparkMode()

  // Read master context and last 3 weeks of content briefs in parallel
  const [masterCtx, lastBriefsR] = await Promise.allSettled([
    readMasterContext(),
    supabase.from('content_briefs').select('week_start, focus_this_week, blog_post_title')
      .order('week_start', { ascending: false }).limit(3),
  ])

  const master = masterCtx.status === 'fulfilled' ? masterCtx.value.slice(0, 1500) : ''
  const lastBriefs = lastBriefsR.status === 'fulfilled' ? (lastBriefsR.value.data ?? []) : []

  // Check Payday Super — 28 Jul 2026 deadline
  const paydaySuperDeadline = new Date('2026-07-28')
  const daysToPaydaySuper = Math.ceil((paydaySuperDeadline.getTime() - Date.now()) / 86400000)
  const paydaySuperUrgent = daysToPaydaySuper > 0 && daysToPaydaySuper <= 30

  const modeInstruction =
    mode === 'URGENCY'
      ? `\n\nMODE: URGENCY — July 1 Payday Super deadline is imminent. ALL content must focus on Payday Super. Every channel. Every angle. This is a product launch moment.`
      : mode === 'RETENTION'
      ? `\n\nMODE: RETENTION — Churn risk is elevated. Shift all content toward value reinforcement: why SAB Account AI saves time, success stories, feature reminders. Do NOT push new acquisition campaigns.`
      : mode === 'COUNTER_POSITIONING'
      ? `\n\nMODE: COUNTER-POSITIONING — A competitor threat has been detected. Generate one counter-narrative piece immediately. Use the competitor's move as the hook and position SAB Account AI as the better alternative.`
      : `\n\nMODE: ACQUISITION — Default mode. Focus on new user acquisition: Payday Super angle, Xero alternative, international student Medicare exempt.`

  const raw = await callClaude({
    systemPrompt: `${SPARK_IDENTITY}\n\nMaster context: ${master}${modeInstruction}`,
    userMessage: `Weekly content brief.

Current mode: ${mode} — ${modeReason}
Metrics: MRR $${metrics.mrr.toFixed(0)}, MRR change $${metrics.mrrChange.toFixed(0)}, new signups ${metrics.newSignups}, churn ${metrics.churnThisWeek}
${metrics.topBlogPost ? `Top blog: ${metrics.topBlogPost}` : ''}
Last 3 weeks focus: ${lastBriefs.map((b: Record<string, unknown>) => b.focus_this_week).filter(Boolean).join(' | ') || 'none yet'}
${(metrics.liftAtRiskCount ?? 0) > 0 ? `⚠️ Lift signal: ${metrics.liftAtRiskCount} users at risk of churning this week` : ''}
${metrics.atlasIntel ? `Market intel from Atlas this week:\n${metrics.atlasIntel}` : ''}
${paydaySuperUrgent ? `⚠️ Payday Super deadline in ${daysToPaydaySuper} days` : ''}

Return ONLY valid JSON:
{
  "weekFocus": "one sentence",
  "blogTitle": "exact SEO title",
  "blogOutline": ["H2 1", "H2 2", "H2 3"],
  "tiktokHook1": "best hook",
  "tiktokHook2": "second hook",
  "facebookPostAngle": "angle for FB groups",
  "accountantEmailAngle": "one sentence pitch",
  "urgentFlag": false,
  "urgentReason": ""
}`,
    maxTokens: 600,
    expectJson: true,
  })

  let parsed: SparkBrief
  try {
    parsed = JSON.parse(raw) as SparkBrief
    if (paydaySuperUrgent) parsed.urgentFlag = true
  } catch {
    parsed = {
      weekFocus: 'Ship one blog post and email two accountants',
      blogTitle: 'How to Calculate PAYG Withholding in Australia (2025-26)',
      blogOutline: ['What is PAYG withholding', 'How to calculate it', 'Common mistakes'],
      tiktokHook1: 'Your employer might be calculating your tax wrong',
      tiktokHook2: 'I built an ATO tax calculator — here is what I learned',
      facebookPostAngle: 'ATO compliance for sole traders',
      accountantEmailAngle: 'Cheaper Xero alternative for your sole trader clients',
      urgentFlag: paydaySuperUrgent,
      urgentReason: paydaySuperUrgent ? `Payday Super deadline in ${daysToPaydaySuper} days` : undefined,
    }
  }

  // Save to content_briefs
  try {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    await supabase.from('content_briefs').upsert({
      week_start: weekStartStr,
      focus_this_week: parsed.weekFocus,
      blog_post_title: parsed.blogTitle,
      blog_post_outline: parsed.blogOutline,
      tiktok_hooks: [parsed.tiktokHook1, parsed.tiktokHook2],
      accountant_email_angle: parsed.accountantEmailAngle,
      weekly_summary: parsed.weekFocus,
      published: false,
    }, { onConflict: 'week_start' })
  } catch { /* non-fatal */ }

  await logSubAgent('spark', 'weekly_brief', '', parsed.weekFocus, Date.now() - start, true)

  // ── Write world state + publish signal ─────────────────────────────────
  await updateWorldState({
    spark_last_topic: parsed.weekFocus.slice(0, 200),
    last_updated_by: 'spark',
  })

  await publishSignal({
    from_agent: 'spark',
    signal_type: 'action_taken',
    severity: parsed.urgentFlag ? 'warning' : 'info',
    summary: `Spark weekly brief complete — mode: ${mode}. Focus: ${parsed.weekFocus.slice(0, 120)}`,
    data: {
      mode,
      mode_reason: modeReason,
      week_focus: parsed.weekFocus,
      blog_title: parsed.blogTitle,
      urgent_flag: parsed.urgentFlag,
      approval_required: parsed.urgentFlag,
    },
    suggested_reactions: 'Basnet should note content mode in morning briefing.',
    expires_after_hours: 168,
  })

  return parsed
}

// ── Fetch a relevant Pexels image for a blog post ─────────────────────

const TAG_PEXELS_QUERY: Record<string, string> = {
  Tax:        'australian tax business paperwork',
  GST:        'business invoice receipt',
  Payroll:    'payroll salary office',
  Super:      'superannuation retirement savings',
  EOFY:       'financial year accounting reports',
  Compliance: 'business compliance law office',
  Invoicing:  'business invoice payment laptop',
  PAYG:       'payroll tax withholding office',
  Medicare:   'healthcare australia',
  ABN:        'self employed freelancer laptop',
}

async function fetchPexelsImage(tag: string, title: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) return null
  try {
    const query = encodeURIComponent(TAG_PEXELS_QUERY[tag] ?? title.split(' ').slice(0, 4).join(' '))
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`,
      { headers: { Authorization: apiKey } },
    )
    if (!res.ok) return null
    const data = await res.json() as { photos: Array<{ src: { large: string } }> }
    return data.photos?.[0]?.src?.large ?? null
  } catch {
    return null
  }
}

// ── Find accountants in a location + add to outreach queue ────────────

function buildEmailHtml(body: string, ctaText: string, includePartnerLink = false, recipientEmail?: string): string {
  const htmlBody = body
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin:0 0 16px 0;">${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('')
  const partnerLine = includePartnerLink
    ? `<p style="margin-top:12px;font-size:13px;color:#666;">Interested in earning 30% recurring monthly commission? <a href="https://sabaccountai.com/partners" style="color:#2563eb;text-decoration:none;">View the partner program →</a></p>`
    : ''
  // Australian Spam Act 2003 s.18 — all commercial emails must include a functional unsubscribe
  const unsubEmail = recipientEmail ? encodeURIComponent(recipientEmail) : ''
  const unsubscribeLine = `<p style="margin-top:20px;font-size:11px;color:#999;border-top:1px solid #f0f0f0;padding-top:12px;">This email was sent to ${recipientEmail ?? 'you'} because we thought SAB Account AI might be relevant to your work. <a href="mailto:basnet@sabaccountai.com?subject=Unsubscribe%20${unsubEmail}&body=Please%20remove%20me%20from%20your%20outreach%20list." style="color:#999;">Unsubscribe</a></p>`
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:24px;color:#222;line-height:1.6;">${htmlBody}<p style="margin:28px 0 0 0;"><a href="https://sabaccountai.com" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">${ctaText}</a></p>${partnerLine}<p style="margin-top:28px;color:#666;font-size:13px;border-top:1px solid #eee;padding-top:16px;line-height:1.8;">Sanjog Basnet<br>Founder, SAB Account AI<br>0415 304 090 · basnet@sabaccountai.com · sabaccountai.com</p>${unsubscribeLine}</body></html>`
}

// Third-party platform emails that appear in page scripts/embeds — never the real contact
const PLATFORM_EMAIL = /cloudflare|disqus|mailchimp|sentry|google|facebook|twitter|instagram|wordpress|wix|squarespace|shopify|hubspot|intercom|zendesk|stripe|dribbble|behance/i

// Returns true if the URL looks like an unknown directory/listing page
// (deep paths like /listing/123 or /business/name are directories, not business sites)
function looksLikeDirectory(url: string): boolean {
  try {
    const { pathname } = new URL(url)
    const segments = pathname.split('/').filter(Boolean)
    // More than 2 path segments AND numeric IDs = likely a directory listing
    if (segments.length > 2 && /\d{4,}/.test(segments[segments.length - 1])) return true
    // Common directory path patterns
    if (/\/(listing|business|company|profile|member|directory|find|search|results)\//i.test(pathname)) return true
    return false
  } catch { return false }
}

async function tavilyExtractEmail(url: string): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, urls: [url] }),
    })
    if (!res.ok) return null
    type ExtractRes = { results?: Array<{ raw_content?: string }> }
    const data = await res.json() as ExtractRes
    const content = data.results?.[0]?.raw_content ?? ''

    const EMAIL_RE = /[\w.+]+@[\w.-]+\.(com|com\.au|net\.au|org\.au|au)\b/gi
    const BEHANCE_HASH = /^[0-9a-f]{10,}@/i
    const allEmails = [...new Set((content.match(EMAIL_RE) ?? []).map(e => e.toLowerCase()))]
      .filter(e => !GENERIC_EMAIL.test(e) && !PLATFORM_EMAIL.test(e) && !BEHANCE_HASH.test(e) && !e.includes('example') && !e.includes('noreply'))

    if (allEmails.length === 0) return null

    // Prefer email whose domain matches the website's own domain — most likely the real contact
    try {
      const siteDomain = new URL(url).hostname.replace(/^www\./, '')
      const domainMatch = allEmails.find(e => e.endsWith(`@${siteDomain}`))
      if (domainMatch) return domainMatch
    } catch { /* ignore */ }

    // Fall back to any surviving non-platform, non-generic email
    return allEmails[0] ?? null
  } catch { return null }
}

export async function sparkFindAccountants(location = 'Darwin, Australia'): Promise<{ found: number; added: number }> {
  const start = Date.now()
  const supabase = createServiceClient()
  const city = location.split(',')[0].trim()

  const searchGroups: Array<{ query: string; type: string }> = [
    { query: `accountant ${city} Australia "contact us" email`,            type: 'accounting firm' },
    { query: `bookkeeper ${city} Australia small business email contact`,  type: 'bookkeeper' },
    { query: `tax agent ${city} Australia email contact`,                  type: 'tax agent' },
    { query: `CPA chartered accountant ${city} Australia email`,           type: 'accounting firm' },
    { query: `BAS agent registered agent ${city} Australia email`,         type: 'BAS agent' },
  ]

  const searches = await Promise.allSettled(
    searchGroups.map(({ query }) => tavilySearch(query, { maxResults: 6, includeAnswer: false }))
  )

  type Candidate = { name: string; url: string; practiceType: string; snippetEmail: string | null }
  const candidates: Candidate[] = []
  const seenUrls = new Set<string>()
  const EMAIL_RE = /[\w.+]+@[\w.-]+\.(com|com\.au|net\.au|org\.au|au)\b/gi

  searches.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    const practiceType = searchGroups[i].type
    for (const result of r.value.results) {
      if (seenUrls.has(result.url)) continue
      if (DIRECTORY_DOMAINS.test(result.url)) continue
      if (looksLikeDirectory(result.url)) continue
      if (/\.gov\.au/i.test(result.url)) continue
      seenUrls.add(result.url)

      const emailsInSnippet = (result.content + ' ' + result.title).match(EMAIL_RE) ?? []
      const snippetEmail = emailsInSnippet
        .map(e => e.toLowerCase())
        .find(e => !GENERIC_EMAIL.test(e) && !e.includes('example') && !e.includes('noreply') && isPersonalEmail(e))
        ?? null

      const name = result.title
        .replace(/\s*[-|–]\s*(Yellow Pages|True Local|Bark|ServiceSeeking|AccountantsList|Accounting|Bookkeeping).*$/i, '')
        .replace(/\s*[-|–]\s*\w+\.com.*$/i, '')
        .trim()

      if (/government|authority|council|department|ato\.gov/i.test(name)) continue
      candidates.push({ name, url: result.url, practiceType, snippetEmail })
    }
  })

  let added = 0
  for (const candidate of candidates.slice(0, 25)) {
    let email = candidate.snippetEmail
    if (!email) {
      const raw = await tavilyExtractEmail(candidate.url)
      if (raw && !GENERIC_EMAIL.test(raw) && isPersonalEmail(raw)) email = raw
    }
    if (!email) continue
    if (GENERIC_EMAIL.test(email) || !isPersonalEmail(email)) continue

    const { count } = await supabase
      .from('accountant_outreach')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
    if ((count ?? 0) > 0) continue

    await supabase.from('accountant_outreach').insert({
      name:          candidate.name,
      email,
      practice_type: candidate.practiceType,
      location,
      status:        'pending',
      source:        'tavily_search',
    })
    added++
  }

  await logSubAgent('spark', 'find_accountants', location, `Candidates: ${candidates.length}, added: ${added}`, Date.now() - start, added > 0)
  return { found: candidates.length, added }
}

// ── Find TPB-registered BAS and tax agents from tpb.gov.au/public-register ─
// Verified licensed practitioners — highest quality accountant leads.

export async function sparkFindTPBAccountants(
  states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'NT'],
): Promise<{ found: number; added: number }> {
  const start = Date.now()
  const supabase = createServiceClient()
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return { found: 0, added: 0 }

  type TPBPractitioner = {
    name: string
    businessName: string
    suburb: string
    state: string
    registrationType: string
  }

  const practitioners: TPBPractitioner[] = []
  const seenNames = new Set<string>()

  // Extract content from TPB public register for each state + registration type
  const registerPages = states.flatMap(state => [
    { url: `https://www.tpb.gov.au/public-register?state=${state}&registration_type=bas_agent`,            type: 'BAS agent',  state },
    { url: `https://www.tpb.gov.au/public-register?state=${state}&registration_type=registered_tax_agent`, type: 'tax agent', state },
  ])

  for (const page of registerPages.slice(0, 8)) {
    try {
      const res = await fetch('https://api.tavily.com/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, urls: [page.url] }),
      })
      if (!res.ok) continue
      type ExtractRes = { results?: Array<{ raw_content?: string }> }
      const data = await res.json() as ExtractRes
      const content = data.results?.[0]?.raw_content ?? ''
      if (!content || content.length < 200) continue

      const parsed = await callClaude({
        systemPrompt: `Extract practitioner records from TPB public register text. Return ONLY valid JSON.`,
        userMessage: `From this TPB register page (${page.type}s in ${page.state}), extract all individual practitioner entries.
Return a JSON array: [{"name":"Full Name","businessName":"Practice Name or empty string","suburb":"Suburb or empty string"}]
Only include entries where a real person's full name is clearly shown.
Content: ${content.slice(0, 4000)}`,
        maxTokens: 1200,
        expectJson: true,
      })

      try {
        const list = JSON.parse(parsed) as Array<{ name: string; businessName: string; suburb: string }>
        for (const p of list) {
          if (!p.name || seenNames.has(p.name.toLowerCase())) continue
          seenNames.add(p.name.toLowerCase())
          practitioners.push({ ...p, state: page.state, registrationType: page.type })
        }
      } catch { /* skip unparseable */ }
    } catch { /* skip failed extract */ }
  }

  const EMAIL_RE = /[\w.+]+@[\w.-]+\.(com|com\.au|net\.au|org\.au|au)\b/gi
  let added = 0

  for (const p of practitioners.slice(0, 20)) {
    try {
      const searchQuery = `"${p.name}" ${p.businessName ? `"${p.businessName}"` : ''} ${p.suburb} ${p.state} Australia accountant contact email`
      const searchResults = await tavilySearch(searchQuery, { maxResults: 4, includeAnswer: false })

      let email: string | null = null
      for (const result of searchResults.results) {
        if (DIRECTORY_DOMAINS.test(result.url)) continue
        if (/\.gov\.au/i.test(result.url)) continue

        const emailsInSnippet = (result.content + ' ' + result.title).match(EMAIL_RE) ?? []
        const snippetEmail = emailsInSnippet
          .map(e => e.toLowerCase())
          .find(e => !GENERIC_EMAIL.test(e) && isPersonalEmail(e))
          ?? null
        if (snippetEmail) { email = snippetEmail; break }

        const extracted = await tavilyExtractEmail(result.url)
        if (extracted && !GENERIC_EMAIL.test(extracted) && isPersonalEmail(extracted)) {
          email = extracted
          break
        }
      }

      if (!email) continue

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
    } catch { /* skip individual failures — don't abort entire batch */ }
  }

  await logSubAgent('spark', 'find_tpb_accountants', states.join(','), `Practitioners: ${practitioners.length}, added: ${added}`, Date.now() - start, added > 0)
  return { found: practitioners.length, added }
}

// ── Send professional deal emails to accountants (2/day, auto-follow-up) ─

const ACCOUNTANT_EMAIL_SYSTEM = `You write professional B2B cold emails on behalf of Sanjog Basnet, founder of SAB Account AI.

ABOUT SAB ACCOUNT AI:
- Australian invoicing and payroll SaaS for sole traders and small businesses
- Website: sabaccountai.com
- Pricing: $9/month (Starter) or $19/month (Pro)
- 60% cheaper than Xero or MYOB for clients who only need invoicing, payroll, and compliance
- Key features: PAYG withholding (ATO-compliant), super tracking, BAS, Payday Super compliance

THE REFERRAL DEAL YOU ARE OFFERING:
- 30% recurring monthly commission for every paying client referred — no cap, no expiry
- Free 14-day trial for any client they refer — cancel anytime before it ends
- No lock-in contract for their clients
- Partner sign-up page: sabaccountai.com/partners

PAYDAY SUPER (urgent, timely):
- Payday Super starts July 28, 2026 — all employers must pay super on every payday, not quarterly
- ATO penalties apply immediately from July 28 with no grace period
- SAB Account AI handles this automatically

SENDER DETAILS (always include in signature):
Sanjog Basnet
Founder, SAB Account AI
0415 304 090
basnet@sabaccountai.com
sabaccountai.com

STRICT RULES:
- Never use: "innovative", "cutting-edge", "game-changing", "excited to share", "I hope this finds you well"
- Be direct and specific — use real numbers ($9-19/month, 20%, July 28, 60%)
- Sound like a real person writing one email, not a marketing template
- No more than 3 short paragraphs
- One clear call to action only`

export async function sparkSendAccountantEmails(): Promise<{ sent: number; names: string[] }> {
  const start = Date.now()
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  if (!process.env.RESEND_API_KEY) return { sent: 0, names: [] }

  type AccountantRow = {
    id: string; name: string; email: string
    practice_type: string | null; location: string | null
    email_subject: string | null; source: string | null
    sequence_step: number | null; isFollowUp: boolean
  }

  const SEL = 'id, name, email, practice_type, location, email_subject, source, sequence_step'

  // Fetch TPB-verified, Tavily-scraped, and sequence follow-ups in parallel
  const [tpbPendingR, tavilyPendingR, followUpsR] = await Promise.all([
    supabase.from('accountant_outreach')
      .select(SEL).eq('status', 'pending').is('emailed_at', null)
      .eq('source', 'tpb_register')
      .order('created_at', { ascending: true }).limit(2),
    supabase.from('accountant_outreach')
      .select(SEL).eq('status', 'pending').is('emailed_at', null)
      .eq('source', 'tavily_search')
      .order('created_at', { ascending: true }).limit(2),
    // Rows awaiting touch 2 (step=1) or touch 3 (step=2), no reply, due today or earlier
    supabase.from('accountant_outreach')
      .select(SEL).eq('status', 'emailed').eq('replied', false)
      .lte('follow_up_due', today)
      .order('follow_up_due', { ascending: true }).limit(2),
  ])

  const tpbPending    = (tpbPendingR.data    ?? []).map(r => ({ ...r, isFollowUp: false }))
  const tavilyPending = (tavilyPendingR.data ?? []).map(r => ({ ...r, isFollowUp: false }))
  const followUps     = (followUpsR.data     ?? []).map(r => ({ ...r, isFollowUp: true  }))

  // Priority: due follow-ups first, then TPB-verified new contacts, then Tavily-scraped
  const targets = ([...followUps, ...tpbPending, ...tavilyPending] as AccountantRow[]).slice(0, 2)
  if (targets.length === 0) return { sent: 0, names: [] }

  // Load winning subject lines for the learning loop
  const { data: winnersData } = await supabase
    .from('accountant_outreach')
    .select('email_subject')
    .eq('replied', true)
    .not('email_subject', 'is', null)
    .order('emailed_at', { ascending: false })
    .limit(5)

  type WinnerRow = { email_subject: string | null }
  const winningSubjects = (winnersData ?? [])
    .map((r: WinnerRow) => r.email_subject)
    .filter(Boolean) as string[]

  const resend = new Resend(process.env.RESEND_API_KEY)
  const names: string[] = []

  for (const accountant of targets) {
    try {
      const winnerHint = winningSubjects.length > 0
        ? `\nSubject lines that got replies before (inspiration only, don't copy):\n${winningSubjects.map(s => `- "${s}"`).join('\n')}`
        : ''

      const step = accountant.isFollowUp ? (accountant.sequence_step ?? 1) : 0

      const userMessage =
        step === 0
          // ── Touch 1: compliance urgency ───────────────────────────────
          ? `Write an INITIAL cold email. Max 150 words. 3 short paragraphs.

Accountant: ${accountant.name}
Practice type: ${accountant.practice_type ?? 'accounting practice'}
Location: ${accountant.location ?? 'Australia'}
${winnerHint}

Use this subject line exactly: "Your clients have 14 days to comply with Payday Super"
Para 1: From July 1 2026, all employers must pay super on every payday — not quarterly. ATO penalties apply from day one with no grace period. Their clients need to be set up before then.
Para 2: SAB Account AI calculates the exact super amount per pay run automatically — free for their clients to try today, no lock-in.
Para 3: As a referring accountant they earn 30% recurring monthly commission for every client who stays on (sabaccountai.com/partners).
Do NOT include a sign-off or signature — those are added automatically.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`

          : step === 1
          // ── Touch 2 (day 4): social proof ─────────────────────────────
          ? `Write a SHORT follow-up email. Max 100 words. Friendly, not pushy.

Accountant: ${accountant.name}
Practice type: ${accountant.practice_type ?? 'accounting practice'}
Previous subject: "${accountant.email_subject ?? 'SAB Account AI'}"

Use this subject line exactly: "Quick update on SAB Account AI"
Reference that you emailed them a few days ago. Mention that Australian small businesses are already using SAB Account AI to auto-calculate Payday Super on every pay run — it goes live July 28 and ATO penalties apply from day one.
No hard sell. One sentence CTA: their clients can try it free at sabaccountai.com.
Do NOT include a sign-off or signature — those are added automatically.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`

          // ── Touch 3 (day 8): direct offer, sequence ends ───────────────
          : `Write a short, honest final email. Max 80 words.

Accountant: ${accountant.name}

Use this subject line exactly: "Last note from me"
Be direct and genuine — this is the last email. If they have clients who need payroll simplified before July 28, SAB Account AI handles Payday Super automatically and offers them 30% recurring monthly commission for every client referred (sabaccountai.com/partners). No pressure. No follow-up after this.
Do NOT include a sign-off or signature — those are added automatically.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`

      const emailRaw = await callClaude({
        systemPrompt: ACCOUNTANT_EMAIL_SYSTEM,
        userMessage,
        maxTokens: 600,
        expectJson: true,
      })

      type EmailJSON = { subject: string; body: string }
      let emailJSON: EmailJSON
      try {
        emailJSON = JSON.parse(emailRaw) as EmailJSON
      } catch { continue }

      if (!emailJSON.subject?.trim() || !emailJSON.body?.trim()) continue

      await resend.emails.send({
        from:    'Sanjog Basnet <basnet@sabaccountai.com>',
        to:      accountant.email,
        subject: emailJSON.subject,
        text:    emailJSON.body,
        html:    buildEmailHtml(
          emailJSON.body,
          accountant.isFollowUp ? 'Start free trial → sabaccountai.com' : 'Try it free → sabaccountai.com',
          true,
          accountant.email,
        ),
      })

      const nextDate = (daysFromNow: number) => {
        const d = new Date()
        d.setDate(d.getDate() + daysFromNow)
        return d.toISOString().split('T')[0]
      }

      if (step === 0) {
        // Touch 1 sent — schedule touch 2 for day 4
        await supabase.from('accountant_outreach').update({
          emailed_at:    new Date().toISOString(),
          status:        'emailed',
          sequence_step: 1,
          follow_up_due: nextDate(4),
          email_subject: emailJSON.subject,
          email_body:    emailJSON.body,
        }).eq('id', accountant.id)
      } else if (step === 1) {
        // Touch 2 sent — schedule touch 3 for 4 more days (day 8 total)
        await supabase.from('accountant_outreach').update({
          emailed_at:    new Date().toISOString(),
          sequence_step: 2,
          follow_up_due: nextDate(4),
          email_subject: emailJSON.subject,
          email_body:    emailJSON.body,
        }).eq('id', accountant.id)
      } else {
        // Touch 3 sent — sequence complete, no further automated emails
        await supabase.from('accountant_outreach').update({
          emailed_at:    new Date().toISOString(),
          sequence_step: 3,
          status:        'followed_up',
        }).eq('id', accountant.id)
      }

      const touchLabel = step === 0 ? '' : ` (touch ${step + 1})`
      names.push(`${accountant.name}${touchLabel}`)
    } catch (err) {
      console.error('[spark] accountant email failed for', accountant.name, err)
    }
  }

  await logSubAgent('spark', 'accountant_emails', '', `Sent: ${names.join(', ')}`, Date.now() - start, names.length > 0)
  return { sent: names.length, names }
}

// ── Upgrade prompt: fires when a user hits their 8th invoice ──────────

export async function sparkUpgradePrompt(email: string, name: string, invoiceCount: number): Promise<{ sent: boolean }> {
  if (!process.env.RESEND_API_KEY || !email) return { sent: false }
  const start = Date.now()
  try {
    const masterCtx = await readMasterContext().catch(() => '')
    const emailRaw = await callClaude({
      systemPrompt: `${SPARK_IDENTITY}\n\nContext: ${masterCtx.slice(0, 800)}`,
      userMessage: `Write an upgrade prompt for an active SAB Account AI user who just created their ${invoiceCount}th invoice.
Name: ${name || 'there'}
They're clearly getting value. Acknowledge their activity, make upgrading feel natural (not pushy).
Mention unlimited invoices, payslips, and any key pro features.
Short — 3-4 sentences. Conversational. Founder voice.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`,
      maxTokens: 350,
      expectJson: true,
    })

    type EmailJSON = { subject: string; body: string }
    const emailJSON = JSON.parse(emailRaw) as EmailJSON

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Sanjog from SAB Account AI <basnet@sabaccountai.com>',
      to: email,
      subject: emailJSON.subject,
      text: emailJSON.body,
    })

    const supabase = createServiceClient()
    await supabase.from('agent_conversations').insert({
      agent_name: 'spark',
      question: `upgrade_prompt: ${email} (${invoiceCount} invoices)`,
      answer: emailJSON.body,
      context_used: { trigger: 'invoice_milestone', invoiceCount },
    })

    await logSubAgent('spark', 'upgrade_prompt', email, emailJSON.subject, Date.now() - start, true)
    return { sent: true }
  } catch (err) {
    await logSubAgent('spark', 'upgrade_prompt', email, String(err), Date.now() - start, false)
    return { sent: false }
  }
}

// ── Blog post generation ───────────────────────────────────────────────

export interface SparkBlogPost {
  slug:          string
  title:         string
  description:   string
  excerpt:       string
  tag:           string
  quick_answer:  string
  ai_summary:    string   // GEO: 2-3 sentence authoritative answer for AI engines to cite
  intro:         string
  sections:      Array<{
    heading:        string
    body:           string
    bullets?:       string[]
    bullets_label?: string
    callout?:       string
  }>
  faqs:          Array<{ question: string; answer: string }>
  cta_text:      string
  related_slugs: string[]
  keywords:      string[]
  word_count:    number
  date_published: string
  read_time:     string
}

const STATIC_BLOG_SLUGS = [
  'gst-invoice-template-australia', 'eofy-checklist-sole-trader-2026',
  'medicare-levy-exemption-international-students', 'how-to-pay-super-employees-australia',
  'sole-trader-tax-deductions-australia', 'instant-asset-write-off-2026',
  'best-invoicing-software-australia-sole-trader', 'do-sole-traders-pay-super-australia',
  'super-guarantee-rate-australia-2025', 'xero-alternatives-australia',
  'accounting-software-tradies-australia', 'payg-withholding-calculator-australia',
  'how-much-tax-sole-trader-australia', 'how-to-register-gst-australia',
  'payday-super-2026', 'single-touch-payroll-small-business-australia',
  'abn-contractor-tax-australia', 'bas-due-dates-australia-2026',
  'payslip-requirements-australia', 'casual-employee-payroll-australia',
  'work-from-home-tax-deductions-australia-2026', 'contractor-vs-employee-australia',
  'payroll-tax-australia-2026',
]

export async function sparkWriteBlogPost(
  topicHint?: string,
  options?: { angle?: string; socialHook?: string; atlasBrief?: boolean },
): Promise<{ post: SparkBlogPost; saved: boolean }> {
  const start = Date.now()
  const supabase = createServiceClient()

  // Gather context: world state, signals, existing DB slugs, this week's brief
  const [ws, recentSignals, existingDbR, briefR] = await Promise.allSettled([
    (await import('@/lib/agents/world-state')).getWorldState(),
    (await import('@/lib/agents/world-state')).getRecentSignals(168),
    supabase.from('blog_posts').select('slug').eq('status', 'published'),
    supabase.from('content_briefs').select('blog_post_title, focus_this_week')
      .order('week_start', { ascending: false }).limit(1).maybeSingle(),
  ])

  const worldState    = ws.status === 'fulfilled' ? ws.value : null
  const signals       = recentSignals.status === 'fulfilled' ? recentSignals.value : []
  const dbSlugs: string[] = existingDbR.status === 'fulfilled'
    ? (existingDbR.value.data ?? []).map((r: { slug: string }) => r.slug)
    : []
  const weekBrief     = briefR.status === 'fulfilled' ? briefR.value.data : null
  const allTakenSlugs = [...STATIC_BLOG_SLUGS, ...dbSlugs]

  // Read Atlas recommendation signal — highest priority topic source
  type AtlasBriefData = { blog_topic?: string; blog_angle?: string; source_finding?: string }
  const atlasRecommendation = signals.find(
    s => s.from_agent === 'atlas' && s.signal_type === 'recommendation'
  )?.data as AtlasBriefData | undefined
  const atlasFinding = signals.find(s => s.from_agent === 'atlas')?.summary ?? ''
  const july1Days    = worldState?.july1_countdown ?? 0
  const churnRisk    = worldState?.churn_risk_score ?? 0

  // Topic priority: caller hint → Atlas recommendation → weekly brief → world state fallback
  const suggestedTopic =
    topicHint ??
    (atlasRecommendation?.blog_topic) ??
    weekBrief?.blog_post_title ??
    (july1Days > 0 && july1Days <= 21
      ? 'Payday Super cash flow impact for small business payroll'
      : churnRisk >= 6
      ? 'How to switch invoicing software in Australia without losing your data'
      : atlasFinding
      ? `SAB Account AI vs Xero: what changed in 2026`
      : 'How to generate a legal invoice in Australia (complete guide)')

  // Angle from Atlas brief or explicit options
  const angleContext = options?.angle ?? atlasRecommendation?.blog_angle ?? ''
  const sourceFinding = options?.atlasBrief
    ? (atlasRecommendation?.source_finding ?? atlasFinding)
    : atlasFinding

  const masterCtx = await readMasterContext().catch(() => '')

  const raw = await callClaude({
    systemPrompt: `${SPARK_IDENTITY}

You are writing an SEO + GEO-optimised blog post for sabaccountai.com — an Australian invoicing and payroll SaaS.
Audience: sole traders, small business owners, freelancers, migrant workers in Australia.
Tone: plain English, practical, no fluff. Cite real Australian rules (Fair Work Act, ATO, SRO, Super Guarantee) with specific figures and dates.
Word count target: ~2000 words of visible body text.

GEO (Generative Engine Optimisation) rules — these make the post citable by ChatGPT, Perplexity, Google AI Overviews, and Claude:
1. The "ai_summary" field must be a 2-3 sentence direct, authoritative answer to the post's main question — written so an AI engine can quote it verbatim. Include the key fact, the relevant law/rule, and a number or date.
2. Every section must open with a clear topic sentence that states the key point immediately.
3. FAQs must be written in the exact format AI engines pull from: direct question → direct 1-2 sentence answer. Write 6-8 FAQs covering the most-searched questions on this topic.
4. Cite real sources inline where possible: "Under the Super Guarantee (Administration) Act...", "According to the ATO...", "Fair Work Act 2009 requires...".
5. Use specific Australian figures: dollar amounts, percentages, dates, ATO thresholds. Vague claims get ignored by AI engines.
6. Include "sabaccountai.com" and "SAB Account AI" naturally 3-4 times so AI engines learn to associate the brand with this topic.

Master context: ${masterCtx.slice(0, 800)}`,
    userMessage: `Write a full 2000-word SEO + GEO-optimised blog post on this topic: "${suggestedTopic}"

Already published topics (DO NOT duplicate):
${allTakenSlugs.slice(0, 30).join(', ')}

${angleContext ? `ANGLE — why this topic is urgent RIGHT NOW: ${angleContext}` : ''}
${sourceFinding ? `Intelligence from Atlas: ${sourceFinding}` : ''}
${july1Days > 0 && july1Days <= 21 ? `URGENT: July 1 Payday Super deadline is ${july1Days} days away — weave this in if relevant` : ''}

Return ONLY valid JSON with this exact structure (no markdown wrapper):
{
  "slug": "kebab-case-url-slug",
  "title": "SEO title with year",
  "description": "meta description under 160 chars",
  "excerpt": "2-3 sentence blog card excerpt",
  "tag": "Tax|Payroll|GST|Super|Compliance|Invoicing|EOFY",
  "quick_answer": "2-3 sentence answer for the callout box at top of the post",
  "ai_summary": "2-3 sentence authoritative answer written for AI engines to cite — include the key rule, a real number or date, and mention SAB Account AI",
  "intro": "3 paragraphs separated by \\n\\n",
  "sections": [
    {
      "heading": "H2 section title",
      "body": "3-4 paragraphs separated by \\n\\n — open each section with the key point, cite real ATO/Fair Work rules",
      "bullets": ["optional bullet 1", "bullet 2"],
      "bullets_label": "optional label above bullets",
      "callout": "optional highlighted note with a specific rule, threshold, or deadline"
    }
  ],
  "faqs": [
    { "question": "Exact question someone would type into Google or ChatGPT?", "answer": "Direct 1-2 sentence answer with a specific fact, number, or rule." }
  ],
  "cta_text": "1 sentence CTA mentioning SAB Account AI by name",
  "related_slugs": ["existing-slug-1", "existing-slug-2"],
  "keywords": ["primary keyword", "keyword 2", "keyword 3"],
  "word_count": 2000,
  "date_published": "${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}",
  "read_time": "9 min read"
}

Write 5-6 sections. Each section body should be 2-3 paragraphs. FAQs: 6-8 questions — cover every question a real Australian small business owner would ask ChatGPT or Perplexity about this topic.`,
    maxTokens: 8000,
    expectJson: true,
  })

  let post: SparkBlogPost
  try {
    // Strip markdown fences, then extract the outermost JSON object
    const stripped = raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/m, '').trim()
    const start    = stripped.indexOf('{')
    const end      = stripped.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('no JSON object found')
    post = JSON.parse(stripped.slice(start, end + 1)) as SparkBlogPost
  } catch (e) {
    throw new Error(`sparkWriteBlogPost: JSON parse failed — ${e instanceof Error ? e.message : e} (raw ${raw.length} chars)`)
  }

  // Fetch Pexels hero image
  const imageUrl = await fetchPexelsImage(post.tag, post.title)

  // Ensure slug is unique
  if (allTakenSlugs.includes(post.slug)) {
    post.slug = `${post.slug}-${new Date().getFullYear()}`
  }

  // Save to Supabase
  let saved = false
  try {
    const { error } = await supabase.from('blog_posts').insert({
      slug:          post.slug,
      title:         post.title,
      description:   post.description,
      excerpt:       post.excerpt,
      tag:           post.tag,
      quick_answer:  post.quick_answer,
      ai_summary:    post.ai_summary,
      intro:         post.intro,
      sections:      post.sections,
      faqs:          post.faqs,
      cta_text:      post.cta_text,
      related_slugs: post.related_slugs,
      keywords:      post.keywords,
      word_count:    post.word_count,
      status:        'draft',
      date_published: post.date_published,
      read_time:     post.read_time,
      image_url:     imageUrl,
      created_by:    'spark',
      updated_at:    new Date().toISOString(),
    })
    if (!error) saved = true
    else console.error('[spark] blog post insert error:', error.message)
  } catch (err) {
    console.error('[spark] blog post save failed:', err)
  }

  // Update world state + publish signal
  await Promise.allSettled([
    (await import('@/lib/agents/world-state')).updateWorldState({
      spark_last_topic: post.title.slice(0, 200),
      last_updated_by: 'spark',
    }),
    (await import('@/lib/agents/world-state')).publishSignal({
      from_agent:   'spark',
      signal_type:  'action_taken',
      severity:     'info',
      summary:      `Blog post saved as draft: "${post.title}"`,
      data:         { slug: post.slug, tag: post.tag, word_count: post.word_count, saved },
      suggested_reactions: 'Basnet should note new content in next briefing. Submit slug to Google Search Console URL Inspection.',
      expires_after_hours: 168,
    }),
  ])

  await logSubAgent('spark', 'write_blog_post', post.slug, post.title, Date.now() - start, saved)
  return { post, saved }
}

export async function sparkTurnMetricIntoPost(metric: string, value: string): Promise<string> {
  try {
    return await callClaude({
      systemPrompt: SPARK_IDENTITY,
      userMessage: `Turn this metric into a TikTok hook or LinkedIn angle.\nMetric: ${metric}\nValue: ${value}\n\nOne sentence. Punchy. Australian audience.`,
      maxTokens: 100,
    })
  } catch {
    return `${value} ${metric} this week on SAB Account AI.`
  }
}

// ── Draft social posts → save to approval queue ────────────────────────

type DraftPost = {
  platform: SocialPlatform
  content: string
  approvalId: string
}

async function findPostImage(content: string): Promise<string> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return ''
  const keywords = ['accounting', 'tax', 'payroll', 'invoice', 'superannuation', 'bookkeeping', 'small business', 'finance']
  const found = keywords.filter(k => content.toLowerCase().includes(k))
  const query = found.length > 0 ? `${found[0]} australia business` : 'small business australia'
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
      { headers: { Authorization: key } }
    )
    if (!res.ok) return ''
    const data = await res.json() as { photos: { src: { large: string } }[] }
    const photos = data.photos ?? []
    if (!photos.length) return ''
    return photos[Math.floor(Math.random() * Math.min(5, photos.length))].src.large
  } catch { return '' }
}

export async function sparkDraftSocialPosts(options?: {
  topicOverride?: string
  hookOverride?:  string
  atlasBrief?:    boolean
} | string): Promise<{
  drafts: DraftPost[]
  searchTopic?: string
}> {
  const start = Date.now()
  const supabase = createServiceClient()

  // Support legacy string context arg for backwards compatibility
  const opts = typeof options === 'string' ? {} : (options ?? {})
  const legacyContext = typeof options === 'string' ? options : undefined

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const [masterCtx, briefR, signalsR] = await Promise.allSettled([
    readMasterContext(),
    supabase.from('content_briefs').select('focus_this_week, blog_post_title, tiktok_hooks')
      .eq('week_start', weekStartStr).maybeSingle(),
    getRecentSignals(168),
  ])

  const master  = masterCtx.status === 'fulfilled' ? masterCtx.value.slice(0, 1500) : ''
  const brief   = briefR.status === 'fulfilled' ? briefR.value.data : null
  const signals = signalsR.status === 'fulfilled' ? signalsR.value : []

  // Read Atlas recommendation signal for social hooks
  type AtlasBriefSignal = { social_hook?: string; social_angle?: string; campaign_idea?: string }
  const atlasRec = signals.find(
    s => s.from_agent === 'atlas' && s.signal_type === 'recommendation'
  )?.data as AtlasBriefSignal | undefined

  // Topic priority: explicit override → Atlas recommendation → weekly brief → fallback
  const topic =
    opts.topicOverride ??
    atlasRec?.social_angle ??
    brief?.focus_this_week ??
    'small business accounting australia'
  const [viralLinkedIn, viralTwitter, redditSignals, trendingNews] = await Promise.allSettled([
    tavilySearch(`viral linkedin posts australian small business accounting ${new Date().getFullYear()} high engagement`, { maxResults: 3, includeAnswer: true }),
    tavilySearch(`trending twitter posts australia tax payroll small business this week`, { maxResults: 3, includeAnswer: true }),
    tavilySearch(`site:reddit.com r/AusFinance OR r/australia "${topic.split(' ').slice(0, 3).join(' ')}"`, { maxResults: 3, includeAnswer: true }),
    tavilySearch(`${topic} australia trending news ${new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`, { maxResults: 3, includeAnswer: true }),
  ])

  const viralLinkedInContext  = viralLinkedIn.status  === 'fulfilled' && viralLinkedIn.value.answer  ? viralLinkedIn.value.answer  : ''
  const viralTwitterContext   = viralTwitter.status   === 'fulfilled' && viralTwitter.value.answer   ? viralTwitter.value.answer   : ''
  const redditContext         = redditSignals.status  === 'fulfilled' && redditSignals.value.answer  ? redditSignals.value.answer  : ''
  const trendingNewsContext   = trendingNews.status   === 'fulfilled' && trendingNews.value.answer   ? trendingNews.value.answer   : ''

  const trendContext = [
    viralLinkedInContext  ? `\nViral LinkedIn signals: ${viralLinkedInContext}`  : '',
    viralTwitterContext   ? `\nTrending Twitter/X signals: ${viralTwitterContext}` : '',
    redditContext         ? `\nReddit Australia questions this week: ${redditContext}` : '',
    trendingNewsContext   ? `\nTrending news this week: ${trendingNewsContext}`  : '',
  ].join('')

  const searchTopic = topic

  const atlasHook = opts.hookOverride ?? atlasRec?.social_hook ?? ''
  const atlasCampaign = atlasRec?.campaign_idea ?? ''
  const extraCtx = legacyContext ? `\nAdditional context: ${legacyContext}` : ''

  // Alternate tone each call — odd week = founder voice, even week = brand voice
  const weekNum = Math.ceil(new Date().getDate() / 7)
  const useFounderVoice = weekNum % 2 !== 0
  const toneInstruction = useFounderVoice
    ? `TONE: Founder voice — written as Sanjog, the builder. Personal, honest, real. Share a specific insight, struggle, or lesson learned. Use "I", "we", "here's what I found". Sound like a human who built something, not a marketing team.`
    : `TONE: Professional-human mix — brand voice with warmth. Clear, benefit-led, but not corporate. Write like a smart friend explaining something important, not a SaaS landing page.`

  const raw = await callClaude({
    systemPrompt: `${SPARK_IDENTITY}\n\nMaster context: ${master}${trendContext}${extraCtx}`,
    userMessage: `Draft social posts for this week for SAB Account AI (sabaccountai.com).
Week focus: ${topic}
Blog title: ${brief?.blog_post_title ?? ''}
TikTok hooks: ${(brief?.tiktok_hooks as string[] | null)?.join(', ') ?? ''}
${atlasHook ? `\n🧠 ATLAS RECOMMENDED HOOK (use this as the opener or base for at least 2 platforms): "${atlasHook}"` : ''}
${atlasCampaign ? `🧠 ATLAS CAMPAIGN IDEA: ${atlasCampaign}` : ''}

VIRAL INTELLIGENCE — study these signals and mirror what's working:
${viralLinkedInContext  ? `LinkedIn: ${viralLinkedInContext}`  : ''}
${viralTwitterContext   ? `Twitter/X: ${viralTwitterContext}`  : ''}
${redditContext         ? `Reddit AUS questions: ${redditContext}` : ''}
${trendingNewsContext   ? `Trending this week: ${trendingNewsContext}` : ''}

Use this intelligence to:
- Pick hooks that match what's getting engagement right now
- Mirror the tone and format of posts that are performing (short punchy lines, numbered lists, bold openers)
- Reference current events or deadlines if relevant (e.g. Payday Super, EOFY, BAS dates)
- Answer questions real Australians are asking on Reddit right now

${toneInstruction}

RULES FOR ALL POSTS:
- Use 1-3 relevant emojis per post — placed naturally, not at the start of every line
- Include hashtags: Twitter 2-3, LinkedIn 3-5, Instagram 6-8, TikTok 3-4
- CTA must be "Try it free → sabaccountai.com" (never just the raw URL alone)
- Language: mix of human and professional — real words, no buzzwords, no "leverage" or "utilise"
- Each post must have a strong HOOK as the first line — a specific claim, stat, or question that stops the scroll

PLATFORM FORMATS:
- Twitter: max 280 chars · strong hook · 1 emoji · 2-3 hashtags · CTA on last line
- LinkedIn: 1 hook line → blank line → 3-4 short paragraphs (1-2 sentences each) → blank line → CTA → 3-5 hashtags. Use line breaks. Sound human.
- Instagram: hook line with emoji · 4-5 short punchy lines · blank line · CTA · 6-8 hashtags on separate lines
- TikTok: spoken script · hook (first 3 seconds) · 3 short talking points · CTA to try free

Return ONLY valid JSON array:
[
  { "platform": "twitter",   "content": "full tweet text" },
  { "platform": "linkedin",  "content": "full linkedin post" },
  { "platform": "instagram", "content": "full instagram caption" },
  { "platform": "tiktok",    "content": "full tiktok script" }
]`,
    maxTokens: 1200,
    expectJson: true,
  })

  type RawPost = { platform: string; content: string }
  let posts: RawPost[]
  try {
    posts = JSON.parse(raw) as RawPost[]
  } catch {
    posts = []
  }

  const drafts: DraftPost[] = []
  for (const post of posts) {
    if (!post.platform || !post.content) continue
    const imageUrl = await findPostImage(post.content)
    const approvalId = await saveApprovalDraft({
      platform:  post.platform as SocialPlatform,
      content:   post.content,
      mediaUrls: imageUrl ? [imageUrl] : [],
      weekStart: weekStartStr,
    })
    drafts.push({ platform: post.platform as SocialPlatform, content: post.content, approvalId })
  }

  if (drafts.length > 0) {
    await sendAlert(
      `${drafts.length} social posts ready for approval`,
      `Platforms: ${drafts.map(d => d.platform).join(', ')}\nReview and approve at /dashboard/agent`,
      'info', 'spark',
    )
  }

  await logSubAgent('spark', 'draft_social_posts', '', `${drafts.length} drafts created`, Date.now() - start, drafts.length > 0)
  return { drafts, searchTopic }
}

// ── Community-targeted post drafts ────────────────────────────────────
// Generates 5 draft posts per run, one per segment, saved for manual review.
// Never auto-publishes — status is always 'draft'.

const COMMUNITY_SEGMENTS = [
  {
    segment:    'nepali_aus',
    platform:   'facebook',
    persona:    'Nepali small business owner in Australia',
    tone:       'warm and community-focused — writing to fellow Nepali business owners, mix of English is natural',
    painPoint:  'understanding payslips, Payday Super compliance, and ATO obligations as a new business owner in Australia',
  },
  {
    segment:    'indian_aus',
    platform:   'linkedin',
    persona:    'Indian small business owner in Australia',
    tone:       'professional but friendly',
    painPoint:  'ATO compliance and the Payday Super July 28 deadline — super must be paid on every payday from that date',
  },
  {
    segment:    'filipino_aus',
    platform:   'facebook',
    persona:    'Filipino small business owner or employee in Australia',
    tone:       'friendly and genuinely helpful',
    painPoint:  'simple invoicing and payslip generation for employees — doing it correctly without expensive software',
  },
  {
    segment:    'tradies_aus',
    platform:   'facebook',
    persona:    'Australian tradie — plumber, electrician, builder — who employs workers',
    tone:       'straight talking, plain language, zero jargon',
    painPoint:  'paying employees correctly and avoiding ATO fines when Payday Super kicks in July 28',
  },
  {
    segment:    'general_aus',
    platform:   'linkedin',
    persona:    'Australian small business owner with employees',
    tone:       'professional and urgent',
    painPoint:  'the Payday Super July 28 deadline — ATO penalties apply from day one with no grace period',
  },
] as const

export async function sparkPostCommunity(): Promise<{ drafts: number }> {
  const start = Date.now()
  const supabase = createServiceClient()

  let drafted = 0

  for (const seg of COMMUNITY_SEGMENTS) {
    try {
      const content = await callClaude({
        systemPrompt: `${SPARK_IDENTITY}
You write social media posts for specific migrant and local Australian small business communities.
Speak directly to the community. Sound like a real person, not a brand account.
Always include a CTA to try SAB Account AI free at sabaccountai.com.
Under 150 words. 3-4 hashtags maximum. No buzzwords. No competitors named.`,
        userMessage: `Write a ${seg.platform} post for: ${seg.persona}

Tone: ${seg.tone}
Core pain point: ${seg.painPoint}

Structure:
1. Opening line that speaks directly to this community (hook)
2. 1-2 sentences on the pain point — specific and relatable
3. 1-2 sentences on how SAB Account AI solves it: invoicing, payslips, Payday Super compliance, from $9/month
4. CTA: try free at sabaccountai.com
5. 3-4 relevant hashtags on a new line

Return ONLY the post text — no JSON, no markdown, no explanation.`,
        maxTokens: 350,
      })

      if (!content?.trim()) continue

      await supabase.from('community_posts').insert({
        segment:  seg.segment,
        platform: seg.platform,
        content:  content.trim(),
        status:   'draft',
      })
      drafted++
    } catch { /* skip individual failures — don't abort the batch */ }
  }

  await logSubAgent('spark', 'post_community', '', `${drafted}/5 community drafts created`, Date.now() - start, drafted > 0)
  return { drafts: drafted }
}

// ── TikTok video script generation ────────────────────────────────────
// Generates 3 scripts per run (one per segment) with stage directions.
// Always status='draft' — never auto-published.

const TIKTOK_SCRIPT_SEGMENTS = [
  {
    segment: 'tradies',
    hook:    "You're probably underpaying your super right now and don't know it",
    tone:    'Blunt, Australian, zero jargon — like talking to a mate on site. Short punchy sentences.',
    focus:   `Payday Super starts July 28 — employers must pay super on EVERY payday, not quarterly.
Most tradies with employees are underpaying because they're still on the old quarterly system.
ATO penalties apply from day one with no grace period.
SAB Account AI calculates the exact super amount on every pay run automatically — $9/month, free to start.`,
    cta:     'Search SAB Account AI — free to start',
  },
  {
    segment: 'intl_student_employer',
    hook:    "Hiring an international student? There's one thing most employers get wrong",
    tone:    'Helpful and informative — explain clearly, no condescension.',
    focus:   `International students on a student visa are exempt from the Medicare levy — they don't pay it.
But most payroll software charges them 2% Medicare levy anyway because employers don't know to turn it off.
That's money being taken from their pay that shouldn't be.
SAB Account AI detects international student status and removes the Medicare levy automatically — no manual configuration needed.`,
    cta:     'SAB Account AI calculates this automatically — link in bio',
  },
  {
    segment: 'payday_super_urgency',
    hook:    'July 1 is 14 days away and most small businesses aren\'t ready',
    tone:    'Urgent but clear and simple — not alarmist, just factual.',
    focus:   `From July 28, every employer in Australia must pay super on EVERY payday — not quarterly.
The ATO starts issuing penalties from day one. No warning letters, no grace period.
If you have employees and you're still paying super quarterly, you'll be non-compliant the day Payday Super starts.
SAB Account AI tracks super per pay run automatically and shows you exactly what's owed each payday.`,
    cta:     'sabaccountai.com — free Payday Super calculator',
  },
] as const

export async function sparkGenerateTikTok(): Promise<{ scripts: number }> {
  const start = Date.now()
  const supabase = createServiceClient()
  let scripts = 0

  for (const seg of TIKTOK_SCRIPT_SEGMENTS) {
    try {
      const raw = await callClaude({
        systemPrompt: `${SPARK_IDENTITY}
You write TikTok video scripts for SAB Account AI — Australian invoicing and payroll SaaS.
Scripts must be natural spoken word, 45-60 seconds when read aloud (~120-150 words of dialogue).
Include stage directions in square brackets: [PAUSE], [SHOW SCREEN], [POINT TO CAMERA], [HOLD UP PHONE], [CUT TO].
Stage directions don't count toward word count.
Always open with the exact hook provided. End with the exact CTA provided.
Return ONLY valid JSON — no markdown, no explanation.`,
        userMessage: `Write a TikTok video script for the ${seg.segment} segment.

Hook (use this exact line to open): "${seg.hook}"
Tone: ${seg.tone}
Core content to cover:
${seg.focus}
CTA (use this exact line to close): "${seg.cta}"

Script structure:
1. Hook — the opening line verbatim, then [PAUSE 1 sec]
2. Problem setup — 2-3 short sentences establishing the pain, use [POINT TO CAMERA] once
3. The detail — 2-3 sentences explaining the specific rule or fact, use [SHOW SCREEN] once if showing the app makes sense
4. Solution — 2 sentences on how SAB Account AI fixes it, use [HOLD UP PHONE] once
5. CTA — the closing line verbatim, then [PAUSE]

Return ONLY valid JSON:
{
  "hook": "exact hook line",
  "script_body": "full script with stage directions in [BRACKETS]",
  "cta": "exact cta line"
}`,
        maxTokens: 600,
        expectJson: true,
      })

      type ScriptJSON = { hook: string; script_body: string; cta: string }
      let parsed: ScriptJSON
      try {
        parsed = JSON.parse(raw) as ScriptJSON
      } catch { continue }

      if (!parsed.hook?.trim() || !parsed.script_body?.trim() || !parsed.cta?.trim()) continue

      await supabase.from('tiktok_scripts').insert({
        segment:     seg.segment,
        hook:        parsed.hook.trim(),
        script_body: parsed.script_body.trim(),
        cta:         parsed.cta.trim(),
        status:      'draft',
      })
      scripts++
    } catch { /* skip individual failures */ }
  }

  await logSubAgent('spark', 'generate_tiktok', '', `${scripts}/3 TikTok scripts drafted`, Date.now() - start, scripts > 0)
  return { scripts }
}

// ── Post an approved draft to its platform ─────────────────────────────

export async function sparkPostApproved(approvalId: string): Promise<{
  success: boolean
  postUrl?: string
  error?: string
}> {
  const start = Date.now()
  const supabase = createServiceClient()

  const { data: approval } = await supabase
    .from('marketing_approvals')
    .select('*')
    .eq('id', approvalId)
    .single()

  if (!approval) return { success: false, error: 'Approval not found' }
  if (approval.status !== 'approved') return { success: false, error: `Status is ${approval.status}, must be approved` }

  type Row = { platform: string; content: string; media_urls: string[] | null }
  const row = approval as Row

  let postUrl = ''
  try {
    if (row.platform === 'twitter') {
      const r = await twitterPost(row.content)
      postUrl = r.url
    } else if (row.platform === 'linkedin') {
      const r = await linkedinPost(row.content)
      postUrl = r.url
    } else if (row.platform === 'instagram') {
      const mediaUrls = row.media_urls ?? []
      const r = await instagramPost(row.content, mediaUrls[0])
      postUrl = r.url
    } else if (row.platform === 'tiktok') {
      // TikTok public API doesn't support auto-posting — mark as reminder instead
      await sendAlert(
        'TikTok post ready — post manually',
        `Script:\n${row.content}`,
        'info', 'spark',
      )
      await updateApprovalStatus(approvalId, 'posted', 'manual')
      await logSubAgent('spark', 'post_approved', approvalId, 'tiktok: manual reminder sent', Date.now() - start, true)
      return { success: true, postUrl: 'manual' }
    }

    await updateApprovalStatus(approvalId, 'posted', postUrl)
    await logSubAgent('spark', 'post_approved', approvalId, `posted to ${row.platform}: ${postUrl}`, Date.now() - start, true)
    return { success: true, postUrl }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await updateApprovalStatus(approvalId, 'failed')
    await logSubAgent('spark', 'post_approved', approvalId, `failed: ${msg}`, Date.now() - start, false)
    return { success: false, error: msg }
  }
}

// ── Find local business prospects + draft outreach emails ──────────────
// Searches for real small businesses in the given location, drafts a
// personalised Payday Super email for each, and emails Sanjog the list
// to copy-paste and send manually from his personal Gmail.

export async function sparkFindBusinessProspects(location = 'Darwin, Australia'): Promise<{
  found: number
  emailedSanjog: boolean
}> {
  const start = Date.now()
  const resend = new Resend(process.env.RESEND_API_KEY)
  if (!process.env.RESEND_API_KEY) return { found: 0, emailedSanjog: false }

  // Search 4 business types in parallel
  const businessTypes = [
    `cafe restaurant ${location}`,
    `plumber electrician tradie ${location}`,
    `cleaning company ${location}`,
    `retail shop small business ${location}`,
  ]

  const searches = await Promise.allSettled(
    businessTypes.map(q => tavilySearch(q, { maxResults: 5, includeAnswer: false }))
  )

  // Extract prospects: business name + website from Tavily results
  type Prospect = { name: string; website: string; type: string }
  const prospects: Prospect[] = []
  const seen = new Set<string>()

  const typeLabels = ['cafe/restaurant', 'tradie', 'cleaning', 'retail']
  searches.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    for (const result of (r.value.results ?? []).slice(0, 4)) {
      const domain = new URL(result.url).hostname.replace('www.', '')
      if (seen.has(domain)) continue
      // Skip directories, news sites, and government pages
      if (/yelp|yellowpages|truelocal|hipages|seek|abc\.net|news|gov\.au|facebook|linkedin|instagram/.test(domain)) continue
      seen.add(domain)
      prospects.push({
        name: result.title.split(' - ')[0].split(' | ')[0].trim(),
        website: result.url,
        type: typeLabels[i],
      })
      if (prospects.length >= 12) break
    }
    if (prospects.length >= 12) return
  })

  if (prospects.length === 0) {
    await logSubAgent('spark', 'find_prospects', location, 'No prospects found', Date.now() - start, false)
    return { found: 0, emailedSanjog: false }
  }

  // Draft all emails in one Claude call (efficient — one call, all prospects)
  const prospectList = prospects.map((p, i) =>
    `${i + 1}. Business: ${p.name} | Type: ${p.type} | Website: ${p.website}`
  ).join('\n')

  const emailsRaw = await callClaude({
    systemPrompt: `${SPARK_IDENTITY}

You are drafting cold outreach emails on behalf of Sanjog Basnet, founder of SAB Account AI (sabaccountai.com).
Context: Payday Super starts July 28, 2026. Every Australian employer must now pay superannuation on EVERY payday instead of quarterly. ATO penalties start immediately with no grace period.
The goal is NOT to pitch the product upfront — just be genuinely helpful about the deadline, then mention SAB Account AI as the tool that handles this automatically.
Tone: friendly, direct, personal. 3 short paragraphs max. No buzzwords.`,
    userMessage: `Draft a cold email for each business below. All are small businesses in ${location} with employees.

${prospectList}

Return ONLY a valid JSON array:
[
  {
    "index": 1,
    "subject": "email subject line",
    "body": "full email body (plain text, 3 paragraphs max, sign off as Sanjog)"
  },
  ...
]`,
    maxTokens: 2500,
    expectJson: true,
  })

  type DraftEmail = { index: number; subject: string; body: string }
  let drafts: DraftEmail[] = []
  try {
    drafts = JSON.parse(emailsRaw) as DraftEmail[]
  } catch {
    drafts = []
  }

  // Build the email to Sanjog — one email with all prospects + drafts
  const sections = prospects.map((p, i) => {
    const draft = drafts.find(d => d.index === i + 1)
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${i + 1}. ${p.name.toUpperCase()} (${p.type})
Website: ${p.website}
Find email: Go to their website → Contact page

SUBJECT: ${draft?.subject ?? 'Payday Super — are you ready for July 28?'}

${draft?.body ?? '(draft unavailable)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  }).join('\n')

  const emailBody = `Hi Sanjog,

Spark found ${prospects.length} real local businesses in ${location} with employees. Below are personalised Payday Super outreach emails ready to copy-paste.

HOW TO USE:
1. Go to each website and find their contact email
2. Copy the email draft below
3. Send from your personal Gmail (not sabaccountai.com — keep it personal)
4. Reply rate is best within 48 hours of finding them

PROSPECTS + DRAFTS:
${sections}

Good luck — send the first 5 today.
— Spark`

  let emailedSanjog = false
  try {
    await resend.emails.send({
      from:    'Spark <basnet@sabaccountai.com>',
      to:      'sanjog.basnet02@gmail.com',
      subject: `Spark found ${prospects.length} prospects in ${location} — emails ready to send`,
      text:    emailBody,
    })
    emailedSanjog = true
  } catch { /* email send failed silently */ }

  await logSubAgent('spark', 'find_prospects', location, `Found ${prospects.length} prospects, emailed: ${emailedSanjog}`, Date.now() - start, emailedSanjog)
  return { found: prospects.length, emailedSanjog }
}

// ── Find small businesses/freelancers + add to business outreach queue ───

const BUSINESS_EMAIL_SYSTEM = `You write short, direct cold emails on behalf of Sanjog Basnet, founder of SAB Account AI.

ABOUT SAB ACCOUNT AI:
- Australian invoicing, payroll, and compliance SaaS for small businesses and freelancers
- Website: sabaccountai.com
- Pricing: $9/month (Starter) or $19/month (Pro) — 14-day free trial, no credit card needed
- Key features: invoicing, PAYG withholding, super tracking, BAS, Payday Super compliance
- 60% cheaper than Xero or MYOB for businesses that only need invoicing and payroll

PAYDAY SUPER (urgent, timely):
- Payday Super starts July 28, 2026 — all employers must pay super on EVERY payday, not quarterly
- ATO penalties apply immediately from July 28 with no grace period
- SAB Account AI calculates and tracks this automatically

SENDER DETAILS:
Sanjog Basnet | Founder, SAB Account AI | 0415 304 090 | basnet@sabaccountai.com

STRICT RULES:
- Never use: "innovative", "cutting-edge", "game-changing", "excited to share", "I hope this finds you well"
- Be direct — use real numbers ($9/month, July 28, 60 days free)
- Sound like a real person writing to a local business owner, not a marketing team
- Max 3 short paragraphs, under 100 words total
- One clear CTA only — try free at sabaccountai.com
- Tone: casual and human, not corporate
- Do NOT include a sign-off or signature — those are added automatically`

export async function sparkFindBusinesses(location = 'Darwin, Australia'): Promise<{ found: number; added: number }> {
  const start = Date.now()
  const supabase = createServiceClient()
  const city = location.split(',')[0].trim()

  const searchGroups: Array<{ query: string; type: string }> = [
    { query: `plumber electrician sparky tradie ${city} Australia contact email`,          type: 'tradie' },
    { query: `builder carpenter concreter ${city} Australia small business email`,         type: 'tradie' },
    { query: `cafe restaurant food truck ${city} Australia email contact`,                 type: 'hospitality' },
    { query: `hair salon barber beauty ${city} Australia contact email`,                   type: 'beauty/wellness' },
    { query: `gym personal trainer fitness ${city} Australia email contact`,               type: 'beauty/wellness' },
    { query: `cleaning lawn mowing gardening ${city} Australia small business email`,      type: 'small business' },
    { query: `mechanic auto repair panel beater ${city} Australia contact email`,          type: 'tradie' },
  ]

  const searches = await Promise.allSettled(
    searchGroups.map(({ query }) => tavilySearch(query, { maxResults: 6, includeAnswer: false }))
  )

  type Candidate = { name: string; url: string; businessType: string; snippetEmail: string | null }
  const candidates: Candidate[] = []
  const seenUrls = new Set<string>()
  const EMAIL_RE = /[\w.+]+@[\w.-]+\.(com|com\.au|net\.au|org\.au|au)\b/gi

  searches.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    const businessType = searchGroups[i].type
    for (const result of r.value.results) {
      if (seenUrls.has(result.url)) continue
      if (DIRECTORY_DOMAINS.test(result.url)) continue
      if (looksLikeDirectory(result.url)) continue
      if (/\.gov\.au/i.test(result.url)) continue
      seenUrls.add(result.url)

      const emailsInSnippet = (result.content + ' ' + result.title).match(EMAIL_RE) ?? []
      const snippetEmail = emailsInSnippet
        .map(e => e.toLowerCase())
        .find(e => !GENERIC_EMAIL.test(e) && !e.includes('example') && !e.includes('noreply') && isPersonalEmail(e))
        ?? null

      const name = result.title
        .replace(/\s*[-|–]\s*(Yellow Pages|True Local|Yelp|Hipages|Bark|ServiceSeeking|OneFlare|Airtasker).*$/i, '')
        .replace(/\s*[-|–]\s*\w+\.com.*$/i, '')
        .trim()

      if (/government|authority|council|department|ministry|shire|tribunal|commission/i.test(name)) continue
      candidates.push({ name, url: result.url, businessType, snippetEmail })
    }
  })

  let added = 0
  for (const candidate of candidates.slice(0, 25)) {
    let email = candidate.snippetEmail
    if (!email) {
      const raw = await tavilyExtractEmail(candidate.url)
      if (raw && !GENERIC_EMAIL.test(raw) && isPersonalEmail(raw)) email = raw
    }
    if (!email) continue
    if (GENERIC_EMAIL.test(email) || !isPersonalEmail(email)) continue

    const { count } = await supabase
      .from('business_outreach')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
    if ((count ?? 0) > 0) continue

    await supabase.from('business_outreach').insert({
      name:          candidate.name,
      email,
      business_type: candidate.businessType,
      location,
      status:        'pending',
    })
    added++
  }

  await logSubAgent('spark', 'find_businesses', location, `Candidates: ${candidates.length}, added: ${added}`, Date.now() - start, added > 0)
  return { found: candidates.length, added }
}

export async function sparkSendBusinessEmails(): Promise<{ sent: number; names: string[] }> {
  const start = Date.now()
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  if (!process.env.RESEND_API_KEY) return { sent: 0, names: [] }

  type BusinessRow = {
    id: string; name: string; email: string
    business_type: string | null; location: string | null
    email_subject: string | null; isFollowUp: boolean
  }

  const [pendingR, followUpsR] = await Promise.all([
    supabase.from('business_outreach')
      .select('id, name, email, business_type, location, email_subject')
      .eq('status', 'pending').is('emailed_at', null)
      .not('business_type', 'like', 'freelancer%')
      .order('created_at', { ascending: true }).limit(2),
    supabase.from('business_outreach')
      .select('id, name, email, business_type, location, email_subject')
      .eq('status', 'emailed').eq('replied', false)
      .not('business_type', 'like', 'freelancer%')
      .lte('follow_up_due', today)
      .order('follow_up_due', { ascending: true }).limit(2),
  ])

  const followUps = (followUpsR.data ?? []).map(r => ({ ...r, isFollowUp: true  }))
  const pending   = (pendingR.data   ?? []).map(r => ({ ...r, isFollowUp: false }))
  const targets = ([...followUps, ...pending] as BusinessRow[]).slice(0, 2)
  if (targets.length === 0) return { sent: 0, names: [] }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const names: string[] = []

  for (const business of targets) {
    try {
      const btype = business.business_type ?? 'small business'
      const angle = btype === 'tradie'
        ? 'Payday Super is mandatory from July 28 — super must be paid on every payday, not quarterly. Most tradies don\'t know this yet.'
        : btype === 'hospitality'
        ? 'Managing staff payslips and invoices manually is a time sink. SAB Account AI automates both — payslips in seconds, invoices sent instantly.'
        : btype === 'beauty/wellness'
        ? 'Client invoices, staff payslips, super compliance — SAB Account AI handles all of it for $9/month so you can focus on your clients.'
        : 'Payday Super hits July 28 — super must be paid every payday from that date. SAB Account AI keeps you compliant automatically.'

      const userMessage = business.isFollowUp
        ? `Write a SHORT FOLLOW-UP email (max 60 words). This business owner did not reply 7 days ago.

Business: ${business.name}
Type: ${btype}
Location: ${business.location ?? 'Australia'}
Previous subject: "${business.email_subject ?? 'SAB Account AI'}"

Angle: ${angle} 14-day free trial, cancel anytime.
Do NOT include a sign-off or signature.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`

        : `Write an INITIAL cold email (max 100 words, casual tone, 3 short paragraphs).

Business: ${business.name}
Type: ${btype}
Location: ${business.location ?? 'Australia'}

Para 1: ${angle}
Para 2: SAB Account AI handles this automatically — $9/month, 60% cheaper than Xero, built for Australian small businesses.
Para 3: 14-day free trial, cancel anytime. sabaccountai.com
Do NOT include a sign-off or signature.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`

      const emailRaw = await callClaude({
        systemPrompt: BUSINESS_EMAIL_SYSTEM,
        userMessage,
        maxTokens: 400,
        expectJson: true,
      })

      type EmailJSON = { subject: string; body: string }
      let emailJSON: EmailJSON
      try {
        emailJSON = JSON.parse(emailRaw) as EmailJSON
      } catch { continue }

      if (!emailJSON.subject?.trim() || !emailJSON.body?.trim()) continue

      await resend.emails.send({
        from:    'Sanjog Basnet <basnet@sabaccountai.com>',
        to:      business.email,
        subject: emailJSON.subject,
        text:    emailJSON.body,
        html:    buildEmailHtml(
          emailJSON.body,
          business.isFollowUp ? 'Start free trial → sabaccountai.com' : 'Try it free → sabaccountai.com',
          false,
          business.email,
        ),
      })

      if (business.isFollowUp) {
        await supabase.from('business_outreach').update({
          emailed_at: new Date().toISOString(),
          status:     'followed_up',
        }).eq('id', business.id)
      } else {
        const followUpDate = new Date()
        followUpDate.setDate(followUpDate.getDate() + 7)
        await supabase.from('business_outreach').update({
          emailed_at:    new Date().toISOString(),
          status:        'emailed',
          follow_up_due: followUpDate.toISOString().split('T')[0],
          email_subject: emailJSON.subject,
          email_body:    emailJSON.body,
        }).eq('id', business.id)
      }

      names.push(`${business.name}${business.isFollowUp ? ' (follow-up)' : ''}`)
    } catch (err) {
      console.error('[spark] business email failed for', business.name, err)
    }
  }

  await logSubAgent('spark', 'business_emails', '', `Sent: ${names.join(', ')}`, Date.now() - start, names.length > 0)
  return { sent: names.length, names }
}

// Domains that are platforms/directories — never have individual freelancer emails
const DIRECTORY_DOMAINS = /upwork\.com|freelancer\.com|airtasker\.com|hipages\.com|seek\.com|yellowpages\.com\.au|truelocal\.com|bark\.com|oneflare\.com|serviceseeking\.com\.au|linkedin\.com|instagram\.com|facebook\.com|twitter\.com|fiverr\.com/i

// Generic company inboxes — not personal freelancer contacts
const GENERIC_EMAIL = /^(info|hello|contact|support|enquiries|enquiry|admin|noreply|no-reply|sales|team|office|mail|webmaster|postmaster|photos|studio|build|stories|editor|events|reception|media|press|marketing|careers|jobs|billing|accounts|accounting)@/i

// Returns true only for emails that look like a real person's address.
// Accepts: john@, john.smith@, john_smith@, j.smith@
// Rejects: gov.au domains, franchise/group domains, locals with digits or 3+ segments.
function isPersonalEmail(email: string): boolean {
  const atIdx = email.indexOf('@')
  if (atIdx < 0) return false
  const local  = email.slice(0, atIdx)
  const domain = email.slice(atIdx + 1)
  if (/gov\.au/i.test(domain)) return false
  if (/franchise|group/i.test(domain)) return false
  // Local must be letters-only with at most one separator (dot/underscore/hyphen)
  if (!/^[a-z]+([._-][a-z]+)?$/i.test(local)) return false
  if (local.length < 3) return false
  return true
}

export async function sparkFindFreelancers(location = 'Sydney, Australia'): Promise<{ found: number; added: number }> {
  const start = Date.now()
  const supabase = createServiceClient()
  const city = location.split(',')[0].trim()

  // Target personal portfolio sites — add "portfolio" and "hire me" to surface real freelancer sites
  // Include "@" in searches to increase chance of email appearing in snippet
  const searchGroups: Array<{ query: string; type: string }> = [
    // Portfolio platform searches — these profiles often show real contact emails
    { query: `site:behance.net designer Australia ${city} "available for work"`,       type: 'designer' },
    { query: `site:dribbble.com designer "Australia" ${city} "hire me"`,              type: 'designer' },
    // Personal portfolio site searches — target .com.au to prefer Australian sites
    { query: `freelance photographer ${city} com.au portfolio contact email`,          type: 'photographer' },
    { query: `freelance web developer ${city} com.au ABN "available" email`,           type: 'developer' },
    { query: `freelance copywriter content writer ${city} Australia portfolio email`,  type: 'writer' },
    { query: `sole trader consultant ${city} Australia ABN contact email`,             type: 'consultant' },
    { query: `freelance videographer ${city} com.au contact email`,                    type: 'videographer' },
    { query: `freelance bookkeeper ${city} Australia ABN contact email`,               type: 'bookkeeper' },
  ]

  const searches = await Promise.allSettled(
    searchGroups.map(({ query }) => tavilySearch(query, { maxResults: 6, includeAnswer: false }))
  )

  type Candidate = { name: string; url: string; freelancerType: string; snippetEmail: string | null }
  const candidates: Candidate[] = []
  const seenUrls = new Set<string>()
  const EMAIL_RE = /[\w.+]+@[\w.-]+\.(com|com\.au|net\.au|org\.au|au)\b/gi

  // Portfolio platforms — individual profile pages ARE valid (not directories)
  const PORTFOLIO_PLATFORMS = /behance\.net|dribbble\.com|cargo\.site/i

  searches.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    const freelancerType = searchGroups[i].type
    for (const result of r.value.results) {
      if (seenUrls.has(result.url)) continue
      const isPortfolioPlatform = PORTFOLIO_PLATFORMS.test(result.url)
      // Skip non-portfolio directories but allow individual portfolio platform profiles
      if (!isPortfolioPlatform && DIRECTORY_DOMAINS.test(result.url)) continue
      if (!isPortfolioPlatform && looksLikeDirectory(result.url)) continue
      if (/\.gov\.au/i.test(result.url)) continue
      seenUrls.add(result.url)

      const text = result.content + ' ' + result.title
      const emailsInSnippet = text.match(EMAIL_RE) ?? []
      const BEHANCE_HASH_F = /^[0-9a-f]{10,}@/i
      // Prefer personal-domain emails — skip generic, platform, and Behance-obfuscated emails
      const snippetEmail = emailsInSnippet
        .map(e => e.toLowerCase())
        .find(e => !GENERIC_EMAIL.test(e) && !PLATFORM_EMAIL.test(e) && !BEHANCE_HASH_F.test(e) && !e.includes('example') && !e.includes('noreply'))
        ?? null

      const name = result.title
        .replace(/\s*[-|–]\s*(Portfolio|Hire Me|Contact|Services|About).*$/i, '')
        .replace(/\s*[-|–]\s*\w+\.com.*$/i, '')
        .trim()

      candidates.push({ name, url: result.url, freelancerType, snippetEmail })
    }
  })

  let added = 0
  for (const candidate of candidates.slice(0, 25)) {
    let email = candidate.snippetEmail
    if (!email) {
      // Visit the page and find ALL emails, then pick the best one
      const raw = await tavilyExtractEmail(candidate.url)
      if (raw && !GENERIC_EMAIL.test(raw)) email = raw
    }
    if (!email) continue
    if (GENERIC_EMAIL.test(email)) continue

    const { count } = await supabase
      .from('business_outreach')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
    if ((count ?? 0) > 0) continue

    // Store freelancer type in business_type field for email personalisation
    await supabase.from('business_outreach').insert({
      name:          candidate.name,
      email,
      business_type: `freelancer_${candidate.freelancerType}`,
      location,
      status:        'pending',
    })
    added++
  }

  await logSubAgent('spark', 'find_freelancers', location, `Candidates: ${candidates.length}, added: ${added}`, Date.now() - start, added > 0)
  return { found: candidates.length, added }
}

const FREELANCER_EMAIL_SYSTEM = `You write short, personal cold emails to Australian freelancers on behalf of Sanjog Basnet, founder of SAB Account AI (sabaccountai.com). SAB Account AI is an invoicing and payslip tool built specifically for Australian freelancers and sole traders — $9/month, 60% cheaper than Xero. Tone: friendly, peer-to-peer, not corporate. No buzzwords. Short sentences.`

export async function sparkSendFreelancerEmails(): Promise<{ sent: number; names: string[] }> {
  const start = Date.now()
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  if (!process.env.RESEND_API_KEY) return { sent: 0, names: [] }

  type FreelancerRow = {
    id: string; name: string; email: string
    business_type: string | null; location: string | null
    email_subject: string | null; isFollowUp: boolean
  }

  const [pendingR, followUpsR] = await Promise.all([
    supabase.from('business_outreach')
      .select('id, name, email, business_type, location, email_subject')
      .eq('status', 'pending').is('emailed_at', null)
      .like('business_type', 'freelancer%')
      .order('created_at', { ascending: true }).limit(5),
    supabase.from('business_outreach')
      .select('id, name, email, business_type, location, email_subject')
      .eq('status', 'emailed').eq('replied', false)
      .like('business_type', 'freelancer%')
      .lte('follow_up_due', today)
      .order('follow_up_due', { ascending: true }).limit(5),
  ])

  const followUps = (followUpsR.data ?? []).map(r => ({ ...r, isFollowUp: true  }))
  const pending   = (pendingR.data   ?? []).map(r => ({ ...r, isFollowUp: false }))
  const targets = ([...followUps, ...pending] as FreelancerRow[]).slice(0, 5)
  if (targets.length === 0) return { sent: 0, names: [] }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const names: string[] = []

  for (const freelancer of targets) {
    try {
      const freelancerType = (freelancer.business_type ?? '').replace('freelancer_', '') || 'freelancer'

      const userMessage = freelancer.isFollowUp
        ? `Write a SHORT FOLLOW-UP email (max 50 words) to an Australian ${freelancerType} who didn't reply 7 days ago.

Name: ${freelancer.name}
Previous subject: "${freelancer.email_subject ?? 'SAB Account AI'}"

Angle: Still invoicing manually? Takes 30 seconds with SAB Account AI — $9/month, built for Australian freelancers.
Do NOT include a sign-off or signature.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`

        : `Write an INITIAL cold email (max 80 words, casual and personal) to an Australian ${freelancerType}.

Name: ${freelancer.name}
Location: ${freelancer.location ?? 'Australia'}

Para 1: Reference that they're a ${freelancerType} — ask if they're still invoicing in Word/Excel or chasing clients manually for payment.
Para 2: SAB Account AI handles it in 30 seconds — unlimited invoices, payslips, built for Australian ABN holders. $9/month, 60% cheaper than Xero.
Para 3: 14-day free trial, cancel anytime. sabaccountai.com
Do NOT include a sign-off or signature.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`

      const emailRaw = await callClaude({
        systemPrompt: FREELANCER_EMAIL_SYSTEM,
        userMessage,
        maxTokens: 400,
        expectJson: true,
      })

      type EmailJSON = { subject: string; body: string }
      let emailJSON: EmailJSON
      try {
        emailJSON = JSON.parse(emailRaw) as EmailJSON
      } catch { continue }

      if (!emailJSON.subject?.trim() || !emailJSON.body?.trim()) continue

      await resend.emails.send({
        from:    'Sanjog Basnet <basnet@sabaccountai.com>',
        to:      freelancer.email,
        subject: emailJSON.subject,
        text:    emailJSON.body,
        html:    buildEmailHtml(emailJSON.body, 'Start free trial → sabaccountai.com', false, freelancer.email),
      })

      if (freelancer.isFollowUp) {
        await supabase.from('business_outreach').update({
          emailed_at: new Date().toISOString(),
          status:     'followed_up',
        }).eq('id', freelancer.id)
      } else {
        const followUpDate = new Date()
        followUpDate.setDate(followUpDate.getDate() + 7)
        await supabase.from('business_outreach').update({
          emailed_at:    new Date().toISOString(),
          status:        'emailed',
          follow_up_due: followUpDate.toISOString().split('T')[0],
          email_subject: emailJSON.subject,
          email_body:    emailJSON.body,
        }).eq('id', freelancer.id)
      }

      names.push(`${freelancer.name}${freelancer.isFollowUp ? ' (follow-up)' : ''}`)
    } catch (err) {
      console.error('[spark] freelancer email failed for', freelancer.name, err)
    }
  }

  await logSubAgent('spark', 'freelancer_emails', '', `Sent: ${names.join(', ')}`, Date.now() - start, names.length > 0)
  return { sent: names.length, names }
}
