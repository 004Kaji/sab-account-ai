'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────

type SystemStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

type WatcherSummary = {
  revenue?:    { mrr: number; newPaidThisCheck: number; failedPayments: number; churn: number }
  product?:    { newSignups: number; usersAtLimit: number }
  codeHealth?: { allPaygPassing: boolean; newErrors: string[] }
  visa?:       { daysUntilExpiry: number; warnings: string[] }
  growth?:     { onboardingGaps: number; upgradeSignals: number }
  // Legacy shape — kept for backward compat with old saved reports
  visaCompliance?: { daysUntilExpiry: number; warnings: string[] }
  growthSignals?:  { onboardingGaps: number }
}

type AlertRow = {
  id: string
  created_at: string
  alert_key: string
  subject: string
  urgency: string
}

type ConvRow = {
  id: string
  question: string
  answer: string
  agent_name: string
  created_at: string
}

type ContentBrief = {
  focus_this_week: string | null
  blog_post_title: string | null
  tiktok_hooks: string[] | null
  weekly_summary: string | null
}

type SubAgentStatus = Record<string, { lastRun: string; success: boolean }>

type ApprovalItem = {
  id: string
  platform: string
  content: string
  status: string
  createdAt: string
}

type DashboardData = {
  briefing?: { briefing_date: string; content: string; sent_to_telegram: boolean } | null
  conversations?: ConvRow[]
  contentBrief?: ContentBrief | null
  alerts?: AlertRow[]
  subAgentStatus?: SubAgentStatus
  watcher?: { report: WatcherSummary; created_at: string } | null
  outreach?: { emailed: number; replied: number }
  users?: { total: number; paid: number }
  lift?: { atRiskCount?: number; upgradeSignals?: number; onboardingGaps?: number; lastRun?: string } | null
  atlas?: { summary?: string; lastRun?: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function urgencyColor(urgency: string): string {
  if (urgency === 'urgent')  return '#C0392B'
  if (urgency === 'warning') return '#C0550A'
  return '#2E75B6'
}

// ── System status dots ─────────────────────────────────────────────────

function StatusDot({ status, label }: { status: SystemStatus; label: string }) {
  const color = status === 'healthy' ? '#16a34a' : status === 'warning' ? '#d97706' : status === 'critical' ? '#dc2626' : '#9ca3af'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontSize: '0.75rem', color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

function deriveStatus(watcher: WatcherSummary | undefined): Record<string, SystemStatus> {
  if (!watcher) return { revenue: 'unknown', product: 'unknown', code: 'unknown', ato: 'unknown', visa: 'unknown', growth: 'unknown' }
  const visaWarnings = (watcher.visa?.warnings ?? watcher.visaCompliance?.warnings ?? []).length
  const onboardGaps  = watcher.growth?.onboardingGaps ?? watcher.growthSignals?.onboardingGaps ?? 0
  return {
    revenue: (watcher.revenue?.failedPayments ?? 0) > 0 ? 'critical' : (watcher.revenue?.churn ?? 0) > 0 ? 'warning' : 'healthy',
    product: (watcher.product?.newSignups ?? 0) > 0 ? 'healthy' : 'healthy',
    code:    watcher.codeHealth?.allPaygPassing === false ? 'critical' : 'healthy',
    ato:     watcher.codeHealth?.allPaygPassing === false ? 'critical' : 'healthy',
    visa:    visaWarnings > 0 ? 'warning' : 'healthy',
    growth:  onboardGaps > 5 ? 'warning' : 'healthy',
  }
}

// ── Main page ─────────────────────────────────────────────────────────

export default function AgentPage() {
  const [data, setData]             = useState<DashboardData>({})
  const [loading, setLoading]       = useState(true)
  const [question, setQuestion]     = useState('')
  const [exchanges, setExchanges]   = useState<{ q: string; a: string; agent: string }[]>([])
  const [asking, setAsking]         = useState(false)
  const [approvals, setApprovals]   = useState<ApprovalItem[]>([])
  const [approving, setApproving]   = useState<string | null>(null)
  const textareaRef                 = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { document.title = 'Basnet — SAB Account AI' }, [])

  const loadData = useCallback(async () => {
    try {
      const [dashRes, approvalRes] = await Promise.allSettled([
        fetch('/api/agents/dashboard-data'),
        fetch('/api/agents/approvals'),
      ])
      if (dashRes.status === 'fulfilled') {
        const json = await dashRes.value.json() as DashboardData
        setData(json)
      }
      if (approvalRes.status === 'fulfilled') {
        const json = await approvalRes.value.json() as { queue?: ApprovalItem[] }
        setApprovals(json.queue ?? [])
      }
    } catch { /* non-fatal */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [loadData])

  async function handleApproval(id: string, action: 'approve' | 'reject') {
    setApproving(id)
    try {
      await fetch('/api/agents/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      setApprovals(prev => prev.filter(a => a.id !== id))
    } catch { /* non-fatal */ } finally {
      setApproving(null)
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || asking) return
    setAsking(true)
    const q = question
    setQuestion('')
    try {
      const res = await fetch('/api/agents/basnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'ask', question: q }),
      })
      const d = await res.json() as { answer?: string; agentUsed?: string; error?: string }
      setExchanges(prev => [{ q, a: d.answer ?? d.error ?? 'No response', agent: d.agentUsed ?? 'basnet' }, ...prev.slice(0, 4)])
    } catch {
      setExchanges(prev => [{ q, a: 'Failed to reach Basnet.', agent: 'error' }, ...prev.slice(0, 4)])
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

  const watcher     = data.watcher?.report
  const statuses    = deriveStatus(watcher)
  const subAgents   = ['flux', 'scout', 'spark', 'atlas', 'lift', 'relay']
  const lastChecked = data.watcher?.created_at ? timeAgo(data.watcher.created_at) : 'never'

  return (
    <div className="page-pad" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Basnet</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.8125rem' }}>Your co-founder. Always watching.</p>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text3)', alignSelf: 'flex-end' }}>Last checked: {lastChecked}</p>
      </div>

      {/* Section A — Live Status */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1rem 1.5rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>System status</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'revenue', label: 'Revenue' },
            { key: 'product', label: 'Product' },
            { key: 'code',    label: 'Code' },
            { key: 'ato',     label: 'ATO' },
            { key: 'visa',    label: 'Visa' },
            { key: 'growth',  label: 'Growth' },
          ].map(s => <StatusDot key={s.key} status={statuses[s.key] ?? 'unknown'} label={s.label} />)}
        </div>
      </div>

      {/* Section B — Live Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'MRR', value: `$${(watcher?.revenue?.mrr ?? 0).toFixed(0)}` },
          { label: 'Users', value: String(data.users?.total ?? '—') },
          { label: 'Paid', value: String(data.users?.paid ?? '—') },
          { label: 'PAYG', value: watcher?.codeHealth?.allPaygPassing ? '5/5 ✓' : watcher?.codeHealth ? 'failing' : '—' },
          { label: 'Visa days', value: (() => { const d = watcher?.visa?.daysUntilExpiry ?? watcher?.visaCompliance?.daysUntilExpiry; return d && d !== 999 ? String(d) : '—' })() },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0.875rem 1rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: '0.25rem', fontWeight: 500 }}>{m.label}</p>
            <p style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--char)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Section D — Ask Basnet */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Ask Basnet</h2>
        <form onSubmit={handleAsk}>
          <textarea
            ref={textareaRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void handleAsk(e as unknown as React.FormEvent) } }}
            placeholder="What's my MRR? Is PAYG broken? Should I raise prices? What should I focus on today?"
            rows={2}
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9375rem', color: 'var(--char)', background: 'var(--cream)', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none', marginBottom: '0.75rem' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="submit" disabled={asking || !question.trim()} className="btn btn-ember" style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem', opacity: asking ? 0.6 : 1 }}>
              {asking ? 'Thinking…' : 'Ask'}
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>⌘↵ to send</span>
          </div>
        </form>

        {exchanges.length > 0 && (
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {exchanges.map((ex, i) => (
              <div key={i} style={{ padding: '1rem', background: 'var(--cream)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', marginBottom: '0.375rem' }}>Q via {ex.agent}</p>
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--char)', marginBottom: '0.5rem' }}>{ex.q}</p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ex.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="basnet-grid">

        {/* Section B — Today's Briefing */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Today&apos;s Briefing</h2>
          {data.briefing ? (
            <>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '0.75rem' }}>
                {data.briefing.briefing_date} · {data.briefing.sent_to_telegram ? '✓ emailed' : 'not sent'}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.briefing.content}</p>
            </>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>Briefing runs at 7am AEST.</p>
          )}
        </div>

        {/* Section E — Recent Alerts */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Recent Alerts</h2>
          {(data.alerts ?? []).length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>No alerts yet. Watcher will send email alerts when it finds something.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {(data.alerts ?? []).map(alert => (
                <div key={alert.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.625rem 0.75rem', background: 'var(--cream)', borderRadius: '6px', borderLeft: `3px solid ${urgencyColor(alert.urgency)}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--char)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.subject}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text3)', marginTop: '2px' }}>{timeAgo(alert.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section C — This Week's Brief */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>This Week&apos;s Content Brief</h2>
          {data.contentBrief ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.contentBrief.focus_this_week && <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--char)' }}>{data.contentBrief.focus_this_week}</p>}
              {data.contentBrief.blog_post_title && <p style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>Blog: {data.contentBrief.blog_post_title}</p>}
              {data.contentBrief.tiktok_hooks?.[0] && <p style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>Hook: &ldquo;{data.contentBrief.tiktok_hooks[0]}&rdquo;</p>}
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>Brief generates Monday 6am AEST.</p>
          )}
        </div>

        {/* Section — Sub-agent Status (6 agents) */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Sub-agents</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {subAgents.map(name => {
              const status = data.subAgentStatus?.[name]
              const role: Record<string, string> = {
                flux:  'engineering', scout: 'testing',
                spark: 'marketing',  atlas: 'intelligence',
                lift:  'retention',  relay: 'personal ops',
              }
              // Amber if last run > 24h, red if failed, green if recent+passing, grey if never run
              let dotColor = '#9ca3af'
              if (status) {
                const hoursSince = (Date.now() - new Date(status.lastRun).getTime()) / 3600000
                if (!status.success)     dotColor = '#dc2626'
                else if (hoursSince > 24) dotColor = '#d97706'
                else                     dotColor = '#16a34a'
              }
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--char)', textTransform: 'capitalize' }}>{name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{role[name] ?? ''}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
                    {status ? timeAgo(status.lastRun) : 'not run yet'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Section E — User Health (Lift) */}
      {data.lift && (
        <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="basnet-grid">
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>User Health</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(data.lift.atRiskCount ?? 0) > 0 ? (
                <div style={{ padding: '0.75rem 1rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#92400e', margin: 0 }}>
                    {data.lift.atRiskCount} users at risk
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#b45309', margin: '4px 0 0' }}>Check email for breakdown and actions</p>
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>No at-risk users right now.</p>
              )}
              {(data.lift.upgradeSignals ?? 0) > 0 && (
                <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534', margin: 0 }}>
                    {data.lift.upgradeSignals} users ready to upgrade
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#15803d', margin: '4px 0 0' }}>Free users at invoice limit</p>
                </div>
              )}
              {data.lift.lastRun && (
                <p style={{ fontSize: '0.6875rem', color: 'var(--text3)', margin: 0 }}>Last scan: {timeAgo(data.lift.lastRun)}</p>
              )}
            </div>
          </div>

          {/* Section F — Market Intel (Atlas) */}
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Market Intelligence</h2>
            {data.atlas?.summary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6 }}>{data.atlas.summary}</p>
                {data.atlas.lastRun && (
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text3)' }}>Last scan: {timeAgo(data.atlas.lastRun)} · Next: Monday 6am AEST</p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>Atlas runs Monday 6am AEST with web search.</p>
            )}
          </div>
        </div>
      )}

      {/* Section G — Pending Social Approvals */}
      {approvals.length > 0 && (
        <div style={{ marginTop: '1.25rem', background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>
            Pending Posts — {approvals.length} waiting for approval
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {approvals.map(a => (
              <div key={a.id} style={{ padding: '0.875rem 1rem', background: 'var(--cream)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--char)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{a.platform}</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text3)' }}>{timeAgo(a.createdAt)}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>{a.content}</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => void handleApproval(a.id, 'approve')}
                    disabled={approving === a.id}
                    style={{ padding: '0.375rem 0.875rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500, cursor: approving === a.id ? 'not-allowed' : 'pointer', opacity: approving === a.id ? 0.6 : 1 }}
                  >
                    {approving === a.id ? 'Posting…' : 'Approve & Post'}
                  </button>
                  <button
                    onClick={() => void handleApproval(a.id, 'reject')}
                    disabled={approving === a.id}
                    style={{ padding: '0.375rem 0.875rem', background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8125rem', cursor: approving === a.id ? 'not-allowed' : 'pointer' }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .basnet-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
