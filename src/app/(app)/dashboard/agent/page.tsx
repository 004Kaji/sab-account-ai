'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────

type AgentBriefing = {
  id: string
  briefing_date: string
  content: string
  sent_to_telegram: boolean
  created_at: string
}

type AgentConversation = {
  id: string
  question: string
  answer: string
  agent_name: string
  created_at: string
}

type ContentBrief = {
  id: string
  week_start: string
  focus_this_week: string | null
  blog_post_title: string | null
  tiktok_hooks: string[] | null
  accountant_email_angle: string | null
  weekly_summary: string | null
}

type OutreachCounts = {
  emailed: number
  replied: number
}

// ── Helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)  return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Main page ─────────────────────────────────────────────────────────

export default function AgentPage() {
  const [briefing, setBriefing]     = useState<AgentBriefing | null>(null)
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [contentBrief, setContentBrief]   = useState<ContentBrief | null>(null)
  const [outreach, setOutreach]           = useState<OutreachCounts>({ emailed: 0, replied: 0 })
  const [loading, setLoading]             = useState(true)
  const [question, setQuestion]           = useState('')
  const [answer, setAnswer]               = useState('')
  const [asking, setAsking]               = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { document.title = 'Basnet Agent — SAB Account AI' }, [])

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()

      const today = new Date().toISOString().split('T')[0]
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const [
        { data: briefingData },
        { data: convData },
        { data: briefData },
        { count: emailedCount },
        { count: repliedCount },
      ] = await Promise.all([
        supabase
          .from('agent_briefings')
          .select('*')
          .eq('briefing_date', today)
          .maybeSingle(),
        supabase
          .from('agent_conversations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('content_briefs')
          .select('*')
          .eq('week_start', weekStartStr)
          .maybeSingle(),
        supabase
          .from('accountant_outreach')
          .select('*', { count: 'exact', head: true })
          .not('emailed_at', 'is', null),
        supabase
          .from('accountant_outreach')
          .select('*', { count: 'exact', head: true })
          .eq('replied', true),
      ])

      setBriefing(briefingData as AgentBriefing | null)
      setConversations((convData ?? []) as AgentConversation[])
      setContentBrief(briefData as ContentBrief | null)
      setOutreach({ emailed: emailedCount ?? 0, replied: repliedCount ?? 0 })
      setLoading(false)
    }
    load()
  }, [])

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || asking) return
    setAsking(true)
    setAnswer('')

    try {
      const res = await fetch('/api/agents/basnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'ask', question }),
      })
      const data = await res.json() as { answer?: string; briefing?: string; summary?: string; error?: string }
      const text = data.answer ?? data.briefing ?? data.summary ?? data.error ?? 'No response'
      setAnswer(text)

      if (data.answer || data.briefing) {
        setConversations(prev => [{
          id: Date.now().toString(),
          question,
          answer: text,
          agent_name: 'basnet',
          created_at: new Date().toISOString(),
        }, ...prev.slice(0, 4)])
      }
    } catch {
      setAnswer('Failed to reach agent. Try again.')
    } finally {
      setAsking(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
      </div>
    )
  }

  return (
    <div className="page-pad" style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Basnet Agent
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
          Your personal AI system — SAB + life, all in one place
        </p>
      </div>

      {/* Ask the agent */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>
          Ask the agent anything
        </h2>
        <form onSubmit={handleAsk}>
          <textarea
            ref={textareaRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void handleAsk(e as unknown as React.FormEvent)
              }
            }}
            placeholder="What should I focus on today? How are signups looking? Is my PAYG logic correct?..."
            rows={3}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.75rem 1rem',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              color: 'var(--char)',
              background: 'var(--cream)',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              outline: 'none',
              marginBottom: '0.75rem',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="btn btn-ember"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem', opacity: asking ? 0.6 : 1 }}
            >
              {asking ? 'Thinking…' : 'Ask'}
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>⌘↵ to send</span>
          </div>
        </form>

        {answer && (
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem 1.25rem',
            background: 'var(--cream)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', marginBottom: '0.5rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Response</p>
            <p style={{ fontSize: '0.9375rem', color: 'var(--char)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{answer}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="agent-grid">

        {/* Today's briefing */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>
            Today&apos;s Briefing
          </h2>
          {briefing ? (
            <>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '0.75rem' }}>
                {formatDate(briefing.briefing_date)} · {briefing.sent_to_telegram ? '✓ sent to Telegram' : 'not sent yet'}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {briefing.content}
              </p>
            </>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>
              No briefing today yet. Trigger morning via webhook or run manually.
            </p>
          )}
        </div>

        {/* This week's content brief */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>
            This Week&apos;s Content Brief
          </h2>
          {contentBrief ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {contentBrief.focus_this_week && (
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Focus</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--char)' }}>{contentBrief.focus_this_week}</p>
                </div>
              )}
              {contentBrief.blog_post_title && (
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Blog Post</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--char)' }}>{contentBrief.blog_post_title}</p>
                </div>
              )}
              {contentBrief.tiktok_hooks && contentBrief.tiktok_hooks.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>TikTok Hooks</p>
                  {contentBrief.tiktok_hooks.slice(0, 2).map((hook, i) => (
                    <p key={i} style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.25rem' }}>
                      &ldquo;{hook}&rdquo;
                    </p>
                  ))}
                </div>
              )}
              {contentBrief.weekly_summary && (
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Summary</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.5 }}>{contentBrief.weekly_summary}</p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>
              No content brief this week yet. Trigger weekly_brief to generate one.
            </p>
          )}
        </div>

        {/* Recent conversations */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>
            Recent Conversations
          </h2>
          {conversations.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>No conversations yet. Ask the agent something above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {conversations.map(conv => (
                <div key={conv.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.875rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', marginBottom: '0.25rem' }}>
                    {timeAgo(conv.created_at)} · {conv.agent_name}
                  </p>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--char)', marginBottom: '0.375rem' }}>
                    Q: {conv.question}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.5 }}>
                    {conv.answer.slice(0, 200)}{conv.answer.length > 200 ? '…' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accountant outreach */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>
            Accountant Outreach
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {outreach.emailed}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.375rem' }}>Emailed</p>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#15803d', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {outreach.replied}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.375rem' }}>Replied</p>
            </div>
          </div>
          {outreach.emailed > 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>
              Reply rate: {outreach.emailed > 0 ? Math.round((outreach.replied / outreach.emailed) * 100) : 0}%
              {outreach.replied === 0 && ' — keep sending, replies take time'}
            </p>
          )}
          {outreach.emailed === 0 && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>
              No accountants in pipeline yet. Add entries to the accountant_outreach table.
            </p>
          )}
        </div>

      </div>

      <style>{`
        @media (max-width: 720px) {
          .agent-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
