import { describe, it, expect } from 'vitest'
import {
  isWeekend,
  isPublicHoliday,
  isBusinessDay,
  addBusinessDays,
  businessDaysBetween,
  paydaySuperDeadline,
  deriveSuperStatus,
  wasPaidOnTime,
  validateUSI,
  validateESA,
  suggestedPaymentReference,
} from '@/lib/super-compliance'

describe('business-day helpers', () => {
  it('detects weekends', () => {
    expect(isWeekend('2026-07-04')).toBe(true)  // Saturday
    expect(isWeekend('2026-07-05')).toBe(true)  // Sunday
    expect(isWeekend('2026-07-03')).toBe(false) // Friday
  })

  it('detects national public holidays', () => {
    expect(isPublicHoliday('2026-12-25')).toBe(true) // Christmas
    expect(isPublicHoliday('2026-01-26')).toBe(true) // Australia Day
    expect(isPublicHoliday('2026-07-03')).toBe(false)
  })

  it('a business day is a weekday that is not a public holiday', () => {
    expect(isBusinessDay('2026-07-03')).toBe(true)  // Friday
    expect(isBusinessDay('2026-07-04')).toBe(false) // Saturday
    expect(isBusinessDay('2026-12-25')).toBe(false) // Christmas (Friday)
  })
})

describe('addBusinessDays', () => {
  it('skips weekends', () => {
    // Fri 2026-07-03 + 1 business day → Mon 2026-07-06
    expect(addBusinessDays('2026-07-03', 1)).toBe('2026-07-06')
  })

  it('skips public holidays', () => {
    // Thu 2026-12-24 + 1 business day: skips Fri 25 (Christmas), Sat/Sun,
    // Mon 28 (Boxing Day observed) → Tue 2026-12-29
    expect(addBusinessDays('2026-12-24', 1)).toBe('2026-12-29')
  })

  it('computes payday + 7 business days across a normal week', () => {
    // Payday Fri 2026-07-03 → +7 business days → Tue 2026-07-14
    expect(paydaySuperDeadline('2026-07-03')).toBe('2026-07-14')
  })

  it('computes payday + 7 business days across the Christmas shutdown', () => {
    // Payday Wed 2026-12-23. Skips Christmas (25), Boxing observed (28),
    // New Year's Day (2027-01-01) and weekends.
    const deadline = paydaySuperDeadline('2026-12-23')
    // Business days: 24, 29, 30, 31, then Jan 4, 5, 6 (skip Jan 1 holiday + weekends)
    expect(deadline).toBe('2027-01-06')
  })
})

describe('businessDaysBetween', () => {
  it('is zero for the same day', () => {
    expect(businessDaysBetween('2026-07-06', '2026-07-06')).toBe(0)
  })

  it('counts forward excluding weekends and holidays', () => {
    // Fri 2026-07-03 → Tue 2026-07-07 = Mon(6), Tue(7) = 2 business days
    expect(businessDaysBetween('2026-07-03', '2026-07-07')).toBe(2)
  })

  it('is negative when the target is in the past', () => {
    expect(businessDaysBetween('2026-07-07', '2026-07-03')).toBe(-2)
  })
})

describe('deriveSuperStatus', () => {
  const deadline = '2026-07-14'

  it('is PAID when a paid date is present, regardless of deadline', () => {
    expect(deriveSuperStatus({ deadlineISO: deadline, paidDateISO: '2026-07-20' })).toBe('PAID')
  })

  it('is OVERDUE when unpaid and past the deadline', () => {
    expect(deriveSuperStatus({ deadlineISO: deadline, todayISO: '2026-07-15' })).toBe('OVERDUE')
  })

  it('is DUE_SOON when unpaid and within 3 business days', () => {
    // Thu 2026-07-09 → deadline Tue 14: business days = Fri10, Mon13, Tue14 = 3
    expect(deriveSuperStatus({ deadlineISO: deadline, todayISO: '2026-07-09' })).toBe('DUE_SOON')
  })

  it('is UPCOMING when unpaid and more than 3 business days out', () => {
    expect(deriveSuperStatus({ deadlineISO: deadline, todayISO: '2026-07-06' })).toBe('UPCOMING')
  })
})

describe('wasPaidOnTime', () => {
  it('true on the deadline day', () => {
    expect(wasPaidOnTime('2026-07-14', '2026-07-14')).toBe(true)
  })
  it('false after the deadline', () => {
    expect(wasPaidOnTime('2026-07-14', '2026-07-15')).toBe(false)
  })
})

describe('validateUSI', () => {
  it('accepts an ABN-based USI with product suffix', () => {
    expect(validateUSI('12345678901001')).toBe(true)
    expect(validateUSI('12345678901')).toBe(true)
  })
  it('accepts an alphanumeric fund code', () => {
    expect(validateUSI('STA0100AU')).toBe(true)
  })
  it('rejects empty or too-short values', () => {
    expect(validateUSI('')).toBe(false)
    expect(validateUSI('AB12')).toBe(false)
  })
})

describe('validateESA', () => {
  it('accepts a typical ESA alias', () => {
    expect(validateESA('SMSFDATAFLOW')).toBe(true)
    expect(validateESA('AUSPOSTSMSF')).toBe(true)
  })
  it('rejects garbage', () => {
    expect(validateESA('no spaces!')).toBe(false)
    expect(validateESA('ab')).toBe(false)
  })
})

describe('suggestedPaymentReference', () => {
  it('builds a compact alphanumeric reference', () => {
    expect(suggestedPaymentReference('Mindil Beach Café', '2026-07-03')).toBe('SG-MINDILBE-20260703')
  })
  it('falls back when the name has no alphanumerics', () => {
    expect(suggestedPaymentReference('!!!', '2026-07-03')).toBe('SG-SUPER-20260703')
  })
})
