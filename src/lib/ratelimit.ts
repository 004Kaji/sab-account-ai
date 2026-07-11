import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'
import * as Sentry from '@sentry/nextjs'

// In-process LRU counter used as fallback when Redis is unavailable.
// Evicts the least-recently-used entry once maxEntries is reached.
export class LRUCounter {
  private readonly map = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private readonly maxEntries: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, limit: number): { allowed: boolean; remaining: number } {
    const now = Date.now()
    const existing = this.map.get(key)

    if (existing && now < existing.resetAt) {
      this.map.delete(key)
      existing.count++
      this.map.set(key, existing)
      const allowed = existing.count <= limit
      return { allowed, remaining: Math.max(0, limit - existing.count) }
    }

    // Evict LRU entry (first in insertion order) when at capacity
    if (!existing && this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
    if (existing) this.map.delete(key)
    this.map.set(key, { count: 1, resetAt: now + this.windowMs })
    return { allowed: true, remaining: limit - 1 }
  }
}

const lruFallback = new LRUCounter(100, 60 * 60 * 1000)
// Dedicated fallback for email sends — keeps the 20/hour cap enforced even when
// Redis is unavailable, so a Redis outage can't turn the endpoint into an open
// relay for sending PDFs from our verified domain.
const emailLruFallback = new LRUCounter(500, 60 * 60 * 1000)
// Fallback for the daily chat cap when Redis is down — each chat message
// costs real Anthropic API money, so errors must not remove the ceiling
// entirely. Note this counter is per-process: across N serverless instances
// the effective cap degrades to limit×N (still bounded, unlike failing open).
const dailyChatLruFallback = new LRUCounter(500, 24 * 60 * 60 * 1000)
const FREE_LIMIT = 5
const PRO_LIMIT = 60
const EMAIL_LIMIT = 20
export const DAILY_CHAT_LIMIT = 10

// Free plan: 5 AI requests/hour. Pro plan: 60 AI requests/hour.
export const freeLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:free',
}) : null

export const proLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 h'),
  prefix: 'rl:pro',
}) : null

// Public endpoints (partner-apply, payday-super/subscribe, feedback): 5 requests/hour per IP
export const publicLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:pub',
}) : null

// Admin/agent endpoints: 30 requests/hour
export const adminLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'rl:admin',
}) : null

// Email-send endpoints: 20 requests/hour
export const emailLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  prefix: 'rl:email',
}) : null

// SAB Chat daily cap: implemented as a plain INCR on a per-UTC-day key
// (not Ratelimit.slidingWindow) so a slot can be REFUNDED via DECR when the
// downstream Anthropic call fails — a failed message must not burn quota.
function dailyChatKey(userId: string): string {
  return `rl:chatday:${userId}:${new Date().toISOString().slice(0, 10)}`
}

export async function checkRateLimit(userId: string, plan: string) {
  const isFreePlan = plan.toLowerCase() === 'free'
  const limit = isFreePlan ? FREE_LIMIT : PRO_LIMIT
  const limiter = isFreePlan ? freeLimiter : proLimiter

  if (!limiter) {
    console.error('[ratelimit] Redis is not configured — using in-process fallback')
    Sentry.captureMessage('Rate limiter not configured (Redis null)', 'warning')
    return lruFallback.check(userId, limit)
  }
  try {
    const { success, remaining } = await limiter.limit(userId)
    return { allowed: success, remaining }
  } catch (err) {
    console.error('[ratelimit] Redis error — using in-process fallback:', err)
    Sentry.captureException(err, { tags: { context: 'checkRateLimit' } })
    return lruFallback.check(userId, limit)
  }
}

// Consumes one daily chat slot. Pair with refundDailyChatSlot() when the
// message ultimately isn't served (e.g. the Anthropic call throws).
export async function checkDailyChatLimit(userId: string) {
  if (!redis) {
    console.error('[ratelimit] Redis is not configured — daily chat cap falling back to in-process counter')
    Sentry.captureMessage('Daily chat limiter not configured (Redis null) — using in-process fallback', 'warning')
    return dailyChatLruFallback.check(userId, DAILY_CHAT_LIMIT)
  }
  try {
    const key = dailyChatKey(userId)
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 25 * 60 * 60) // outlives the UTC day it keys
    return { allowed: count <= DAILY_CHAT_LIMIT, remaining: Math.max(0, DAILY_CHAT_LIMIT - count) }
  } catch (err) {
    // Fail closed — chat spends Anthropic tokens, so a Redis error must not
    // lift the daily ceiling.
    console.error('[ratelimit] Redis error in daily chat limiter — using in-process fallback:', err)
    Sentry.captureException(err, { tags: { context: 'checkDailyChatLimit' } })
    return dailyChatLruFallback.check(userId, DAILY_CHAT_LIMIT)
  }
}

// Gives back a slot consumed by checkDailyChatLimit for a message that was
// never served. Best-effort: a refund that fails only means the user keeps
// one fewer slot today.
export async function refundDailyChatSlot(userId: string): Promise<void> {
  if (!redis) return
  try {
    const key = dailyChatKey(userId)
    const count = await redis.decr(key)
    // decr on a missing/expired key creates it at -1 — clean that up so the
    // next day starts from a true zero.
    if (count < 0) await redis.del(key)
  } catch (err) {
    Sentry.captureException(err, { tags: { context: 'refundDailyChatSlot' } })
  }
}

export async function checkAdminRateLimit(key: string) {
  if (!adminLimiter) {
    console.error('[ratelimit] Redis is not configured — admin rate limiting is disabled')
    Sentry.captureMessage('Admin rate limiter not configured (Redis null)', 'warning')
    return { allowed: true }
  }
  try {
    const { success } = await adminLimiter.limit(key)
    return { allowed: success }
  } catch (err) {
    console.error('[ratelimit] Redis error in admin limiter, allowing request:', err)
    Sentry.captureException(err, { tags: { context: 'checkAdminRateLimit' } })
    return { allowed: true }
  }
}

export async function checkEmailRateLimit(userId: string) {
  if (!emailLimiter) {
    console.error('[ratelimit] Redis is not configured — email rate limiting falling back to in-process counter')
    Sentry.captureMessage('Email rate limiter not configured (Redis null) — using in-process fallback', 'warning')
    return emailLruFallback.check(userId, EMAIL_LIMIT)
  }
  try {
    const { success } = await emailLimiter.limit(userId)
    return { allowed: success }
  } catch (err) {
    // Fail closed to the in-process limiter rather than allowing unconditionally —
    // an email endpoint that ignores its limit on Redis errors is abusable.
    console.error('[ratelimit] Redis error in email limiter — using in-process fallback:', err)
    Sentry.captureException(err, { tags: { context: 'checkEmailRateLimit' } })
    return emailLruFallback.check(userId, EMAIL_LIMIT)
  }
}

export async function checkPublicRateLimit(req: { headers: { get(name: string): string | null } }) {
  if (!publicLimiter) {
    console.error('[ratelimit] Redis is not configured — public rate limiting is disabled')
    Sentry.captureMessage('Public rate limiter not configured (Redis null)', 'warning')
    return { allowed: true }
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
  if (!ip) {
    Sentry.captureMessage('Public rate limiter: no IP header — request allowed without limiting', { level: 'warning' })
    return { allowed: true }
  }
  try {
    const { success } = await publicLimiter.limit(ip)
    return { allowed: success }
  } catch (err) {
    console.error('[ratelimit] Redis error in public limiter, allowing request:', err)
    Sentry.captureException(err, { tags: { context: 'checkPublicRateLimit' } })
    return { allowed: true }
  }
}
