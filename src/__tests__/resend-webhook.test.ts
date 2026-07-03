import { describe, it, expect } from 'vitest'
import { resendEventToField } from '../lib/resend-utils'
import { Webhook } from 'svix'

// ── resendEventToField ─────────────────────────────────────────────────────

describe('resendEventToField', () => {
  it('maps email.delivered → delivered_at', () => {
    expect(resendEventToField('email.delivered')).toBe('delivered_at')
  })

  it('maps email.bounced → bounced_at', () => {
    expect(resendEventToField('email.bounced')).toBe('bounced_at')
  })

  it('maps email.complained → failed_at', () => {
    expect(resendEventToField('email.complained')).toBe('failed_at')
  })

  it('returns null for unknown event types', () => {
    expect(resendEventToField('email.opened')).toBeNull()
    expect(resendEventToField('email.clicked')).toBeNull()
    expect(resendEventToField('')).toBeNull()
    expect(resendEventToField('unknown')).toBeNull()
  })
})

// ── Svix webhook signature verification ──────────────────────────────────

const TEST_SECRET = 'MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'

function signPayload(payload: string, secret: string): Record<string, string> {
  const msgId    = 'msg_test_001'
  const timestamp = Math.floor(Date.now() / 1000)
  const wh       = new Webhook(secret)
  // Manually construct the headers that Resend/svix would send
  const toSign   = `${msgId}.${timestamp}.${payload}`
  // Use the internal sign method via a round-trip: sign then expose headers
  // by calling sign() on a known payload to derive correct headers
  const signed   = (wh as unknown as { sign(msgId: string, timestamp: Date, payload: string): string })
    .sign(msgId, new Date(timestamp * 1000), payload)
  return {
    'svix-id':        msgId,
    'svix-timestamp': String(timestamp),
    'svix-signature': signed,
  }
}

describe('svix Webhook signature verification', () => {
  it('accepts a valid payload+signature', () => {
    const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_abc' } })
    const wh      = new Webhook(TEST_SECRET)
    const headers = signPayload(payload, TEST_SECRET)
    expect(() => wh.verify(payload, headers)).not.toThrow()
  })

  it('rejects a payload with wrong signature', () => {
    const payload     = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_abc' } })
    const wh          = new Webhook(TEST_SECRET)
    const badHeaders  = {
      'svix-id':        'msg_test_001',
      'svix-timestamp': String(Math.floor(Date.now() / 1000)),
      'svix-signature': 'v1,invalidsignature',
    }
    expect(() => wh.verify(payload, badHeaders)).toThrow()
  })

  it('rejects a tampered payload', () => {
    const originalPayload = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_abc' } })
    const tamperedPayload = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_TAMPERED' } })
    const wh              = new Webhook(TEST_SECRET)
    const headers         = signPayload(originalPayload, TEST_SECRET)
    expect(() => wh.verify(tamperedPayload, headers)).toThrow()
  })

  it('rejects a payload signed with a different secret', () => {
    const payload    = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_abc' } })
    const wh         = new Webhook(TEST_SECRET)
    const headers    = signPayload(payload, 'WrongSecret12345678901234567890')
    expect(() => wh.verify(payload, headers)).toThrow()
  })
})
