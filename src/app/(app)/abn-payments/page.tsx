'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDateAU, todayISO } from '@/lib/utils'
import { downloadABNRemittancePDF, downloadNoABNWithholdingPDF, getABNRemittancePDFBase64, getNoABNWithholdingPDFBase64, type ABNRemittancePDFData, type NoABNWithholdingPDFData } from '@/lib/pdf'
import PlanGate from '@/components/ui/PlanGate'

// ── Constants ─────────────────────────────────────────────────────────────
const WITHHOLDING_RATE = 0.47
const SG_RATE = 0.12 // From 1 July 2025

type Tab = 'abn' | 'noabn'

interface ABNPayment {
  id: string
  has_abn: boolean
  contractor_name: string
  contractor_abn: string | null
  contractor_address: string | null
  contractor_email: string | null
  contractor_phone: string | null
  work_description: string
  payment_date: string
  invoice_reference: string | null
  gross_amount: number
  includes_gst: boolean
  gst_amount: number
  withholding_amount: number
  is_super_applicable: boolean
  super_amount: number
  net_payable: number
  notes: string | null
  created_at: string
}

interface BusinessProfile {
  business_name: string | null
  abn: string | null
  email: string | null
  address: string | null
}

type SavedPayment =
  | { type: 'abn'; pdf: ABNRemittancePDFData; gross: number; recipientEmail: string }
  | { type: 'noabn'; pdf: NoABNWithholdingPDFData; gross: number; withholding: number; netPayable: number; recipientEmail: string }

interface ABNForm {
  contractor_name: string
  contractor_abn: string
  contractor_address: string
  contractor_email: string
  contractor_phone: string
  work_description: string
  payment_date: string
  invoice_reference: string
  gross_input: string
  includes_gst: boolean
  notes: string
  is_labour: boolean | null
  is_personal_work: boolean | null
  is_individual: boolean | null
}

interface NoABNForm {
  worker_name: string
  worker_email: string
  worker_address: string
  work_description: string
  payment_date: string
  gross_input: string
  notes: string
  is_company: boolean | null
  is_under_threshold: boolean | null
}

function defaultABNForm(): ABNForm {
  return {
    contractor_name: '', contractor_abn: '', contractor_address: '',
    contractor_email: '', contractor_phone: '', work_description: '',
    payment_date: todayISO(), invoice_reference: '',
    gross_input: '', includes_gst: true, notes: '',
    is_labour: null, is_personal_work: null, is_individual: null,
  }
}

function defaultNoABNForm(): NoABNForm {
  return {
    worker_name: '', worker_email: '', worker_address: '', work_description: '',
    payment_date: todayISO(), gross_input: '', notes: '',
    is_company: null, is_under_threshold: null,
  }
}

// ── Calculation helpers ───────────────────────────────────────────────────
function calcABN(form: ABNForm) {
  const gross = parseFloat(form.gross_input) || 0
  const gst = (form.includes_gst && gross > 0)
    ? Math.round(gross / 11 * 100) / 100 : 0
  const grossEx = form.includes_gst ? Math.round((gross - gst) * 100) / 100 : gross
  const superApplicable =
    form.is_labour === true &&
    form.is_personal_work === true &&
    form.is_individual === true
  const superAmt = superApplicable
    ? Math.round(grossEx * SG_RATE * 100) / 100 : 0
  return { gross, grossEx, gst, superApplicable, superAmt }
}

function calcNoABN(form: NoABNForm) {
  const gross = parseFloat(form.gross_input) || 0
  const isExempt = form.is_company === true || form.is_under_threshold === true
  const withholding = isExempt ? 0 : Math.round(gross * WITHHOLDING_RATE * 100) / 100
  const netPayable = Math.round((gross - withholding) * 100) / 100
  return { gross, withholding, netPayable, isExempt }
}

function fyRange() {
  const now = new Date()
  const month = now.getMonth() + 1
  const yr = month >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return { start: `${yr}-07-01`, end: `${yr + 1}-06-30`, label: `FY${yr}–${String(yr + 1).slice(2)}` }
}

// ── YesNo toggle ──────────────────────────────────────────────────────────
function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'inline-flex', gap: '0.25rem', background: 'var(--cream2)', borderRadius: '8px', padding: '0.2rem' }}>
      {([true, false] as const).map(v => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          style={{
            padding: '0.3rem 0.875rem', borderRadius: '6px', fontSize: '0.8125rem',
            fontWeight: 500, border: 'none', cursor: 'pointer',
            background: value === v ? (v ? 'rgba(34,197,94,0.2)' : 'rgba(200,75,47,0.15)') : 'transparent',
            color: value === v ? (v ? '#15803d' : 'var(--ember)') : 'var(--text3)',
            transition: 'all 120ms',
          }}
        >{v ? 'Yes' : 'No'}</button>
      ))}
    </div>
  )
}

// ── Document Preview ──────────────────────────────────────────────────────
function ABNPreview({ form, biz }: { form: ABNForm; biz: BusinessProfile }) {
  const { gross, grossEx, gst, superApplicable, superAmt } = calcABN(form)
  const docNum = `RS-${form.payment_date.replace(/-/g, '') || todayISO().replace(/-/g, '')}`

  return (
    <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.5rem', fontSize: '0.8125rem', lineHeight: 1.6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--char)' }}>{biz.business_name || 'Your Business'}</p>
          {biz.abn && <p style={{ color: 'var(--text3)' }}>ABN: {biz.abn}</p>}
          {biz.email && <p style={{ color: 'var(--text3)' }}>{biz.email}</p>}
          {biz.address && <p style={{ color: 'var(--text3)' }}>{biz.address}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ background: 'var(--char)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            REMITTANCE STATEMENT
          </span>
          <p style={{ color: 'var(--text3)', marginTop: '0.375rem' }}>{docNum}</p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>CONTRACTOR</p>
        <p style={{ fontWeight: 600, color: 'var(--char)' }}>{form.contractor_name || '—'}</p>
        {form.contractor_abn && <p style={{ color: 'var(--text3)' }}>ABN: {form.contractor_abn}</p>}
        {form.contractor_address && <p style={{ color: 'var(--text3)' }}>{form.contractor_address}</p>}
      </div>

      <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '0.875rem', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>WORK DETAILS</p>
        <p style={{ color: 'var(--char)' }}>{form.work_description || '—'}</p>
        {form.invoice_reference && <p style={{ color: 'var(--text3)' }}>Ref: {form.invoice_reference}</p>}
        <p style={{ color: 'var(--text3)' }}>Payment Date: {form.payment_date ? formatDateAU(form.payment_date) : '—'}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.875rem' }}>
        {form.includes_gst && gross > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
            <span>Amount ex GST</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(grossEx)}</span>
          </div>
        )}
        {form.includes_gst && gross > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
            <span>GST (10%)</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(gst)}</span>
          </div>
        )}
        {superApplicable && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
            <span>Super SG ({(SG_RATE * 100).toFixed(0)}%)</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(superAmt)}</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: '2px solid var(--char)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: 'var(--char)' }}>Total Payment</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--char)' }}>
          {formatCurrency(gross)}
        </span>
      </div>
      {superApplicable && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.375rem' }}>
          + {formatCurrency(superAmt)} super payable to {form.contractor_name || 'contractor'}&apos;s super fund
        </p>
      )}

      {!superApplicable && (form.is_labour !== null || form.is_personal_work !== null || form.is_individual !== null) && (
        <div style={{ marginTop: '0.875rem', padding: '0.625rem', background: 'rgba(34,197,94,0.08)', borderRadius: '6px', borderLeft: '3px solid #16a34a' }}>
          <p style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 500 }}>
            No super obligation — ATO contractor tests not met
          </p>
        </div>
      )}

      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text3)', textAlign: 'center' }}>
          Generated by SAB Account AI · ABN Contractor Payment
        </p>
      </div>
    </div>
  )
}

function NoABNPreview({ form, biz }: { form: NoABNForm; biz: BusinessProfile }) {
  const { gross, withholding, netPayable, isExempt } = calcNoABN(form)
  const docNum = `W4-${form.payment_date.replace(/-/g, '') || todayISO().replace(/-/g, '')}`

  return (
    <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.5rem', fontSize: '0.8125rem', lineHeight: 1.6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--char)' }}>{biz.business_name || 'Your Business'}</p>
          {biz.abn && <p style={{ color: 'var(--text3)' }}>ABN: {biz.abn}</p>}
          {biz.email && <p style={{ color: 'var(--text3)' }}>{biz.email}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ background: 'rgba(200,75,47,0.85)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            WITHHOLDING STATEMENT
          </span>
          <p style={{ color: 'var(--text3)', marginTop: '0.375rem' }}>{docNum}</p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>PAYEE (NO ABN)</p>
        <p style={{ fontWeight: 600, color: 'var(--char)' }}>{form.worker_name || '—'}</p>
        {form.worker_address && <p style={{ color: 'var(--text3)' }}>{form.worker_address}</p>}
      </div>

      <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '0.875rem', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>SERVICES</p>
        <p style={{ color: 'var(--char)' }}>{form.work_description || '—'}</p>
        <p style={{ color: 'var(--text3)' }}>Payment Date: {form.payment_date ? formatDateAU(form.payment_date) : '—'}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
          <span>Gross Payment</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(gross)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: isExempt ? 'var(--text3)' : 'var(--ember)' }}>
          <span>W4 Withholding ({isExempt ? 'exempt' : `${(WITHHOLDING_RATE * 100).toFixed(0)}%`})</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{isExempt ? 'Nil' : `(${formatCurrency(withholding)})`}</span>
        </div>
      </div>

      <div style={{ borderTop: '2px solid var(--char)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: 'var(--char)' }}>Net Payable to Worker</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--char)' }}>
          {formatCurrency(netPayable)}
        </span>
      </div>

      {!isExempt && withholding > 0 && (
        <div style={{ marginTop: '0.875rem', padding: '0.625rem', background: 'rgba(200,75,47,0.06)', borderRadius: '6px', borderLeft: '3px solid var(--ember)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--ember)', fontWeight: 500, marginBottom: '0.25rem' }}>
            W4 Withholding: {formatCurrency(withholding)} must be remitted to ATO via BAS
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>
            Report in W4 on your quarterly BAS. Provide this statement to the payee.
          </p>
        </div>
      )}

      {isExempt && (
        <div style={{ marginTop: '0.875rem', padding: '0.625rem', background: 'rgba(34,197,94,0.08)', borderRadius: '6px', borderLeft: '3px solid #16a34a' }}>
          <p style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 500 }}>
            Withholding exception applies — no W4 withholding required
          </p>
        </div>
      )}

      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text3)', textAlign: 'center' }}>
          Generated by SAB Account AI · ATO No-ABN Withholding
        </p>
      </div>
    </div>
  )
}

// ── Super Obligation Checker ──────────────────────────────────────────────
function SuperChecker({ form, onChange }: { form: ABNForm; onChange: (k: keyof ABNForm, v: boolean | null) => void }) {
  const { superApplicable } = calcABN(form)
  const allAnswered = form.is_labour !== null && form.is_personal_work !== null && form.is_individual !== null

  return (
    <div style={{ background: 'var(--cream)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.25rem' }}>
        Super Obligation Checker
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '1rem' }}>
        ATO requires super if all 3 conditions are met
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.375rem' }}>
            1. Is this primarily a labour engagement? (Not a specific deliverable/result)
          </p>
          <YesNo value={form.is_labour} onChange={v => onChange('is_labour', v)} />
        </div>
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.375rem' }}>
            2. Does the contractor personally perform the work? (No employees or subcontractors)
          </p>
          <YesNo value={form.is_personal_work} onChange={v => onChange('is_personal_work', v)} />
        </div>
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.375rem' }}>
            3. Is the contractor an individual or sole trader? (Not a company, trust, or partnership)
          </p>
          <YesNo value={form.is_individual} onChange={v => onChange('is_individual', v)} />
        </div>
      </div>

      {allAnswered && (
        <div style={{
          marginTop: '1rem', padding: '0.75rem', borderRadius: '8px',
          background: superApplicable ? 'rgba(200,75,47,0.08)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${superApplicable ? 'rgba(200,75,47,0.25)' : 'rgba(34,197,94,0.25)'}`,
        }}>
          {superApplicable ? (
            <>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ember)' }}>
                Super obligation applies — {(SG_RATE * 100).toFixed(0)}% SG rate
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.25rem' }}>
                Employer super guarantee applies. Pay to contractor&apos;s nominated super fund.
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#15803d' }}>
                No super obligation
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.25rem' }}>
                ATO contractor tests not met — super guarantee does not apply to this payment.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Exception Checker ─────────────────────────────────────────────────────
function ExceptionChecker({ form, onChange }: { form: NoABNForm; onChange: (k: keyof NoABNForm, v: boolean | null) => void }) {
  const { isExempt } = calcNoABN(form)
  const allAnswered = form.is_company !== null && form.is_under_threshold !== null

  return (
    <div style={{ background: 'var(--cream)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.25rem' }}>
        Withholding Exception Check
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '1rem' }}>
        Check if the 47% no-ABN withholding can be waived
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.375rem' }}>
            1. Is the payee a company, trust, or partnership?
          </p>
          <YesNo value={form.is_company} onChange={v => onChange('is_company', v)} />
        </div>
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.375rem' }}>
            2. Is the total payment $75 or less (ex GST)? (ATO low-value threshold)
          </p>
          <YesNo value={form.is_under_threshold} onChange={v => onChange('is_under_threshold', v)} />
        </div>
      </div>

      {allAnswered && (
        <div style={{
          marginTop: '1rem', padding: '0.75rem', borderRadius: '8px',
          background: isExempt ? 'rgba(34,197,94,0.08)' : 'rgba(200,75,47,0.08)',
          border: `1px solid ${isExempt ? 'rgba(34,197,94,0.25)' : 'rgba(200,75,47,0.25)'}`,
        }}>
          {isExempt ? (
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#15803d' }}>
              Exception applies — no withholding required
            </p>
          ) : (
            <>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ember)' }}>
                47% withholding applies — W4 reportable on BAS
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.25rem' }}>
                Withhold 47% and remit to ATO. Report total in W4 on your quarterly BAS.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── ABN Builder ───────────────────────────────────────────────────────────
function ABNBuilder({
  form, onChange, onSave, saving, biz,
}: {
  form: ABNForm
  onChange: (k: keyof ABNForm, v: string | boolean | null) => void
  onSave: () => void
  saving: boolean
  biz: BusinessProfile
}) {
  const { gross, grossEx, gst, superApplicable, superAmt } = calcABN(form)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }} className="abn-builder-grid">
      {/* Left: Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', borderBottom: '1px solid var(--border)', paddingBottom: '0.625rem' }}>
          Contractor Details
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="sab-label">Contractor Name *</label>
            <input className="sab-input" placeholder="Jane Smith" value={form.contractor_name}
              onChange={e => onChange('contractor_name', e.target.value)} />
          </div>
          <div>
            <label className="sab-label">ABN</label>
            <input className="sab-input" placeholder="12 345 678 901" value={form.contractor_abn}
              onChange={e => onChange('contractor_abn', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="sab-label">Address</label>
          <input className="sab-input" placeholder="123 Main St, Melbourne VIC 3000" value={form.contractor_address}
            onChange={e => onChange('contractor_address', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="sab-label">Email <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(statement sent here)</span></label>
            <input className="sab-input" type="email" placeholder="contractor@email.com" value={form.contractor_email}
              onChange={e => onChange('contractor_email', e.target.value)} />
          </div>
          <div>
            <label className="sab-label">Phone</label>
            <input className="sab-input" placeholder="0400 000 000" value={form.contractor_phone}
              onChange={e => onChange('contractor_phone', e.target.value)} />
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', borderBottom: '1px solid var(--border)', paddingBottom: '0.625rem', marginTop: '0.5rem' }}>
          Work Details
        </p>

        <div>
          <label className="sab-label">Work Description *</label>
          <input className="sab-input" placeholder="e.g. Web development — April 2025" value={form.work_description}
            onChange={e => onChange('work_description', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="sab-label">Payment Date *</label>
            <input type="date" className="sab-input" value={form.payment_date}
              onChange={e => onChange('payment_date', e.target.value)} />
          </div>
          <div>
            <label className="sab-label">Invoice / Reference</label>
            <input className="sab-input" placeholder="INV-001" value={form.invoice_reference}
              onChange={e => onChange('invoice_reference', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="sab-label">Payment Amount (total)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>$</span>
            <input type="number" min={0} step="0.01" className="sab-input" placeholder="0.00" value={form.gross_input}
              onChange={e => onChange('gross_input', e.target.value)} style={{ paddingLeft: '1.5rem' }} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text2)' }}>
          <input type="checkbox" checked={form.includes_gst}
            onChange={e => onChange('includes_gst', e.target.checked)}
            style={{ accentColor: 'var(--ember)', width: '1rem', height: '1rem' }} />
          <span>Invoice includes GST</span>
          {form.includes_gst && gross > 0 && (
            <span style={{ color: 'var(--text3)', fontSize: '0.8125rem' }}>
              — {formatCurrency(grossEx)} ex-GST + {formatCurrency(gst)} GST
            </span>
          )}
        </label>

        <SuperChecker form={form} onChange={(k, v) => onChange(k, v)} />

        {gross > 0 && (
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.625rem' }}>Payment Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {form.includes_gst && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text2)' }}>
                    <span>Ex-GST amount</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(grossEx)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text2)' }}>
                    <span>GST (10%)</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(gst)}</span>
                  </div>
                </>
              )}
              {superApplicable && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text2)' }}>
                  <span>Super SG ({(SG_RATE * 100).toFixed(0)}%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ember)' }}>{formatCurrency(superAmt)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--char)' }}>
                <span>Total to contractor</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(gross)}</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="sab-label">Notes (optional)</label>
          <input className="sab-input" placeholder="Any additional notes…" value={form.notes}
            onChange={e => onChange('notes', e.target.value)} />
        </div>

        <button onClick={onSave} disabled={saving} className="btn btn-ember">
          {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
          {saving ? 'Saving…' : 'Save & Generate Document'}
        </button>
      </div>

      {/* Right: Preview */}
      <div style={{ position: 'sticky', top: '80px' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
          Document Preview
        </p>
        <ABNPreview form={form} biz={biz} />
      </div>
    </div>
  )
}

// ── No-ABN Builder ────────────────────────────────────────────────────────
function NoABNBuilder({
  form, onChange, onSave, saving, biz,
}: {
  form: NoABNForm
  onChange: (k: keyof NoABNForm, v: string | boolean | null) => void
  onSave: () => void
  saving: boolean
  biz: BusinessProfile
}) {
  const { gross, withholding, netPayable } = calcNoABN(form)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }} className="abn-builder-grid">
      {/* Left: Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', borderBottom: '1px solid var(--border)', paddingBottom: '0.625rem' }}>
          Worker Details (No ABN)
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="sab-label">Worker Name *</label>
            <input className="sab-input" placeholder="Full name" value={form.worker_name}
              onChange={e => onChange('worker_name', e.target.value)} />
          </div>
          <div>
            <label className="sab-label">Email <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(statement sent here)</span></label>
            <input className="sab-input" type="email" placeholder="worker@email.com" value={form.worker_email}
              onChange={e => onChange('worker_email', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="sab-label">Address (optional)</label>
          <input className="sab-input" placeholder="Home address" value={form.worker_address}
            onChange={e => onChange('worker_address', e.target.value)} />
        </div>

        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', borderBottom: '1px solid var(--border)', paddingBottom: '0.625rem', marginTop: '0.5rem' }}>
          Work Details
        </p>

        <div>
          <label className="sab-label">Work Description *</label>
          <input className="sab-input" placeholder="e.g. Casual labouring — 3 days" value={form.work_description}
            onChange={e => onChange('work_description', e.target.value)} />
        </div>

        <div>
          <label className="sab-label">Payment Date *</label>
          <input type="date" className="sab-input" value={form.payment_date}
            onChange={e => onChange('payment_date', e.target.value)} />
        </div>

        <div>
          <label className="sab-label">Gross Payment Amount</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>$</span>
            <input type="number" min={0} step="0.01" className="sab-input" placeholder="0.00" value={form.gross_input}
              onChange={e => onChange('gross_input', e.target.value)} style={{ paddingLeft: '1.5rem' }} />
          </div>
        </div>

        <ExceptionChecker form={form} onChange={(k, v) => onChange(k, v)} />

        {gross > 0 && (
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.625rem' }}>Withholding Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text2)' }}>
                <span>Gross payment</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(gross)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: withholding > 0 ? 'var(--ember)' : 'var(--text2)' }}>
                <span>W4 withholding ({(WITHHOLDING_RATE * 100).toFixed(0)}%)</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{withholding > 0 ? `(${formatCurrency(withholding)})` : 'Nil'}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--char)' }}>
                <span>Net payable to worker</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(netPayable)}</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="sab-label">Notes (optional)</label>
          <input className="sab-input" placeholder="Any additional notes…" value={form.notes}
            onChange={e => onChange('notes', e.target.value)} />
        </div>

        <button onClick={onSave} disabled={saving} className="btn btn-ember">
          {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
          {saving ? 'Saving…' : 'Save & Generate Document'}
        </button>
      </div>

      {/* Right: Preview */}
      <div style={{ position: 'sticky', top: '80px' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
          Document Preview
        </p>
        <NoABNPreview form={form} biz={biz} />
      </div>
    </div>
  )
}

// ── Payment List ──────────────────────────────────────────────────────────
function PaymentList({
  payments, onDelete, biz, tab,
}: {
  payments: ABNPayment[]
  onDelete: (id: string) => void
  biz: BusinessProfile
  tab: Tab
}) {
  const { toast } = useToast()
  const [emailingId, setEmailingId] = useState<string | null>(null)
  const [emailAddress, setEmailAddress] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSentIds, setEmailSentIds] = useState<Set<string>>(new Set())

  async function sendEmail(p: ABNPayment) {
    if (!emailAddress.trim()) { toast('Enter an email address', 'error'); return }
    setEmailSending(true)
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      let pdfBase64: string
      if (p.has_abn) {
        pdfBase64 = await getABNRemittancePDFBase64({
          business_name: biz.business_name || '',
          business_abn: biz.abn || '',
          business_email: biz.email || '',
          business_address: biz.address || '',
          contractor_name: p.contractor_name,
          contractor_abn: p.contractor_abn || '',
          contractor_address: p.contractor_address || '',
          work_description: p.work_description,
          payment_date: p.payment_date,
          invoice_reference: p.invoice_reference || '',
          gross_amount: Number(p.gross_amount),
          includes_gst: p.includes_gst,
          gst_amount: Number(p.gst_amount),
          is_super_applicable: p.is_super_applicable,
          super_amount: Number(p.super_amount),
        })
      } else {
        pdfBase64 = await getNoABNWithholdingPDFBase64({
          business_name: biz.business_name || '',
          business_abn: biz.abn || '',
          business_email: biz.email || '',
          worker_name: p.contractor_name,
          worker_address: p.contractor_address || '',
          work_description: p.work_description,
          payment_date: p.payment_date,
          gross_amount: Number(p.gross_amount),
          withholding_amount: Number(p.withholding_amount),
          net_payable: Number(p.net_payable),
        })
      }

      const res = await fetch('/api/email/abn-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to: emailAddress.trim(),
          paymentType: p.has_abn ? 'abn' : 'noabn',
          recipientName: p.contractor_name,
          businessName: biz.business_name || '',
          workDescription: p.work_description,
          paymentDate: formatDateAU(p.payment_date),
          grossAmount: formatCurrency(Number(p.gross_amount)),
          netPayable: formatCurrency(Number(p.net_payable)),
          withholdingAmount: Number(p.withholding_amount) > 0 ? formatCurrency(Number(p.withholding_amount)) : undefined,
          pdfBase64,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to send')

      setEmailSentIds(prev => new Set([...prev, p.id]))
      setEmailingId(null)
      toast(`Document emailed to ${emailAddress.trim()}`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Email failed', 'error')
    } finally {
      setEmailSending(false)
    }
  }

  const filtered = payments.filter(p => tab === 'abn' ? p.has_abn : !p.has_abn)

  if (filtered.length === 0) {
    return (
      <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '3rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{tab === 'abn' ? '📋' : '📄'}</div>
        <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.375rem' }}>No payments yet</p>
        <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
          {tab === 'abn' ? 'Record ABN contractor payments above.' : 'Record no-ABN worker payments above.'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
            {['Date', tab === 'abn' ? 'Contractor' : 'Worker', 'Description', 'Gross', tab === 'abn' ? 'Super' : 'Withheld', 'Net Paid', ''].map(h => (
              <th key={h} style={{
                padding: '0.625rem 1rem',
                textAlign: ['Gross', 'Super', 'Withheld', 'Net Paid'].includes(h) ? 'right' : 'left',
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((p, i) => (
            <React.Fragment key={p.id}>
            <tr style={{ borderBottom: emailingId !== p.id && i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                {formatDateAU(p.payment_date)}
              </td>
              <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--char)' }}>
                {p.contractor_name}
                {p.contractor_abn && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 400 }}>ABN: {p.contractor_abn}</span>}
              </td>
              <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.work_description}
              </td>
              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--char)', whiteSpace: 'nowrap' }}>
                {formatCurrency(p.gross_amount)}
              </td>
              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: tab === 'abn' ? (p.is_super_applicable ? 'var(--ember)' : 'var(--text3)') : (p.withholding_amount > 0 ? 'var(--ember)' : 'var(--text3)'), whiteSpace: 'nowrap' }}>
                {tab === 'abn'
                  ? (p.is_super_applicable ? formatCurrency(p.super_amount) : '—')
                  : (p.withholding_amount > 0 ? formatCurrency(p.withholding_amount) : 'Exempt')}
              </td>
              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', whiteSpace: 'nowrap' }}>
                {formatCurrency(p.net_payable)}
              </td>
              <td style={{ padding: '0.75rem 0.75rem', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      if (emailingId === p.id) { setEmailingId(null); return }
                      setEmailingId(p.id)
                      setEmailAddress(p.contractor_email || '')
                      setEmailSending(false)
                    }}
                    style={{
                      background: emailSentIds.has(p.id) ? 'rgba(34,197,94,0.1)' : 'none',
                      border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer',
                      color: emailSentIds.has(p.id) ? '#15803d' : 'var(--text2)',
                      fontSize: '0.75rem', padding: '0.25rem 0.625rem',
                    }}
                    title="Email document"
                  >
                    {emailSentIds.has(p.id) ? '✓ Sent' : 'Email'}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (p.has_abn) {
                          await downloadABNRemittancePDF({
                            business_name: biz.business_name || '',
                            business_abn: biz.abn || '',
                            business_email: biz.email || '',
                            business_address: biz.address || '',
                            contractor_name: p.contractor_name,
                            contractor_abn: p.contractor_abn || '',
                            contractor_address: p.contractor_address || '',
                            work_description: p.work_description,
                            payment_date: p.payment_date,
                            invoice_reference: p.invoice_reference || '',
                            gross_amount: Number(p.gross_amount),
                            includes_gst: p.includes_gst,
                            gst_amount: Number(p.gst_amount),
                            is_super_applicable: p.is_super_applicable,
                            super_amount: Number(p.super_amount),
                          })
                        } else {
                          await downloadNoABNWithholdingPDF({
                            business_name: biz.business_name || '',
                            business_abn: biz.abn || '',
                            business_email: biz.email || '',
                            worker_name: p.contractor_name,
                            worker_address: p.contractor_address || '',
                            work_description: p.work_description,
                            payment_date: p.payment_date,
                            gross_amount: Number(p.gross_amount),
                            withholding_amount: Number(p.withholding_amount),
                            net_payable: Number(p.net_payable),
                          })
                        }
                      } catch {
                        toast('PDF download failed', 'error')
                      }
                    }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text2)', fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                    title="Download PDF"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this payment record?')) onDelete(p.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '1rem', padding: '0.25rem', borderRadius: '4px', lineHeight: 1 }}
                    title="Delete"
                  >×</button>
                </div>
              </td>
            </tr>
            {emailingId === p.id && (
              <tr>
                <td colSpan={7} style={{ padding: '0.75rem 1rem', background: 'var(--cream)', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      Email {p.has_abn ? 'Remittance Statement' : 'Withholding Statement'} to:
                    </span>
                    <input
                      type="email"
                      className="sab-input"
                      placeholder="recipient@example.com"
                      value={emailAddress}
                      onChange={e => setEmailAddress(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') sendEmail(p) }}
                      style={{ flex: 1, minWidth: '200px', fontSize: '0.875rem', padding: '0.4rem 0.75rem' }}
                      autoFocus
                    />
                    <button
                      onClick={() => sendEmail(p)}
                      disabled={emailSending}
                      className="btn btn-ember"
                      style={{ fontSize: '0.8125rem', padding: '0.4rem 1rem', whiteSpace: 'nowrap' }}
                    >
                      {emailSending && <span className="spinner" style={{ width: '0.75rem', height: '0.75rem', borderWidth: '2px' }} />}
                      {emailSending ? 'Sending…' : 'Send'}
                    </button>
                    <button
                      onClick={() => setEmailingId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '0.875rem', padding: '0.25rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function ABNPaymentsPage() {
  const { toast } = useToast()
  useEffect(() => { document.title = 'ABN Payments — SAB Account AI' }, [])

  const [payments, setPayments] = useState<ABNPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('abn')       // builder scenario
  const [listTab, setListTab] = useState<Tab>('abn') // list filter (independent)
  const [mode, setMode] = useState<'list' | 'building'>('list')
  const [saving, setSaving] = useState(false)
  const [biz, setBiz] = useState<BusinessProfile>({ business_name: null, abn: null, email: null, address: null })
  const [abnForm, setABNForm] = useState<ABNForm>(defaultABNForm())
  const [noabnForm, setNoABNForm] = useState<NoABNForm>(defaultNoABNForm())
  const [savedPayment, setSavedPayment] = useState<SavedPayment | null>(null)
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const fy = fyRange()

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: payData }, { data: bizData }] = await Promise.all([
        supabase.from('abn_payments').select('*').eq('user_id', user.id)
          .gte('payment_date', fy.start).lte('payment_date', fy.end)
          .order('payment_date', { ascending: false }),
        supabase.from('business_profiles').select('business_name, abn, email, address').eq('id', user.id).single(),
      ])

      setPayments((payData ?? []) as ABNPayment[])
      if (bizData) setBiz({ business_name: bizData.business_name, abn: bizData.abn, email: bizData.email, address: bizData.address })
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stats
  const abnPayments = useMemo(() => payments.filter(p => p.has_abn), [payments])
  const noabnPayments = useMemo(() => payments.filter(p => !p.has_abn), [payments])
  const totalABNGross = abnPayments.reduce((s, p) => s + Number(p.gross_amount), 0)
  const totalWithholding = noabnPayments.reduce((s, p) => s + Number(p.withholding_amount), 0)
  const totalSuper = abnPayments.reduce((s, p) => s + Number(p.super_amount), 0)

  function setABNField(k: keyof ABNForm, v: string | boolean | null) {
    setABNForm(prev => ({ ...prev, [k]: v }))
  }

  function setNoABNField(k: keyof NoABNForm, v: string | boolean | null) {
    setNoABNForm(prev => ({ ...prev, [k]: v }))
  }

  async function saveABN() {
    if (!abnForm.contractor_name.trim()) { toast('Contractor name is required', 'error'); return }
    if (!abnForm.work_description.trim()) { toast('Work description is required', 'error'); return }
    if (!abnForm.payment_date) { toast('Payment date is required', 'error'); return }
    const gross = parseFloat(abnForm.gross_input)
    if (!gross || gross <= 0) { toast('Amount must be greater than 0', 'error'); return }

    const { gst, superApplicable, superAmt } = calcABN(abnForm)

    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('abn_payments').insert({
        user_id: user.id,
        has_abn: true,
        contractor_name: abnForm.contractor_name.trim(),
        contractor_abn: abnForm.contractor_abn.trim() || null,
        contractor_address: abnForm.contractor_address.trim() || null,
        contractor_email: abnForm.contractor_email.trim() || null,
        contractor_phone: abnForm.contractor_phone.trim() || null,
        work_description: abnForm.work_description.trim(),
        payment_date: abnForm.payment_date,
        invoice_reference: abnForm.invoice_reference.trim() || null,
        gross_amount: gross,
        includes_gst: abnForm.includes_gst,
        gst_amount: gst,
        withholding_amount: 0,
        is_super_applicable: superApplicable,
        super_amount: superAmt,
        net_payable: gross,
        notes: abnForm.notes.trim() || null,
      }).select('*').single()

      if (error) throw error
      setPayments(prev => [data as ABNPayment, ...prev])
      toast('ABN payment saved', 'success')

      const pdfData: ABNRemittancePDFData = {
        business_name: biz.business_name || '',
        business_abn: biz.abn || '',
        business_email: biz.email || '',
        business_address: biz.address || '',
        contractor_name: abnForm.contractor_name.trim(),
        contractor_abn: abnForm.contractor_abn.trim(),
        contractor_address: abnForm.contractor_address.trim(),
        work_description: abnForm.work_description.trim(),
        payment_date: abnForm.payment_date,
        invoice_reference: abnForm.invoice_reference.trim(),
        gross_amount: gross,
        includes_gst: abnForm.includes_gst,
        gst_amount: gst,
        is_super_applicable: superApplicable,
        super_amount: superAmt,
      }

      setSavedPayment({ type: 'abn', pdf: pdfData, gross, recipientEmail: abnForm.contractor_email.trim() })
      setEmailTo(abnForm.contractor_email.trim())
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveNoABN() {
    if (!noabnForm.worker_name.trim()) { toast('Worker name is required', 'error'); return }
    if (!noabnForm.work_description.trim()) { toast('Work description is required', 'error'); return }
    if (!noabnForm.payment_date) { toast('Payment date is required', 'error'); return }
    const gross = parseFloat(noabnForm.gross_input)
    if (!gross || gross <= 0) { toast('Amount must be greater than 0', 'error'); return }

    const { withholding, netPayable } = calcNoABN(noabnForm)

    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('abn_payments').insert({
        user_id: user.id,
        has_abn: false,
        contractor_name: noabnForm.worker_name.trim(),
        contractor_abn: null,
        contractor_address: noabnForm.worker_address.trim() || null,
        contractor_email: noabnForm.worker_email.trim() || null,
        contractor_phone: null,
        work_description: noabnForm.work_description.trim(),
        payment_date: noabnForm.payment_date,
        invoice_reference: null,
        gross_amount: gross,
        includes_gst: false,
        gst_amount: 0,
        withholding_amount: withholding,
        is_super_applicable: false,
        super_amount: 0,
        net_payable: netPayable,
        notes: noabnForm.notes.trim() || null,
      }).select('*').single()

      if (error) throw error
      setPayments(prev => [data as ABNPayment, ...prev])
      toast('No-ABN payment saved', 'success')

      const noabnPdfData: NoABNWithholdingPDFData = {
        business_name: biz.business_name || '',
        business_abn: biz.abn || '',
        business_email: biz.email || '',
        worker_name: noabnForm.worker_name.trim(),
        worker_address: noabnForm.worker_address.trim(),
        work_description: noabnForm.work_description.trim(),
        payment_date: noabnForm.payment_date,
        gross_amount: gross,
        withholding_amount: withholding,
        net_payable: netPayable,
      }

      setSavedPayment({ type: 'noabn', pdf: noabnPdfData, gross, withholding, netPayable, recipientEmail: noabnForm.worker_email.trim() })
      setEmailTo(noabnForm.worker_email.trim())
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('abn_payments').delete().eq('id', id)
    if (error) { toast('Delete failed', 'error'); return }
    setPayments(prev => prev.filter(p => p.id !== id))
    toast('Payment deleted', 'info')
  }

  function resetAfterSave() {
    setSavedPayment(null)
    setEmailTo('')
    setEmailSent(false)
    setABNForm(defaultABNForm())
    setNoABNForm(defaultNoABNForm())
  }

  async function handleDownloadSavedPDF() {
    if (!savedPayment) return
    if (savedPayment.type === 'abn') {
      await downloadABNRemittancePDF(savedPayment.pdf)
    } else {
      await downloadNoABNWithholdingPDF(savedPayment.pdf)
    }
  }

  async function handleSendEmail() {
    if (!emailTo.trim()) { toast('Enter an email address', 'error'); return }
    if (!savedPayment) return
    setEmailSending(true)
    try {
      const pdfBase64 = savedPayment.type === 'abn'
        ? await getABNRemittancePDFBase64(savedPayment.pdf)
        : await getNoABNWithholdingPDFBase64(savedPayment.pdf)

      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const body = savedPayment.type === 'abn'
        ? {
            to: emailTo.trim(),
            paymentType: 'abn' as const,
            recipientName: savedPayment.pdf.contractor_name,
            businessName: savedPayment.pdf.business_name,
            workDescription: savedPayment.pdf.work_description,
            paymentDate: formatDateAU(savedPayment.pdf.payment_date),
            grossAmount: formatCurrency(savedPayment.gross),
            netPayable: formatCurrency(savedPayment.gross),
            pdfBase64,
          }
        : {
            to: emailTo.trim(),
            paymentType: 'noabn' as const,
            recipientName: savedPayment.pdf.worker_name,
            businessName: savedPayment.pdf.business_name,
            workDescription: savedPayment.pdf.work_description,
            paymentDate: formatDateAU(savedPayment.pdf.payment_date),
            grossAmount: formatCurrency(savedPayment.gross),
            netPayable: formatCurrency(savedPayment.netPayable),
            withholdingAmount: savedPayment.withholding > 0 ? formatCurrency(savedPayment.withholding) : undefined,
            pdfBase64,
          }

      const res = await fetch('/api/email/abn-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Send failed (${res.status})`)
      console.log('[ABN email] sent, Resend id:', json.id)
      setEmailSent(true)
      toast('Statement sent successfully!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send email', 'error')
    } finally {
      setEmailSending(false)
    }
  }

  if (savedPayment) {
    const isABN = savedPayment.type === 'abn'
    const label = isABN ? 'Remittance Statement' : 'Withholding Statement'
    const amount = isABN ? savedPayment.gross : savedPayment.netPayable
    return (
      <PlanGate requiredPlan="pro">
        <div style={{ maxWidth: '520px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.25rem' }}>✓</div>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Payment Saved!</h2>
          <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
            {label} · {formatCurrency(amount)}
          </p>

          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '1rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.625rem' }}>
              Send {label.toLowerCase()} by email
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="sab-input"
                type="email"
                placeholder="recipient@example.com"
                value={emailTo}
                onChange={e => { setEmailTo(e.target.value); setEmailSent(false) }}
                style={{ flex: 1 }}
              />
              <button
                onClick={handleSendEmail}
                disabled={emailSending || emailSent}
                className="btn btn-char"
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {emailSending && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
                {emailSending ? 'Sending…' : emailSent ? '✓ Sent' : 'Send Email'}
              </button>
            </div>
            {emailSent && <p style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.5rem' }}>Statement emailed to {emailTo}</p>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={handleDownloadSavedPDF} className="btn btn-ember" style={{ width: '100%' }}>Download PDF</button>
            <button onClick={resetAfterSave} className="btn btn-outline" style={{ width: '100%' }}>+ Save Another Payment</button>
            <button onClick={() => { resetAfterSave(); setMode('list') }} className="btn btn-ghost" style={{ width: '100%' }}>← Back to List</button>
          </div>
        </div>
      </PlanGate>
    )
  }

  return (
    <PlanGate requiredPlan="pro">
    <>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              ABN Payments
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>{fy.label} · Contractor & casual worker payments</p>
          </div>
          {mode === 'list' && (
            <button
              onClick={() => { setMode('building'); setABNForm(defaultABNForm()); setNoABNForm(defaultNoABNForm()) }}
              className="btn btn-ember"
              style={{ fontSize: '0.875rem', padding: '0.45rem 1.125rem' }}
            >
              + New Payment
            </button>
          )}
          {mode === 'building' && (
            <button onClick={() => setMode('list')} className="btn btn-outline" style={{ fontSize: '0.875rem', padding: '0.45rem 1rem' }}>
              ← Back to List
            </button>
          )}
        </div>

        {/* Stats */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.125rem 1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text3)', marginBottom: '0.375rem' }}>ABN Payments</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--char)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.25rem' }}>{formatCurrency(totalABNGross)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{abnPayments.length} payment{abnPayments.length !== 1 ? 's' : ''}</p>
            </div>
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.125rem 1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text3)', marginBottom: '0.375rem' }}>W4 Withholding (No ABN)</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: totalWithholding > 0 ? 'var(--ember)' : 'var(--char)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.25rem' }}>{formatCurrency(totalWithholding)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Report in W4 on BAS</p>
            </div>
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.125rem 1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text3)', marginBottom: '0.375rem' }}>Super Payable</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--char)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.25rem' }}>{formatCurrency(totalSuper)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>SG obligations this FY</p>
            </div>
          </div>
        )}

        {/* Builder */}
        {mode === 'building' && (
          <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Scenario tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--cream2)', borderRadius: 'var(--r)', padding: '0.25rem', marginBottom: '1.5rem', width: 'fit-content' }}>
              {(['abn', 'noabn'] as Tab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    padding: '0.45rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem',
                    fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: tab === t ? '#ffffff' : 'transparent',
                    color: tab === t ? 'var(--char)' : 'var(--text3)',
                    boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 150ms',
                  }}
                >
                  {t === 'abn' ? 'With ABN — Contractor' : 'No ABN — Withholding'}
                </button>
              ))}
            </div>

            {tab === 'abn' ? (
              <ABNBuilder form={abnForm} onChange={setABNField} onSave={saveABN} saving={saving} biz={biz} />
            ) : (
              <NoABNBuilder form={noabnForm} onChange={setNoABNField} onSave={saveNoABN} saving={saving} biz={biz} />
            )}
          </div>
        )}

        {/* List */}
        <div>
          {/* List tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--cream2)', borderRadius: 'var(--r)', padding: '0.25rem', marginBottom: '1rem', width: 'fit-content' }}>
            {(['abn', 'noabn'] as Tab[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setListTab(t)}
                style={{
                  padding: '0.35rem 1rem', borderRadius: '8px', fontSize: '0.8125rem',
                  fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: listTab === t ? 'var(--char)' : 'transparent',
                  color: listTab === t ? '#ffffff' : 'var(--text2)',
                  transition: 'all 150ms',
                }}
              >
                {t === 'abn' ? `With ABN (${abnPayments.length})` : `No ABN (${noabnPayments.length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
            </div>
          ) : (
            <PaymentList payments={payments} onDelete={handleDelete} biz={biz} tab={listTab} />
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .abn-builder-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
    </PlanGate>
  )
}
