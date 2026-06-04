// Stripe API 2026+ sends timestamps as ISO strings; older versions send Unix numbers.
export function toISO(val: number | string | null | undefined): string | null {
  if (!val) return null
  try {
    const d = typeof val === 'number' ? new Date(val * 1000) : new Date(val)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}
