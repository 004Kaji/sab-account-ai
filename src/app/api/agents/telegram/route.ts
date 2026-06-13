export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { classifyQuestion } from '@/lib/agents/classification'
import { readMasterContext, readAgentLearnings, callClaude, logAgentAction } from '@/lib/agents/toolkits/basnet-toolkit'
import { BASNET_PERSONALITY } from '@/lib/agents/personality'
import { runFlux, fluxDiagnose } from '@/lib/agents/sub/flux'
import { relayAnswer } from '@/lib/agents/sub/relay'
import { runScout } from '@/lib/agents/sub/scout'
import { runLift } from '@/lib/agents/sub/lift'
import { atlasResearch } from '@/lib/agents/sub/atlas'
import { sendTelegramDirect } from '@/lib/agents/utils'
import { createServiceClient } from '@/lib/supabase'

const BOT_TOKEN      = process.env.TELEGRAM_BOT_TOKEN      ?? ''
const ALLOWED_ID     = process.env.TELEGRAM_CHAT_ID        ?? ''
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''

async function sendTyping(chatId: number): Promise<void> {
  if (!BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  }).catch(() => {})
}

// ── Conversation memory ───────────────────────────────────────────────

type ConvHistory = { q: string; a: string }

async function loadHistory(userId: string, limit = 6): Promise<ConvHistory[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('agent_conversations')
    .select('question, answer')
    .eq('source', 'telegram')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (!data) return []
  return data.reverse().map(r => ({ q: r.question, a: r.answer }))
}

function formatHistory(history: ConvHistory[]): string {
  if (!history.length) return ''
  return '\n\nRecent conversation:\n' + history.map(h => `User: ${h.q}\nBasnet: ${h.a}`).join('\n\n')
}

// ── Save conversation to Supabase ────────────────────────────────────

async function saveConversation(question: string, answer: string, agentUsed: string) {
  try {
    const supabase = createServiceClient()
    await supabase.from('agent_conversations').insert({
      question,
      answer,
      agent_name: agentUsed,
      source: 'telegram',
    })
  } catch { /* non-fatal */ }
}

// ── Handle a user message ─────────────────────────────────────────────

async function handleMessage(text: string, history: ConvHistory[] = []): Promise<string> {
  const cls = classifyQuestion(text)

  const [masterContext, learnings] = await Promise.all([
    readMasterContext().catch(() => ''),
    readAgentLearnings(3).catch(() => ''),
  ])
  const learningsCtx = learnings ? `\n\nRecent learnings:\n${learnings}` : ''
  const historyCtx   = formatHistory(history)

  let answer = ''
  let agentUsed = 'basnet'

  if (cls === 'QUALITY') {
    const scout = await runScout()
    const failing = scout.tests.filter(t => !t.pass)
    answer = failing.length === 0
      ? `All ${scout.tests.length} product tests passing.`
      : `${failing.length} failing: ${failing.map(t => `${t.name} — ${t.actual}`).join(', ')}`
    agentUsed = 'scout'

  } else if (cls === 'RETENTION') {
    const lift = await runLift()
    answer = lift.atRiskUsers.length === 0
      ? `No at-risk users. ${lift.upgradeSignals} near upgrade threshold.`
      : `${lift.atRiskUsers.length} at-risk users. Top: ${lift.atRiskUsers[0]?.riskReason ?? 'unknown'}. Action: ${lift.atRiskUsers[0]?.action ?? 'check dashboard'}`
    agentUsed = 'lift'

  } else if (cls === 'BROWSER' || cls === 'EXEC' || cls === 'APP' || cls === 'BUILD') {
    const localUrl = process.env.LOCAL_AGENT_URL ?? 'http://127.0.0.1:3099'
    const secret   = process.env.AGENT_WEBHOOK_SECRET ?? ''
    const macOffMsg = 'Your Mac needs to be on and local-agent running for this task. All cloud questions still work.'

    try {
      if (cls === 'EXEC') {
        // Ask Claude to extract the command then run it
        const cmdRaw = await callClaude({
          systemPrompt: 'Extract the exact shell command the user wants to run. Reply with ONLY the command, nothing else. No markdown, no explanation.',
          userMessage: text,
          maxTokens: 100,
        })
        const res = await fetch(`${localUrl}/exec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-agent-secret': secret },
          body: JSON.stringify({ command: cmdRaw.trim(), cwd: process.env.PROJECT_DIR }),
          signal: AbortSignal.timeout(60000),
        })
        const data = await res.json() as { stdout?: string; stderr?: string; exitCode?: number }
        const out = data.stdout || data.stderr || '(no output)'
        answer = `\`\`\`\n${out.slice(0, 3000)}\n\`\`\`${data.exitCode !== 0 ? `\n⚠️ Exit code: ${data.exitCode}` : ''}`

      } else if (cls === 'APP') {
        // Ask Claude to parse the action + app name
        const parseRaw = await callClaude({
          systemPrompt: 'Parse the user request into JSON. Reply ONLY with: {"action":"open"|"close"|"list","name":"App Name"} — no markdown.',
          userMessage: text,
          maxTokens: 60,
        })
        const parsed = JSON.parse(parseRaw.trim()) as { action: string; name?: string }
        const res = await fetch(`${localUrl}/app`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-agent-secret': secret },
          body: JSON.stringify(parsed),
          signal: AbortSignal.timeout(15000),
        })
        const data = await res.json() as { opened?: string; closed?: string; apps?: string[] }
        if (data.apps)    answer = `Running apps:\n${data.apps.join(', ')}`
        else if (data.opened) answer = `Opened ${data.opened}.`
        else if (data.closed) answer = `Closed ${data.closed}.`
        else answer = 'Done.'

      } else if (cls === 'BUILD') {
        // Route to build pipeline on local-agent
        const res = await fetch(`${localUrl}/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-agent-secret': secret },
          body: JSON.stringify({ task: text }),
          signal: AbortSignal.timeout(300000),
        })
        const data = await res.json() as { answer?: string; url?: string }
        answer = data.answer ?? 'Build task started.'
        if (data.url) answer += `\n\nLive at: ${data.url}`

      } else {
        // BROWSER
        const res = await fetch(`${localUrl}/browse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-agent-secret': secret },
          body: JSON.stringify({ task: text }),
          signal: AbortSignal.timeout(120000),
        })
        const data = await res.json() as { answer?: string }
        answer = data.answer ?? 'Browser task completed.'
      }
    } catch {
      answer = macOffMsg
    }
    agentUsed = cls.toLowerCase()

  } else if (cls === 'AGENT_STATUS') {
    answer = await callClaude({
      systemPrompt: `${BASNET_PERSONALITY}\n\nFull system context — answer only from this, do not invent:\n${masterContext}${historyCtx}`,
      userMessage: text,
      maxTokens: 600,
    })
    agentUsed = 'basnet'

  } else if (cls === 'MARKET') {
    answer = await atlasResearch(text)
    agentUsed = 'atlas'

  } else if (cls === 'SAB_PRODUCT') {
    answer = await fluxDiagnose(text)
    agentUsed = 'flux'

  } else if (cls === 'SAB_MARKETING') {
    answer = await callClaude({
      systemPrompt: `${BASNET_PERSONALITY}\n\nContext: ${masterContext.slice(0, 1500)}${learningsCtx}${historyCtx}`,
      userMessage: text,
      maxTokens: 400,
    })
    agentUsed = 'spark'

  } else if (cls === 'MAC') {
    answer = (await relayAnswer(text, 'local')).answer
    agentUsed = 'relay'

  } else if (cls === 'PERSONAL') {
    answer = (await relayAnswer(text)).answer
    agentUsed = 'relay'

  } else if (cls === 'STRATEGY') {
    const [flux, lift] = await Promise.all([runFlux(), runLift()])
    const ctx = [
      masterContext.slice(0, 1500),
      `Flux: ${flux.overall} — ${flux.sentry.newErrors.length} sentry errors, PAYG ${flux.payg.allPassing ? 'passing' : 'failing'}`,
      `Lift: ${lift.atRiskUsers.length} at-risk users, ${lift.upgradeSignals} upgrade signals`,
    ].join('\n\n')
    answer = await callClaude({
      systemPrompt: `${BASNET_PERSONALITY}\n\n${ctx}${learningsCtx}`,
      userMessage: text,
      maxTokens: 600,
    })
    agentUsed = 'basnet-strategy'

  } else {
    answer = await callClaude({
      systemPrompt: `${BASNET_PERSONALITY}\n\nContext: ${masterContext.slice(0, 2000)}${learningsCtx}${historyCtx}`,
      userMessage: text,
      maxTokens: 500,
    })
  }

  await saveConversation(text, answer, agentUsed)
  await logAgentAction({ agentName: agentUsed, triggerType: 'telegram', actionsTaken: { question: text }, outcome: 'replied' })

  return answer
}

// ── Webhook handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Verify Telegram webhook secret
    const secret = req.headers.get('x-telegram-bot-api-secret-token') ?? ''
    if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const body = await req.json() as TelegramUpdate
    const message = body.message ?? body.edited_message
    if (!message?.text) return NextResponse.json({ ok: true }) // ignore non-text (photos, stickers, etc.)

    const chatId   = message.chat.id
    const fromId   = String(message.from?.id ?? '')
    const text     = message.text.trim()

    // Only respond to your own Telegram account
    if (ALLOWED_ID && fromId !== ALLOWED_ID) {
      await sendTelegramDirect(chatId, 'Unauthorized.')
      return NextResponse.json({ ok: true })
    }

    // /start command
    if (text === '/start') {
      await sendTelegramDirect(chatId, `Basnet online. Ask me anything about SAB Account AI, your personal goals, or your Mac.`)
      return NextResponse.json({ ok: true })
    }

    // /status command — quick health check
    if (text === '/status') {
      const flux = await runFlux().catch(() => null)
      const status = flux
        ? `Overall: ${flux.overall}\nSentry errors: ${flux.sentry.newErrors.length}\nPAYG tests: ${flux.payg.allPassing ? 'passing' : 'failing'}\nStripe webhook: ${flux.stripe.webhookHealthy ? 'healthy' : 'check'}`
        : 'Status unavailable'
      await sendTelegramDirect(chatId, `*System Status*\n${status}`)
      return NextResponse.json({ ok: true })
    }

    // Show typing indicator and keep refreshing it every 4s while agent thinks
    await sendTyping(chatId)
    const typingInterval = setInterval(() => sendTyping(chatId), 4000)

    // Load last 6 messages for conversation memory
    const history = await loadHistory(ALLOWED_ID).catch(() => [] as ConvHistory[])

    const answer = await handleMessage(text, history)
    clearInterval(typingInterval)
    await sendTelegramDirect(chatId, answer)

    return NextResponse.json({ ok: true })

  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ ok: true }) // always 200 to Telegram or it retries forever
  }
}

// ── Types ─────────────────────────────────────────────────────────────

type TelegramUpdate = {
  message?:         TelegramMessage
  edited_message?:  TelegramMessage
}

type TelegramMessage = {
  message_id: number
  from?: { id: number; first_name: string }
  chat:  { id: number }
  text?: string
}
