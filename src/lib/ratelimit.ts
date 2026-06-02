import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'

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

export async function checkRateLimit(userId: string, plan: string) {
  const limiter = plan.toLowerCase() === 'free' ? freeLimiter : proLimiter
  if (!limiter) return { allowed: true, remaining: -1 }
  try {
    const { success, remaining } = await limiter.limit(userId)
    return { allowed: success, remaining }
  } catch (err) {
    console.error('[ratelimit] Redis error, allowing request:', err)
    return { allowed: true, remaining: -1 }
  }
}
