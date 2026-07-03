'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { initPostHog } from '@/lib/posthog-client'

export { posthog }

export { initPostHog }

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])
  return <>{children}</>
}
