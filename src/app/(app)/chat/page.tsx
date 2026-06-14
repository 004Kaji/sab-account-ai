'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useProfile } from '@/app/(app)/profile-context'
import { createBrowserClient } from '@/lib/supabase'

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
}

const QUICK_CHIPS = [
  'Business summary this month',
  'How much super do I owe?',
  'What are my BAS obligations?',
  'What is Payday Super?',
  'Create an invoice',
]

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
            ✓ Sent
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
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [toolActivity, setToolActivity] = useState<string | null>(null)
  const [remaining, setRemaining]   = useState<number | null>(null)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Load chat history from Supabase on mount ──────────────────────
  useEffect(() => {
    if (profile.plan !== 'autopilot') return
    const load = async () => {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setHistoryLoaded(true); return }
      const { data } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data && data.length > 0) {
        const historical = [...data].reverse().map(m => ({
          id:   m.id as string,
          role: m.role as MessageRole,
          text: m.content as string,
        }))
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

  // ── Gate: non-autopilot users see upgrade prompt ─────────────────
  if (profile.plan !== 'autopilot') {
    return (
      <div style={{ maxWidth: '560px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
        <h1 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--char)', marginBottom: '0.5rem' }}>SAB Chat</h1>
        <p style={{ color: 'var(--text2)', marginBottom: '0.5rem', lineHeight: 1.6 }}>
          One message. Everything done. SAB Chat lets you create payslips, invoices, and get ATO compliance answers — just by typing.
        </p>
        <p style={{ color: 'var(--text3)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Available on the Autopilot plan ($49/month).
        </p>
        <Link href="/settings?tab=subscription" className="btn btn-ember" style={{ display: 'inline-flex' }}>
          Upgrade to Autopilot →
        </Link>
      </div>
    )
  }

  // ── Send a message ─────────────────────────────────────────────────
  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setToolActivity(null)

    // Build message history for API
    const history = [...messages, userMsg].map(m => ({
      role:    m.role,
      content: m.text,
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
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? 'Request failed')
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
          try {
            const evt = JSON.parse(raw) as { type: string; text?: string; tool?: string; message?: string; remaining?: number }
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
            } else if (evt.type === 'done') {
              setRemaining(evt.remaining ?? null)
            } else if (evt.type === 'error') {
              throw new Error(evt.message ?? 'Stream error')
            }
          } catch { /* skip malformed events */ }
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
  }, [messages, loading])

  // ── Handle confirm card action ─────────────────────────────────────
  const handleConfirm = useCallback(async (msgId: string, card: ConfirmCard) => {
    // Mark this card as confirmed immediately
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirmed: true } : m))

    // Pass the action AND its full payload so Claude knows exactly what to call
    const confirmText = `Confirmed. Call ${card.action} now with this exact payload: ${JSON.stringify(card.action_payload)}`
    await send(confirmText)
  }, [send])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const isFirstLoad = historyLoaded && messages.length === 0 && !loading

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>

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
              <div style={{
                padding: '0.625rem 0.875rem',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? 'var(--ember)' : 'var(--cream)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                fontSize: '0.875rem',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.text || (msg.role === 'assistant' && loading && <TypingDots />)}
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
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => send(chip)}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                background: '#fff',
                fontSize: '0.8125rem',
                color: 'var(--char)',
                cursor: 'pointer',
                transition: 'border-color 150ms, background 150ms',
              }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--ember)'; (e.currentTarget).style.color = 'var(--ember)' }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border)'; (e.currentTarget).style.color = 'var(--char)' }}
            >
              {chip}
            </button>
          ))}
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
          disabled={loading}
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
