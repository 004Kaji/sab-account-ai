import { describe, it, expect } from 'vitest'
import { toISO } from '@/lib/date-utils'

describe('toISO', () => {
  it('returns null for null', () => {
    expect(toISO(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(toISO(undefined)).toBeNull()
  })

  it('returns null for 0 (falsy number)', () => {
    expect(toISO(0)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(toISO('')).toBeNull()
  })

  it('returns null for an invalid date string (was causing RangeError in production)', () => {
    expect(toISO('not-a-date')).toBeNull()
    expect(toISO('invalid')).toBeNull()
    expect(toISO('2024-13-99')).toBeNull()
  })

  it('converts a Unix timestamp (number) to ISO string', () => {
    const result = toISO(1748822400) // 2025-06-02T00:00:00.000Z
    expect(result).toBeTruthy()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(new Date(result!).getFullYear()).toBe(2025)
  })

  it('passes through a valid ISO date string unchanged in value', () => {
    const input = '2025-06-15T10:30:00.000Z'
    const result = toISO(input)
    expect(result).toBe(input)
  })

  it('converts a date-only string to ISO', () => {
    const result = toISO('2025-06-15')
    expect(result).toBeTruthy()
    expect(result).toMatch(/^2025-06-15/)
  })
})
