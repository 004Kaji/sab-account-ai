'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { useProfile } from '@/app/(app)/profile-context'
import { useToast } from '@/components/ui/Toast'
import { formatDateAU, validateABN, formatABN } from '@/lib/utils'
import AbnVerifyBadge from '@/components/ui/AbnVerifyBadge'

// ── Types ─────────────────────────────────────────────────────────────
type TabKey = 'business' | 'subscription' | 'invoices' | 'notifications' | 'ato' | 'referrals'

interface BizSettings {
  business_name:        string
  abn:                  string
  email:                string
  phone:                string
  address:              string
  website:              string
  industry:             string
  logo_url:             string
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
  business_name: '', abn: '', email: '', phone: '', address: '', website: '', industry: '', logo_url: '',
  default_payment_terms: '14 days', default_gst: true, starting_invoice_num: 1,
  default_currency: 'AUD', default_footer: '',
  gst_registered: false, bas_frequency: 'quarterly', super_rate_new: true,
  notify_overdue: true, notify_bas: true, notify_super: true, notify_payment: true, notify_weekly: false,
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'business',      label: 'Business'      },
  { key: 'subscription',  label: 'Subscription'  },
  { key: 'invoices',      label: 'Invoices'      },
  { key: 'notifications', label: 'Notifications' },
  { key: 'ato',           label: 'ATO'           },
  { key: 'referrals',     label: 'Referrals 🎁'  },
]

const INDUSTRIES = [
  'Building & Construction', 'Consulting & Professional Services', 'Retail', 'Hospitality',
  'Technology', 'Creative & Design', 'Transport & Logistics', 'Health & Wellbeing',
  'Education & Training', 'Agriculture', 'Real Estate', 'Other',
]

// ── Shared tab prop types ─────────────────────────────────────────────
interface SharedTabProps {
  biz: BizSettings
  setField: <K extends keyof BizSettings>(key: K, value: BizSettings[K]) => void
  saving: boolean
  save: (fields: Partial<BizSettings>) => Promise<void>
}

interface ProfileInfo {
  plan: string
  trial_ends_at: string | null
  subscription_status: string | null
  business_name: string | null
  email: string
}

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

// ── Logo resize helper ────────────────────────────────────────────────
async function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (ev) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const MAX_W = 400, MAX_H = 150
        let w = img.width, h = img.height
        if (w > MAX_W || h > MAX_H) {
          const ratio = Math.min(MAX_W / w, MAX_H / h)
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        const isJpeg = file.type === 'image/jpeg'
        if (isJpeg) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h) }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(isJpeg ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png'))
      }
      img.src = ev.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ── Tab components (module-level to prevent remounting on parent re-render) ──

function BusinessTab({ biz, setField, saving, save, abnError, setAbnError }: SharedTabProps & {
  abnError: string
  setAbnError: (e: string) => void
}) {
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
        <input className="sab-input" placeholder="Smith Trades Pty Ltd" autoComplete="organization"
          value={biz.business_name} onChange={e => setField('business_name', e.target.value)} />
      </div>
      <div>
        <label className="sab-label">ABN <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
        <input
          className={`sab-input${abnError ? ' sab-input-error' : ''}`}
          placeholder="12 345 678 901"
          autoComplete="off"
          value={biz.abn}
          onChange={e => setField('abn', e.target.value)}
          onBlur={() => {
            if (biz.abn && !validateABN(biz.abn)) setAbnError('Invalid ABN')
            else if (biz.abn) setField('abn', formatABN(biz.abn))
          }}
        />
        {abnError && <p style={{ fontSize: '0.8125rem', color: 'var(--ember)', marginTop: '0.25rem' }}>{abnError}</p>}
        {!abnError && <AbnVerifyBadge abn={biz.abn} />}
      </div>
      <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label className="sab-label">Business Email</label>
          <input type="text" className="sab-input" placeholder="hello@yourbusiness.com.au" autoComplete="email"
            value={biz.email} onChange={e => setField('email', e.target.value)} />
        </div>
        <div>
          <label className="sab-label">Phone</label>
          <input className="sab-input" placeholder="0400 000 000" autoComplete="tel"
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
      <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label className="sab-label">Website <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
          <input className="sab-input" placeholder="yourbusiness.com.au" autoComplete="url"
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
      {/* Logo upload */}
      <div>
        <label className="sab-label">Business Logo <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
        {biz.logo_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.625rem' }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', background: '#fff', display: 'inline-flex', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={biz.logo_url} alt="Business logo" style={{ maxHeight: '44px', maxWidth: '140px', objectFit: 'contain', display: 'block' }} />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => { setField('logo_url', ''); save({ logo_url: '' }) }}
              style={{ fontSize: '0.8125rem', color: 'var(--ember)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Remove
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginBottom: '0.5rem' }}>No logo uploaded yet</p>
        )}
        <input
          type="file"
          id="logo-upload"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              const dataUrl = await resizeLogo(file)
              setField('logo_url', dataUrl)
              await save({ logo_url: dataUrl })
            } catch { /* ignore */ }
            e.target.value = ''
          }}
        />
        <label htmlFor="logo-upload" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.4375rem 0.875rem', borderRadius: '8px', fontSize: '0.875rem',
          fontWeight: 500, cursor: 'pointer', border: '1px solid var(--border)',
          background: '#fff', color: 'var(--char)',
        }}>
          {biz.logo_url ? 'Replace logo' : 'Upload logo'}
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.375rem' }}>
          PNG or JPEG, max 2 MB. Appears on invoices and payslips.
        </p>
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

function SubscriptionTab({ profile, successPlan, stripeLoading, handlePortal, handleUpgrade }: {
  profile: ProfileInfo
  successPlan: string | null
  stripeLoading: boolean
  handlePortal: (targetPlan?: string) => Promise<void>
  handleUpgrade: (plan: 'starter' | 'pro' | 'autopilot') => Promise<void>
}) {
  const planStyle = PLAN_STYLES[profile.plan] ?? PLAN_STYLES.free
  const isPaid    = profile.plan !== 'free'

  const plans: Array<{
    key: string; name: string; price: string; period: string
    features: string[]; highlight?: boolean
  }> = [
    {
      key: 'free', name: 'Free', price: '$0', period: 'forever',
      features: ['3 invoices/month', 'AI invoice generation', 'Income & expense records', 'GST/BAS estimates'],
    },
    {
      key: 'starter', name: 'Starter', price: '$9', period: '/month',
      features: ['Unlimited invoices', 'Everything in Free', 'Invoice PDF download', 'Priority email support'],
    },
    {
      key: 'pro', name: 'Pro', price: '$19', period: '/month',
      features: ['Everything in Starter', 'ATO-compliant payslips', 'PAYG Scale 1 & 2', 'Super at 12%', 'HELP repayment'],
    },
    {
      key: 'autopilot', name: 'Autopilot', price: '$49', period: '/month',
      features: ['Everything in Pro', 'SAB Chat AI assistant', 'Ask questions about your business', 'Create payslips & invoices by chat', 'ATO compliance answers instantly'],
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
              Your 14-day free trial has started. Your plan will update within a few seconds — refresh the page if you don&apos;t see it.
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
          {profile.subscription_status === 'past_due' && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'rgba(220,60,40,0.07)',
              border: '1px solid rgba(220,60,40,0.25)',
              borderRadius: '0.5rem',
            }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ember)', marginBottom: '0.25rem' }}>
                Payment failed
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.5rem' }}>
                We couldn&apos;t charge your card. Please update your payment method to keep your plan active.
              </p>
              <button
                onClick={() => handlePortal()}
                disabled={stripeLoading}
                className="btn btn-primary"
                style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }}
              >
                {stripeLoading && <span className="spinner" style={{ width: '0.8rem', height: '0.8rem', borderWidth: '2px' }} />}
                Update payment method →
              </button>
            </div>
          )}
          {profile.subscription_status === 'cancelled' && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginTop: '0.25rem' }}>
              Subscription cancelled — you&apos;re on the free plan.
            </p>
          )}
        </div>
        {isPaid && (
          <button
            onClick={() => handlePortal()}
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
                  onClick={() => isPaid ? handlePortal(plan.key) : handleUpgrade(plan.key as 'starter' | 'pro' | 'autopilot')}
                  disabled={stripeLoading}
                  className={`btn ${plan.highlight ? 'btn-ember' : 'btn-outline'}`}
                  style={{ width: '100%', fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                >
                  {stripeLoading && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
                  {isPaid ? `Switch to ${plan.name}` : `Upgrade to ${plan.name}`}
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

function InvoiceDefaultsTab({ biz, setField, saving, save }: SharedTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
          Bank details (BSB, account number) are entered per-invoice when creating invoices. They appear on the invoice PDF under &quot;Payment Details&quot;.
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

function NotificationsTab({ biz, setField, saving, save, profileEmail }: SharedTabProps & { profileEmail: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>
        Control which email reminders SAB Account AI sends to <strong>{profileEmail}</strong>.
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

function AtoTab({ biz, setField, saving, save }: SharedTabProps) {
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

function ReferralsTab() {
  type ReferralStatus = {
    code: string
    link: string
    totalReferrals: number
    convertedReferrals: number
    freeMonthsEarned: number
    freeMonthsRemaining: number
    lifetimePro: boolean
    nextReward: string
  }
  type ReferralRecord = {
    id: string
    created_at: string
    referred_email: string
    status: string
  }

  const [refData, setRefData] = useState<ReferralStatus | null>(null)
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [refLoading, setRefLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)

  useEffect(() => {
    async function loadReferrals() {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setRefLoading(false); return }

      // Ensure code exists (creates if needed)
      await fetch('/api/referral/ensure-code', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setRefLoading(false); return }

      const [{ data: rc }, { data: refs }] = await Promise.all([
        supabase.from('referral_codes').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('referrals').select('id, created_at, referred_email, status')
          .eq('referrer_id', user.id).order('created_at', { ascending: false }),
      ])

      if (rc) {
        const converted = (rc.converted_referrals as number) ?? 0
        const earned = (rc.free_months_earned as number) ?? 0
        const used = (rc.free_months_used as number) ?? 0
        let nextReward = '1 converted friend = 1 month free'
        if (rc.lifetime_pro) {
          nextReward = 'You have Lifetime Pro!'
        } else if (converted >= 3) {
          const n = 10 - converted
          nextReward = `${n} more converting friend${n === 1 ? '' : 's'} = Lifetime Pro`
        } else if (converted >= 1) {
          const n = 3 - converted
          nextReward = `${n} more converting friend${n === 1 ? '' : 's'} = 3 months free`
        }
        setRefData({
          code: rc.code as string,
          link: `https://sabaccountai.com/signup?ref=${rc.code}`,
          totalReferrals: (rc.total_referrals as number) ?? 0,
          convertedReferrals: converted,
          freeMonthsEarned: earned,
          freeMonthsRemaining: earned - used,
          lifetimePro: (rc.lifetime_pro as boolean) ?? false,
          nextReward,
        })
      }
      setReferrals((refs ?? []) as ReferralRecord[])
      setRefLoading(false)
    }
    loadReferrals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function copyLink() {
    if (!refData?.link) return
    navigator.clipboard.writeText(refData.link).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  function copyTemplate(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTemplate(id)
      setTimeout(() => setCopiedTemplate(null), 2000)
    })
  }

  function maskEmail(email: string): string {
    const parts = email.split('@')
    if (parts.length !== 2) return email
    return `${parts[0].slice(0, 3)}***@${parts[1]}`
  }

  if (refLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
      </div>
    )
  }

  const tiers = [
    { label: 'Refer 1 friend', reward: '1 month free', emoji: '🎁', threshold: 1 },
    { label: 'Refer 3 friends', reward: '3 months free', emoji: '🎁', threshold: 3 },
    { label: 'Refer 10 friends', reward: 'Pro for life', emoji: '👑', threshold: 10 },
  ]
  const converted = refData?.convertedReferrals ?? 0
  const link = refData?.link ?? ''
  const code = refData?.code ?? ''

  const shareTemplates = [
    {
      id: 'facebook',
      label: 'Facebook / Instagram',
      text: `Running a small business or freelancing in Australia?\nI've been using SAB Account AI for invoicing and ATO-compliant payslips. It generates professional invoices from plain English in 30 seconds.\nFree plan available 👇\n${link}`,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      text: `Hey! Check out this free Australian invoicing tool — SAB Account AI. Describe your job, it makes the invoice. Also does payslips with correct PAYG/super calculations.\nTry free: ${link}`,
    },
    {
      id: 'email',
      label: 'Email',
      text: `Subject: Free invoicing tool for Australian business\n\nHi,\nI thought you might find this useful — SAB Account AI generates ATO-compliant invoices and payslips instantly. It handles GST, PAYG, super, and ABN contractor payments.\nFree to try: ${link}`,
    },
  ]

  const tweetText = encodeURIComponent(`I've been using SAB Account AI for ATO-compliant invoices and payslips — try it free:\nhttps://sabaccountai.com/signup?ref=${code}\n#australia #smallbusiness #freelance`)
  const waText = encodeURIComponent(`Hey! Try SAB Account AI for invoicing and payslips. Use my link for a free bonus: ${link}`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', paddingBottom: '0.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎁</div>
        <h2 className="font-display" style={{ fontSize: '1.375rem', color: 'var(--char)', marginBottom: '0.375rem' }}>
          Refer friends, get free months
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>
          Share SAB Account AI and earn rewards when your friends upgrade
        </p>
      </div>

      {/* Tier cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.875rem' }}>
        {tiers.map((tier) => {
          const earned = converted >= tier.threshold
          const isCurrent = !earned && (
            (tier.threshold === 1 && converted < 1) ||
            (tier.threshold === 3 && converted >= 1 && converted < 3) ||
            (tier.threshold === 10 && converted >= 3 && converted < 10)
          )
          return (
            <div
              key={tier.threshold}
              style={{
                borderRadius: 'var(--r)',
                border: earned
                  ? '2px solid rgba(34,197,94,0.5)'
                  : isCurrent
                  ? '2px solid var(--ember)'
                  : '1px solid var(--border)',
                padding: '1.25rem',
                background: earned ? 'rgba(34,197,94,0.05)' : '#fff',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: '0.5rem', right: '0.5rem',
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'var(--ember)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              )}
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{tier.emoji}</div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--char)', marginBottom: '0.25rem' }}>
                {tier.label}
              </p>
              <p style={{ fontSize: '0.8125rem', color: earned ? '#15803d' : 'var(--text2)', fontWeight: earned ? 600 : 400 }}>
                {tier.reward}
              </p>
              {earned ? (
                <div style={{ marginTop: '0.625rem', fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>✓ Earned</div>
              ) : isCurrent ? (
                <div style={{ marginTop: '0.625rem', fontSize: '0.75rem', color: 'var(--ember)', fontWeight: 600 }}>In progress</div>
              ) : (
                <div style={{ marginTop: '0.625rem', fontSize: '0.75rem', color: 'var(--text3)' }}>🔒 Locked</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Referral link */}
      <div>
        <label className="sab-label" style={{ marginBottom: '0.5rem' }}>Your unique referral link</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            readOnly
            value={link}
            className="sab-input"
            style={{ flex: 1, minWidth: '200px', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', cursor: 'text' }}
          />
          <button onClick={copyLink} className="btn btn-ember" style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
            {copiedLink ? 'Copied! ✓' : 'Copy link'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
          <a
            href={`https://twitter.com/intent/tweet?text=${tweetText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{ fontSize: '0.8125rem', textDecoration: 'none' }}
          >
            Share on X / Twitter
          </a>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{ fontSize: '0.8125rem', textDecoration: 'none' }}
          >
            Share on WhatsApp
          </a>
        </div>
      </div>

      {/* Stats row */}
      {refData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.875rem' }}>
          {[
            { label: 'Friends signed up', value: refData.totalReferrals },
            { label: 'Converted to paid', value: refData.convertedReferrals },
            { label: 'Months earned', value: refData.freeMonthsEarned },
            { label: 'Months remaining', value: refData.freeMonthsRemaining },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--cream)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--char)', fontFamily: 'var(--font-mono)' }}>{value}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.125rem' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {refData && !refData.lifetimePro && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--char)' }}>Progress to next reward</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>{refData.nextReward}</p>
          </div>
          <div style={{ height: '8px', background: 'var(--cream2)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              borderRadius: '999px',
              background: 'var(--ember)',
              width: `${Math.min(100, (converted / (converted < 1 ? 1 : converted < 3 ? 3 : 10)) * 100)}%`,
              transition: 'width 500ms ease',
            }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.375rem' }}>
            {converted} / {converted < 1 ? 1 : converted < 3 ? 3 : 10} paid friends
          </p>
        </div>
      )}
      {refData?.lifetimePro && (
        <div style={{ background: 'rgba(200,75,47,0.08)', border: '1px solid rgba(200,75,47,0.25)', borderRadius: 'var(--r)', padding: '1rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', fontSize: '1.125rem' }}>👑 Lifetime Pro Active</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginTop: '0.25rem' }}>You&apos;ll never be billed again. Thank you for sharing SAB Account AI!</p>
        </div>
      )}

      {/* Friends list */}
      {referrals.length > 0 && (
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.75rem' }}>Referred friends</p>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream2)' }}>
                  {['Email', 'Joined', 'Status', 'Reward'].map(h => (
                    <th key={h} style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 600, color: 'var(--text2)', fontSize: '0.75rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map((r, i) => (
                  <tr key={r.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)', background: '#fff' }}>
                    <td style={{ padding: '0.625rem 0.875rem', color: 'var(--char)' }}>{maskEmail(r.referred_email ?? '')}</td>
                    <td style={{ padding: '0.625rem 0.875rem', color: 'var(--text2)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: r.status === 'converted' ? 'rgba(34,197,94,0.12)' : 'rgba(201,147,58,0.15)',
                        color: r.status === 'converted' ? '#15803d' : '#92400e',
                      }}>
                        {r.status === 'converted' ? 'Upgraded to paid' : 'Signed up'}
                      </span>
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem', color: r.status === 'converted' ? '#15803d' : 'var(--text3)', fontWeight: r.status === 'converted' ? 600 : 400 }}>
                      {r.status === 'converted' ? '1 month earned' : 'Pending upgrade'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Share templates */}
      <div>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.75rem' }}>Ready-to-send templates</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {shareTemplates.map((tmpl) => (
            <div key={tmpl.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              <div style={{ background: 'var(--cream2)', padding: '0.5rem 0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)' }}>{tmpl.label}</span>
                <button
                  onClick={() => copyTemplate(tmpl.id, tmpl.text)}
                  style={{
                    padding: '0.25rem 0.625rem', borderRadius: '6px',
                    border: '1px solid var(--border)', background: copiedTemplate === tmpl.id ? 'rgba(34,197,94,0.1)' : '#fff',
                    color: copiedTemplate === tmpl.id ? '#15803d' : 'var(--char)',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {copiedTemplate === tmpl.id ? 'Copied! ✓' : 'Copy'}
                </button>
              </div>
              <div style={{ padding: '0.875rem', background: '#fff', fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {tmpl.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Partner program upsell */}
      <div style={{
        background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)',
        borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <p style={{ fontWeight: 700, color: 'var(--char)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
            Are you an accountant or bookkeeper?
          </p>
          <p style={{ color: 'var(--text2)', fontSize: '0.825rem' }}>
            Join the Partner Program — earn 20% ongoing monthly commission for every client you refer.
          </p>
        </div>
        <a href="/dashboard/partner" style={{
          display: 'inline-block', background: 'var(--ember)', color: 'white',
          padding: '0.6rem 1.25rem', borderRadius: 'var(--r)',
          fontWeight: 600, fontSize: '0.825rem', textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          Partner dashboard →
        </a>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 768px) {
          .settings-tab-panel { padding: 1.25rem !important; }
        }
        @media (max-width: 480px) {
          .settings-tab-panel { padding: 1rem !important; }
        }
      `}</style>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
function SettingsPageInner() {
  const profile      = useProfile()
  const { toast }    = useToast()
  const searchParams = useSearchParams()
  useEffect(() => { document.title = 'Settings — SAB Account AI' }, [])

  const [tab, setTab] = useState<TabKey>(() => {
    const t = searchParams.get('tab') as TabKey | null
    return t && TABS.some(tb => tb.key === t) ? t : 'business'
  })
  const [biz, setBiz]           = useState<BizSettings>(EMPTY)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [abnError, setAbnError] = useState('')
  const [stripeLoading, setStripeLoading] = useState(false)
  const [successPlan, setSuccessPlan] = useState<string | null>(() =>
    searchParams.get('success') === 'true' ? searchParams.get('plan') : null
  )

  // Confirm Stripe checkout session and jump to subscription tab on ?success=true
  useEffect(() => {
    if (searchParams.get('success') !== 'true') return
    setTab('subscription')
    const sessionId = searchParams.get('session_id')
    if (!sessionId) return
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          logo_url:             data.logo_url             ?? '',
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

  async function handleUpgrade(plan: 'starter' | 'pro' | 'autopilot') {
    setStripeLoading(true)
    try {
      const url = await stripeRequest('/api/stripe/checkout', { plan })
      window.location.href = url
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upgrade failed', 'error')
      setStripeLoading(false)
    }
  }

  async function handlePortal(targetPlan?: string) {
    setStripeLoading(true)
    try {
      const url = await stripeRequest('/api/stripe/portal', targetPlan ? { targetPlan } : {})
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

  return (
    <div className="page-pad" style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
        Settings
      </h1>
      <p style={{ color: 'var(--text3)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        {profile.business_name || profile.email}
      </p>

      {/* Tab bar */}
      <div className="settings-tabs" style={{ display: 'flex', gap: '0.125rem', background: 'var(--cream2)', borderRadius: 'var(--r)', padding: '0.25rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.4rem 0.75rem',
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
      <div className="settings-tab-panel" style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '2rem' }}>
        {tab === 'business' && (
          <BusinessTab biz={biz} setField={setField} saving={saving} save={save} abnError={abnError} setAbnError={setAbnError} />
        )}
        {tab === 'subscription' && (
          <SubscriptionTab profile={profile} successPlan={successPlan} stripeLoading={stripeLoading} handlePortal={handlePortal} handleUpgrade={handleUpgrade} />
        )}
        {tab === 'invoices' && (
          <InvoiceDefaultsTab biz={biz} setField={setField} saving={saving} save={save} />
        )}
        {tab === 'notifications' && (
          <NotificationsTab biz={biz} setField={setField} saving={saving} save={save} profileEmail={profile.email} />
        )}
        {tab === 'ato' && (
          <AtoTab biz={biz} setField={setField} saving={saving} save={save} />
        )}
        {tab === 'referrals' && (
          <ReferralsTab />
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageInner />
    </Suspense>
  )
}
