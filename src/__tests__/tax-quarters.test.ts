import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildQuarters, currentQuarterIndex } from '@/lib/tax-quarters'

// Fake timers are set up/torn down symmetrically per describe block to prevent
// leaking faked Date state into sibling test files sharing the same worker.
describe('buildQuarters', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('produces 4 quarters for the current FY', () => {
    vi.setSystemTime(new Date('2025-08-15T05:00:00Z')) // 3pm AEST Aug 15
    expect(buildQuarters()).toHaveLength(4)
  })

  it('Q1: Jul–Sep with correct dates and BAS due 28 Oct', () => {
    vi.setSystemTime(new Date('2025-08-15T05:00:00Z'))
    const [q1] = buildQuarters()
    expect(q1.start).toBe('2025-07-01')
    expect(q1.end).toBe('2025-09-30')
    expect(q1.basDue).toBe('28 Oct 2025')
    expect(q1.superDue).toBe('28 Oct 2025')
  })

  it('Q2: Oct–Dec with BAS due 28 Feb and super due 28 Jan of next year', () => {
    vi.setSystemTime(new Date('2025-08-15T05:00:00Z'))
    const [, q2] = buildQuarters()
    expect(q2.start).toBe('2025-10-01')
    expect(q2.end).toBe('2025-12-31')
    expect(q2.basDue).toBe('28 Feb 2026')
    expect(q2.superDue).toBe('28 Jan 2026')
  })

  it('Q3: Jan–Mar with BAS and super due 28 Apr', () => {
    vi.setSystemTime(new Date('2025-08-15T05:00:00Z'))
    const [, , q3] = buildQuarters()
    expect(q3.start).toBe('2026-01-01')
    expect(q3.end).toBe('2026-03-31')
    expect(q3.basDue).toBe('28 Apr 2026')
    expect(q3.superDue).toBe('28 Apr 2026')
  })

  it('Q4: Apr–Jun with BAS and super due 28 Jul', () => {
    vi.setSystemTime(new Date('2025-08-15T05:00:00Z'))
    const [, , , q4] = buildQuarters()
    expect(q4.start).toBe('2026-04-01')
    expect(q4.end).toBe('2026-06-30')
    expect(q4.basDue).toBe('28 Jul 2026')
    expect(q4.superDue).toBe('28 Jul 2026')
  })

  it('uses previous calendar year as FY start when AEST month is Jan–Jun', () => {
    vi.setSystemTime(new Date('2026-03-10T05:00:00Z')) // Mar in AEST → FY starts 2025
    const [q1] = buildQuarters()
    expect(q1.start).toBe('2025-07-01')
    expect(q1.end).toBe('2025-09-30')
  })

  it('Q1 is in FY that starts same year when AEST month is Jul–Dec', () => {
    vi.setSystemTime(new Date('2025-07-01T05:00:00Z')) // Jul 1 AEST = Jul 1 in AEDT (+10)
    const [q1] = buildQuarters()
    expect(q1.start).toBe('2025-07-01')
  })

  // Timezone boundary: 1am Jul 1 AEST = Jun 30 UTC. Should still show FY2025-26.
  it('correctly starts FY2025-26 at 1am AEST Jul 1 (= Jun 30 UTC)', () => {
    vi.setSystemTime(new Date('2025-06-30T15:00:00Z')) // 1am Jul 1 AEST (UTC+10)
    const [q1] = buildQuarters()
    expect(q1.start).toBe('2025-07-01')
  })
})

describe('currentQuarterIndex', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns 0 (Q1) when AEST date is in Jul–Sep', () => {
    vi.setSystemTime(new Date('2025-08-15T05:00:00Z'))
    const qs = buildQuarters()
    expect(currentQuarterIndex(qs)).toBe(0)
  })

  it('returns 1 (Q2) when AEST date is in Oct–Dec', () => {
    vi.setSystemTime(new Date('2025-11-01T05:00:00Z'))
    const qs = buildQuarters()
    expect(currentQuarterIndex(qs)).toBe(1)
  })

  it('returns 2 (Q3) when AEST date is in Jan–Mar', () => {
    vi.setSystemTime(new Date('2026-02-14T05:00:00Z'))
    const qs = buildQuarters()
    expect(currentQuarterIndex(qs)).toBe(2)
  })

  it('returns 3 (Q4) when AEST date is in Apr–Jun', () => {
    vi.setSystemTime(new Date('2026-05-01T05:00:00Z'))
    const qs = buildQuarters()
    expect(currentQuarterIndex(qs)).toBe(3)
  })

  it('returns 0 on the first day of Q1 in AEST even when UTC is still Jun 30', () => {
    vi.setSystemTime(new Date('2025-06-30T15:00:00Z')) // 1am Jul 1 AEST
    const qs = buildQuarters()
    expect(currentQuarterIndex(qs)).toBe(0)
  })

  it('returns 0 on the last day of Q1 (Sep 30 AEST boundary)', () => {
    vi.setSystemTime(new Date('2025-09-30T05:00:00Z'))
    const qs = buildQuarters()
    expect(currentQuarterIndex(qs)).toBe(0)
  })

  it('returns last quarter index when date is outside all quarters (defensive fallback)', () => {
    vi.setSystemTime(new Date('2030-06-15T05:00:00Z'))
    const staleQuarters = [
      { label: 'Q1', start: '2020-07-01', end: '2020-09-30', basDue: '', superDue: '' },
      { label: 'Q2', start: '2020-10-01', end: '2020-12-31', basDue: '', superDue: '' },
      { label: 'Q3', start: '2021-01-01', end: '2021-03-31', basDue: '', superDue: '' },
      { label: 'Q4', start: '2021-04-01', end: '2021-06-30', basDue: '', superDue: '' },
    ]
    expect(currentQuarterIndex(staleQuarters)).toBe(3)
  })
})
