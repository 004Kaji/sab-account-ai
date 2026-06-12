export const dynamic = 'force-dynamic'

// Temporary demo endpoint — delete after testing
// Sends one sample accountant email + one sample business email to Sanjog's Gmail

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { callClaude } from '@/lib/agents/toolkits/sab-marketing-toolkit'

function buildEmailHtml(body: string, ctaText: string): string {
  const htmlBody = body
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin:0 0 16px 0;">${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('')
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:24px;color:#222;line-height:1.6;">${htmlBody}<p style="margin:28px 0 0 0;"><a href="https://sabaccountai.com" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">${ctaText}</a></p><p style="margin-top:28px;color:#666;font-size:13px;border-top:1px solid #eee;padding-top:16px;line-height:1.8;">Sanjog Basnet<br>Founder, SAB Account AI<br>0415 304 090 · basnet@sabaccountai.com · sabaccountai.com</p></body></html>`
}

const ACCOUNTANT_SYSTEM = `You write professional B2B cold emails on behalf of Sanjog Basnet, founder of SAB Account AI.
SAB Account AI is an Australian invoicing and payroll SaaS — $9-19/month, 60% cheaper than Xero.
Referral deal: 20% commission on first year + free 60-day trial for referred clients.
Payday Super starts July 28, 2026 — SAB handles this automatically.
STRICT: No buzzwords. Under 150 words. 3 short paragraphs. Do NOT include a signature.`

const BUSINESS_SYSTEM = `You write short casual cold emails on behalf of Sanjog Basnet, founder of SAB Account AI.
SAB Account AI is $9/month for invoicing, payroll, and ATO compliance — 60% cheaper than Xero.
Payday Super starts July 28, 2026 — SAB handles this automatically for employers.
STRICT: Under 100 words. 3 short paragraphs. Casual tone. Do NOT include a signature.`

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'No RESEND_API_KEY' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const sent: string[] = []

  // ── Demo accountant email ─────────────────────────────────────────────
  try {
    const raw = await callClaude({
      systemPrompt: ACCOUNTANT_SYSTEM,
      userMessage: `Write an initial cold email to an accountant.
Accountant: Teresa Ffa
Practice type: Tax Agent & Accountant
Location: Sydney, Australia

Para 1: One sentence on who you are and why you're contacting them.
Para 2: The deal — 20% referral commission on first year + free 60-day trial for any client they refer + SAB Account AI is 60% cheaper than Xero for sole traders.
Para 3: One CTA — ask for a 15-minute call this week.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`,
      maxTokens: 400,
      expectJson: true,
    })

    const { subject, body } = JSON.parse(raw) as { subject: string; body: string }

    await resend.emails.send({
      from:    'Sanjog Basnet <basnet@sabaccountai.com>',
      to:      'sanjog.basnet02@gmail.com',
      subject: `[DEMO - ACCOUNTANT] ${subject}`,
      text:    body,
      html:    buildEmailHtml(body, 'Try it free → sabaccountai.com'),
    })
    sent.push('accountant email')
  } catch (err) {
    console.error('Demo accountant email failed:', err)
  }

  // ── Demo business email ───────────────────────────────────────────────
  try {
    const raw = await callClaude({
      systemPrompt: BUSINESS_SYSTEM,
      userMessage: `Write an initial cold email to a small business owner.
Business: Darwin Plumbing Co
Type: Tradie
Location: Darwin, Australia

Para 1: Payday Super July 28 deadline — why you're reaching out.
Para 2: SAB Account AI handles this automatically — $9/month, 60% cheaper than Xero.
Para 3: 60-day free trial, no credit card needed.
Return ONLY valid JSON: { "subject": "string", "body": "string" }`,
      maxTokens: 300,
      expectJson: true,
    })

    const { subject, body } = JSON.parse(raw) as { subject: string; body: string }

    await resend.emails.send({
      from:    'Sanjog Basnet <basnet@sabaccountai.com>',
      to:      'sanjog.basnet02@gmail.com',
      subject: `[DEMO - BUSINESS] ${subject}`,
      text:    body,
      html:    buildEmailHtml(body, 'Try it free → sabaccountai.com'),
    })
    sent.push('business email')
  } catch (err) {
    console.error('Demo business email failed:', err)
  }

  return NextResponse.json({ sent, message: 'Check sanjog.basnet02@gmail.com' })
}
