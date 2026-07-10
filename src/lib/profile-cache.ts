import { redis } from '@/lib/redis'
import { createServiceClient } from '@/lib/supabase'
import { FREE_MODE } from '@/lib/free-mode'

const KEY = (userId: string) => `profile:${userId}`
const TTL = 60 // seconds — stale data is fine; webhook invalidates on subscription changes

export interface CachedProfile {
  plan: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
}

// Server-side chokepoint for feature gating: every API route reads the plan
// through here, so free mode only needs to override it in one place.
function withFreeMode(profile: CachedProfile | null): CachedProfile | null {
  if (FREE_MODE && profile) return { ...profile, plan: 'autopilot' }
  return profile
}

export async function getProfile(userId: string): Promise<CachedProfile | null> {
  if (redis) {
    try {
      const hit = await redis.get<CachedProfile>(KEY(userId))
      if (hit) return withFreeMode(hit)
    } catch {
      // Redis unavailable — fall through to Supabase
    }
  }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('plan, stripe_customer_id, stripe_subscription_id, subscription_status')
    .eq('id', userId)
    .single()

  if (data && redis) {
    try {
      await redis.setex(KEY(userId), TTL, data)
    } catch {
      // Non-fatal — serve from Supabase on next request
    }
  }

  return withFreeMode(data ?? null)
}

export async function invalidateProfile(userId: string): Promise<void> {
  if (!redis) return
  try {
    await redis.del(KEY(userId))
  } catch {
    // Non-fatal
  }
}
