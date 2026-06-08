export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { sendTelegram, getBaseUrl } from '@/lib/agents/utils'

async function callAgent(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const baseUrl = getBaseUrl()
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return await res.json() as Record<string, unknown>
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      secret?: string
      trigger?: string
      payload?: Record<string, unknown>
    }

    // Validate secret
    const expectedSecret = process.env.AGENT_WEBHOOK_SECRET
    if (!expectedSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 401 })
    }
    if (body.secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
    }

    const trigger = body.trigger ?? ''

    switch (trigger) {
      case 'morning_briefing':
        return NextResponse.json(
          await callAgent('/api/agents/basnet', { trigger: 'morning' })
        )

      case 'weekly_brief':
        return NextResponse.json(
          await callAgent('/api/agents/basnet', { trigger: 'weekly' })
        )

      case 'accountant_emails':
        return NextResponse.json(
          await callAgent('/api/agents/sab/marketing', { trigger: 'accountant_emails' })
        )

      case 'health_check':
        return NextResponse.json(
          await callAgent('/api/agents/sab/product-health', { trigger: 'scheduled' })
        )

      case 'learn':
        return NextResponse.json(
          await callAgent('/api/agents/learn', {})
        )

      case 'visa_check':
        return NextResponse.json(
          await callAgent('/api/agents/personal', { trigger: 'visa' })
        )

      default:
        return NextResponse.json({ error: `Unknown trigger: ${trigger}` }, { status: 400 })
    }

  } catch (err) {
    Sentry.captureException(err, { tags: { agent: 'webhooks' } })
    const msg = err instanceof Error ? err.message : String(err)
    await sendTelegram(`Webhook error: ${msg}`, 'urgent').catch(() => {})
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
