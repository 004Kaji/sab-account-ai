import { describe, it, expect } from 'vitest'
import { getPageRange, calcOverdueDays, isInvoiceNumberDuplicate, PAGE_SIZE } from '../lib/invoice-utils'

describe('PAGE_SIZE', () => {
  it('is 20', () => {
    expect(PAGE_SIZE).toBe(20)
  })
})

describe('getPageRange', () => {
  it('returns [0, 19] for page 0', () => {
    expect(getPageRange(0)).toEqual({ from: 0, to: 19 })
  })

  it('returns [20, 39] for page 1', () => {
    expect(getPageRange(1)).toEqual({ from: 20, to: 39 })
  })

  it('returns [40, 59] for page 2', () => {
    expect(getPageRange(2)).toEqual({ from: 40, to: 59 })
  })

  it('respects a custom pageSize', () => {
    expect(getPageRange(0, 10)).toEqual({ from: 0, to: 9 })
    expect(getPageRange(1, 10)).toEqual({ from: 10, to: 19 })
  })

  it('to is always from + pageSize - 1', () => {
    for (let p = 0; p < 5; p++) {
      const { from, to } = getPageRange(p, PAGE_SIZE)
      expect(to - from).toBe(PAGE_SIZE - 1)
    }
  })
})

describe('calcOverdueDays', () => {
  it('returns null for a future due date', () => {
    expect(calcOverdueDays('2099-12-31', '2026-06-25')).toBeNull()
  })

  it('returns null for today (same date, not overdue yet)', () => {
    expect(calcOverdueDays('2026-06-25', '2026-06-25')).toBeNull()
  })

  it('returns 1 for yesterday', () => {
    expect(calcOverdueDays('2026-06-24', '2026-06-25')).toBe(1)
  })

  it('returns 7 for 7 days ago', () => {
    expect(calcOverdueDays('2026-06-18', '2026-06-25')).toBe(7)
  })

  it('returns 30 for exactly 30 days overdue', () => {
    expect(calcOverdueDays('2026-05-26', '2026-06-25')).toBe(30)
  })

  it('returns null for empty dueDate', () => {
    expect(calcOverdueDays('', '2026-06-25')).toBeNull()
  })

  it('returns null for empty todayStr', () => {
    expect(calcOverdueDays('2026-06-20', '')).toBeNull()
  })
})

describe('isInvoiceNumberDuplicate', () => {
  const existing = ['INV-001', 'INV-002', 'INV-003']

  it('returns false when number is not in the list', () => {
    expect(isInvoiceNumberDuplicate('INV-004', existing)).toBe(false)
  })

  it('returns true when number exists in the list', () => {
    expect(isInvoiceNumberDuplicate('INV-001', existing)).toBe(true)
    expect(isInvoiceNumberDuplicate('INV-003', existing)).toBe(true)
  })

  it('is case-sensitive', () => {
    expect(isInvoiceNumberDuplicate('inv-001', existing)).toBe(false)
  })

  it('returns false for empty list', () => {
    expect(isInvoiceNumberDuplicate('INV-001', [])).toBe(false)
  })

  it('returns false for empty number string', () => {
    expect(isInvoiceNumberDuplicate('', existing)).toBe(false)
  })
})
