import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'
import * as Sentry from '@sentry/nextjs'

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

export async function checkRateLimit(userId: string, plan: string) {
  const limiter = plan.toLowerCase() === 'free' ? freeLimiter : proLimiter
  if (!limiter) {
    console.error('[ratelimit] Redis is not configured — rate limiting is disabled')
    Sentry.captureMessage('Rate limiter not configured (Redis null)', 'warning')
    return { allowed: true, remaining: -1 }
  }
  try {
    const { success, remaining } = await limiter.limit(userId)
    return { allowed: success, remaining }
  } catch (err) {
    console.error('[ratelimit] Redis error, allowing request:', err)
    Sentry.captureException(err, { tags: { context: 'checkRateLimit' } })
    return { allowed: true, remaining: -1 }
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
    console.error('[ratelimit] Redis is not configured — email rate limiting is disabled')
    Sentry.captureMessage('Email rate limiter not configured (Redis null)', 'warning')
    return { allowed: true }
  }
  try {
    const { success } = await emailLimiter.limit(userId)
    return { allowed: success }
  } catch (err) {
    console.error('[ratelimit] Redis error in email limiter, allowing request:', err)
    Sentry.captureException(err, { tags: { context: 'checkEmailRateLimit' } })
    return { allowed: true }
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
    ?? 'unknown'
  try {
    const { success } = await publicLimiter.limit(ip)
    return { allowed: success }
  } catch (err) {
    console.error('[ratelimit] Redis error in public limiter, allowing request:', err)
    Sentry.captureException(err, { tags: { context: 'checkPublicRateLimit' } })
    return { allowed: true }
  }
}
