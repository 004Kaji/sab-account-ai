import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redisUrl   = process.env.KV_REST_API_URL   ?? process.env.UPSTASH_REDIS_REST_URL   ?? ''
const redisToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? ''

if (!redisUrl || !redisToken) {
  console.error('[ratelimit] Missing Redis env vars (KV_REST_API_URL / UPSTASH_REDIS_REST_URL) — rate limiting disabled')
}

const redis = new Redis({ url: redisUrl || 'http://localhost', token: redisToken || 'placeholder' })

// Free plan: 5 AI requests/hour. Pro plan: 60 AI requests/hour.
export const freeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:free',
})

export const proLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 h'),
  prefix: 'rl:pro',
})

export async function checkRateLimit(userId: string, plan: string) {
  if (!redisUrl || !redisToken) {
    return { allowed: true, remaining: -1 }
  }
  const limiter = plan.toLowerCase() === 'free' ? freeLimiter : proLimiter
  try {
    const { success, remaining } = await limiter.limit(userId)
    return { allowed: success, remaining }
  } catch (err) {
    console.error('[ratelimit] Redis error, allowing request:', err)
    return { allowed: true, remaining: -1 }
  }
}
