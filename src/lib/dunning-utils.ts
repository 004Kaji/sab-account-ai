export const DUNNING_STEPS = [
  {
    step:    3,
    subject: 'Action required: update your SAB Account AI payment details',
    heading: 'Your payment didn\'t go through',
    body:    'We weren\'t able to process your most recent payment. Please update your card to keep your account active.',
    cta:     'Update payment details →',
    tone:    'gentle' as const,
  },
  {
    step:    7,
    subject: 'Your SAB account will be paused in 7 days',
    heading: 'Urgent: your account will be paused soon',
    body:    'Your payment is still outstanding. If we don\'t receive payment in the next 7 days, your account will be paused and you\'ll lose access to invoicing, payroll, and AI chat.',
    cta:     'Update payment now →',
    tone:    'urgent' as const,
  },
  {
    step:    14,
    subject: 'Your SAB account has been paused — reactivate here',
    heading: 'Your account has been paused',
    body:    'Due to an unpaid invoice, access to your SAB Account AI account has been paused. Reactivate by updating your payment details — your data is safe and will be restored immediately.',
    cta:     'Reactivate my account →',
    tone:    'final' as const,
  },
] as const

export function getDunningStep(step: number): typeof DUNNING_STEPS[number] | null {
  return DUNNING_STEPS.find(s => s.step === step) ?? null
}
