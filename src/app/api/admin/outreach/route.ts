import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'
import { checkAdminRateLimit } from '@/lib/ratelimit'
import { ADMIN_EMAILS } from '@/lib/admin'

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

const PRODUCT_CONTEXT = `
SAB Account AI (sabaccountai.com):
- Australian invoicing and payroll SaaS for sole traders, freelancers, small business owners
- Built by Sanjog Basnet — a sole trader himself (ABN: 49 541 449 108), bootstrapped
- Pricing: completely FREE (every feature included) — vs Xero $50-70/mo, MYOB $30-50/mo
- Key features: AI invoice generation, ATO-compliant PAYG withholding, HELP/HECS repayment,
  superannuation tracking (12% SGC from July 2025), STP compliance, BAS tracking, ABN payment tracking,
  recurring invoices, overdue reminders, client management, employee management, PDF export
- 100% free, no credit card required
- No partner/commission program — the product is free, so the pitch is pure value, not rewards
`

const TARGET_CONTEXT: Record<string, string> = {
  accountant: `
TARGET: Accountant or bookkeeper in Australia
- They manage books and tax for 10-100+ small business clients
- Many of their clients are sole traders or small businesses who currently use Xero/MYOB or nothing
- Pain: clients complain about Xero/MYOB cost, especially sole traders who only need basics
- Opportunity: SAB Account AI is a cheaper, simpler alternative they can recommend to suitable clients
- Angle: recommending a free tool positions them as a cost-conscious advisor their clients trust
- Key message: "you can save your sole trader clients money — SAB Account AI is completely free"
`,
  sole_trader: `
TARGET: Australian sole trader or freelancer
- Runs their own business, invoices clients, handles their own payroll/super
- Likely using spreadsheets, Word docs, or paying too much for Xero/MYOB
- Pain: invoicing is manual, payroll calculations are complex (PAYG, HELP, super), worried about ATO compliance
- Key message: "SAB Account AI handles all of this for free, with AI built in"
- Trigger events that work: just registered ABN, just left employment to freelance, mentioned Xero costs
`,
  small_business: `
TARGET: Small business owner in Australia
- Has 1-5 employees, pays wages, invoices B2B clients
- Likely on Xero or MYOB, paying $50-70/mo, frustrated with complexity
- Pain: overpaying for features they don't use, payslips are manual, ATO compliance is stressful
- Key message: "all the compliance features you actually need at a fraction of the price"
`,
}

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rl = await checkAdminRateLimit(user.id)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })

  const { target, context, trigger } = await req.json()
  if (!target) return NextResponse.json({ error: 'Target required' }, { status: 400 })

  // Get Sanjog's referral code to include in outreach
  const { data: refCode } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', user.id)
    .maybeSingle()

  const referralLink = refCode?.code
    ? `https://sabaccountai.com/signup?ref=${refCode.code}`
    : 'https://sabaccountai.com/signup'

  const targetCtx = TARGET_CONTEXT[target] ?? TARGET_CONTEXT.sole_trader

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are writing outreach copy for Sanjog, the founder of SAB Account AI.

${PRODUCT_CONTEXT}

${targetCtx}

${context ? `ADDITIONAL CONTEXT ABOUT THIS RECIPIENT:\n${context}\n` : ''}
${trigger ? `TRIGGER / REASON FOR REACHING OUT:\n${trigger}\n` : ''}

Write TWO pieces of outreach:

1. COLD EMAIL
   - Subject line: specific, not generic, not spammy, no ALL CAPS
   - Body: 150-200 words max
   - Open with something relevant to them specifically (use trigger/context if provided)
   - Lead with their problem or a useful insight — not a pitch
   - Introduce SAB Account AI naturally as the solution
   - CTA must include this referral link naturally: ${referralLink}
   - Sign off as: Sanjog, Founder — SAB Account AI
   - Australian English, warm but professional tone
   - Never say "I hope this email finds you well"

2. SHORT MESSAGE (LinkedIn DM or direct message)
   - 60-100 words max
   - Conversational, feels personal not automated
   - Reference the trigger or context if available
   - Include the referral link naturally: ${referralLink}
   - One specific ask — not vague
   - No formal greeting ("Dear X")
   - Feels like a real person wrote it

Return ONLY valid JSON, no markdown:
{
  "email": {
    "subject": "subject line here",
    "body": "full email body here"
  },
  "message": "short dm/message here"
}`,
    }],
  })

  try {
    const text = (msg.content[0] as { text: string }).text.trim()
    const jsonMatch = extractFirstJSON(text)
    if (!jsonMatch) throw new Error('No JSON in response')
    return NextResponse.json(JSON.parse(jsonMatch))
  } catch (err) {
    console.error('[outreach] Failed to parse Claude response:', err)
    Sentry.captureException(err, { tags: { route: 'admin/outreach' } })
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
