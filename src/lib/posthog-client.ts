export function initPostHog(): void {
  if (typeof window === 'undefined') return
  if (navigator.doNotTrack === '1') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  // Lazy-require posthog-js to avoid module-level browser dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const posthog = (require('posthog-js') as { default: { __loaded: boolean; init: (key: string, opts: object) => void } }).default
  if (posthog.__loaded) return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
  })
}
