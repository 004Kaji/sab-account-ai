import { callClaude, logSubAgent } from '@/lib/agents/utils'
import type { WatcherReport } from '@/lib/agents/watcher'

export const SPARK_IDENTITY = `
You are Spark, Basnet's content strategy sub-agent.
Your job: content calendar, TikTok angles, blog topics, and turning SAB metrics into shareable stories.
You understand the Australian small business audience.
You know Sanjog posts on 14hrs/week budget.
You never suggest more than 3 content pieces per week.
`

export interface SparkBrief {
  blogTitle: string
  blogOutline: string[]
  tiktokHook1: string
  tiktokHook2: string
  facebookPostAngle: string
  accountantEmailAngle: string
  weekFocus: string
}

export async function sparkWeeklyBrief(metrics: WatcherReport): Promise<SparkBrief> {
  const start = Date.now()

  const raw = await callClaude({
    systemPrompt: SPARK_IDENTITY,
    userMessage: `Current metrics: ${JSON.stringify({
      mrr: metrics.revenue.mrr,
      newSignups: metrics.product.newSignups,
      totalUsers: metrics.product.activeNow,
    })}

Generate a weekly content brief. Return ONLY valid JSON:
{
  "blogTitle": "exact SEO title",
  "blogOutline": ["H2 1", "H2 2", "H2 3"],
  "tiktokHook1": "best hook",
  "tiktokHook2": "second hook",
  "facebookPostAngle": "angle for FB groups",
  "accountantEmailAngle": "one sentence pitch angle",
  "weekFocus": "one sentence max priority"
}`,
    maxTokens: 500,
    expectJson: true,
  })

  let parsed: SparkBrief
  try {
    parsed = JSON.parse(raw) as SparkBrief
  } catch {
    parsed = {
      blogTitle: 'How to Calculate PAYG Withholding in Australia (2025-26)',
      blogOutline: ['What is PAYG withholding', 'How to calculate it', 'Common mistakes'],
      tiktokHook1: 'Your employer is calculating your tax wrong and here\'s proof',
      tiktokHook2: 'I built an ATO tax calculator and this is what I learned',
      facebookPostAngle: 'ATO compliance question for sole traders',
      accountantEmailAngle: 'Cheaper Xero alternative for your sole trader clients',
      weekFocus: 'Ship one blog post and email two accountants',
    }
  }

  await logSubAgent('spark', 'weekly_brief', '', parsed.weekFocus, Date.now() - start, true)
  return parsed
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
