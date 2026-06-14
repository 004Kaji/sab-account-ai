'use client'

import Link from 'next/link'
import { useProfile } from '@/app/(app)/profile-context'

interface PlanGateProps {
  requiredPlan: 'starter' | 'pro' | 'autopilot'
  children: React.ReactNode
  fallback?: React.ReactNode
}

const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, autopilot: 3 }

export default function PlanGate({ requiredPlan, children, fallback }: PlanGateProps) {
  const profile = useProfile()
  const userRank     = PLAN_RANK[profile.plan] ?? 0
  const requiredRank = PLAN_RANK[requiredPlan]  ?? 1

  if (userRank >= requiredRank) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      textAlign: 'center',
      gap: '1rem',
    }}>
      <div style={{
        width: '3rem',
        height: '3rem',
        borderRadius: '50%',
        background: 'rgba(200,75,47,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
      }}>
        🔒
      </div>
      <div>
        <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.375rem' }}>
          {requiredPlan === 'pro' ? 'Pro' : 'Starter'} plan required
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text2)', maxWidth: '320px' }}>
          Upgrade your plan to unlock this feature.
        </p>
      </div>
      <Link
        href="/settings?tab=subscription"
        className="btn btn-ember"
        style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}
      >
        Upgrade now
      </Link>
    </div>
  )
}
