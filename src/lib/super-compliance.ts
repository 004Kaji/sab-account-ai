// Super Payment Assistant — Payday Super compliance engine
//
// SAB Account AI is the COMPLIANCE BRAIN, not a bank. This module calculates
// deadlines, derives statuses, validates fund identifiers and builds the data
// for payment instruction sheets. It NEVER moves, holds or routes money — the
// employer makes the actual payment through their own bank or fund portal.
//
// Payday Super (law from 1 July 2026): super must reach the employee's fund
// within 7 business days of each payday. PCG 2026/1 applies a risk-based
// approach for year one (1 Jul 2026 – 30 Jun 2027): genuine on-time attempts
// with prompt correction of errors are treated as low-risk.

// ── Australian public holidays ────────────────────────────────────────
// National public holidays for the Payday Super year-one window and a bit
// either side. Deliberately NATIONAL-only: state-specific holidays vary and
// the ATO deadline is a floor — treating a state holiday as a business day is
// the safe (earlier-deadline) direction. Dates are ISO (YYYY-MM-DD).
//
// ⚠️ Check australia.gov.au/public-holidays each year and extend this table.
export const AU_PUBLIC_HOLIDAYS_NATIONAL: ReadonlySet<string> = new Set([
  // 2026
  '2026-01-01', // New Year's Day
  '2026-01-26', // Australia Day
  '2026-04-03', // Good Friday
  '2026-04-04', // Easter Saturday
  '2026-04-06', // Easter Monday
  '2026-04-25', // Anzac Day (Saturday — not moved nationally, but included)
  '2026-12-25', // Christmas Day
  '2026-12-26', // Boxing Day (Saturday)
  '2026-12-28', // Boxing Day observed (Monday)
  // 2027
  '2027-01-01', // New Year's Day
  '2027-01-26', // Australia Day
  '2027-03-26', // Good Friday
  '2027-03-27', // Easter Saturday
  '2027-03-29', // Easter Monday
  '2027-04-25', // Anzac Day (Sunday)
  '2027-04-26', // Anzac Day observed (Monday)
  '2027-12-25', // Christmas Day (Saturday)
  '2027-12-27', // Christmas Day observed (Monday)
  '2027-12-28', // Boxing Day observed (Tuesday)
])

// All date math is done in UTC to stay timezone-safe: constructing a Date from
// a local-time string and then reading it back via toISOString() shifts the
// calendar day in positive-offset timezones (e.g. AEST). We use `…T00:00:00Z`
// and the getUTC*/toISOString pair consistently.
function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`)
}
function utcISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** True if the given ISO date (YYYY-MM-DD) falls on a Sat/Sun. */
export function isWeekend(isoDate: string): boolean {
  const day = utcDate(isoDate).getUTCDay()
  return day === 0 || day === 6
}

/** True if the ISO date is a national public holiday. */
export function isPublicHoliday(isoDate: string): boolean {
  return AU_PUBLIC_HOLIDAYS_NATIONAL.has(isoDate)
}

/** A business day is a weekday that is not a national public holiday. */
export function isBusinessDay(isoDate: string): boolean {
  return !isWeekend(isoDate) && !isPublicHoliday(isoDate)
}

/**
 * Add N business days to an ISO date, skipping weekends AND national public
 * holidays. The start date itself is never counted; the result is always a
 * business day. Used to compute the Payday Super due date (payday + 7).
 */
export function addBusinessDays(isoDate: string, days: number): string {
  const d = utcDate(isoDate)
  let added = 0
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (isBusinessDay(utcISO(d))) added++
  }
  return utcISO(d)
}

/** Count business days from `fromISO` to `toISO` (exclusive of from, inclusive of to). Negative if to < from. */
export function businessDaysBetween(fromISO: string, toISO: string): number {
  const from = utcDate(fromISO)
  const to = utcDate(toISO)
  if (from.getTime() === to.getTime()) return 0
  const dir = to > from ? 1 : -1
  let count = 0
  const cursor = new Date(from)
  while (cursor.getTime() !== to.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + dir)
    if (isBusinessDay(utcISO(cursor))) count += dir
  }
  return count
}

/** Payday Super due date = payday + 7 business days. */
export const PAYDAY_SUPER_BUSINESS_DAYS = 7
export function paydaySuperDeadline(paydayISO: string): string {
  return addBusinessDays(paydayISO, PAYDAY_SUPER_BUSINESS_DAYS)
}

// ── Compliance status ─────────────────────────────────────────────────
// UI/compliance statuses (distinct from the DB row lifecycle). Derived from
// paid state + how many business days remain until the deadline.
export type SuperComplianceStatus = 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'PAID'

export const DUE_SOON_THRESHOLD_BUSINESS_DAYS = 3

/**
 * Derive the compliance status for a payrun's super.
 *  - PAID     → user has recorded payment (paid date present)
 *  - OVERDUE  → not paid and today is past the deadline
 *  - DUE_SOON → not paid and <= 3 business days remain to the deadline
 *  - UPCOMING → not paid and more than 3 business days remain
 */
export function deriveSuperStatus(params: {
  deadlineISO: string
  paidDateISO?: string | null
  todayISO?: string
}): SuperComplianceStatus {
  const { deadlineISO, paidDateISO } = params
  if (paidDateISO) return 'PAID'
  const todayISO = params.todayISO ?? new Date().toISOString().split('T')[0]
  if (todayISO > deadlineISO) return 'OVERDUE'
  const remaining = businessDaysBetween(todayISO, deadlineISO)
  if (remaining <= DUE_SOON_THRESHOLD_BUSINESS_DAYS) return 'DUE_SOON'
  return 'UPCOMING'
}

/** Was a payment on time? (paid on or before the deadline.) */
export function wasPaidOnTime(deadlineISO: string, paidDateISO: string): boolean {
  return paidDateISO <= deadlineISO
}

// ── Fund identifier validation ────────────────────────────────────────
//
// USI (Unique Superannuation Identifier): identifies a super fund product for
// SuperStream. Two accepted shapes:
//   - APRA-regulated fund: fund ABN (11 digits) + up to 3-digit numeric suffix,
//     e.g. "12345678901" or "12345678901001".
//   - Some funds publish a USI without the ABN prefix; the ATO Fund Validation
//     Service treats the alphanumeric code as authoritative. We accept the
//     common 11–20 char alphanumeric form as a fallback.
// SMSFs do NOT have a USI — they use an ESA (Electronic Service Address) alias.

/** Validate a USI. Accepts ABN-based (11 digits + optional numeric suffix) or an alphanumeric fund code. */
export function validateUSI(usi: string): boolean {
  const clean = usi.replace(/\s/g, '').toUpperCase()
  if (clean.length === 0) return false
  // ABN-based: 11 digits, optionally followed by a numeric product suffix
  if (/^\d{11}\d{0,4}$/.test(clean)) return true
  // Alphanumeric fund code fallback (letters + digits), 8–20 chars
  if (/^[A-Z0-9]{8,20}$/.test(clean)) return true
  return false
}

/**
 * Validate an ESA (Electronic Service Address) for an SMSF. ESAs are messaging
 * aliases (e.g. "SMSFDATAFLOW", "AUSPOSTSMSF"). Format is an uppercase
 * alphanumeric token — we validate shape only, not that it is registered.
 */
export function validateESA(esa: string): boolean {
  return /^[A-Za-z0-9]{4,30}$/.test(esa.trim())
}

// ── Payment reference ─────────────────────────────────────────────────
/**
 * Suggested payment reference for a super contribution, so the employer can
 * reconcile the bank/fund-portal payment back to the payrun. Kept short and
 * alphanumeric to fit narrow bank reference fields. NOT a payment instruction
 * to any system — just a human-friendly memo string.
 */
export function suggestedPaymentReference(businessName: string, paydayISO: string): string {
  const slug = businessName.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'SUPER'
  const compactDate = paydayISO.replace(/-/g, '')
  return `SG-${slug}-${compactDate}`
}

// ── PCG 2026/1 plain-English compliance line ──────────────────────────
export const PCG_2026_1_LINE =
  'Under PCG 2026/1, consistent genuine attempts to pay super on time — and promptly fixing any errors — keep you in the low-risk category for the 2026–27 transition year.'

export const NOT_ADVICE_DISCLAIMER =
  'SAB Account AI provides calculation and record-keeping tools, not financial or tax advice.'
