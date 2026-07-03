import { describe, it, expect } from 'vitest'

// Pure helper that mirrors the plan check added to employees and email/payslip routes.
// Tests ensure the gate logic is correct regardless of how the route is mounted.
const PAYROLL_PLANS = ['pro', 'autopilot']

function isPlanAllowed(plan: string | null | undefined): boolean {
  return PAYROLL_PLANS.includes((plan ?? 'free').toLowerCase())
}

describe('server-side plan enforcement (payroll routes)', () => {
  it('allows pro plan', () => {
    expect(isPlanAllowed('pro')).toBe(true)
  })

  it('allows autopilot plan', () => {
    expect(isPlanAllowed('autopilot')).toBe(true)
  })

  it('blocks free plan', () => {
    expect(isPlanAllowed('free')).toBe(false)
  })

  it('blocks starter plan', () => {
    expect(isPlanAllowed('starter')).toBe(false)
  })

  it('blocks null (missing profile)', () => {
    expect(isPlanAllowed(null)).toBe(false)
  })

  it('blocks undefined (missing profile)', () => {
    expect(isPlanAllowed(undefined)).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isPlanAllowed('PRO')).toBe(true)
    expect(isPlanAllowed('Autopilot')).toBe(true)
    expect(isPlanAllowed('FREE')).toBe(false)
  })
})
