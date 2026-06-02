import { Redis } from '@upstash/redis'

// Shared singleton — both ratelimit.ts and profile-cache.ts use this.
// Redis.fromEnv() reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// (the current Upstash Marketplace env var names).
// Falls back to null when env vars are absent so callers can fail open.
export const redis: Redis | null =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null

if (!redis) {
  console.error('[redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — Redis features disabled')
}
