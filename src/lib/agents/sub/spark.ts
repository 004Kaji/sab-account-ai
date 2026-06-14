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

function buildEmailHtml(body: string, ctaText: string, includePartnerLink = false): string {
  const htmlBody = body
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin:0 0 16px 0;">${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('')
  const partnerLine = includePartnerLink
    ? `<p style="margin-top:12px;font-size:13px;color:#666;">Interested in earning 20% monthly commission? <a href="https://sabaccountai.com/partners" style="color:#2563eb;text-decoration:none;">View the partner program →</a></p>`
    : ''
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:24px;color:#222;line-height:1.6;">${htmlBody}<p style="margin:28px 0 0 0;"><a href="https://sabaccountai.com" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">${ctaText}</a></p>${partnerLine}<p style="margin-top:28px;color:#666;font-size:13px;border-top:1px solid #eee;padding-top:16px;line-height:1.8;">Sanjog Basnet<br>Founder, SAB Account AI<br>0415 304 090 · basnet@sabaccountai.com · sabaccountai.com</p></body></html>`
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
    const match = content.match(/[\w.+]+@[\w.-]+\.(com|com\.au|net\.au|org\.au|au)\b/i)
    return match ? match[0].toLowerCase() : null
  } catch { return null }
}

export async function sparkFindAccountants(location = 'Darwin, Australia'): Promise<{ found: number; added: number }> {
  const start = Date.now()
  const supabase = createServiceClient()

  // Extract city name for directory searches (e.g. "Darwin, Australia" → "Darwin")
  const city = location.split(',')[0].trim()

  // Direct searches for accounting firm websites — site: directory searches return category pages without emails
  const searches = await Promise.allSettled([
    tavilySearch(`accountant ${city} Australia contact email`,              { maxResults: 6, includeAnswer: false }),
    tavilySearch(`bookkeeper ${city} Australia email contact`,              { maxResults: 6, includeAnswer: false }),
    tavilySearch(`tax agent ${city} Australia email contact`,               { maxResults: 5, includeAnswer: false }),
    tavilySearch(`accounting firm ${city} Australia email`,                 { maxResults: 5, includeAnswer: false }),
    tavilySearch(`CPA chartered accountant ${city} Australia email`,        { maxResults: 5, includeAnswer: false }),
  ])

  type Candidate = { name: string; url: string; practiceType: string; snippetEmail: string | null }
  const candidates: Candidate[] = []
  const seenUrls = new Set<string>()
  const EMAIL_RE = /[\w.+]+@[\w.-]+\.(com|com\.au|net\.au|org\.au|au)\b/gi
  const typeLabels = ['accounting firm', 'bookkeeper', 'tax agent', 'accounting firm', 'accounting firm']

  searches.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    for (const result of r.value.results) {
      if (seenUrls.has(result.url)) continue
      seenUrls.add(result.url)

      // Pull any email visible directly in the Tavily snippet
      const emailsInSnippet = (result.content + ' ' + result.title).match(EMAIL_RE) ?? []
      const snippetEmail = emailsInSnippet
        .find(e => !e.includes('example') && !e.includes('noreply') && !e.includes('no-reply'))
        ?.toLowerCase() ?? null

      const name = result.title
        .replace(/\s*[-|–]\s*(Yellow Pages|True Local|Accounting|Bookkeeping).*$/i, '')
        .trim()

      candidates.push({ name, url: result.url, practiceType: typeLabels[i], snippetEmail })
    }
  })

  let added = 0

  for (const candidate of candidates.slice(0, 15)) {
    // Determine best email: snippet first, then crawl the listing/website
    let email = candidate.snippetEmail

    if (!email) {
      // Crawl the listing page (Yellow Pages / True Local / firm's own site)
      email = await tavilyExtractEmail(candidate.url)
    }

    if (!email) continue  // skip if we genuinely can't find an email

    // Skip internal/system emails
    if (/noreply|no-reply|example|test@|admin@|info@yellowpages|info@truelocal/.test(email)) continue

    // Deduplicate — skip if this email is already in the pipeline
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
    })
    added++
  }

  await logSubAgent('spark', 'find_accountants', location, `Candidates: ${candidates.length}, added: ${added}`, Date.now() - start, added > 0)
  return { found: candidates.length, added }
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
- 20% ongoing monthly commission for every paying client referred — no cap, no expiry
- Free 14-day trial for any client they refer — no credit card needed
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
    email_subject: string | null; isFollowUp: boolean
  }

  // Fetch follow-ups AND new in parallel — merge with follow-ups first
  const [pendingR, followUpsR] = await Promise.all([
    supabase.from('accountant_outreach')
      .select('id, name, email, practice_type, location, email_subject')
      .eq('status', 'pending').is('emailed_at', null)
      .order('created_at', { ascending: true }).limit(2),
    supabase.from('accountant_outreach')
      .select('id, name, email, practice_type, location, email_subject')
      .eq('status', 'emailed').eq('replied', false)
      .lte('follow_up_due', today)
      .order('follow_up_due', { ascending: true }).limit(2),
  ])

  const followUps = (followUpsR.data ?? []).map(r => ({ ...r, isFollowUp: true  }))
  const pending   = (pendingR.data   ?? []).map(r => ({ ...r, isFollowUp: false }))

  // Follow-ups take priority — fill remaining slot(s) with new
  const targets = ([...followUps, ...pending] as AccountantRow[]).slice(0, 2)
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

      const userMessage = accountant.isFollowUp
        ? `Write a SHORT FOLLOW-UP email (max 80 words). This accountant did not reply to the first email 7 days ago.

Accountant: ${accountant.name}
Practice type: ${accountant.practice_type ?? 'accounting practice'}
Location: ${accountant.location ?? 'Australia'}
Previous subject: "${accountant.email_subject ?? 'SAB Account AI referral'}"

New angle: Payday Super July 28 — every employer must pay super on every payday from that date. SAB Account AI handles this automatically for their clients.
CTA: offer a free 14-day trial for their clients (no call needed this time).
Do NOT include a sign-off or signature — those are added automatically.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`

        : `Write an INITIAL cold email (max 150 words, 3 short paragraphs).

Accountant: ${accountant.name}
Practice type: ${accountant.practice_type ?? 'accounting practice'}
Location: ${accountant.location ?? 'Australia'}
${winnerHint}

Para 1: One sentence on who you are and why you're contacting them.
Para 2: The deal — 20% referral commission on first year + free 14-day trial for any client they refer + SAB Account AI is 60% cheaper than Xero for sole traders.
Para 3: One CTA — ask for a 15-minute call this week.
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
        ),
      })

      if (accountant.isFollowUp) {
        // Mark as fully followed-up — no more automatic emails
        await supabase.from('accountant_outreach').update({
          emailed_at: new Date().toISOString(),
          status:     'followed_up',
        }).eq('id', accountant.id)
      } else {
        // First email sent — schedule follow-up in 7 days
        const followUpDate = new Date()
        followUpDate.setDate(followUpDate.getDate() + 7)
        await supabase.from('accountant_outreach').update({
          emailed_at:    new Date().toISOString(),
          status:        'emailed',
          follow_up_due: followUpDate.toISOString().split('T')[0],
          email_subject: emailJSON.subject,
          email_body:    emailJSON.body,
        }).eq('id', accountant.id)
      }

      names.push(`${accountant.name}${accountant.isFollowUp ? ' (follow-up)' : ''}`)
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

You are writing an SEO blog post for sabaccountai.com — an Australian invoicing and payroll SaaS.
Audience: sole traders, small business owners, freelancers, migrant workers in Australia.
Tone: plain English, practical, no fluff. Cite real Australian rules (Fair Work, ATO, SRO).
Word count target: ~2000 words of visible body text.

Master context: ${masterCtx.slice(0, 800)}`,
    userMessage: `Write a full 2000-word SEO blog post on this topic: "${suggestedTopic}"

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
  "quick_answer": "2-3 sentence answer for the callout box at top",
  "intro": "3 paragraphs separated by \\n\\n",
  "sections": [
    {
      "heading": "H2 section title",
      "body": "3-4 paragraphs separated by \\n\\n",
      "bullets": ["optional bullet 1", "bullet 2"],
      "bullets_label": "optional label above bullets",
      "callout": "optional highlighted note"
    }
  ],
  "faqs": [
    { "question": "FAQ question?", "answer": "Clear answer in 2-3 sentences." }
  ],
  "cta_text": "1 sentence call to action for SAB Account AI",
  "related_slugs": ["existing-slug-1", "existing-slug-2"],
  "keywords": ["primary keyword", "keyword 2", "keyword 3"],
  "word_count": 2000,
  "date_published": "${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}",
  "read_time": "9 min read"
}

Write 5-6 sections. Each section body should be 2-3 paragraphs. FAQs: 4-5 questions. Keep each answer concise (2-3 sentences).`,
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
      intro:         post.intro,
      sections:      post.sections,
      faqs:          post.faqs,
      cta_text:      post.cta_text,
      related_slugs: post.related_slugs,
      keywords:      post.keywords,
      word_count:    post.word_count,
      status:        'published',
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
      summary:      `Blog post published: "${post.title}"`,
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

  // Use direct business website searches — site: directory searches return category pages without emails
  const searches = await Promise.allSettled([
    tavilySearch(`plumber electrician tradie ${city} Australia contact email`,              { maxResults: 6, includeAnswer: false }),
    tavilySearch(`cafe restaurant food small business ${city} Australia email contact`,     { maxResults: 6, includeAnswer: false }),
    tavilySearch(`hair salon beauty gym fitness ${city} Australia email`,                   { maxResults: 5, includeAnswer: false }),
    tavilySearch(`cleaning landscaping gardening ${city} Australia small business email`,   { maxResults: 5, includeAnswer: false }),
    tavilySearch(`freelancer bookkeeper consultant ${city} Australia email contact`,        { maxResults: 5, includeAnswer: false }),
  ])

  type Candidate = { name: string; url: string; businessType: string; snippetEmail: string | null }
  const candidates: Candidate[] = []
  const seenUrls = new Set<string>()
  const EMAIL_RE = /[\w.+]+@[\w.-]+\.(com|com\.au|net\.au|org\.au|au)\b/gi
  const typeLabels = ['tradie', 'hospitality', 'beauty/wellness', 'small business', 'freelancer']

  searches.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    for (const result of r.value.results) {
      if (seenUrls.has(result.url)) continue
      seenUrls.add(result.url)
      const emailsInSnippet = (result.content + ' ' + result.title).match(EMAIL_RE) ?? []
      const snippetEmail = emailsInSnippet
        .find(e => !e.includes('example') && !e.includes('noreply') && !e.includes('no-reply'))
        ?.toLowerCase() ?? null
      const name = result.title
        .replace(/\s*[-|–]\s*(Yellow Pages|True Local|Yelp|Hipages).*$/i, '')
        .trim()
      candidates.push({ name, url: result.url, businessType: typeLabels[i], snippetEmail })
    }
  })

  let added = 0

  for (const candidate of candidates.slice(0, 15)) {
    let email = candidate.snippetEmail
    if (!email) email = await tavilyExtractEmail(candidate.url)
    if (!email) continue
    if (/noreply|no-reply|example|test@|admin@|info@yellowpages|info@truelocal/.test(email)) continue
    if (/\.gov\.au/i.test(candidate.url)) continue
    if (/government|authority|council|department|ministry|shire|tribunal|commission/i.test(candidate.name)) continue

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
      .neq('business_type', 'freelancer')
      .order('created_at', { ascending: true }).limit(2),
    supabase.from('business_outreach')
      .select('id, name, email, business_type, location, email_subject')
      .eq('status', 'emailed').eq('replied', false)
      .neq('business_type', 'freelancer')
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
      const userMessage = business.isFollowUp
        ? `Write a SHORT FOLLOW-UP email (max 60 words). This business owner did not reply 7 days ago.

Business: ${business.name}
Type: ${business.business_type ?? 'small business'}
Location: ${business.location ?? 'Australia'}
Previous subject: "${business.email_subject ?? 'SAB Account AI'}"

Angle: July 28 Payday Super deadline is coming fast. Offer 14-day free trial — no credit card, no lock-in.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`

        : `Write an INITIAL cold email (max 100 words, casual tone, 3 short paragraphs).

Business: ${business.name}
Type: ${business.business_type ?? 'small business'}
Location: ${business.location ?? 'Australia'}

Para 1: One sentence — why you're reaching out. For employers: Payday Super July 28 deadline. For freelancers: PAYG and invoicing made simple.
Para 2: SAB Account AI handles this automatically — $9/month, 60% cheaper than Xero.
Para 3: 14-day free trial, cancel anytime before it ends.
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

export async function sparkFindFreelancers(location = 'Australia'): Promise<{ found: number; added: number }> {
  const start = Date.now()
  const supabase = createServiceClient()
  const city = location.split(',')[0].trim()

  const searches = await Promise.allSettled([
    tavilySearch(`freelance graphic designer ${city} contact email website`,         { maxResults: 6, includeAnswer: false }),
    tavilySearch(`freelance photographer videographer ${city} email contact`,        { maxResults: 6, includeAnswer: false }),
    tavilySearch(`freelance web developer software developer ${city} ABN email`,     { maxResults: 5, includeAnswer: false }),
    tavilySearch(`freelance copywriter content writer ${city} Australia email`,      { maxResults: 5, includeAnswer: false }),
    tavilySearch(`independent consultant sole trader ${city} Australia email contact`, { maxResults: 5, includeAnswer: false }),
  ])

  type Candidate = { name: string; url: string; snippetEmail: string | null }
  const candidates: Candidate[] = []
  const seenUrls = new Set<string>()
  const EMAIL_RE = /[\w.+]+@[\w.-]+\.(com|com\.au|net\.au|org\.au|au)\b/gi

  searches.forEach(r => {
    if (r.status !== 'fulfilled') return
    for (const result of r.value.results) {
      if (seenUrls.has(result.url)) continue
      seenUrls.add(result.url)
      const emailsInSnippet = (result.content + ' ' + result.title).match(EMAIL_RE) ?? []
      const snippetEmail = emailsInSnippet
        .find(e => !e.includes('example') && !e.includes('noreply') && !e.includes('no-reply'))
        ?.toLowerCase() ?? null
      const name = result.title.replace(/\s*[-|–]\s*(LinkedIn|Upwork|Freelancer\.com).*$/i, '').trim()
      candidates.push({ name, url: result.url, snippetEmail })
    }
  })

  let added = 0
  for (const candidate of candidates.slice(0, 20)) {
    let email = candidate.snippetEmail
    if (!email) email = await tavilyExtractEmail(candidate.url)
    if (!email) continue
    if (/noreply|no-reply|example|test@|admin@/.test(email)) continue
    if (/\.gov\.au/i.test(candidate.url)) continue

    const { count } = await supabase
      .from('business_outreach')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
    if ((count ?? 0) > 0) continue

    await supabase.from('business_outreach').insert({
      name:          candidate.name,
      email,
      business_type: 'freelancer',
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
    location: string | null; email_subject: string | null; isFollowUp: boolean
  }

  const [pendingR, followUpsR] = await Promise.all([
    supabase.from('business_outreach')
      .select('id, name, email, location, email_subject')
      .eq('status', 'pending').is('emailed_at', null)
      .eq('business_type', 'freelancer')
      .order('created_at', { ascending: true }).limit(5),
    supabase.from('business_outreach')
      .select('id, name, email, location, email_subject')
      .eq('status', 'emailed').eq('replied', false)
      .eq('business_type', 'freelancer')
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
      const userMessage = freelancer.isFollowUp
        ? `Write a SHORT FOLLOW-UP email (max 50 words) to an Australian freelancer who didn't reply 7 days ago.

Freelancer: ${freelancer.name}
Previous subject: "${freelancer.email_subject ?? 'SAB Account AI'}"

Angle: Still invoicing manually? Takes 30 seconds with SAB Account AI — $9/month, built for Australian freelancers.
Do NOT include a sign-off or signature.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`

        : `Write an INITIAL cold email (max 80 words, casual and personal) to an Australian freelancer.

Freelancer: ${freelancer.name}
Location: ${freelancer.location ?? 'Australia'}

Para 1: Ask if they're still invoicing in Word or Excel — many freelancers are.
Para 2: SAB Account AI does it in 30 seconds — unlimited invoices, payslips, AI help, $9/month. Built for Australian freelancers with ABNs. 60% cheaper than Xero.
Para 3: 14-day free trial, cancel anytime before it ends. Link: sabaccountai.com
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
        html:    buildEmailHtml(emailJSON.body, 'Start free trial → sabaccountai.com'),
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
