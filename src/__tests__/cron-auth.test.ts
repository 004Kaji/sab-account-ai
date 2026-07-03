import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isAuthorizedCron } from '@/lib/cron-auth'

function reqWith(auth: string | null) {
  return { headers: { get: (name: string) => (name === 'Authorization' ? auth : null) } }
}

describe('isAuthorizedCron', () => {
  const original = process.env.CRON_SECRET

  beforeEach(() => { process.env.CRON_SECRET = 'super-secret-value' })
  afterEach(() => { process.env.CRON_SECRET = original })

  it('accepts the correct bearer token', () => {
    expect(isAuthorizedCron(reqWith('Bearer super-secret-value'))).toBe(true)
  })

  it('rejects a wrong token', () => {
    expect(isAuthorizedCron(reqWith('Bearer wrong'))).toBe(false)
  })

  it('rejects a missing header', () => {
    expect(isAuthorizedCron(reqWith(null))).toBe(false)
  })

  it('fails closed when CRON_SECRET is unset — "Bearer undefined" must not authorise', () => {
    delete process.env.CRON_SECRET
    expect(isAuthorizedCron(reqWith('Bearer undefined'))).toBe(false)
    expect(isAuthorizedCron(reqWith('Bearer '))).toBe(false)
  })

  it('fails closed when CRON_SECRET is empty string', () => {
    process.env.CRON_SECRET = ''
    expect(isAuthorizedCron(reqWith('Bearer '))).toBe(false)
  })
})
