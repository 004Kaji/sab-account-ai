// Shared utility functions for SAB Account AI

// ── Currency ────────────────────────────────────────────────────

/** Format a number as Australian dollars, e.g. 1250 → "$1,250.00" */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Round a number to 2 decimal places (avoids floating-point errors) */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Dates ────────────────────────────────────────────────────────

/** Format an ISO date string as Australian format: DD/MM/YYYY */
export function formatDateAU(dateStr: string): string {
  if (!dateStr) return ''
  // Parse as local date to avoid timezone shifts on date-only strings
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

/** Get today's date as a YYYY-MM-DD string (for <input type="date">) */
export function todayISO(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

/** Add N days to a YYYY-MM-DD string and return the result as YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

/** Get a human-readable greeting based on the current time of day */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── ABN validation ───────────────────────────────────────────────

/**
 * Validate an Australian Business Number using the ATO check-digit algorithm.
 * Accepts with or without spaces (e.g. "12 345 678 901" or "12345678901").
 */
export function validateABN(abn: string): boolean {
  const digits = abn.replace(/\s/g, '')
  if (!/^\d{11}$/.test(digits)) return false

  // ATO check-digit: weighted sum of digits (first digit minus 1) must be divisible by 89
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const d = digits.split('').map(Number)
  d[0] -= 1
  const sum = weights.reduce((acc, w, i) => acc + w * d[i], 0)
  return sum % 89 === 0
}

/** Format an ABN with spaces: 12 345 678 901 */
export function formatABN(abn: string): string {
  const digits = abn.replace(/\s/g, '')
  if (digits.length !== 11) return abn
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`
}

// ── Email validation ─────────────────────────────────────────────

/** Check that an email address has a valid format */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ── Invoice numbers ──────────────────────────────────────────────

/** Generate an invoice number like INV-2025-001 */
export function generateInvoiceNumber(count: number): string {
  const year = new Date().getFullYear()
  return `INV-${year}-${String(count).padStart(3, '0')}`
}

// ── GST calculations ─────────────────────────────────────────────

/** Calculate 10% GST on an amount excluding GST */
export function calcGST(amountExGST: number): number {
  return round2(amountExGST * 0.1)
}

/** Calculate the total including 10% GST from an ex-GST amount */
export function calcTotalIncGST(amountExGST: number): number {
  return round2(amountExGST * 1.1)
}

/** Extract the GST component from an amount that already includes GST */
export function extractGST(amountIncGST: number): number {
  return round2(amountIncGST / 11)
}

// ── Random ID generator ──────────────────────────────────────────

/** Generate a short random ID for list keys or temporary IDs */
export function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

// ── String helpers ───────────────────────────────────────────────

/** Capitalise the first letter of a string */
export function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Return the initials of a name (max 2 characters) */
export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Class name helper ────────────────────────────────────────────

/**
 * Combine class names, filtering out falsy values.
 * Lightweight replacement for the 'clsx' package.
 * Usage: cn('base', isActive && 'active', error ? 'error' : '')
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ── Current financial year ───────────────────────────────────────

/**
 * Return the Australian financial year string (e.g. "FY 2024–25").
 * The ATO FY runs 1 Jul – 30 Jun, so months 7-12 are the start of the next FY.
 */
export function getCurrentFY(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-indexed
  const fyStart = month >= 7 ? year : year - 1
  return `FY ${fyStart}–${String(fyStart + 1).slice(2)}`
}

/** Get the current FY date range label, e.g. "1 Jul 2024 – 30 Jun 2025" */
export function getCurrentFYRange(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const fyStart = month >= 7 ? year : year - 1
  return `1 Jul ${fyStart} – 30 Jun ${fyStart + 1}`
}
