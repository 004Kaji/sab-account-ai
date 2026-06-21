'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { createBrowserClient } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────

type Stats = {
  mrr: number
  totalUsers: number
  planCounts: { free: number; starter: number; pro: number }
  trialing: number
  pastDue: number
  active: number
  cancelled: number
  newThisWeek: number
  newThisMonth: number
  invoiceCount: number
  payslipCount: number
  recordCount: number
  clientCount: number
  totalReferralSignups: number
  convertedReferrals: number
  topReferrers: TopReferrer[]
}

type TopReferrer = {
  user_id: string
  email: string
  code: string
  total_referrals: number
  converted_referrals: number
  free_months_earned: number
  lifetime_pro: boolean
}

type AdminUser = {
  id: string
  email: string
  plan: 'free' | 'starter' | 'pro'
  subscription_status: string | null
  trial_ends_at: string | null
  billing_cycle_end: string | null
  created_at: string
  business_name: string | null
  industry: string | null
  referral: {
    code: string
    total_referrals: number
    converted_referrals: number
    free_months_earned: number
    lifetime_pro: boolean
  } | null
}

type VideoContent = {
  format: string
  hook: string
  angle: string
  points: string[]
  cta: string
}

type GeneratedContent = {
  linkedin:  string
  twitter:   string
  reddit:    string
  facebook:  string
  instagram: string
  video: VideoContent
}

type OutreachContent = {
  email: { subject: string; body: string }
  message: string
}

// ── Content Queue Types ────────────────────────────────────────────────────

type ContentQueueData = {
  blogPosts:      BlogPost[]
  communityPosts: CommunityPost[]
  tiktokScripts:  TiktokScript[]
  kiteReplies:    KiteReply[]
  emailDrafts:    EmailDraft[]
  outreachStats:  OutreachStats
  bridgeReport:   BridgeReport | null
}

type BlogPost = {
  id: string
  title: string | null
  created_at: string
  content: string
}

type CommunityPost = {
  id: string
  segment: string
  platform: string
  content: string
  created_at: string
}

type TiktokScript = {
  id: string
  segment: string
  hook: string
  script_body: string
  cta: string
  created_at: string
}

type KiteReply = {
  id: string
  source_platform: string
  source_url: string
  original_post_snippet: string | null
  draft_reply: string
  created_at: string
}

type EmailDraft = {
  id: string
  agent: string
  campaign: string
  to_email: string
  to_name: string | null
  subject: string
  body_text: string
  source_table: string
  sequence_step: number | null
  is_follow_up: boolean
  created_at: string
}

type OutreachStats = {
  total:   number
  emailed: number
  replied: number
  pending: number
  tpb:     number
  tavily:  number
  touch1:  number
  touch2:  number
  touch3:  number
}

type BridgeReport = {
  id: string
  created_at: string
  week_starting: string
  accountant_email: string
  referral_count: number
  commission_owed: number
  top_referrer: string | null
}

const OUTREACH_TARGETS = [
  { key: 'accountant',    label: 'Accountant / Bookkeeper' },
  { key: 'sole_trader',   label: 'Sole Trader'             },
  { key: 'small_business', label: 'Small Business Owner'   },
]

const CONTENT_SUBTABS = ['Posts & Video', 'Outreach'] as const
type ContentSubtab = typeof CONTENT_SUBTABS[number]

const TONES = [
  { key: 'building', label: 'Building in public' },
  { key: 'numbers',  label: 'Numbers & growth'   },
  { key: 'story',    label: 'Founder story'       },
]

const TABS = ['Overview', 'Users', 'Referrals', 'Content', 'Content Queue'] as const
type Tab = typeof TABS[number]

const QUEUE_SUBTABS = ['Email Drafts', 'Blog Posts', 'Community', 'TikTok', 'Kite Replies', 'Outreach'] as const
type QueueSubtab = typeof QUEUE_SUBTABS[number]

const PLAN_FILTERS = ['All', 'Free', 'Starter', 'Pro', 'Trialing', 'Past Due'] as const

const PLAN_COLORS: Record<string, { bg: string; color: string }> = {
  free:    { bg: 'rgba(155,148,142,0.15)', color: 'var(--text2)' },
  starter: { bg: 'rgba(201,147,58,0.15)',  color: '#B8832A'      },
  pro:     { bg: 'rgba(200,75,47,0.12)',   color: 'var(--ember)' },
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:    { bg: 'rgba(74,112,85,0.12)',   color: 'var(--sage)'  },
  trialing:  { bg: 'rgba(201,147,58,0.15)',  color: '#B8832A'      },
  past_due:  { bg: 'rgba(200,75,47,0.12)',   color: 'var(--ember)' },
  cancelled: { bg: 'rgba(155,148,142,0.15)', color: 'var(--text3)' },
  inactive:  { bg: 'rgba(155,148,142,0.15)', color: 'var(--text3)' },
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMRR(n: number) {
  return '$' + n.toLocaleString('en-AU')
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const supabase = createBrowserClient()
  const [tab, setTab]             = useState<Tab>('Overview')
  const [stats, setStats]         = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [queueBadge, setQueueBadge] = useState<number | null>(null)

  async function authHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }

  useEffect(() => {
    authHeader().then(h =>
      fetch('/api/admin/stats', { headers: h })
        .then(r => r.json())
        .then(setStats)
        .finally(() => setStatsLoading(false))
    )
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '2.5rem 1.5rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-block', background: 'var(--ember-p)', color: 'var(--ember)',
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', padding: '0.3rem 0.8rem', borderRadius: 20, marginBottom: '0.6rem',
          }}>
            Admin Portal
          </div>
          <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '2rem', color: 'var(--char)', margin: 0 }}>
            SAB Account AI
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '0.6rem 1.25rem',
                border: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.875rem',
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--ember)' : 'var(--text2)',
                cursor: 'pointer',
                borderBottom: tab === t ? '2px solid var(--ember)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.15s',
              }}
            >
              {t}
              {t === 'Content Queue' && queueBadge !== null && queueBadge > 0 && (
                <span style={{ marginLeft: '0.4rem', background: 'var(--ember)', color: 'white', fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 10, verticalAlign: 'middle' }}>
                  {queueBadge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'Overview'  && <OverviewTab  stats={stats} loading={statsLoading} />}
        {tab === 'Users'     && <UsersTab     authHeader={authHeader} />}
        {tab === 'Referrals' && <ReferralsTab stats={stats} loading={statsLoading} />}
        {tab === 'Content'        && <ContentTab      supabase={supabase} />}
        {tab === 'Content Queue'  && <ContentQueueTab authHeader={authHeader} onBadgeCount={setQueueBadge} />}
      </div>
    </div>
  )
}

// ── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />
  if (!stats) return <p style={{ color: 'var(--text2)' }}>Failed to load stats.</p>

  return (
    <div>
      {/* Revenue row */}
      <SectionLabel>Revenue</SectionLabel>
      <div style={gridStyle(4)}>
        <StatCard label="MRR" value={fmtMRR(stats.mrr)} sub="/month" accent />
        <StatCard label="Active Paid" value={stats.active} sub="subscriptions" />
        <StatCard label="Starter" value={stats.planCounts.starter} sub={`× $9 = ${fmtMRR(stats.planCounts.starter * 9)}`} />
        <StatCard label="Pro" value={stats.planCounts.pro} sub={`× $19 = ${fmtMRR(stats.planCounts.pro * 19)}`} />
      </div>

      {/* Users row */}
      <SectionLabel>Users</SectionLabel>
      <div style={gridStyle(4)}>
        <StatCard label="Total Users"   value={stats.totalUsers}    sub="all plans" />
        <StatCard label="New This Week"  value={stats.newThisWeek}   sub="signups" />
        <StatCard label="New This Month" value={stats.newThisMonth}  sub="signups" />
        <StatCard label="Free Users"     value={stats.planCounts.free} sub="not yet paying" />
      </div>

      {/* Status row */}
      <SectionLabel>Subscription Status</SectionLabel>
      <div style={gridStyle(4)}>
        <StatCard label="Trialing"  value={stats.trialing}   sub="in 14-day trial" warn />
        <StatCard label="Past Due"  value={stats.pastDue}    sub="payment failed"  danger />
        <StatCard label="Cancelled" value={stats.cancelled}  sub="churned" />
        <StatCard label="Conversion" value={stats.planCounts.free + stats.planCounts.starter + stats.planCounts.pro > 0
          ? Math.round(((stats.planCounts.starter + stats.planCounts.pro) / stats.totalUsers) * 100) + '%'
          : '0%'} sub="free → paid" />
      </div>

      {/* Activity row */}
      <SectionLabel>Platform Activity</SectionLabel>
      <div style={gridStyle(4)}>
        <StatCard label="Invoices"  value={stats.invoiceCount} sub="total created" />
        <StatCard label="Payslips"  value={stats.payslipCount} sub="total generated" />
        <StatCard label="Records"   value={stats.recordCount}  sub="income & expenses" />
        <StatCard label="Clients"   value={stats.clientCount}  sub="across all users" />
      </div>

      {/* Referrals row */}
      <SectionLabel>Referrals</SectionLabel>
      <div style={gridStyle(3)}>
        <StatCard label="Total Signups via Referral" value={stats.totalReferralSignups} sub="referred signups" />
        <StatCard label="Converted Referrals"        value={stats.convertedReferrals}   sub="paid after referral" />
        <StatCard label="Referral Conv. Rate"
          value={stats.totalReferralSignups > 0
            ? Math.round((stats.convertedReferrals / stats.totalReferralSignups) * 100) + '%'
            : '0%'}
          sub="signup → paid"
        />
      </div>
    </div>
  )
}

// ── Users Tab ──────────────────────────────────────────────────────────────

function UsersTab({ authHeader }: { authHeader: () => Promise<Record<string, string>> }) {
  const [users, setUsers]   = useState<AdminUser[]>([])
  const [filter, setFilter] = useState<string>('All')
  const [loading, setLoading] = useState(true)

  const load = useCallback((f: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (f === 'Trialing')  params.set('status', 'trialing')
    else if (f === 'Past Due') params.set('status', 'past_due')
    else if (f !== 'All')  params.set('plan', f.toLowerCase())

    authHeader().then(h =>
      fetch(`/api/admin/users?${params}`, { headers: h })
        .then(r => r.json())
        .then(d => setUsers(d.users ?? []))
        .finally(() => setLoading(false))
    )
  }, [])

  useEffect(() => { load('All') }, [])

  function handleFilter(f: string) {
    setFilter(f)
    load(f)
  }

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {PLAN_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
            style={{
              padding: '0.35rem 0.9rem', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
              border: filter === f ? '1.5px solid var(--ember)' : '1.5px solid var(--border)',
              background: filter === f ? 'var(--ember-p)' : 'white',
              color: filter === f ? 'var(--ember)' : 'var(--text2)',
              fontFamily: 'var(--font-dm-sans)', fontWeight: filter === f ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {f}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text3)', alignSelf: 'center' }}>
          {loading ? 'Loading…' : `${users.length} users`}
        </span>
      </div>

      {/* Table */}
      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 'var(--r2)', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
                {['Email', 'Business', 'Plan', 'Status', 'Referrals', 'Joined'].map(h => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem', textAlign: 'left',
                    fontWeight: 600, color: 'var(--text2)',
                    fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text3)' }}>Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text3)' }}>No users found.</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--char)', fontFamily: 'var(--font-dm-sans)' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)' }}>
                    {u.business_name ?? <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <Badge
                      label={u.plan}
                      bg={PLAN_COLORS[u.plan]?.bg}
                      color={PLAN_COLORS[u.plan]?.color}
                    />
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {u.subscription_status ? (
                      <Badge
                        label={u.subscription_status.replace('_', ' ')}
                        bg={STATUS_COLORS[u.subscription_status]?.bg}
                        color={STATUS_COLORS[u.subscription_status]?.color}
                      />
                    ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)', textAlign: 'center' }}>
                    {u.referral ? (
                      <span title={`Code: ${u.referral.code}`}>
                        {u.referral.converted_referrals}/{u.referral.total_referrals}
                        {u.referral.lifetime_pro && ' ⭐'}
                      </span>
                    ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {fmtDate(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Referrals Tab ──────────────────────────────────────────────────────────

function ReferralsTab({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />
  if (!stats)  return <p style={{ color: 'var(--text2)' }}>Failed to load.</p>

  const convRate = stats.totalReferralSignups > 0
    ? Math.round((stats.convertedReferrals / stats.totalReferralSignups) * 100)
    : 0

  return (
    <div>
      {/* Summary */}
      <div style={gridStyle(3)}>
        <StatCard label="Total Referred Signups" value={stats.totalReferralSignups} sub="all time" />
        <StatCard label="Converted to Paid"      value={stats.convertedReferrals}   sub="after referral" accent />
        <StatCard label="Conversion Rate"         value={convRate + '%'}              sub="signup → paid" />
      </div>

      {/* Top referrers */}
      <SectionLabel>Top Referrers</SectionLabel>
      {stats.topReferrers.length === 0 ? (
        <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>No referrals yet.</p>
      ) : (
        <div style={{
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 'var(--r2)', overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
                {['Referrer', 'Code', 'Signups', 'Converted', 'Free Months', 'Reward'].map(h => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem', textAlign: 'left',
                    fontWeight: 600, color: 'var(--text2)',
                    fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.topReferrers.map((r, i) => (
                <tr key={r.user_id} style={{ borderBottom: i < stats.topReferrers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--char)' }}>{r.email}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <code style={{
                      background: 'var(--cream)', padding: '0.2rem 0.5rem',
                      borderRadius: 4, fontSize: '0.8rem', color: 'var(--text2)',
                      fontFamily: 'var(--font-jetbrains)',
                    }}>
                      {r.code}
                    </code>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--char)', textAlign: 'center' }}>{r.total_referrals}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--sage)', fontWeight: 600, textAlign: 'center' }}>{r.converted_referrals}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)', textAlign: 'center' }}>{r.free_months_earned}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {r.lifetime_pro
                      ? <Badge label="Lifetime Pro ⭐" bg="rgba(200,75,47,0.12)" color="var(--ember)" />
                      : r.free_months_earned > 0
                      ? <Badge label={`${r.free_months_earned} mo free`} bg="rgba(74,112,85,0.12)" color="var(--sage)" />
                      : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Content Tab ────────────────────────────────────────────────────────────

function ContentTab({ supabase }: { supabase: ReturnType<typeof createBrowserClient> }) {
  const [subtab, setSubtab] = useState<ContentSubtab>('Posts & Video')

  return (
    <div>
      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {CONTENT_SUBTABS.map(t => (
          <button
            key={t}
            onClick={() => setSubtab(t)}
            style={{
              padding: '0.45rem 1.1rem', borderRadius: 20, fontSize: '0.85rem', cursor: 'pointer',
              border: subtab === t ? '1.5px solid var(--ember)' : '1.5px solid var(--border)',
              background: subtab === t ? 'var(--ember-p)' : 'white',
              color: subtab === t ? 'var(--ember)' : 'var(--text2)',
              fontFamily: 'var(--font-dm-sans)', fontWeight: subtab === t ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {subtab === 'Posts & Video' && <PostsSection supabase={supabase} />}
      {subtab === 'Outreach'      && <OutreachSection supabase={supabase} />}
    </div>
  )
}

function PostsSection({ supabase }: { supabase: ReturnType<typeof createBrowserClient> }) {
  const [bullets, setBullets] = useState('')
  const [tone, setTone]       = useState('building')
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<GeneratedContent | null>(null)
  const [error, setError]     = useState('')

  async function generate() {
    if (!bullets.trim()) return
    setLoading(true); setError(''); setContent(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/post-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ bullets, tone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setContent(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.6rem' }}>
          What happened today?
        </label>
        <textarea
          value={bullets}
          onChange={e => setBullets(e.target.value)}
          placeholder={"- Shipped payslip export fix\n- 3 new signups this week\n- Fixed a GST rounding bug\n- Replied to 5 Reddit threads"}
          rows={6}
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0.85rem 1rem', fontFamily: 'var(--font-dm-sans)', fontSize: '0.9rem', color: 'var(--char)', resize: 'vertical', outline: 'none', lineHeight: 1.65, transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = 'var(--ember)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <div style={{ marginTop: '1.25rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', margin: '0 0 0.6rem' }}>Tone</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {TONES.map(t => (
              <button key={t.key} onClick={() => setTone(t.key)} style={{ padding: '0.4rem 1rem', borderRadius: 20, fontSize: '0.82rem', cursor: 'pointer', border: tone === t.key ? '1.5px solid var(--ember)' : '1.5px solid var(--border)', background: tone === t.key ? 'var(--ember-p)' : 'transparent', color: tone === t.key ? 'var(--ember)' : 'var(--text2)', fontFamily: 'var(--font-dm-sans)', fontWeight: tone === t.key ? 600 : 400, transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={generate} disabled={loading || !bullets.trim()} style={{ padding: '0.75rem 2rem', background: loading || !bullets.trim() ? 'var(--border)' : 'var(--ember)', color: loading || !bullets.trim() ? 'var(--text3)' : 'white', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--font-dm-sans)', fontWeight: 600, fontSize: '0.9rem', cursor: loading || !bullets.trim() ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {loading ? 'Generating…' : 'Generate All'}
          </button>
          {error && <span style={{ fontSize: '0.85rem', color: 'var(--ember)' }}>{error}</span>}
        </div>
      </div>
      {content && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <PostCard platform="LinkedIn"    text={content.linkedin} />
          <PostCard platform="X (Twitter)" text={content.twitter} showCount />
          <PostCard platform="Reddit"      text={content.reddit} />
          <PostCard platform="Facebook"    text={content.facebook} />
          <PostCard platform="Instagram"   text={content.instagram} />
          <VideoCard video={content.video} />
        </div>
      )}
    </div>
  )
}

function OutreachSection({ supabase }: { supabase: ReturnType<typeof createBrowserClient> }) {
  const [target, setTarget]   = useState('accountant')
  const [context, setContext] = useState('')
  const [trigger, setTrigger] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<OutreachContent | null>(null)
  const [error, setError]     = useState('')

  async function generate() {
    setLoading(true); setError(''); setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ target, context, trigger }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* Target */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--char)', margin: '0 0 0.6rem' }}>Who are you reaching out to?</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {OUTREACH_TARGETS.map(t => (
              <button key={t.key} onClick={() => setTarget(t.key)} style={{ padding: '0.4rem 1rem', borderRadius: 20, fontSize: '0.82rem', cursor: 'pointer', border: target === t.key ? '1.5px solid var(--ember)' : '1.5px solid var(--border)', background: target === t.key ? 'var(--ember-p)' : 'transparent', color: target === t.key ? 'var(--ember)' : 'var(--text2)', fontFamily: 'var(--font-dm-sans)', fontWeight: target === t.key ? 600 : 400, transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trigger */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.4rem' }}>
            Why are you reaching out? <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            value={trigger}
            onChange={e => setTrigger(e.target.value)}
            placeholder={target === 'accountant'
              ? 'e.g. They posted about helping small business clients with tax'
              : 'e.g. Just registered an ABN, mentioned Xero is too expensive'}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0.7rem 1rem', fontFamily: 'var(--font-dm-sans)', fontSize: '0.88rem', color: 'var(--char)', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = 'var(--ember)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Context */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.4rem' }}>
            Anything specific about this person? <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder={target === 'accountant'
              ? 'e.g. Sarah, manages books for 40+ small businesses in Melbourne, active on LinkedIn'
              : 'e.g. Freelance graphic designer, just went sole trader, based in Sydney'}
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0.7rem 1rem', fontFamily: 'var(--font-dm-sans)', fontSize: '0.88rem', color: 'var(--char)', resize: 'vertical', outline: 'none', lineHeight: 1.6, transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = 'var(--ember)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={generate} disabled={loading} style={{ padding: '0.75rem 2rem', background: loading ? 'var(--border)' : 'var(--ember)', color: loading ? 'var(--text3)' : 'white', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--font-dm-sans)', fontWeight: 600, fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {loading ? 'Writing…' : 'Generate Email + Message'}
          </button>
          {error && <span style={{ fontSize: '0.85rem', color: 'var(--ember)' }}>{error}</span>}
        </div>
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Cold Email */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cold Email</span>
              <CopyButton text={`Subject: ${result.email.subject}\n\n${result.email.body}`} />
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0.6rem 1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Subject</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--char)', margin: 0 }}>{result.email.subject}</p>
              </div>
              <TextWithLinks text={result.email.body} />
            </div>
          </div>

          {/* Short Message */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>LinkedIn DM / Direct Message</span>
              <CopyButton text={result.message} />
            </div>
            <div style={{ padding: '1.5rem' }}>
              <TextWithLinks text={result.message} />
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: 'var(--text3)' }}>
                {result.message.length} characters
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared UI components ───────────────────────────────────────────────────

// ── Shared UI components ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      margin: '1.5rem 0 0.75rem',
    }}>
      {children}
    </p>
  )
}

function gridStyle(cols: number): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: '0.75rem',
  }
}

function StatCard({ label, value, sub, accent, warn, danger }: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  warn?: boolean
  danger?: boolean
}) {
  const color = danger ? 'var(--ember)' : warn ? '#B8832A' : accent ? 'var(--char)' : 'var(--char)'
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 'var(--r2)', padding: '1.25rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>
        {label}
      </p>
      <p style={{ fontSize: accent ? '1.75rem' : '1.5rem', fontWeight: 700, color, margin: '0 0 0.2rem', fontFamily: accent ? 'var(--font-fraunces)' : undefined }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text3)', margin: 0 }}>{sub}</p>}
    </div>
  )
}

function Badge({ label, bg, color }: { label: string; bg?: string; color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      background: bg ?? 'var(--cream)',
      color: color ?? 'var(--text2)',
      fontSize: '0.72rem', fontWeight: 600,
      padding: '0.2rem 0.6rem', borderRadius: 10,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// Module-level — no /g flag so .test() has no lastIndex side-effects
const URL_RE = /(https?:\/\/[^\s]+)/

function TextWithLinks({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'var(--font-dm-sans)', fontSize: '0.92rem', color: 'var(--char)', lineHeight: 1.75 }}>
      {parts.map((part, i) =>
        URL_RE.test(part)
          ? <span key={i} style={{ color: 'var(--ember)', fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'rgba(200,75,47,0.35)' }}>{part}</span>
          : part
      )}
    </pre>
  )
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{ padding: '0.3rem 1rem', borderRadius: 'var(--r)', fontSize: '0.78rem', cursor: 'pointer', border: '1px solid var(--border)', background: copied ? 'var(--ember-p)' : 'white', color: copied ? 'var(--ember)' : 'var(--text2)', fontFamily: 'var(--font-dm-sans)', fontWeight: 600, transition: 'all 0.15s' }}>
      {copied ? 'Copied!' : (label ?? 'Copy')}
    </button>
  )
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
    </div>
  )
}

const PLATFORM_COLORS: Record<string, { dot: string }> = {
  'LinkedIn':    { dot: '#0A66C2' },
  'X (Twitter)': { dot: '#000000' },
  'Reddit':      { dot: '#FF4500' },
  'Facebook':    { dot: '#1877F2' },
  'Instagram':   { dot: '#E1306C' },
}

function PostCard({ platform, text, showCount }: { platform: string; text: string; showCount?: boolean }) {
  const isOver = showCount && text.length > 270
  const color = PLATFORM_COLORS[platform]?.dot ?? 'var(--text2)'

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{platform}</span>
        </div>
        <CopyButton text={text} />
      </div>
      <div style={{ padding: '1.5rem' }}>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'var(--font-dm-sans)', fontSize: '0.92rem', color: 'var(--char)', lineHeight: 1.75 }}>{text}</pre>
        {showCount && <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: isOver ? 'var(--ember)' : 'var(--text3)' }}>{text.length} / 270 chars{isOver ? ' — too long, regenerate' : ''}</p>}
      </div>
    </div>
  )
}

function VideoCard({ video }: { video: VideoContent }) {
  const [copied, setCopied] = useState(false)
  const fullText = `FORMAT: ${video.format}\n\nHOOK: ${video.hook}\n\nANGLE: ${video.angle}\n\nTALKING POINTS:\n${video.points.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nCTA: ${video.cta}`

  async function copy() {
    await navigator.clipboard.writeText(fullText)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Video Concept</span>
          <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: 10 }}>{video.format}</span>
        </div>
        <button onClick={copy} style={{ padding: '0.3rem 1rem', borderRadius: 'var(--r)', fontSize: '0.78rem', cursor: 'pointer', border: '1px solid var(--border)', background: copied ? 'var(--ember-p)' : 'white', color: copied ? 'var(--ember)' : 'var(--text2)', fontFamily: 'var(--font-dm-sans)', fontWeight: 600, transition: 'all 0.15s' }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>Hook</p>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--char)', margin: 0, lineHeight: 1.5 }}>&ldquo;{video.hook}&rdquo;</p>
        </div>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>Angle</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>{video.angle}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.6rem' }}>Talking Points</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {video.points.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.72rem', fontWeight: 700, width: '1.4rem', height: '1.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>{i + 1}</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>{point}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0.85rem 1rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.3rem' }}>CTA</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--char)', margin: 0, fontWeight: 500 }}>{video.cta}</p>
        </div>
      </div>
    </div>
  )
}

// ── Content Queue Tab ──────────────────────────────────────────────────────

function ContentQueueTab({
  authHeader,
  onBadgeCount,
}: {
  authHeader: () => Promise<Record<string, string>>
  onBadgeCount: (n: number) => void
}) {
  const [subtab, setSubtab]   = useState<QueueSubtab>('Blog Posts')
  const [data, setData]       = useState<ContentQueueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const h = await authHeader()
      const res = await fetch('/api/admin/content-queue', { headers: h })
      const d = await res.json() as ContentQueueData
      setData(d)
      onBadgeCount(
        (d.emailDrafts?.length ?? 0) +
        (d.blogPosts?.length ?? 0) +
        (d.communityPosts?.length ?? 0) +
        (d.tiktokScripts?.length ?? 0) +
        (d.kiteReplies?.length ?? 0),
      )
    } catch {
      // ignore — show stale data or null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function doAction(action: string, id: string, table: string) {
    setActing(id)
    try {
      const h = await authHeader()
      const isEmailDraftAction = action === 'send' || (action === 'dismiss' && table === 'email_drafts')
      await fetch(isEmailDraftAction ? '/api/admin/email-drafts' : '/api/admin/content-queue', {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: isEmailDraftAction
          ? JSON.stringify({ action, id })
          : JSON.stringify({ action, id, table }),
      })
      await load()
    } finally {
      setActing(null)
    }
  }

  if (loading && !data) return <LoadingSpinner />
  if (!data) return <p style={{ color: 'var(--text2)' }}>Failed to load queue.</p>

  const subCounts: Record<QueueSubtab, number> = {
    'Email Drafts': data.emailDrafts?.length ?? 0,
    'Blog Posts':   data.blogPosts.length,
    'Community':    data.communityPosts.length,
    'TikTok':       data.tiktokScripts.length,
    'Kite Replies': data.kiteReplies.length,
    'Outreach':     0,
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {QUEUE_SUBTABS.map(t => {
          const count = subCounts[t]
          const active = subtab === t
          return (
            <button
              key={t}
              onClick={() => setSubtab(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 1.1rem', borderRadius: 20, fontSize: '0.85rem', cursor: 'pointer',
                border: active ? '1.5px solid var(--ember)' : '1.5px solid var(--border)',
                background: active ? 'var(--ember-p)' : 'white',
                color: active ? 'var(--ember)' : 'var(--text2)',
                fontFamily: 'var(--font-dm-sans)', fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {t}
              {count > 0 && (
                <span style={{
                  background: active ? 'var(--ember)' : 'rgba(200,75,47,0.15)',
                  color: active ? 'white' : 'var(--ember)',
                  fontSize: '0.65rem', fontWeight: 700,
                  padding: '0.1rem 0.45rem', borderRadius: 10, lineHeight: 1,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {subtab === 'Email Drafts' && <EmailDraftsQueue  drafts={data.emailDrafts ?? []} acting={acting} onAction={doAction} />}
      {subtab === 'Blog Posts'   && <BlogPostsQueue   posts={data.blogPosts}          acting={acting} onAction={doAction} />}
      {subtab === 'Community'    && <CommunityQueue   posts={data.communityPosts}      acting={acting} onAction={doAction} />}
      {subtab === 'TikTok'       && <TikTokQueue      scripts={data.tiktokScripts}     acting={acting} onAction={doAction} />}
      {subtab === 'Kite Replies' && <KiteQueue        replies={data.kiteReplies}       acting={acting} onAction={doAction} />}
      {subtab === 'Outreach'     && <OutreachStatsView stats={data.outreachStats}      report={data.bridgeReport} />}
    </div>
  )
}

// ── Shared queue helpers ───────────────────────────────────────────────────

function EmptyQueue() {
  return (
    <div style={{
      padding: '3rem', textAlign: 'center',
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 'var(--r2)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <p style={{ color: 'var(--text3)', fontSize: '0.9rem', margin: 0 }}>
        No items waiting for review ✓
      </p>
    </div>
  )
}

function QueueActionBtn({
  label, color, disabled, onClick,
}: {
  label: string; color: 'green' | 'red'; disabled: boolean; onClick: () => void
}) {
  const g = color === 'green'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.3rem 0.85rem', borderRadius: 'var(--r)',
        fontSize: '0.78rem', fontFamily: 'var(--font-dm-sans)', fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
        border: g ? '1px solid rgba(74,112,85,0.35)' : '1px solid rgba(200,75,47,0.35)',
        background: g ? 'rgba(74,112,85,0.08)' : 'rgba(200,75,47,0.08)',
        color: g ? 'var(--sage)' : 'var(--ember)',
        opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

const Q_TH: React.CSSProperties = {
  padding: '0.75rem 1rem', textAlign: 'left',
  fontWeight: 600, color: 'var(--text2)',
  fontSize: '0.75rem', letterSpacing: '0.05em',
  textTransform: 'uppercase', whiteSpace: 'nowrap',
}

const Q_CARD: React.CSSProperties = {
  background: 'white', border: '1px solid var(--border)',
  borderRadius: 'var(--r2)', overflow: 'hidden',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
}

// ── Blog Posts queue ───────────────────────────────────────────────────────

function BlogPostsQueue({
  posts, acting, onAction,
}: {
  posts: BlogPost[]
  acting: string | null
  onAction: (action: string, id: string, table: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (posts.length === 0) return <EmptyQueue />
  return (
    <div style={Q_CARD}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
            {['Title', 'Created', 'Actions'].map(h => <th key={h} style={Q_TH}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {posts.map(p => (
            <Fragment key={p.id}>
              <tr
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                <td style={{ padding: '0.85rem 1rem', color: 'var(--char)', fontWeight: 500 }}>
                  <span style={{ marginRight: '0.5rem', color: 'var(--text3)', fontSize: '0.7rem' }}>
                    {expanded === p.id ? '▼' : '▶'}
                  </span>
                  {p.title ?? <em style={{ color: 'var(--text3)' }}>Untitled</em>}
                </td>
                <td style={{ padding: '0.85rem 1rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                  {fmtDate(p.created_at)}
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <QueueActionBtn label="Publish" color="green" disabled={acting === p.id} onClick={() => onAction('publish', p.id, 'blog_posts')} />
                    <QueueActionBtn label="Dismiss" color="red"   disabled={acting === p.id} onClick={() => onAction('dismiss', p.id, 'blog_posts')} />
                  </div>
                </td>
              </tr>
              {expanded === p.id && (
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
                  <td colSpan={3} style={{ padding: '1.25rem 1.5rem' }}>
                    <pre style={{
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                      fontFamily: 'var(--font-dm-sans)', fontSize: '0.88rem',
                      color: 'var(--char)', lineHeight: 1.7, maxHeight: 400, overflowY: 'auto',
                    }}>
                      {p.content}
                    </pre>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Community Posts queue ──────────────────────────────────────────────────

function CommunityQueue({
  posts, acting, onAction,
}: {
  posts: CommunityPost[]
  acting: string | null
  onAction: (action: string, id: string, table: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (posts.length === 0) return <EmptyQueue />
  return (
    <div style={Q_CARD}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
            {['Segment', 'Platform', 'Preview', 'Created', 'Actions'].map(h => <th key={h} style={Q_TH}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {posts.map(p => (
            <Fragment key={p.id}>
              <tr
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                <td style={{ padding: '0.85rem 1rem', color: 'var(--char)' }}>
                  <span style={{ marginRight: '0.4rem', color: 'var(--text3)', fontSize: '0.7rem' }}>
                    {expanded === p.id ? '▼' : '▶'}
                  </span>
                  {p.segment.replace(/_/g, ' ')}
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <Badge label={p.platform} />
                </td>
                <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)', maxWidth: 240 }}>
                  {p.content.slice(0, 80)}{p.content.length > 80 ? '…' : ''}
                </td>
                <td style={{ padding: '0.85rem 1rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                  {fmtDate(p.created_at)}
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <QueueActionBtn label="Mark Posted" color="green" disabled={acting === p.id} onClick={() => onAction('posted', p.id, 'community_posts')} />
                    <QueueActionBtn label="Dismiss"     color="red"   disabled={acting === p.id} onClick={() => onAction('dismiss', p.id, 'community_posts')} />
                  </div>
                </td>
              </tr>
              {expanded === p.id && (
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
                  <td colSpan={5} style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                      <CopyButton text={p.content} />
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'var(--font-dm-sans)', fontSize: '0.88rem', color: 'var(--char)', lineHeight: 1.7 }}>
                      {p.content}
                    </pre>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── TikTok Scripts queue ───────────────────────────────────────────────────

function TikTokQueue({
  scripts, acting, onAction,
}: {
  scripts: TiktokScript[]
  acting: string | null
  onAction: (action: string, id: string, table: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (scripts.length === 0) return <EmptyQueue />
  return (
    <div style={Q_CARD}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
            {['Segment', 'Hook', 'Created', 'Actions'].map(h => <th key={h} style={Q_TH}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {scripts.map(s => {
            const fullText = `SEGMENT: ${s.segment}\n\nHOOK: ${s.hook}\n\nSCRIPT:\n${s.script_body}\n\nCTA: ${s.cta}`
            return (
              <Fragment key={s.id}>
                <tr
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                >
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--char)' }}>
                    <span style={{ marginRight: '0.4rem', color: 'var(--text3)', fontSize: '0.7rem' }}>
                      {expanded === s.id ? '▼' : '▶'}
                    </span>
                    {s.segment.replace(/_/g, ' ')}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)', maxWidth: 260 }}>
                    {s.hook.slice(0, 70)}{s.hook.length > 70 ? '…' : ''}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {fmtDate(s.created_at)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                      <QueueActionBtn label="Mark Filmed" color="green" disabled={acting === s.id} onClick={() => onAction('posted', s.id, 'tiktok_scripts')} />
                      <QueueActionBtn label="Dismiss"     color="red"   disabled={acting === s.id} onClick={() => onAction('dismiss', s.id, 'tiktok_scripts')} />
                    </div>
                  </td>
                </tr>
                {expanded === s.id && (
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
                    <td colSpan={4} style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                        <CopyButton text={fullText} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.3rem' }}>Hook</p>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--char)', margin: 0 }}>&ldquo;{s.hook}&rdquo;</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.3rem' }}>Script</p>
                          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'var(--font-dm-sans)', fontSize: '0.88rem', color: 'var(--char)', lineHeight: 1.7 }}>
                            {s.script_body}
                          </pre>
                        </div>
                        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0.75rem 1rem' }}>
                          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>CTA</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--char)', margin: 0, fontWeight: 500 }}>{s.cta}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Kite Replies queue ─────────────────────────────────────────────────────

function KiteQueue({
  replies, acting, onAction,
}: {
  replies: KiteReply[]
  acting: string | null
  onAction: (action: string, id: string, table: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (replies.length === 0) return <EmptyQueue />
  return (
    <div style={Q_CARD}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
            {['Platform', 'Post Snippet', 'Created', 'Actions'].map(h => <th key={h} style={Q_TH}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {replies.map(r => (
            <Fragment key={r.id}>
              <tr
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <td style={{ padding: '0.85rem 1rem', color: 'var(--char)' }}>
                  <span style={{ marginRight: '0.4rem', color: 'var(--text3)', fontSize: '0.7rem' }}>
                    {expanded === r.id ? '▼' : '▶'}
                  </span>
                  {r.source_platform}
                </td>
                <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)', maxWidth: 280 }}>
                  {r.original_post_snippet
                    ? r.original_post_snippet.slice(0, 80) + (r.original_post_snippet.length > 80 ? '…' : '')
                    : <em style={{ color: 'var(--text3)' }}>—</em>}
                </td>
                <td style={{ padding: '0.85rem 1rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                  {fmtDate(r.created_at)}
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <QueueActionBtn label="Mark Posted" color="green" disabled={acting === r.id} onClick={() => onAction('posted', r.id, 'kite_replies')} />
                    <QueueActionBtn label="Dismiss"     color="red"   disabled={acting === r.id} onClick={() => onAction('dismiss', r.id, 'kite_replies')} />
                  </div>
                </td>
              </tr>
              {expanded === r.id && (
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
                  <td colSpan={4} style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1rem' }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
                          Original Post
                        </p>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'var(--font-dm-sans)', fontSize: '0.85rem', color: 'var(--char)', lineHeight: 1.65 }}>
                          {r.original_post_snippet ?? 'No snippet captured.'}
                        </pre>
                        <a href={r.source_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--ember)', textDecoration: 'underline' }}>
                          View original →
                        </a>
                      </div>
                      <div style={{ background: 'white', border: '1px solid rgba(74,112,85,0.3)', borderRadius: 'var(--r)', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                            Draft Reply
                          </p>
                          <CopyButton text={r.draft_reply} />
                        </div>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'var(--font-dm-sans)', fontSize: '0.85rem', color: 'var(--char)', lineHeight: 1.65 }}>
                          {r.draft_reply}
                        </pre>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Email Drafts queue ─────────────────────────────────────────────────────

const CAMPAIGN_LABELS: Record<string, string> = {
  accountant_outreach: 'Accountant',
  business_outreach:   'Business',
  freelancer_outreach: 'Freelancer',
}

function EmailDraftsQueue({
  drafts, acting, onAction,
}: {
  drafts: EmailDraft[]
  acting: string | null
  onAction: (action: string, id: string, table: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (drafts.length === 0) return <EmptyQueue />

  return (
    <div style={Q_CARD}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
            {['To', 'Subject', 'Campaign', 'Touch', 'Created', 'Actions'].map(h => (
              <th key={h} style={Q_TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drafts.map(d => (
            <Fragment key={d.id}>
              <tr
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
              >
                <td style={{ padding: '0.85rem 1rem', color: 'var(--char)', maxWidth: 160, wordBreak: 'break-all' }}>
                  <span style={{ marginRight: '0.4rem', color: 'var(--text3)', fontSize: '0.7rem' }}>
                    {expanded === d.id ? '▼' : '▶'}
                  </span>
                  <span style={{ fontWeight: 500 }}>{d.to_name ?? d.to_email}</span>
                  {d.to_name && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text3)', paddingLeft: '1rem' }}>
                      {d.to_email}
                    </span>
                  )}
                </td>
                <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)', maxWidth: 220 }}>
                  {d.subject.slice(0, 55)}{d.subject.length > 55 ? '…' : ''}
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <Badge label={d.agent} bg="rgba(74,112,85,0.1)" color="var(--sage)" />
                    <Badge label={CAMPAIGN_LABELS[d.campaign] ?? d.campaign} />
                  </div>
                </td>
                <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                  {d.is_follow_up
                    ? `Follow-up`
                    : d.sequence_step !== null
                    ? `Touch ${d.sequence_step + 1}`
                    : 'Initial'}
                </td>
                <td style={{ padding: '0.85rem 1rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                  {fmtDate(d.created_at)}
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <QueueActionBtn label="Send" color="green" disabled={acting === d.id} onClick={() => onAction('send', d.id, 'email_drafts')} />
                    <QueueActionBtn label="Dismiss" color="red" disabled={acting === d.id} onClick={() => onAction('dismiss', d.id, 'email_drafts')} />
                  </div>
                </td>
              </tr>
              {expanded === d.id && (
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
                  <td colSpan={6} style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                      <CopyButton text={`Subject: ${d.subject}\n\n${d.body_text}`} label="Copy email" />
                    </div>
                    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0.6rem 1rem', marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Subject</p>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--char)', margin: 0 }}>{d.subject}</p>
                    </div>
                    <pre style={{
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                      fontFamily: 'var(--font-dm-sans)', fontSize: '0.88rem',
                      color: 'var(--char)', lineHeight: 1.7, maxHeight: 400, overflowY: 'auto',
                    }}>
                      {d.body_text}
                    </pre>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Outreach Stats view ────────────────────────────────────────────────────

function OutreachStatsView({
  stats, report,
}: {
  stats: OutreachStats
  report: BridgeReport | null
}) {
  return (
    <div>
      <div style={gridStyle(4)}>
        <StatCard label="Total Contacts" value={stats.total}   sub="in outreach DB" />
        <StatCard label="Emailed"        value={stats.emailed} sub="touch 1+ sent" accent />
        <StatCard label="Replied"        value={stats.replied} sub="responded" />
        <StatCard label="Pending"        value={stats.pending} sub="not yet emailed" warn />
      </div>

      <SectionLabel>Source</SectionLabel>
      <div style={gridStyle(2)}>
        <StatCard label="TPB Register"  value={stats.tpb}    sub="verified licensed accountants" accent />
        <StatCard label="Tavily Search" value={stats.tavily} sub="scraped via web search" />
      </div>

      <SectionLabel>Sequence Progress</SectionLabel>
      <div style={gridStyle(3)}>
        <StatCard label="Touch 1 Sent" value={stats.touch1} sub="day 0 — intro email" />
        <StatCard label="Touch 2 Sent" value={stats.touch2} sub="day 4 — follow-up" />
        <StatCard label="Touch 3 Sent" value={stats.touch3} sub="day 8 — final touch" />
      </div>

      {report && (
        <>
          <SectionLabel>Latest Bridge Report</SectionLabel>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Week Starting</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--char)', margin: 0, fontWeight: 500 }}>{report.week_starting}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Referrals</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--char)', margin: 0 }}>{report.referral_count}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Commission</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--sage)', margin: 0 }}>${report.commission_owed.toFixed(2)}</p>
              </div>
              {report.top_referrer && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Top Referrer</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--char)', margin: 0, fontWeight: 500 }}>{report.top_referrer}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
