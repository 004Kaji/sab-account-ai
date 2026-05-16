import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    // Require an authenticated user before touching Anthropic API
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const supabase = createServiceClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { prompt } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
    }

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an invoice assistant for an Australian small business. Parse the job description below and return structured invoice line items.

Return ONLY a valid JSON object — no extra text, no markdown:
{
  "line_items": [
    { "description": "string", "qty": number, "unit_price": number, "has_gst": true }
  ],
  "notes": "string or null"
}

Rules:
- Prices are in AUD, EXCLUDING GST (GST is added on top)
- has_gst is true by default (false only for GST-free: residential rent, basic food, medical)
- Split quantities and unit prices when possible (e.g. "3 days at $500" → qty:3, unit_price:500)
- Use qty:1 for lump sums
- Write descriptions clearly and professionally (title case)
- notes should be a short payment or thank-you message, or null

Job description: ${prompt}`,
      }],
    })

    const text = (msg.content[0] as { text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('AI generate error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 },
    )
  }
}
