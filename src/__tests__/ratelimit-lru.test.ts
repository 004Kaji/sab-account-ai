import { describe, it, expect, vi, afterEach } from 'vitest'
import { LRUCounter } from '@/lib/ratelimit'

afterEach(() => {
  vi.useRealTimers()
})

describe('LRUCounter', () => {
  it('allows the first request', () => {
    const lru = new LRUCounter(100, 60_000)
    const result = lru.check('user1', 5)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('allows requests up to the limit', () => {
    const lru = new LRUCounter(100, 60_000)
    for (let i = 0; i < 5; i++) {
      expect(lru.check('user1', 5).allowed).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const lru = new LRUCounter(100, 60_000)
    for (let i = 0; i < 5; i++) lru.check('user1', 5)
    const result = lru.check('user1', 5)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('tracks separate keys independently', () => {
    const lru = new LRUCounter(100, 60_000)
    for (let i = 0; i < 5; i++) lru.check('userA', 5)
    expect(lru.check('userA', 5).allowed).toBe(false)
    expect(lru.check('userB', 5).allowed).toBe(true)
  })

  it('resets the count after the window expires', () => {
    vi.useFakeTimers()
    const lru = new LRUCounter(100, 60_000)
    for (let i = 0; i < 5; i++) lru.check('user1', 5)
    expect(lru.check('user1', 5).allowed).toBe(false)

    vi.advanceTimersByTime(60_001)
    const result = lru.check('user1', 5)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('evicts the LRU entry when at maxEntries capacity', () => {
    const lru = new LRUCounter(3, 60_000)
    lru.check('a', 10)
    lru.check('b', 10)
    lru.check('c', 10)

    // Touch 'b' and 'c' to make 'a' the least-recently-used
    lru.check('b', 10)
    lru.check('c', 10)

    // Adding 'd' should evict 'a' (LRU)
    lru.check('d', 10)

    // 'a' was evicted — its count resets to 1 on re-entry, so remaining = 10 - 1 = 9
    const result = lru.check('a', 10)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it('does not exceed maxEntries', () => {
    const lru = new LRUCounter(5, 60_000)
    for (let i = 0; i < 10; i++) {
      lru.check(`user${i}`, 100)
    }
    // If this throws or hangs, the test fails — just exercising the eviction path
    expect(lru.check('userX', 100).allowed).toBe(true)
  })

  it('applies different limits per key in the same instance', () => {
    const lru = new LRUCounter(100, 60_000)
    // free user: limit 5
    for (let i = 0; i < 5; i++) lru.check('freeUser', 5)
    expect(lru.check('freeUser', 5).allowed).toBe(false)

    // pro user: limit 60 — same LRU instance, independent counter
    for (let i = 0; i < 60; i++) lru.check('proUser', 60)
    expect(lru.check('proUser', 60).allowed).toBe(false)
    expect(lru.check('freeUser', 5).allowed).toBe(false) // still blocked
  })
})
