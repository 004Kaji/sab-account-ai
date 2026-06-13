import { chromium, Browser, BrowserContext, Page } from 'playwright'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Singleton browser — reused across tasks so it stays logged in
let _browser: Browser | null = null
let _context: BrowserContext | null = null
let _page: Page | null = null

async function getPage(): Promise<Page> {
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({ headless: false }) // visible so you can watch it work
    _context = await _browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    _page = await _context.newPage()
  }
  if (!_page || _page.isClosed()) {
    _page = await _context!.newPage()
  }
  return _page
}

async function screenshot(): Promise<string> {
  const page = await getPage()
  const buf = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: false })
  return buf.toString('base64')
}

// Ask Claude what it sees and what action to take next
async function visionStep(task: string, history: string[], imageBase64: string): Promise<{
  observation: string
  action: 'click' | 'type' | 'scroll' | 'navigate' | 'done' | 'extract'
  x?: number
  y?: number
  text?: string
  url?: string
  summary?: string
}> {
  const historyText = history.length ? `\nPrevious steps:\n${history.join('\n')}` : ''

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
        },
        {
          type: 'text',
          text: `You are controlling a browser to complete this task: "${task}"${historyText}

Look at the screenshot and decide the next action. Reply with ONLY valid JSON:
{
  "observation": "what you see on screen in one sentence",
  "action": "click" | "type" | "scroll" | "navigate" | "extract" | "done",
  "x": <click x coordinate if action=click>,
  "y": <click y coordinate if action=click>,
  "text": <text to type if action=type, or extracted summary if action=extract/done>,
  "url": <full URL if action=navigate>
}

Rules:
- Use "extract" when you can see the answer and just need to read it
- Use "done" when the task is complete — put the final answer in "text"
- Use "navigate" to go to a URL directly
- Coordinates are for the 1280x800 viewport`,
        },
      ],
    }],
  })

  const raw = (res.content[0] as { type: string; text: string }).text.trim()
  const json = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(json)
}

// ── Main browser task runner ──────────────────────────────────────────

export async function runBrowserTask(task: string, startUrl?: string): Promise<string> {
  const page = await getPage()
  const history: string[] = []
  const MAX_STEPS = 8

  // Navigate to starting URL if provided
  if (startUrl) {
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    await page.waitForTimeout(1000) // let page settle
    const img = await screenshot()
    const decision = await visionStep(task, history, img)

    history.push(`Step ${step + 1}: ${decision.observation} → ${decision.action}`)

    if (decision.action === 'done' || decision.action === 'extract') {
      return decision.text ?? decision.observation
    }

    if (decision.action === 'navigate' && decision.url) {
      await page.goto(decision.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})

    } else if (decision.action === 'click' && decision.x && decision.y) {
      await page.mouse.click(decision.x, decision.y).catch(() => {})

    } else if (decision.action === 'type' && decision.text) {
      await page.keyboard.type(decision.text).catch(() => {})

    } else if (decision.action === 'scroll') {
      await page.mouse.wheel(0, 600).catch(() => {})
    }
  }

  // Max steps hit — extract whatever is visible
  const img = await screenshot()
  const final = await visionStep(`Summarise what you see relevant to: ${task}`, history, img)
  return final.text ?? final.observation ?? 'Task reached max steps. Check the browser window.'
}

// ── Quick page-text extract (no vision, just DOM — fast & cheap) ──────

export async function extractPageText(url: string): Promise<string> {
  const page = await getPage()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1500)
  // evaluated in browser context — DOM APIs available there, not in Node
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const text = await page.evaluate(new Function(`
    const els = document.querySelectorAll('h1,h2,h3,p,li,span,article')
    return Array.from(els).map(e => e.innerText ? e.innerText.trim() : '').filter(t => t && t.length > 20).slice(0, 60).join('\\n')
  `) as () => string)
  return text.slice(0, 3000)
}

// ── Resolve task intent to URL ────────────────────────────────────────

export function resolveTaskToUrl(task: string): string | undefined {
  const t = task.toLowerCase()
  if (t.includes('facebook'))    return 'https://facebook.com'
  if (t.includes('instagram'))   return 'https://instagram.com'
  if (t.includes('linkedin'))    return 'https://linkedin.com'
  if (t.includes('twitter') || t.includes('x.com')) return 'https://x.com'
  if (t.includes('tiktok'))      return 'https://tiktok.com'
  if (t.includes('stripe'))      return 'https://dashboard.stripe.com'
  if (t.includes('gmail') || t.includes('email')) return 'https://mail.google.com'
  if (t.includes('youtube'))     return 'https://youtube.com'
  if (t.includes('reddit'))      return 'https://reddit.com'
  if (t.includes('google'))      return 'https://google.com'
  if (t.includes('news'))        return 'https://news.ycombinator.com'
  return undefined
}

export async function closeBrowser(): Promise<void> {
  await _browser?.close().catch(() => {})
  _browser = null
  _context = null
  _page    = null
}
