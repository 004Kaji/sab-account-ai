import { NOT_ADVICE_DISCLAIMER } from '@/lib/super-compliance'

// Reusable compliance disclaimer for the Super Payment Assistant. Makes the
// two guardrails explicit everywhere super is shown: SAB never moves money,
// and it is not financial/tax advice.
export function SuperDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p style={{
      fontSize: compact ? '0.7rem' : '0.75rem',
      color: 'var(--text3)',
      lineHeight: 1.6,
      margin: 0,
    }}>
      SAB Account AI calculates, prepares and tracks super payments — it does not pay super or move money on your behalf. {NOT_ADVICE_DISCLAIMER}
    </p>
  )
}
