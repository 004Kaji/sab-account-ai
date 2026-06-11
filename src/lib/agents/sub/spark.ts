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

export async function sparkSendAccountantEmails(): Promise<{ sent: number; names: string[] }> {
  const start = Date.now()
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  type AccountantRow = { id: string; name: string; email: string; practice_type: string | null; location: string | null }

  // Get pending accountants, fallback to follow-ups
  let { data: targets } = await supabase
    .from('accountant_outreach').select('id, name, email, practice_type, location')
    .eq('status', 'pending').is('emailed_at', null).limit(2)

  if (!targets || targets.length === 0) {
    const { data: followUps } = await supabase
      .from('accountant_outreach').select('id, name, email, practice_type, location')
      .lte('follow_up_due', today).eq('replied', false).limit(2)
    targets = followUps
  }

  if (!targets || targets.length === 0) return { sent: 0, names: [] }

  const [masterCtx, learningsCtx, winnersR] = await Promise.allSettled([
    readMasterContext(),
    readAgentLearnings(3),
    supabase.from('accountant_outreach')
      .select('email_subject')
      .eq('replied', true)
      .not('email_subject', 'is', null)
      .order('emailed_at', { ascending: false })
      .limit(5),
  ])

  const master   = masterCtx.status   === 'fulfilled' ? masterCtx.value.slice(0, 1000)   : ''
  const learnings = learningsCtx.status === 'fulfilled' ? learningsCtx.value              : ''
  type WinnerRow = { email_subject: string | null }
  const winningSubjects = winnersR.status === 'fulfilled'
    ? (winnersR.value.data ?? []).map((r: WinnerRow) => r.email_subject).filter(Boolean)
    : []

  const resend = new Resend(process.env.RESEND_API_KEY)
  const names: string[] = []

  for (const accountant of targets as AccountantRow[]) {
    try {
      const winnerContext = winningSubjects.length > 0
        ? `\nSubject lines that got replies in the past:\n${winningSubjects.map(s => `- "${s}"`).join('\n')}\nUse these as inspiration, not copies.`
        : ''
      const learningsContext = learnings
        ? `\nWhat worked / failed in past outreach:\n${learnings}`
        : ''

      const emailRaw = await callClaude({
        systemPrompt: `${SPARK_IDENTITY}\n\nContext: ${master}${learningsContext}`,
        userMessage: `Write a personalised cold email from Sanjog Basnet, founder of SAB Account AI.
Name: ${accountant.name}
Practice: ${accountant.practice_type ?? 'accounting'}
Location: ${accountant.location ?? 'Australia'}
${winnerContext}
Return ONLY valid JSON: { "subject": "string", "body": "string" }`,
        maxTokens: 500,
        expectJson: true,
      })

      type EmailJSON = { subject: string; body: string }
      const emailJSON = JSON.parse(emailRaw) as EmailJSON

      await resend.emails.send({
        from: 'Sanjog Basnet <basnet@sabaccountai.com>',
        to: accountant.email,
        subject: emailJSON.subject,
        text: emailJSON.body,
      })

      const followUpDate = new Date()
      followUpDate.setDate(followUpDate.getDate() + 7)

      await supabase.from('accountant_outreach').update({
        emailed_at: new Date().toISOString(),
        status: 'emailed',
        follow_up_due: followUpDate.toISOString().split('T')[0],
        email_subject: emailJSON.subject,
        email_body: emailJSON.body,
      }).eq('id', accountant.id)

      names.push(accountant.name)
    } catch (err) {
      console.error('sparkSendAccountantEmails failed for', accountant.name, err)
    }
  }

  await logSubAgent('spark', 'accountant_emails', '', `Sent to: ${names.join(', ')}`, Date.now() - start, names.length > 0)
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

export async function sparkWriteBlogPost(topicHint?: string): Promise<{ post: SparkBlogPost; saved: boolean }> {
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

  const atlasFinding  = signals.find(s => s.from_agent === 'atlas')?.summary ?? ''
  const july1Days     = worldState?.july1_countdown ?? 0
  const churnRisk     = worldState?.churn_risk_score ?? 0

  const suggestedTopic =
    topicHint ??
    weekBrief?.blog_post_title ??
    (july1Days > 0 && july1Days <= 21
      ? 'Payday Super cash flow impact for small business payroll'
      : churnRisk >= 6
      ? 'How to switch invoicing software in Australia without losing your data'
      : atlasFinding
      ? `SAB Account AI vs Xero: what changed in 2026`
      : 'How to generate a legal invoice in Australia (complete guide)')

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

${atlasFinding ? `Recent market intel from Atlas: ${atlasFinding}` : ''}
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

export async function sparkDraftSocialPosts(context?: string): Promise<{
  drafts: DraftPost[]
  searchTopic?: string
}> {
  const start = Date.now()
  const supabase = createServiceClient()

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const [masterCtx, briefR] = await Promise.allSettled([
    readMasterContext(),
    supabase.from('content_briefs').select('focus_this_week, blog_post_title, tiktok_hooks')
      .eq('week_start', weekStartStr).maybeSingle(),
  ])

  const master = masterCtx.status === 'fulfilled' ? masterCtx.value.slice(0, 1500) : ''
  const brief = briefR.status === 'fulfilled' ? briefR.value.data : null

  // Web search for trending topics
  let trendContext = ''
  let searchTopic: string | undefined
  if (brief?.focus_this_week) {
    searchTopic = `${brief.focus_this_week} Australia 2026`
    const search = await tavilySearch(searchTopic, { maxResults: 3, includeAnswer: true })
    if (search.answer) trendContext = `\nTrending context: ${search.answer}`
  }

  const extraCtx = context ? `\nAdditional context: ${context}` : ''

  const raw = await callClaude({
    systemPrompt: `${SPARK_IDENTITY}\n\nMaster context: ${master}${trendContext}${extraCtx}`,
    userMessage: `Draft social posts for this week.
Week focus: ${brief?.focus_this_week ?? 'grow SAB Account AI'}
Blog title: ${brief?.blog_post_title ?? ''}
TikTok hooks: ${(brief?.tiktok_hooks as string[] | null)?.join(', ') ?? ''}

Return ONLY valid JSON array:
[
  { "platform": "twitter",   "content": "tweet max 280 chars" },
  { "platform": "linkedin",  "content": "linkedin post 3-4 sentences" },
  { "platform": "instagram", "content": "instagram caption with hashtags" },
  { "platform": "tiktok",    "content": "tiktok script hook + 3 talking points" }
]`,
    maxTokens: 800,
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
    const approvalId = await saveApprovalDraft({
      platform: post.platform as SocialPlatform,
      content: post.content,
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
