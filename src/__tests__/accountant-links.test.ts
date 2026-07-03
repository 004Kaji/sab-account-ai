import { describe, it, expect } from 'vitest'
import {
  isLinkRevoked,
  isLinkExpired,
  getLinkStatus,
  isLinkValid,
  applyRLSFilter,
  getFinancialYearStart,
  aggregateInvoiceStats,
  aggregatePayrollStats,
  aggregateBASStats,
} from '../lib/accountant-utils'

// ── Link status helpers ────────────────────────────────────────────────────

const FUTURE  = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
const PAST    = new Date(Date.now() - 1  * 24 * 60 * 60 * 1000).toISOString()
const NOW_DATE = new Date()

describe('isLinkRevoked', () => {
  it('returns false when revoked_at is null', () => {
    expect(isLinkRevoked({ revoked_at: null, expires_at: FUTURE })).toBe(false)
  })

  it('returns true when revoked_at is set', () => {
    expect(isLinkRevoked({ revoked_at: PAST, expires_at: FUTURE })).toBe(true)
  })
})

describe('isLinkExpired', () => {
  it('returns false for a future expiry', () => {
    expect(isLinkExpired({ revoked_at: null, expires_at: FUTURE }, NOW_DATE)).toBe(false)
  })

  it('returns true for a past expiry', () => {
    expect(isLinkExpired({ revoked_at: null, expires_at: PAST }, NOW_DATE)).toBe(true)
  })

  it('returns true when expiry equals now (boundary)', () => {
    const exact = NOW_DATE.toISOString()
    expect(isLinkExpired({ revoked_at: null, expires_at: exact }, NOW_DATE)).toBe(true)
  })
})

describe('getLinkStatus', () => {
  it('returns "active" for a valid non-revoked non-expired link', () => {
    expect(getLinkStatus({ revoked_at: null, expires_at: FUTURE }, NOW_DATE)).toBe('active')
  })

  it('returns "revoked" when revoked_at is set, even if not expired', () => {
    expect(getLinkStatus({ revoked_at: PAST, expires_at: FUTURE }, NOW_DATE)).toBe('revoked')
  })

  it('returns "expired" when expires_at is past and not revoked', () => {
    expect(getLinkStatus({ revoked_at: null, expires_at: PAST }, NOW_DATE)).toBe('expired')
  })

  it('prefers "revoked" over "expired" when both apply', () => {
    expect(getLinkStatus({ revoked_at: PAST, expires_at: PAST }, NOW_DATE)).toBe('revoked')
  })
})

describe('isLinkValid', () => {
  it('returns true for an active link', () => {
    expect(isLinkValid({ revoked_at: null, expires_at: FUTURE }, NOW_DATE)).toBe(true)
  })

  it('returns false for a revoked link', () => {
    expect(isLinkValid({ revoked_at: PAST, expires_at: FUTURE }, NOW_DATE)).toBe(false)
  })

  it('returns false for an expired link', () => {
    expect(isLinkValid({ revoked_at: null, expires_at: PAST }, NOW_DATE)).toBe(false)
  })
})

// ── RLS filter (mirrors auth.uid() = user_id policy) ─────────────────────

describe('applyRLSFilter', () => {
  const rows = [
    { id: '1', user_id: 'user-a', token: 'tok-1' },
    { id: '2', user_id: 'user-b', token: 'tok-2' },
    { id: '3', user_id: 'user-a', token: 'tok-3' },
  ]

  it('returns only rows belonging to the given user', () => {
    const result = applyRLSFilter(rows, 'user-a')
    expect(result).toHaveLength(2)
    expect(result.map(r => r.id)).toEqual(['1', '3'])
  })

  it('returns no rows for a different user', () => {
    expect(applyRLSFilter(rows, 'user-c')).toHaveLength(0)
  })

  it('user-b cannot see user-a rows', () => {
    const result = applyRLSFilter(rows, 'user-b')
    expect(result.every(r => r.user_id === 'user-b')).toBe(true)
    expect(result.map(r => r.id)).toEqual(['2'])
  })
})

// ── Financial year start ──────────────────────────────────────────────────

describe('getFinancialYearStart', () => {
  it('returns July 1 of the same year when in July–December', () => {
    const start = getFinancialYearStart(new Date('2025-08-15'))
    expect(start.getFullYear()).toBe(2025)
    expect(start.getMonth()).toBe(6) // 0-indexed: 6 = July
    expect(start.getDate()).toBe(1)
  })

  it('returns July 1 of the previous year when in January–June', () => {
    const start = getFinancialYearStart(new Date('2026-04-10'))
    expect(start.getFullYear()).toBe(2025)
    expect(start.getMonth()).toBe(6)
    expect(start.getDate()).toBe(1)
  })

  it('returns July 1 when called on July 1 itself', () => {
    const start = getFinancialYearStart(new Date('2026-07-01'))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(6)
  })
})

// ── Invoice aggregation ───────────────────────────────────────────────────

describe('aggregateInvoiceStats', () => {
  const invoices = [
    { total_inc_gst: 1000, status: 'paid',    document_type: 'invoice' },
    { total_inc_gst: 500,  status: 'pending', document_type: 'invoice' },
    { total_inc_gst: 300,  status: 'overdue', document_type: 'invoice' },
    { total_inc_gst: 200,  status: 'draft',   document_type: 'invoice' },
    { total_inc_gst: 9999, status: 'pending', document_type: 'quote'   }, // excluded
  ]

  it('sums total invoiced (excluding quotes)', () => {
    expect(aggregateInvoiceStats(invoices).totalInvoiced).toBe(2000)
  })

  it('sums only paid invoices', () => {
    expect(aggregateInvoiceStats(invoices).totalPaid).toBe(1000)
  })

  it('sums pending + overdue as outstanding', () => {
    expect(aggregateInvoiceStats(invoices).totalOutstanding).toBe(800)
  })

  it('returns zeros for empty array', () => {
    const r = aggregateInvoiceStats([])
    expect(r.totalInvoiced).toBe(0)
    expect(r.totalPaid).toBe(0)
    expect(r.totalOutstanding).toBe(0)
  })
})

// ── Payroll aggregation ───────────────────────────────────────────────────

describe('aggregatePayrollStats', () => {
  const payslips = [
    { gross_pay: 5000, income_tax: 1200, super_sg: 550 },
    { gross_pay: 5500, income_tax: 1350, super_sg: 605 },
  ]

  it('sums total gross pay', () => {
    expect(aggregatePayrollStats(payslips).totalGross).toBe(10500)
  })

  it('sums PAYG withheld', () => {
    expect(aggregatePayrollStats(payslips).totalPAYG).toBe(2550)
  })

  it('sums superannuation', () => {
    expect(aggregatePayrollStats(payslips).totalSuper).toBe(1155)
  })

  it('returns zeros for empty array', () => {
    const r = aggregatePayrollStats([])
    expect(r.totalGross).toBe(0)
    expect(r.totalPAYG).toBe(0)
    expect(r.totalSuper).toBe(0)
  })
})

// ── BAS / GST aggregation ─────────────────────────────────────────────────

describe('aggregateBASStats', () => {
  const records = [
    { type: 'income',  gst_amount: 1000 },
    { type: 'income',  gst_amount: 500  },
    { type: 'expense', gst_amount: 300  },
    { type: 'expense', gst_amount: 150  },
  ]

  it('sums GST collected from income records', () => {
    expect(aggregateBASStats(records).gstCollected).toBe(1500)
  })

  it('sums GST credits from expense records', () => {
    expect(aggregateBASStats(records).gstCredits).toBe(450)
  })

  it('computes net GST as collected minus credits', () => {
    expect(aggregateBASStats(records).netGST).toBe(1050)
  })

  it('handles negative net GST (credits exceed collected)', () => {
    const r = aggregateBASStats([
      { type: 'income',  gst_amount: 100 },
      { type: 'expense', gst_amount: 500 },
    ])
    expect(r.netGST).toBe(-400)
  })

  it('returns zeros for empty array', () => {
    const r = aggregateBASStats([])
    expect(r.gstCollected).toBe(0)
    expect(r.gstCredits).toBe(0)
    expect(r.netGST).toBe(0)
  })
})
