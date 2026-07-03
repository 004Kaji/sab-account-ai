import { describe, it, expect } from 'vitest'
import { eligibleForMarkPaid, eligibleForReminder } from '../lib/invoice-utils'

// ── eligibleForMarkPaid ───────────────────────────────────────────────────

describe('eligibleForMarkPaid', () => {
  const invoices = [
    { id: 'a', status: 'pending' },
    { id: 'b', status: 'overdue' },
    { id: 'c', status: 'paid'    },
    { id: 'd', status: 'draft'   },
  ]

  it('includes pending invoices', () => {
    expect(eligibleForMarkPaid(invoices, ['a'])).toContain('a')
  })

  it('includes overdue invoices', () => {
    expect(eligibleForMarkPaid(invoices, ['b'])).toContain('b')
  })

  it('includes draft invoices', () => {
    expect(eligibleForMarkPaid(invoices, ['d'])).toContain('d')
  })

  it('excludes already paid invoices', () => {
    expect(eligibleForMarkPaid(invoices, ['c'])).not.toContain('c')
  })

  it('excludes IDs not in selection', () => {
    const result = eligibleForMarkPaid(invoices, ['a'])
    expect(result).not.toContain('b')
    expect(result).not.toContain('c')
    expect(result).not.toContain('d')
  })

  it('returns multiple eligible IDs when all selected', () => {
    const result = eligibleForMarkPaid(invoices, ['a', 'b', 'c', 'd'])
    expect(result).toContain('a')
    expect(result).toContain('b')
    expect(result).toContain('d')
    expect(result).not.toContain('c')
  })

  it('returns empty array when all selected are paid', () => {
    expect(eligibleForMarkPaid(invoices, ['c'])).toHaveLength(0)
  })

  it('returns empty array for empty selection', () => {
    expect(eligibleForMarkPaid(invoices, [])).toHaveLength(0)
  })

  it('returns empty array for empty invoice list', () => {
    expect(eligibleForMarkPaid([], ['a', 'b'])).toHaveLength(0)
  })
})

// ── eligibleForReminder ───────────────────────────────────────────────────

describe('eligibleForReminder', () => {
  const invoices = [
    { id: 'a', status: 'pending', client_email: 'alice@example.com' },
    { id: 'b', status: 'overdue', client_email: 'bob@example.com'   },
    { id: 'c', status: 'paid',    client_email: 'carol@example.com' },
    { id: 'd', status: 'pending', client_email: null                },
    { id: 'e', status: 'draft',   client_email: 'eve@example.com'   },
  ]

  it('includes pending invoices with a client email', () => {
    expect(eligibleForReminder(invoices, ['a'])).toContain('a')
  })

  it('includes overdue invoices with a client email', () => {
    expect(eligibleForReminder(invoices, ['b'])).toContain('b')
  })

  it('excludes paid invoices even with an email', () => {
    expect(eligibleForReminder(invoices, ['c'])).not.toContain('c')
  })

  it('excludes pending invoices without a client email', () => {
    expect(eligibleForReminder(invoices, ['d'])).not.toContain('d')
  })

  it('excludes draft invoices', () => {
    expect(eligibleForReminder(invoices, ['e'])).not.toContain('e')
  })

  it('returns only eligible IDs from a mixed selection', () => {
    const result = eligibleForReminder(invoices, ['a', 'b', 'c', 'd', 'e'])
    expect(result).toEqual(expect.arrayContaining(['a', 'b']))
    expect(result).not.toContain('c')
    expect(result).not.toContain('d')
    expect(result).not.toContain('e')
    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty selection', () => {
    expect(eligibleForReminder(invoices, [])).toHaveLength(0)
  })

  it('treats empty string client_email as ineligible', () => {
    const inv = [{ id: 'x', status: 'pending', client_email: '' }]
    expect(eligibleForReminder(inv, ['x'])).toHaveLength(0)
  })
})
