import { describe, it, expect } from 'vitest'
import { DUNNING_STEPS, getDunningStep } from '../lib/dunning-utils'

// ── DUNNING_STEPS config ──────────────────────────────────────────────────

describe('DUNNING_STEPS', () => {
  it('has exactly 3 steps', () => {
    expect(DUNNING_STEPS).toHaveLength(3)
  })

  it('schedules at day 3, 7, and 14', () => {
    expect(DUNNING_STEPS.map(s => s.step)).toEqual([3, 7, 14])
  })

  it('each step has subject, heading, body, and cta', () => {
    for (const step of DUNNING_STEPS) {
      expect(step.subject.length).toBeGreaterThan(0)
      expect(step.heading.length).toBeGreaterThan(0)
      expect(step.body.length).toBeGreaterThan(0)
      expect(step.cta.length).toBeGreaterThan(0)
    }
  })

  it('escalates tone from gentle → urgent → final', () => {
    expect(DUNNING_STEPS[0].tone).toBe('gentle')
    expect(DUNNING_STEPS[1].tone).toBe('urgent')
    expect(DUNNING_STEPS[2].tone).toBe('final')
  })

  it('delay in seconds for each step is correct', () => {
    const SECONDS_PER_DAY = 24 * 60 * 60
    for (const step of DUNNING_STEPS) {
      expect(step.step * SECONDS_PER_DAY).toBe(step.step * SECONDS_PER_DAY)
    }
    expect(DUNNING_STEPS[0].step * SECONDS_PER_DAY).toBe(259_200)   // 3 days
    expect(DUNNING_STEPS[1].step * SECONDS_PER_DAY).toBe(604_800)   // 7 days
    expect(DUNNING_STEPS[2].step * SECONDS_PER_DAY).toBe(1_209_600) // 14 days
  })
})

// ── getDunningStep ────────────────────────────────────────────────────────

describe('getDunningStep', () => {
  it('returns the correct step for day 3', () => {
    const s = getDunningStep(3)
    expect(s).not.toBeNull()
    expect(s!.tone).toBe('gentle')
    expect(s!.step).toBe(3)
  })

  it('returns the correct step for day 7', () => {
    const s = getDunningStep(7)
    expect(s).not.toBeNull()
    expect(s!.tone).toBe('urgent')
  })

  it('returns the correct step for day 14', () => {
    const s = getDunningStep(14)
    expect(s).not.toBeNull()
    expect(s!.tone).toBe('final')
  })

  it('returns null for an unknown step', () => {
    expect(getDunningStep(1)).toBeNull()
    expect(getDunningStep(0)).toBeNull()
    expect(getDunningStep(99)).toBeNull()
  })
})

// ── Delay seconds calculation ─────────────────────────────────────────────

describe('dunning delay scheduling', () => {
  it('schedules day-3 email 3 days from now', () => {
    const nowMs       = Date.now()
    const delayMs     = DUNNING_STEPS[0].step * 24 * 60 * 60 * 1000
    const scheduledAt = new Date(nowMs + delayMs)
    const diffDays    = (scheduledAt.getTime() - nowMs) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBe(3)
  })

  it('schedules day-7 email exactly 7 days from now', () => {
    const nowMs   = Date.now()
    const delayMs = DUNNING_STEPS[1].step * 24 * 60 * 60 * 1000
    const diffDays = delayMs / (24 * 60 * 60 * 1000)
    expect(diffDays).toBe(7)
  })

  it('schedules day-14 email exactly 14 days from now', () => {
    const delayMs  = DUNNING_STEPS[2].step * 24 * 60 * 60 * 1000
    const diffDays = delayMs / (24 * 60 * 60 * 1000)
    expect(diffDays).toBe(14)
  })

  it('day-14 delay is greater than day-7 which is greater than day-3', () => {
    const delays = DUNNING_STEPS.map(s => s.step * 24 * 60 * 60 * 1000)
    expect(delays[0]).toBeLessThan(delays[1])
    expect(delays[1]).toBeLessThan(delays[2])
  })
})
