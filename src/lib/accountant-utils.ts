// ── Link validation ────────────────────────────────────────────────────────

type LinkLike = { revoked_at: string | null; expires_at: string }

export function isLinkRevoked(link: LinkLike): boolean {
  return link.revoked_at != null
}

export function isLinkExpired(link: LinkLike, now: Date = new Date()): boolean {
  return new Date(link.expires_at) <= now
}

export function getLinkStatus(link: LinkLike, now: Date = new Date()): 'active' | 'expired' | 'revoked' {
  if (isLinkRevoked(link)) return 'revoked'
  if (isLinkExpired(link, now)) return 'expired'
  return 'active'
}

export function isLinkValid(link: LinkLike, now: Date = new Date()): boolean {
  return getLinkStatus(link, now) === 'active'
}

// ── RLS-equivalent filter (mirrors the DB policy auth.uid() = user_id) ─────

export function applyRLSFilter<T extends { user_id: string }>(rows: T[], userId: string): T[] {
  return rows.filter(r => r.user_id === userId)
}

// ── Australian financial year ──────────────────────────────────────────────

export function getFinancialYearStart(now: Date = new Date()): Date {
  // FY runs 1 Jul – 30 Jun; if we're before July, start was last year
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return new Date(year, 6, 1) // month 6 = July
}

// ── Aggregation helpers (used both in the page and in tests) ──────────────

export function aggregateInvoiceStats(
  invoices: Array<{ total_inc_gst: number; status: string; document_type: string }>,
) {
  const billable = invoices.filter(i => i.document_type !== 'quote')
  return {
    totalInvoiced:    billable.reduce((s, i) => s + Number(i.total_inc_gst), 0),
    totalPaid:        billable.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_inc_gst), 0),
    totalOutstanding: billable.filter(i => ['pending', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total_inc_gst), 0),
  }
}

export function aggregatePayrollStats(
  payslips: Array<{ gross_pay: number; income_tax: number; super_sg: number }>,
) {
  return {
    totalGross: payslips.reduce((s, p) => s + Number(p.gross_pay), 0),
    totalPAYG:  payslips.reduce((s, p) => s + Number(p.income_tax), 0),
    totalSuper: payslips.reduce((s, p) => s + Number(p.super_sg), 0),
  }
}

export function aggregateBASStats(
  records: Array<{ type: string; gst_amount: number }>,
) {
  const gstCollected = records.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.gst_amount), 0)
  const gstCredits   = records.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.gst_amount), 0)
  return { gstCollected, gstCredits, netGST: gstCollected - gstCredits }
}
