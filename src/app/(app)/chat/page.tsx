'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useProfile } from '@/app/(app)/profile-context'
import { createBrowserClient } from '@/lib/supabase'
import { posthog } from '@/components/PostHogProvider'

// ── Types ─────────────────────────────────────────────────────────────
interface ConfirmCard {
  type: string
  title: string
  rows: [string, string][]
  action: string
  action_payload: Record<string, unknown>
  confirm_label: string
  warning?: string
}

type MessageRole = 'user' | 'assistant'
interface ChatMessage {
  id: string
  role: MessageRole
  text: string
  confirmCard?: ConfirmCard
  toolActivity?: string
  confirmed?: boolean
  kind?: 'chat' | 'reminder'
}

const QUICK_CHIPS = [
  'Business summary this month',
  'How much super do I owe?',
  'What are my BAS obligations?',
  'What is Payday Super?',
  'Create an invoice',
]

// ── Minimal markdown renderer (bold + italic only) ────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i}>{part.slice(1, -1)}</em>
        }
        return part
      })}
    </>
  )
}

// ── Parse confirm_card from assistant text ────────────────────────────
function parseConfirmCard(text: string): { clean: string; card: ConfirmCard | null } {
  const match = text.match(/<confirm_card>([\s\S]*?)<\/confirm_card>/)
  if (!match) return { clean: text, card: null }
  try {
    const card = JSON.parse(match[1].trim()) as ConfirmCard
    const clean = text.replace(/<confirm_card>[\s\S]*?<\/confirm_card>/, '').trim()
    return { clean, card }
  } catch {
    return { clean: text, card: null }
  }
}

// ── Confirm card component ────────────────────────────────────────────
function ConfirmCardUI({ card, onConfirm, confirmed }: { card: ConfirmCard; onConfirm: () => void; confirmed?: boolean }) {
  return (
    <div style={{
      marginTop: '0.75rem',
      background: 'var(--cream)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      overflow: 'hidden',
    }}>
      <div style={{ background: 'var(--char)', padding: '0.75rem 1rem' }}>
        <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>{card.title}</p>
        <p style={{ margin: '0.125rem 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.type}</p>
      </div>
      <div style={{ padding: '0.75rem 1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {card.rows.map(([label, value], i) => (
              <tr key={i} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '0.375rem 0', fontSize: '0.8125rem', color: 'var(--text2)' }}>{label}</td>
                <td style={{ padding: '0.375rem 0', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)', textAlign: 'right' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {card.warning && (
          <p style={{ margin: '0.625rem 0 0', fontSize: '0.75rem', color: 'var(--ember)', background: 'rgba(200,75,47,0.08)', padding: '0.375rem 0.625rem', borderRadius: '6px' }}>
            ⚠ {card.warning}
          </p>
        )}
      </div>
      {!confirmed && (
        <div style={{ padding: '0 1rem 0.875rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onConfirm}
            className="btn btn-ember"
            style={{ flex: 1, fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
          >
            {card.confirm_label || 'Confirm and send →'}
          </button>
        </div>
      )}
      {confirmed && (
        <div style={{ padding: '0 1rem 0.875rem' }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#15803d', fontWeight: 500 }}>
            {card.type === 'super' ? '✓ Recorded' : '✓ Sent'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Typing dots ───────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--text3)',
          animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

// ── SAB avatar ────────────────────────────────────────────────────────
function SabAvatar() {
  return (
    <div style={{
      width: '1.875rem', height: '1.875rem', borderRadius: '50%',
      background: 'var(--char)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ember)',
    }}>
      SAB
    </div>
  )
}

// ── Main chat page ────────────────────────────────────────────────────
export default function ChatPage() {
  useEffect(() => { document.title = 'SAB Chat — SAB Account AI' }, [])

  const profile = useProfile()
  const isAutopilot = profile.plan === 'autopilot'
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [toolActivity, setToolActivity] = useState<string | null>(null)
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Load chat history + credits on mount ─────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setHistoryLoaded(true); return }

      // Fetch credits for non-autopilot users; clear for autopilot to avoid flash
      if (!isAutopilot) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('chat_credits_remaining')
          .eq('id', session.user.id)
          .single()
        setCreditsRemaining(prof?.chat_credits_remaining ?? 5)
      } else {
        setCreditsRemaining(null)
      }

      const { data } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at, tool_calls')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data && data.length > 0) {
        const historical: ChatMessage[] = [...data].reverse().map(m => {
          const { clean, card } = parseConfirmCard(m.content as string)
          const tc = m.tool_calls as { kind?: string } | null
          return {
            id:          m.id as string,
            role:        m.role as MessageRole,
            text:        clean,
            confirmCard: card ?? undefined,
            confirmed:   true,
            kind:        tc?.kind === 'reminder' ? 'reminder' : 'chat',
          }
        })
        setMessages(historical)
      }
      setHistoryLoaded(true)
    }
    load()
  }, [profile.plan])

  // ── Clear chat history ────────────────────────────────────────────
  const clearHistory = useCallback(async () => {
    if (!confirm('Clear all chat history? This cannot be undone.')) return
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('chat_messages').delete().eq('user_id', session.user.id)
    setMessages([])
  }, [])

  // ── Send a message ─────────────────────────────────────────────────
  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    if (posthog.__loaded) posthog.capture('chat_message_sent')
    setLoading(true)
    setToolActivity(null)

    // Build message history for API.
    // Confirm cards are now executed via /api/chat/confirm (bypassing Claude),
    // so we just include the assistant's visible text for context.
    const history = [...messages, userMsg].map(m => ({
      role:    m.role,
      content: m.text || (m.confirmCard ? `[Confirm card shown: "${m.confirmCard.title}"]` : '…'),
    }))

    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string; credits_exhausted?: boolean }
        if (err.credits_exhausted) {
          setCreditsRemaining(0)
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: "You've used all 5 free messages this month. Upgrade to Autopilot for unlimited SAB Chat — payslips, invoices, BAS answers, and proactive reminders. [Upgrade →](/settings?tab=subscription)",
          }])
          setLoading(false)
          setToolActivity(null)
          return
        }
        throw new Error(err.error ?? 'Request failed')
      }

      // Decrement local credit counter for non-autopilot users
      if (!isAutopilot) {
        setCreditsRemaining(prev => prev !== null ? Math.max(0, prev - 1) : null)
      }

      // Stream SSE events
      const reader = res.body!.getReader()
      const dec    = new TextDecoder()
      let   buffer = ''
      let   assistantText = ''
      const assistantId = crypto.randomUUID()

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', text: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += dec.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          let evt: { type: string; text?: string; tool?: string; message?: string } | null = null
          try { evt = JSON.parse(raw) } catch { /* skip malformed JSON */ }
          if (!evt) continue
          if (evt.type === 'text' && evt.text) {
            assistantText += evt.text
            const { clean, card } = parseConfirmCard(assistantText)
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, text: clean, confirmCard: card ?? undefined } : m
            ))
          } else if (evt.type === 'tool_start') {
            setToolActivity(evt.tool ?? null)
          } else if (evt.type === 'tool_end') {
            setToolActivity(null)
          } else if (evt.type === 'error') {
            throw new Error(evt.message ?? 'Stream error')
          }
        }
      }

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong'
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: `Sorry, something went wrong: ${errMsg}` }])
    } finally {
      setLoading(false)
      setToolActivity(null)
      textareaRef.current?.focus()
    }
  }, [messages, loading, isAutopilot])

  // ── Handle confirm card action ─────────────────────────────────────
  // Calls /api/chat/confirm directly — bypasses Claude entirely so it
  // can't re-create the payslip/invoice instead of sending the existing one.
  const handleConfirm = useCallback(async (msgId: string, card: ConfirmCard) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirmed: true } : m))
    setLoading(true)

    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/chat/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body:    JSON.stringify({ action: card.action, action_payload: card.action_payload }),
      })

      const data = await res.json() as Record<string, unknown>

      // Build a human-readable result message from the tool response
      let resultText: string
      if (!res.ok || data.error) {
        resultText = `Sorry, couldn't send — ${String(data.error ?? 'something went wrong')}.`
      } else if (data.already_sent) {
        resultText = `Already sent! ${String(data.message ?? '')}`
      } else if (data.ok && data.payslip_number) {
        resultText = `${String(data.payslip_number)} sent to ${String(data.sent_to)}. ✓`
      } else if (data.ok && data.invoice_number) {
        resultText = `${String(data.invoice_number)} sent to ${String(data.sent_to)}. ✓`
      } else if (data.sent_count != null) {
        resultText = `${String(data.sent_count)} payslips sent. ✓`
      } else if (data.ok && data.super_marked_paid) {
        resultText = String(data.message ?? 'Super recorded. ✓')
      } else {
        resultText = 'Done!'
      }

      // Persist both messages to chat_messages with explicit timestamps 1ms apart
      // to guarantee user message always sorts before assistant message.
      const supabaseSvc = createBrowserClient()
      const confirmMsg  = `Confirmed — ${card.title}`
      const confirmNow  = new Date()
      await supabaseSvc.from('chat_messages').insert([
        { user_id: session.user.id, role: 'user',      content: confirmMsg,  created_at: confirmNow.toISOString() },
        { user_id: session.user.id, role: 'assistant', content: resultText,  created_at: new Date(confirmNow.getTime() + 1).toISOString() },
      ])

      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user',      text: confirmMsg },
        { id: crypto.randomUUID(), role: 'assistant', text: resultText },
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: `Sorry, something went wrong: ${msg}` }])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const isFirstLoad = historyLoaded && messages.length === 0 && !loading

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: '1.25rem 0 0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.125rem', color: 'var(--char)', margin: 0 }}>SAB Chat</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text3)' }}>
            Ask anything about your business. Create payslips and invoices by message.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!isAutopilot && creditsRemaining !== null && (
            <span style={{
              fontSize: '0.75rem',
              color: creditsRemaining === 0 ? 'var(--ember)' : creditsRemaining <= 2 ? '#B8832A' : 'var(--text3)',
              fontWeight: creditsRemaining <= 2 ? 600 : 400,
            }}>
              {creditsRemaining === 0
                ? <><Link href="/settings?tab=subscription" style={{ color: 'var(--ember)', fontWeight: 600 }}>Upgrade to Autopilot</Link> for more messages</>
                : `${creditsRemaining} message${creditsRemaining === 1 ? '' : 's'} left this month`
              }
            </span>
          )}
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              style={{ fontSize: '0.75rem', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              title="Clear chat history"
            >
              Clear history
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {isFirstLoad && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💬</div>
            <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
              Hi, I&apos;m SAB. What do you need done today?
            </p>
            <p style={{ color: 'var(--text3)', fontSize: '0.8125rem' }}>
              I can create payslips, invoices, check your BAS, and answer ATO questions.
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            {msg.role === 'assistant' && <SabAvatar />}
            <div style={{ maxWidth: '82%' }}>
              {msg.kind === 'reminder' && (
                <p style={{
                  margin: '0 0 0.3rem', fontSize: '0.6875rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ember)',
                }}>
                  🔔 Reminder from SAB
                </p>
              )}
              <div style={{
                padding: '0.625rem 0.875rem',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.kind === 'reminder' ? 'rgba(200,75,47,0.06)' : msg.role === 'user' ? 'var(--ember)' : 'var(--cream)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                borderLeft: msg.kind === 'reminder' ? '3px solid var(--ember)' : undefined,
                fontSize: '0.875rem',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.text ? renderMarkdown(msg.text) : (msg.role === 'assistant' && loading && <TypingDots />)}
              </div>
              {msg.confirmCard && (
                <ConfirmCardUI
                  card={msg.confirmCard}
                  confirmed={msg.confirmed}
                  onConfirm={() => handleConfirm(msg.id, msg.confirmCard!)}
                />
              )}
            </div>
          </div>
        ))}

        {loading && toolActivity && (
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
            <SabAvatar />
            <div style={{ padding: '0.5rem 0.875rem', borderRadius: '16px 16px 16px 4px', background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text3)' }}>
              ⚙ {toolActivity.replace(/_/g, ' ')}…
            </div>
          </div>
        )}

        {loading && !toolActivity && messages[messages.length - 1]?.role !== 'assistant' && (
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
            <SabAvatar />
            <div style={{ padding: '0.5rem 0.875rem', borderRadius: '16px 16px 16px 4px', background: 'var(--cream)', border: '1px solid var(--border)' }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick chips (shown only on first load) ── */}
      {isFirstLoad && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingBottom: '0.75rem' }}>
          {QUICK_CHIPS.map(chip => {
            const chipsDisabled = !isAutopilot && creditsRemaining === 0
            return (
              <button
                key={chip}
                onClick={() => send(chip)}
                disabled={chipsDisabled}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '999px',
                  border: '1px solid var(--border)',
                  background: '#fff',
                  fontSize: '0.8125rem',
                  color: chipsDisabled ? 'var(--text3)' : 'var(--char)',
                  cursor: chipsDisabled ? 'not-allowed' : 'pointer',
                  opacity: chipsDisabled ? 0.5 : 1,
                  transition: 'border-color 150ms, background 150ms',
                }}
                onMouseEnter={e => { if (!chipsDisabled) { (e.currentTarget).style.borderColor = 'var(--ember)'; (e.currentTarget).style.color = 'var(--ember)' } }}
                onMouseLeave={e => { if (!chipsDisabled) { (e.currentTarget).style.borderColor = 'var(--border)'; (e.currentTarget).style.color = 'var(--char)' } }}
              >
                {chip}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem', paddingBottom: '1rem', display: 'flex', gap: '0.625rem', alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask SAB anything… (Enter to send, Shift+Enter for new line)"
          disabled={loading || (!isAutopilot && creditsRemaining === 0)}
          style={{
            flex: 1,
            resize: 'none',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '0.625rem 0.875rem',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            outline: 'none',
            background: '#fff',
            color: 'var(--char)',
            transition: 'border-color 150ms',
            overflow: 'hidden',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--ember)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="btn btn-ember"
          style={{ padding: '0.625rem 1.25rem', flexShrink: 0, borderRadius: '12px' }}
        >
          {loading ? <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> : 'Send'}
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text3)', paddingBottom: '0.75rem', margin: 0 }}>
        SAB is not a registered tax agent. For complex tax advice, consult your accountant.
      </p>
    </div>
  )
}
