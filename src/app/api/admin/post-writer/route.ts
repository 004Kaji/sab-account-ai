import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'

const ADMIN_EMAILS = ['sanjog.basnet02@gmail.com', 'basnet@sabaccountai.com']

function extractFirstJSON(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

const TONE_GUIDE: Record<string, string> = {
  building: 'Raw and honest building-in-public voice. Focus on the journey, small wins, lessons learned. Like a diary entry from a founder.',
  numbers:  'Data-driven and direct. Lead with a number or result. Show the growth. Confident but not boastful.',
  story:    'Personal and story-driven. Start with a moment or feeling. Pull the reader into the founder experience.',
}

const PRODUCT_CONTEXT = `
SAB Account AI (sabaccountai.com) — deep product knowledge:

WHAT IT IS:
- Australian small business invoicing and payroll SaaS
- Built by Sanjog Basnet, a sole trader himself (ABN: 49 541 449 108)
- Bootstrapped, no outside funding, building in public
- Powered by AI (Claude by Anthropic) under the hood

WHO IT'S FOR:
- Australian sole traders, freelancers, independent contractors
- Small business owners who need ATO-compliant invoicing and payroll
- People who find Xero/MYOB too expensive or complicated

KEY FEATURES:
- AI invoice generation — describe a job in plain English, Claude generates professional line items with GST
- Payslip generation with ATO-compliant PAYG withholding calculations
- HELP/HECS repayment calculations (Schedule 8, ATO-accurate)
- Superannuation tracking (11.5% SGC rate, payday super compliance)
- Single Touch Payroll (STP) compliance
- ABN payment tracking
- Tax & Super dashboard
- Client and employee management
- Recurring invoices with auto-send
- Overdue invoice reminders (automated)
- BAS (Business Activity Statement) tracking
- Bank import and AI transaction categorisation
- GST calculations (10%)
- PDF export for invoices and payslips
- Email invoices directly to clients
- Referral system with free months for successful referrals

PRICING (vs competitors):
- SAB Account AI: Free tier / Starter $9/mo / Pro $19/mo
- Xero: $50–70/mo
- MYOB: $30–50/mo
- QuickBooks: $25–45/mo
- SAB Account AI is 3–5x cheaper with AI built in

AUSTRALIAN-SPECIFIC COMPLIANCE:
- ATO tax tables and withholding schedules
- Medicare levy
- HELP/HECS debt repayments
- Super guarantee (SGC)
- GST registration and BAS
- ABN verification

TECH STACK (for developer-audience posts):
- Next.js 15 App Router
- Supabase (auth + database)
- Stripe (subscriptions)
- Claude AI by Anthropic
- Vercel (hosting)
- Resend (emails)

CONTENT ANGLES THAT WORK WELL:
- "I built X because I was frustrated with Y" (personal founder story)
- Australian sole trader tips (educational, high search intent)
- AI + accounting (niche intersection, growing interest)
- Bootstrapped SaaS journey (building in public audience)
- Xero/MYOB comparison (high intent, competitor audience)
- "How [ATO concept] works" explainer content
`

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  if (!ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { bullets, tone } = await req.json()
  if (!bullets?.trim()) return NextResponse.json({ error: 'Bullets required' }, { status: 400 })

  const toneGuide = TONE_GUIDE[tone] ?? TONE_GUIDE.building

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a content strategist and ghostwriter for Sanjog, the founder of SAB Account AI. You know his product deeply.

${PRODUCT_CONTEXT}

TONE FOR THIS BATCH: ${toneGuide}

TODAY'S UPDATES FROM SANJOG:
${bullets}

Generate SIX pieces of content from these updates:

1. LINKEDIN POST (150–300 words)
   - First person, real and specific
   - Paragraph breaks between thoughts
   - Max 2 hashtags, only if natural
   - Never open with "Excited to" or "Thrilled to"
   - Tie to what the audience cares about (freelancers, sole traders, ATO compliance, AI, bootstrapping)

2. X/TWITTER POST (strictly under 270 characters)
   - One punchy hook, no fluff
   - Hashtags only if natural

3. REDDIT POST
   - Reads like a genuine community member, NOT a marketer
   - Lead with a useful insight, story, or question — helpful first
   - Only mention SAB Account AI if it fits naturally (never force it)
   - Conversational, no corporate language
   - Suitable for: r/AustralianBusiness, r/smallbusiness, r/freelanceAU, r/AusFinance
   - 100–200 words, no hashtags
   - Include a suggested subreddit at the top like: "Suggested: r/AustralianBusiness"

4. FACEBOOK POST
   - Casual and personal, like posting on your own profile or a small business group
   - Warmer and more conversational than LinkedIn
   - 80–150 words
   - 1–2 relevant hashtags max
   - Can end with a question to spark comments

5. INSTAGRAM CAPTION
   - Visual storytelling — describe what someone would SEE if this were a photo/reel
   - Hook in the first line (before "more" cutoff)
   - 100–150 words
   - 8–12 relevant hashtags at the end (mix of niche and broad: #AustralianBusiness #SoleTradersAustralia #SmallBizAU #AccountingAI #BuildInPublic etc.)
   - End with a CTA like "Link in bio"

6. VIDEO CONCEPT
   - Pick the best format: "Short/Reel (60s)" or "YouTube (5–8 min)"
   - Scroll-stopping hook (first line someone sees/hears)
   - One-sentence angle
   - 3–4 talking points (bullet form)
   - One clear CTA

Return ONLY valid JSON, no markdown or extra text:
{
  "linkedin": "full linkedin post",
  "twitter": "x post under 270 chars",
  "reddit": "full reddit post with suggested subreddit at top",
  "facebook": "facebook post",
  "instagram": "instagram caption with hashtags",
  "video": {
    "format": "Short/Reel (60s) or YouTube (5–8 min)",
    "hook": "opening line",
    "angle": "one sentence concept",
    "points": ["point 1", "point 2", "point 3"],
    "cta": "call to action"
  }
}`,
    }],
  })

  try {
    const text = (msg.content[0] as { text: string }).text.trim()
    const jsonMatch = extractFirstJSON(text)
    if (!jsonMatch) throw new Error('No JSON in response')
    return NextResponse.json(JSON.parse(jsonMatch))
  } catch {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
