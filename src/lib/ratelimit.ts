import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redis = new Redis({
  url: (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL)!,
  token: (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN)!,
})

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
  const limiter = plan === 'free' ? freeLimiter : proLimiter
  const { success, remaining } = await limiter.limit(userId)
  return { allowed: success, remaining }
}
