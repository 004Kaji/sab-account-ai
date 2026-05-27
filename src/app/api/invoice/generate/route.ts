// ── What this file does ───────────────────────────────────────────────
// This is the server-side "kitchen hatch" for AI invoice generation.
// When the user clicks "Generate Invoice", the browser sends their
// job description text here. This file calls Claude AI and sends
// back structured line items.
//
// ⚠️  This file runs on Vercel's servers — NEVER in the browser.
//     That's how your ANTHROPIC_API_KEY stays secret.
//
// Safe to change:
//   - The prompt text (the instructions sent to Claude)
//   - The model name (e.g. upgrade to a smarter model)
//   - The max_tokens limit (controls max length of Claude's response)
//
// Do NOT change:
//   - The auth check (lines that read the token and verify the user)
//   - The JSON parsing logic at the bottom

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase'

// ── In-memory rate limiter ────────────────────────────────────────────
// Note: resets on each Vercel cold start. Good enough for abuse prevention
// on a small app; for production-scale use Upstash Redis instead.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60 * 60 * 1000 // 1 hour window

function checkRateLimit(userId: string, plan: string): { allowed: boolean; remaining: number } {
  const limit = plan === 'free' ? 5 : 60
  const now = Date.now()
  const entry = rateLimitStore.get(userId)

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

// POST means this route only accepts POST requests (sending data TO the server).
// GET requests (just fetching a page) will be ignored by this route.
export async function POST(req: NextRequest) {
  // Create a connection to the Anthropic (Claude) API using your secret key.
  // process.env.ANTHROPIC_API_KEY reads from your Vercel environment variables —
  // it's never written in the code itself, so it can't leak.
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    // ── SECURITY GATE ─────────────────────────────────────────────────
    // Read the Authorization header — this is the user's "ID card" that
    // the browser sent with the request. It looks like: "Bearer abc123..."
    // We strip the word "Bearer " to get just the token value.
    //
    // ⚠️  NEVER REMOVE THIS BLOCK. Without it, anyone on the internet
    //     could call this route and spend your Anthropic credit for free.
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Verify the token is real by asking Supabase: "who does this ID card belong to?"
    // createServiceClient() uses the master key to ask Supabase directly.
    // If the token is fake, expired, or missing, we stop here and return 401
    // (401 is the standard HTTP code meaning "you need to log in").
    const supabase = createServiceClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // ── RATE LIMIT ────────────────────────────────────────────────────
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    const plan = (profile?.plan as string) ?? 'free'
    const { allowed, remaining } = checkRateLimit(user.id, plan)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait before generating another invoice.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '3600' } },
      )
    }

    // ── READ THE REQUEST BODY ─────────────────────────────────────────
    // The browser sent JSON data. We unpack it to get the "prompt" —
    // the user's job description text (e.g. "Built a deck for 3 days at $550/day").
    const { prompt } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
    }

    // ── CALL CLAUDE AI ────────────────────────────────────────────────
    // Send the job description to Claude Haiku (a fast, affordable Claude model).
    // The "content" field is the full prompt — both our instructions AND the user's text.
    //
    // ✅ Safe to change: the text inside the backtick string (the prompt instructions).
    //    For example, you could add "Always include a 10% markup on materials."
    //
    // ✅ Safe to change: 'claude-haiku-4-5-20251001' to a newer model name if needed.
    //
    // ✅ Safe to change: max_tokens from 1024 to a higher number if responses get cut off.
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

    // ── PARSE CLAUDE'S RESPONSE ───────────────────────────────────────
    // Claude returns plain text. We extract the JSON object from that text
    // using a regex (a pattern that finds text matching a shape).
    // The regex /\{[\s\S]*\}/ means: find the first { and everything until the last }.
    const text = (msg.content[0] as { text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    // JSON.parse converts the JSON text string into a real JavaScript object
    // that the browser can use to fill in the invoice form.
    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)

  } catch (err) {
    // If ANYTHING goes wrong (bad API key, Claude is down, JSON parse failed),
    // we log it on the server and send a safe error message back to the browser.
    // The user sees: "Generation failed" in a red toast notification.
    Sentry.captureException(err, { tags: { feature: 'ai_generation', operation: 'invoice_generate' } })
    console.error('AI generate error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 },
    )
  }
}
