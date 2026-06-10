import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'
import {
  callClaude, logSubAgent, readMasterContext, readAgentLearnings, sendAlert,
  tavilySearch, saveApprovalDraft, updateApprovalStatus,
  twitterPost, linkedinPost, instagramPost,
  type SocialPlatform,
} from '@/lib/agents/toolkits/sab-marketing-toolkit'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'

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

  const raw = await callClaude({
    systemPrompt: `${SPARK_IDENTITY}\n\nMaster context: ${master}`,
    userMessage: `Weekly content brief.

Metrics: MRR $${metrics.mrr.toFixed(0)}, MRR change $${metrics.mrrChange.toFixed(0)}, new signups ${metrics.newSignups}, churn ${metrics.churnThisWeek}
${metrics.topBlogPost ? `Top blog: ${metrics.topBlogPost}` : ''}
Last 3 weeks focus: ${lastBriefs.map((b: Record<string, unknown>) => b.focus_this_week).filter(Boolean).join(' | ') || 'none yet'}
${(metrics.liftAtRiskCount ?? 0) > 0 ? `⚠️ Lift signal: ${metrics.liftAtRiskCount} users at risk of churning this week — content tone should address retention, not just acquisition` : ''}
${metrics.atlasIntel ? `Market intel from Atlas this week:\n${metrics.atlasIntel}` : ''}
${paydaySuperUrgent ? `⚠️ Payday Super deadline in ${daysToPaydaySuper} days — content opportunity` : ''}

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
