import { describe, it, expect } from 'vitest'
import { computeReward } from '@/lib/referral'

describe('computeReward', () => {
  describe('0 conversions', () => {
    it('earns nothing', () => {
      const r = computeReward(0, 0, false)
      expect(r.additionalMonths).toBe(0)
      expect(r.lifetimePro).toBe(false)
      expect(r.newEarned).toBe(0)
    })
  })

  describe('1 conversion', () => {
    it('earns 1 month on first conversion', () => {
      const r = computeReward(1, 0, false)
      expect(r.additionalMonths).toBe(1)
      expect(r.lifetimePro).toBe(false)
      expect(r.newEarned).toBe(1)
    })

    it('earns 0 additional months if 1 month was already earned (idempotent)', () => {
      const r = computeReward(1, 1, false)
      expect(r.additionalMonths).toBe(0)
      expect(r.newEarned).toBe(1)
    })
  })

  describe('3 conversions', () => {
    it('earns 3 months total, 3 additional if starting from 0', () => {
      const r = computeReward(3, 0, false)
      expect(r.additionalMonths).toBe(3)
      expect(r.newEarned).toBe(3)
    })

    it('earns 2 additional months if 1 month was already earned', () => {
      const r = computeReward(3, 1, false)
      expect(r.additionalMonths).toBe(2)
      expect(r.newEarned).toBe(3)
    })

    it('earns 0 additional months if 3 months already earned (idempotent)', () => {
      const r = computeReward(3, 3, false)
      expect(r.additionalMonths).toBe(0)
      expect(r.newEarned).toBe(3)
    })

    it('does not reduce earned months (Math.max)', () => {
      const r = computeReward(3, 5, false)
      expect(r.additionalMonths).toBe(0)
      expect(r.newEarned).toBe(5)
    })
  })

  describe('10 conversions — Lifetime Pro', () => {
    it('grants lifetime pro', () => {
      const r = computeReward(10, 3, false)
      expect(r.lifetimePro).toBe(true)
      expect(r.additionalMonths).toBe(0)
    })

    it('grants lifetime pro at 11 too (>= 10)', () => {
      const r = computeReward(11, 0, false)
      expect(r.lifetimePro).toBe(true)
    })
  })

  describe('already lifetime pro', () => {
    it('returns no change if already lifetime pro', () => {
      const r = computeReward(10, 3, true)
      expect(r.lifetimePro).toBe(true)
      expect(r.additionalMonths).toBe(0)
      expect(r.newEarned).toBe(3)
    })

    it('returns no change even at 0 conversions if already lifetime pro', () => {
      const r = computeReward(0, 0, true)
      expect(r.lifetimePro).toBe(true)
      expect(r.additionalMonths).toBe(0)
    })
  })
})
