'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useProfile } from '@/app/(app)/profile-context'
import { useToast } from '@/components/ui/Toast'
import { formatDateAU, validateABN, formatABN } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────
type TabKey = 'business' | 'subscription' | 'invoices' | 'notifications' | 'ato'

interface BizSettings {
  business_name:        string
  abn:                  string
  email:                string
  phone:                string
  address:              string
  website:              string
  industry:             string
  default_payment_terms: string
  default_gst:          boolean
  starting_invoice_num: number
  default_currency:     string
  default_footer:       string
  gst_registered:       boolean
  bas_frequency:        string
  super_rate_new:       boolean
  notify_overdue:       boolean
  notify_bas:           boolean
  notify_super:         boolean
  notify_payment:       boolean
  notify_weekly:        boolean
}

const EMPTY: BizSettings = {
  business_name: '', abn: '', email: '', phone: '', address: '', website: '', industry: '',
  default_payment_terms: '14 days', default_gst: true, starting_invoice_num: 1,
  default_currency: 'AUD', default_footer: '',
  gst_registered: false, bas_frequency: 'quarterly', super_rate_new: true,
  notify_overdue: true, notify_bas: true, notify_super: true, notify_payment: true, notify_weekly: false,
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'business',      label: 'Business Profile' },
  { key: 'subscription',  label: 'Subscription'     },
  { key: 'invoices',      label: 'Invoice Defaults' },
  { key: 'notifications', label: 'Notifications'    },
  { key: 'ato',           label: 'ATO & Compliance' },
]

const INDUSTRIES = [
  'Building & Construction', 'Consulting & Professional Services', 'Retail', 'Hospitality',
  'Technology', 'Creative & Design', 'Transport & Logistics', 'Health & Wellbeing',
  'Education & Training', 'Agriculture', 'Real Estate', 'Other',
]

// ── Toggle switch ─────────────────────────────────────────────────────
function Toggle({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}
    >
      <div style={{
        width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
        background: checked ? 'var(--ember)' : 'var(--border)',
        position: 'relative', transition: 'background 150ms', marginTop: '2px',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', width: '14px', height: '14px', borderRadius: '50%',
          background: '#fff', top: '3px', left: checked ? '19px' : '3px',
          transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }} />
      </div>
      <div style={{ pointerEvents: 'none' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--char)', lineHeight: 1.3 }}>{label}</p>
        {hint && <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.125rem' }}>{hint}</p>}
      </div>
    </div>
  )
}

// ── Plan badge ────────────────────────────────────────────────────────
const PLAN_STYLES: Record<string, { bg: string; color: string }> = {
  free:    { bg: 'var(--cream2)',          color: 'var(--text2)'  },
  starter: { bg: 'rgba(201,147,58,0.15)', color: '#92400e'       },
  pro:     { bg: 'rgba(200,75,47,0.1)',   color: 'var(--ember)'  },
}

// ── Main page ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const profile    = useProfile()
  const { toast }  = useToast()
  useEffect(() => { document.title = 'Settings — SAB Account AI' }, [])

  const [tab, setTab]           = useState<TabKey>('business')
  const [biz, setBiz]           = useState<BizSettings>(EMPTY)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [abnError, setAbnError] = useState('')
  const [stripeLoading, setStripeLoading] = useState(false)
  const [successPlan, setSuccessPlan]     = useState<string | null>(null)

  // Handle ?tab=subscription and ?success=true from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab') as TabKey | null
    if (t && TABS.some(tb => tb.key === t)) setTab(t)
    if (params.get('success') === 'true') {
      setTab('subscription')
      setSuccessPlan(params.get('plan'))

      const sessionId = params.get('session_id')
      if (sessionId) {
        // Confirm the checkout session and update the plan immediately
        createBrowserClient().auth.getSession().then(({ data: { session } }) => {
          if (!session) return
          fetch('/api/stripe/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ sessionId }),
          }).then(res => {
            if (res.ok) window.location.replace('/settings?tab=subscription')
          })
        })
      }
    }
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setBiz({
          business_name:        data.business_name        ?? '',
          abn:                  data.abn                  ?? '',
          email:                data.email                ?? '',
          phone:                data.phone                ?? '',
          address:              data.address              ?? '',
          website:              data.website              ?? '',
          industry:             data.industry             ?? '',
          default_payment_terms: data.default_payment_terms ?? '14 days',
          default_gst:          data.default_gst          ?? true,
          starting_invoice_num: data.starting_invoice_num ?? 1,
          default_currency:     data.default_currency     ?? 'AUD',
          default_footer:       data.default_footer       ?? '',
          gst_registered:       data.gst_registered       ?? false,
          bas_frequency:        data.bas_frequency        ?? 'quarterly',
          super_rate_new:       data.super_rate_new       ?? true,
          notify_overdue:       data.notify_overdue       ?? true,
          notify_bas:           data.notify_bas           ?? true,
          notify_super:         data.notify_super         ?? true,
          notify_payment:       data.notify_payment       ?? true,
          notify_weekly:        data.notify_weekly        ?? false,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  function setField<K extends keyof BizSettings>(key: K, value: BizSettings[K]) {
    setBiz(prev => ({ ...prev, [key]: value }))
    if (key === 'abn') setAbnError('')
  }

  async function stripeRequest(endpoint: string, body: object): Promise<string> {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Not authenticated')
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Request failed')
    return data.url as string
  }

  async function handleUpgrade(plan: 'starter' | 'pro') {
    setStripeLoading(true)
    try {
      const url = await stripeRequest('/api/stripe/checkout', { plan })
      window.location.href = url
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upgrade failed', 'error')
      setStripeLoading(false)
    }
  }

  async function handlePortal() {
    setStripeLoading(true)
    try {
      const url = await stripeRequest('/api/stripe/portal', {})
      window.location.href = url
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not open billing portal', 'error')
      setStripeLoading(false)
    }
  }

  async function save(fields: Partial<BizSettings>) {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('business_profiles')
        .upsert({ id: user.id, ...fields, updated_at: new Date().toISOString() })

      if (error) throw error
      toast('Settings saved', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
      </div>
    )
  }

  // ── Tab content ────────────────────────────────────────────────────
  function BusinessTab() {
    function handleSave() {
      if (biz.abn && !validateABN(biz.abn)) {
        setAbnError('Invalid ABN — please check and try again')
        return
      }
      save({
        business_name: biz.business_name, abn: biz.abn, email: biz.email,
        phone: biz.phone, address: biz.address, website: biz.website, industry: biz.industry,
      })
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label className="sab-label">Business Name</label>
          <input className="sab-input" placeholder="Smith Trades Pty Ltd"
            value={biz.business_name} onChange={e => setField('business_name', e.target.value)} />
        </div>
        <div>
          <label className="sab-label">ABN <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
          <input
            className={`sab-input${abnError ? ' sab-input-error' : ''}`}
            placeholder="12 345 678 901"
            value={biz.abn}
            onChange={e => setField('abn', e.target.value)}
            onBlur={() => {
              if (biz.abn && !validateABN(biz.abn)) setAbnError('Invalid ABN')
              else if (biz.abn) setField('abn', formatABN(biz.abn))
            }}
          />
          {abnError && <p style={{ fontSize: '0.8125rem', color: 'var(--ember)', marginTop: '0.25rem' }}>{abnError}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="sab-label">Business Email</label>
            <input type="text" className="sab-input" placeholder="hello@yourbusiness.com.au"
              value={biz.email} onChange={e => setField('email', e.target.value)} />
          </div>
          <div>
            <label className="sab-label">Phone</label>
            <input className="sab-input" placeholder="0400 000 000"
              value={biz.phone} onChange={e => setField('phone', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="sab-label">Business Address</label>
          <textarea
            className="sab-input" rows={2} placeholder="123 Main St, Sydney NSW 2000"
            value={biz.address} onChange={e => setField('address', e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="sab-label">Website <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
            <input className="sab-input" placeholder="yourbusiness.com.au"
              value={biz.website} onChange={e => setField('website', e.target.value)} />
          </div>
          <div>
            <label className="sab-label">Industry</label>
            <select className="sab-input" value={biz.industry} onChange={e => setField('industry', e.target.value)}>
              <option value="">Select industry…</option>
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <div>
          <button onClick={handleSave} disabled={saving} className="btn btn-ember">
            {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
            {saving ? 'Saving…' : 'Save Business Profile'}
          </button>
        </div>
      </div>
    )
  }

  function SubscriptionTab() {
    const planStyle = PLAN_STYLES[profile.plan] ?? PLAN_STYLES.free
    const isPaid    = profile.plan !== 'free'

    const plans: Array<{
      key: string; name: string; price: string; period: string
      features: string[]; highlight?: boolean
    }> = [
      {
        key: 'free', name: 'Free', price: '$0', period: 'forever',
        features: ['5 invoices/month', 'AI invoice generation', 'Income & expense records', 'GST/BAS estimates'],
      },
      {
        key: 'starter', name: 'Starter', price: '$9', period: '/month',
        features: ['Unlimited invoices', 'Everything in Free', 'Invoice PDF download', 'Priority email support'],
      },
      {
        key: 'pro', name: 'Pro', price: '$19', period: '/month',
        features: ['Everything in Starter', 'ATO-compliant payslips', 'PAYG Scale 1 & 2', 'Super at 12%', 'HELP repayment'],
        highlight: true,
      },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Success banner */}
        {successPlan && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🎉</span>
            <div>
              <p style={{ fontWeight: 600, color: '#15803d', marginBottom: '0.2rem' }}>
                Welcome to {successPlan.charAt(0).toUpperCase() + successPlan.slice(1)}!
              </p>
              <p style={{ fontSize: '0.875rem', color: '#166534' }}>
                Your 14-day free trial has started. Your plan will update within a few seconds — refresh the page if you don't see it.
              </p>
            </div>
          </div>
        )}

        {/* Current plan card */}
        <div style={{ background: 'var(--cream)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginBottom: '0.25rem' }}>Current plan</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--char)' }}>
                {profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0.2rem 0.625rem', borderRadius: '999px', background: planStyle.bg, color: planStyle.color }}>
                {profile.plan}
              </span>
            </div>
            {profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date() && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginTop: '0.25rem' }}>
                Free trial ends {formatDateAU(profile.trial_ends_at.slice(0, 10))}
              </p>
            )}
            {profile.subscription_status && !['active', 'trialing', 'inactive'].includes(profile.subscription_status) && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--ember)', marginTop: '0.25rem' }}>
                Status: {profile.subscription_status}
              </p>
            )}
          </div>
          {isPaid && (
            <button
              onClick={handlePortal}
              disabled={stripeLoading}
              className="btn btn-outline"
              style={{ fontSize: '0.875rem' }}
            >
              {stripeLoading && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
              Manage Billing →
            </button>
          )}
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {plans.map(plan => {
            const isCurrent = profile.plan === plan.key
            return (
              <div
                key={plan.key}
                style={{
                  background: '#ffffff',
                  borderRadius: 'var(--r)',
                  border: `1px solid ${plan.highlight ? 'rgba(200,75,47,0.35)' : 'var(--border)'}`,
                  padding: '1.5rem',
                  position: 'relative',
                  boxShadow: plan.highlight ? '0 0 0 3px rgba(200,75,47,0.08)' : 'none',
                }}
              >
                {plan.highlight && (
                  <span style={{ position: 'absolute', top: '-1px', right: '1rem', background: 'var(--ember)', color: '#fff', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em', padding: '0.2rem 0.625rem', borderRadius: '0 0 6px 6px' }}>
                    POPULAR
                  </span>
                )}
                <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--char)', marginBottom: '0.25rem' }}>{plan.name}</p>
                <p style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--char)', fontFamily: 'var(--font-mono)' }}>{plan.price}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>{plan.period}</span>
                </p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text2)' }}>
                      <span style={{ color: 'var(--ember)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--cream2)', textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text3)' }}>
                    Current plan
                  </div>
                ) : plan.key === 'free' ? (
                  <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--cream)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text3)', border: '1px solid var(--border)' }}>
                    {isPaid ? 'Cancel subscription to downgrade' : 'Your current plan'}
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key as 'starter' | 'pro')}
                    disabled={stripeLoading}
                    className={`btn ${plan.highlight ? 'btn-ember' : 'btn-outline'}`}
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                  >
                    {stripeLoading && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
                    {profile.plan === 'pro' ? `Switch to ${plan.name}` : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>
          All paid plans include a 14-day free trial. Cancel anytime via the billing portal. Prices are in AUD and exclude GST.
        </p>
      </div>
    )
  }

  function InvoiceDefaultsTab() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="sab-label">Default Payment Terms</label>
            <select className="sab-input" value={biz.default_payment_terms}
              onChange={e => setField('default_payment_terms', e.target.value)}>
              {['7 days', '14 days', '30 days', 'On receipt'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="sab-label">Default Currency</label>
            <select className="sab-input" value={biz.default_currency}
              onChange={e => setField('default_currency', e.target.value)}>
              <option value="AUD">AUD — Australian Dollar</option>
              <option value="USD">USD — US Dollar</option>
              <option value="NZD">NZD — New Zealand Dollar</option>
            </select>
          </div>
        </div>

        <div>
          <label className="sab-label">Starting Invoice Number</label>
          <input
            type="number" min={1} step={1} className="sab-input"
            value={biz.starting_invoice_num}
            onChange={e => setField('starting_invoice_num', parseInt(e.target.value) || 1)}
            style={{ maxWidth: '160px' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.25rem' }}>
            Next invoice will be numbered from this value
          </p>
        </div>

        <Toggle
          label="Include GST on new invoices by default"
          hint="You can override this per line item when creating invoices."
          checked={biz.default_gst}
          onChange={v => setField('default_gst', v)}
        />

        <div>
          <label className="sab-label">Default Invoice Footer / Notes</label>
          <textarea
            className="sab-input" rows={3}
            placeholder="e.g. Thank you for your business! Please reference the invoice number when paying."
            value={biz.default_footer}
            onChange={e => setField('default_footer', e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
        </div>

        <div style={{ background: 'var(--cream)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--char)', marginBottom: '0.25rem' }}>Bank Details</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>
            Bank details (BSB, account number) are entered per-invoice when creating invoices. They appear on the invoice PDF under "Payment Details".
          </p>
        </div>

        <div>
          <button onClick={() => save({ default_payment_terms: biz.default_payment_terms, default_gst: biz.default_gst, starting_invoice_num: biz.starting_invoice_num, default_currency: biz.default_currency, default_footer: biz.default_footer })}
            disabled={saving} className="btn btn-ember">
            {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
            {saving ? 'Saving…' : 'Save Invoice Defaults'}
          </button>
        </div>
      </div>
    )
  }

  function NotificationsTab() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>
          Control which email reminders SAB Account AI sends to <strong>{profile.email}</strong>.
        </p>

        {[
          { key: 'notify_overdue' as const, label: 'Overdue invoice reminders', hint: 'Get notified when an invoice passes its due date without payment.' },
          { key: 'notify_payment' as const, label: 'Payment received alerts',   hint: 'Notify when a client pays an invoice.' },
          { key: 'notify_bas'     as const, label: 'BAS lodgement reminders',   hint: 'Reminder 2 weeks before each quarterly BAS is due.' },
          { key: 'notify_super'   as const, label: 'Super payment reminders',   hint: 'Reminder before each quarterly superannuation due date.' },
          { key: 'notify_weekly'  as const, label: 'Weekly activity digest',    hint: 'A summary of invoices, income, and expenses every Monday.' },
        ].map(({ key, label, hint }) => (
          <Toggle
            key={key}
            label={label}
            hint={hint}
            checked={biz[key]}
            onChange={v => setField(key, v)}
          />
        ))}

        <div>
          <button onClick={() => save({ notify_overdue: biz.notify_overdue, notify_payment: biz.notify_payment, notify_bas: biz.notify_bas, notify_super: biz.notify_super, notify_weekly: biz.notify_weekly })}
            disabled={saving} className="btn btn-ember">
            {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
            {saving ? 'Saving…' : 'Save Notification Preferences'}
          </button>
        </div>
      </div>
    )
  }

  function AtoTab() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <Toggle
          label="Registered for GST"
          hint="If your business earns over $75,000/year, you must register for GST with the ATO."
          checked={biz.gst_registered}
          onChange={v => setField('gst_registered', v)}
        />

        {biz.gst_registered && (
          <div>
            <label className="sab-label">BAS Lodgement Frequency</label>
            <select className="sab-input" value={biz.bas_frequency}
              onChange={e => setField('bas_frequency', e.target.value)}
              style={{ maxWidth: '260px' }}>
              <option value="quarterly">Quarterly (most common)</option>
              <option value="monthly">Monthly (turnover &gt; $20M)</option>
              <option value="annually">Annually (turnover &lt; $75K)</option>
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.25rem' }}>
              Quarterly BAS is due on the 28th of October, February, April, and July.
            </p>
          </div>
        )}

        <Toggle
          label="Use 12% super rate (from 1 July 2025)"
          hint="The super guarantee rate increased from 11.5% to 12% on 1 July 2025. Applies to payslip calculations."
          checked={biz.super_rate_new}
          onChange={v => setField('super_rate_new', v)}
        />

        {/* ATO reference card */}
        <div style={{ background: 'var(--cream)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.125rem' }}>ATO Key Dates (2025–26)</p>
          {[
            { label: 'Q1 BAS (Jul–Sep)',     due: '28 October 2025'  },
            { label: 'Q2 BAS (Oct–Dec)',     due: '28 February 2026' },
            { label: 'Q3 BAS (Jan–Mar)',     due: '28 April 2026'    },
            { label: 'Q4 BAS (Apr–Jun)',     due: '28 July 2026'     },
            { label: 'Q1 Super (Jul–Sep)',   due: '28 October 2025'  },
            { label: 'Q2 Super (Oct–Dec)',   due: '28 January 2026'  },
            { label: 'Q3 Super (Jan–Mar)',   due: '28 April 2026'    },
            { label: 'Q4 Super (Apr–Jun)',   due: '28 July 2026'     },
          ].map(({ label, due }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text2)' }}>{label}</span>
              <span style={{ fontWeight: 500, color: 'var(--char)' }}>{due}</span>
            </div>
          ))}
        </div>

        <div>
          <button onClick={() => save({ gst_registered: biz.gst_registered, bas_frequency: biz.bas_frequency, super_rate_new: biz.super_rate_new })}
            disabled={saving} className="btn btn-ember">
            {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
            {saving ? 'Saving…' : 'Save ATO Settings'}
          </button>
        </div>
      </div>
    )
  }

  const tabContent: Record<TabKey, React.ReactNode> = {
    business:      <BusinessTab />,
    subscription:  <SubscriptionTab />,
    invoices:      <InvoiceDefaultsTab />,
    notifications: <NotificationsTab />,
    ato:           <AtoTab />,
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
        Settings
      </h1>
      <p style={{ color: 'var(--text3)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        {profile.business_name || profile.email}
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.125rem', background: 'var(--cream2)', borderRadius: 'var(--r)', padding: '0.25rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: tab === t.key ? '#ffffff' : 'transparent',
              color: tab === t.key ? 'var(--char)' : 'var(--text2)',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 150ms',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '2rem' }}>
        {tabContent[tab]}
      </div>
    </div>
  )
}
