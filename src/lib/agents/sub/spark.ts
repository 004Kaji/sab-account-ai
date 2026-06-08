import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'
import { callClaude, logSubAgent, readMasterContext } from '@/lib/agents/utils'
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
  newSignups:    number
  mrr:           number
  mrrChange:     number
  topBlogPost?:  string
  churnThisWeek: number
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

  const [masterCtx] = await Promise.allSettled([readMasterContext()])
  const master = masterCtx.status === 'fulfilled' ? masterCtx.value.slice(0, 1000) : ''
  const resend = new Resend(process.env.RESEND_API_KEY)
  const names: string[] = []

  for (const accountant of targets as AccountantRow[]) {
    try {
      const emailRaw = await callClaude({
        systemPrompt: `${SPARK_IDENTITY}\n\nContext: ${master}`,
        userMessage: `Write a personalised cold email from Sanjog Basnet, founder of SAB Account AI.
Name: ${accountant.name}
Practice: ${accountant.practice_type ?? 'accounting'}
Location: ${accountant.location ?? 'Australia'}

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
      }).eq('id', accountant.id)

      names.push(accountant.name)
    } catch (err) {
      console.error('sparkSendAccountantEmails failed for', accountant.name, err)
    }
  }

  await logSubAgent('spark', 'accountant_emails', '', `Sent to: ${names.join(', ')}`, Date.now() - start, names.length > 0)
  return { sent: names.length, names }
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
