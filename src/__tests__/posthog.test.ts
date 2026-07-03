import { describe, it, expect, afterEach } from 'vitest'
import { getPostHogServer, captureServerEvent } from '../lib/posthog'
import { mapStripeEventToPostHog } from '../lib/posthog-webhook-utils'
import { initPostHog } from '../lib/posthog-client'

// ── Server client ──────────────────────────────────────────────────────────

describe('getPostHogServer', () => {
  const original = process.env.NEXT_PUBLIC_POSTHOG_KEY

  afterEach(() => {
    if (original !== undefined) {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = original
    } else {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    }
  })

  it('returns null when NEXT_PUBLIC_POSTHOG_KEY is not set', () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    // Re-import via inline require to get fresh module state
    // We rely on the exported function to check the env at call time
    expect(getPostHogServer()).toBeNull()
  })

  it('returns a PostHog instance when key is set', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key'
    const client = getPostHogServer()
    expect(client).not.toBeNull()
    expect(typeof client?.capture).toBe('function')
  })

  it('returns the same instance on repeated calls (singleton)', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key'
    const first  = getPostHogServer()
    const second = getPostHogServer()
    expect(first).toBe(second)
  })
})

describe('captureServerEvent', () => {
  it('resolves without throwing when key is not set', async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    await expect(captureServerEvent('user-1', 'test_event')).resolves.toBeUndefined()
  })
})

// ── PostHogProvider ────────────────────────────────────────────────────────

describe('initPostHog', () => {
  it('is a function', () => {
    expect(typeof initPostHog).toBe('function')
  })

  it('does not throw when called in node environment (no window)', () => {
    expect(() => initPostHog()).not.toThrow()
  })
})

// ── Stripe webhook event mapper ────────────────────────────────────────────

describe('mapStripeEventToPostHog', () => {
  describe('customer.subscription.created', () => {
    it('returns subscription_started when status is active', () => {
      const result = mapStripeEventToPostHog(
        'customer.subscription.created',
        'user-abc',
        { status: 'active', plan: 'starter' },
      )
      expect(result).not.toBeNull()
      expect(result!.event).toBe('subscription_started')
      expect(result!.distinctId).toBe('user-abc')
      expect(result!.properties).toEqual({ plan: 'starter' })
    })

    it('returns null when status is trialing (not yet active)', () => {
      const result = mapStripeEventToPostHog(
        'customer.subscription.created',
        'user-abc',
        { status: 'trialing' },
      )
      expect(result).toBeNull()
    })

    it('returns null when status is incomplete', () => {
      const result = mapStripeEventToPostHog(
        'customer.subscription.created',
        'user-abc',
        { status: 'incomplete' },
      )
      expect(result).toBeNull()
    })

    it('omits properties when no plan provided', () => {
      const result = mapStripeEventToPostHog(
        'customer.subscription.created',
        'user-abc',
        { status: 'active' },
      )
      expect(result?.properties).toBeUndefined()
    })
  })

  describe('customer.subscription.deleted', () => {
    it('returns subscription_cancelled', () => {
      const result = mapStripeEventToPostHog('customer.subscription.deleted', 'user-abc')
      expect(result).not.toBeNull()
      expect(result!.event).toBe('subscription_cancelled')
      expect(result!.distinctId).toBe('user-abc')
    })
  })

  describe('invoice.payment_failed', () => {
    it('returns payment_failed', () => {
      const result = mapStripeEventToPostHog('invoice.payment_failed', 'user-abc')
      expect(result).not.toBeNull()
      expect(result!.event).toBe('payment_failed')
      expect(result!.distinctId).toBe('user-abc')
    })
  })

  describe('edge cases', () => {
    it('returns null for unknown event type', () => {
      expect(mapStripeEventToPostHog('payment.intent.created', 'user-abc')).toBeNull()
    })

    it('returns null when userId is null', () => {
      expect(mapStripeEventToPostHog('customer.subscription.deleted', null)).toBeNull()
    })

    it('returns null when userId is undefined', () => {
      expect(mapStripeEventToPostHog('customer.subscription.deleted', undefined)).toBeNull()
    })

    it('returns null when userId is empty string', () => {
      expect(mapStripeEventToPostHog('customer.subscription.deleted', '')).toBeNull()
    })
  })
})
