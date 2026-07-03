import { describe, it, expect } from 'vitest'
import { parseAdminEmails } from '@/lib/admin'

describe('parseAdminEmails', () => {
  it('parses a single email', () => {
    expect(parseAdminEmails('admin@example.com')).toEqual(['admin@example.com'])
  })

  it('parses multiple comma-separated emails', () => {
    expect(parseAdminEmails('a@x.com,b@x.com,c@x.com')).toEqual(['a@x.com', 'b@x.com', 'c@x.com'])
  })

  it('trims whitespace around emails', () => {
    expect(parseAdminEmails(' a@x.com , b@x.com ')).toEqual(['a@x.com', 'b@x.com'])
  })

  it('filters out empty segments from trailing/double commas', () => {
    expect(parseAdminEmails('a@x.com,,b@x.com,')).toEqual(['a@x.com', 'b@x.com'])
  })

  it('returns empty array for undefined', () => {
    expect(parseAdminEmails(undefined)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseAdminEmails('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(parseAdminEmails('   ')).toEqual([])
  })
})
