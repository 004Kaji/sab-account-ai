export interface PostHogWebhookEvent {
  event: string
  distinctId: string
  properties?: Record<string, unknown>
}

export function mapStripeEventToPostHog(
  eventType: string,
  userId: string | null | undefined,
  extra?: { plan?: string; status?: string },
): PostHogWebhookEvent | null {
  if (!userId) return null
  switch (eventType) {
    case 'customer.subscription.created':
      if (extra?.status !== 'active') return null
      return {
        event: 'subscription_started',
        distinctId: userId,
        properties: extra?.plan ? { plan: extra.plan } : undefined,
      }
    case 'customer.subscription.deleted':
      return { event: 'subscription_cancelled', distinctId: userId }
    case 'invoice.payment_failed':
      return { event: 'payment_failed', distinctId: userId }
    default:
      return null
  }
}
