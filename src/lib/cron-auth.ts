import { timingSafeEqual } from 'crypto'

// Verifies the Authorization header on a cron route against CRON_SECRET.
//
// Guards two failure modes the previous inline check missed:
//  1. CRON_SECRET unset — the old `Bearer ${undefined}` comparison would let a
//     caller in by sending the literal string "Bearer undefined". Here a missing
//     secret always fails closed.
//  2. Timing attacks — uses a constant-time comparison instead of `!==`.
export function isAuthorizedCron(req: { headers: { get(name: string): string | null } }): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = req.headers.get('Authorization')
  if (!header) return false

  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
