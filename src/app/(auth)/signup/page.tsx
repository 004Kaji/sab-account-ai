// Signup page — split layout matching the login page.
// Collects business details + plan selection. Server component that passes
// the pre-selected plan (from URL) to the client signup form.

import type { Metadata } from 'next'
import SignupForm from './SignupForm'

export const metadata: Metadata = {
  title: 'Create free account — SAB Account AI',
  description: 'Sign up free. Create ATO-compliant invoices with AI in 30 seconds. No credit card required.',
  alternates: { canonical: 'https://sabaccountai.com/signup' },
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; ref?: string }>
}) {
  const { plan, ref } = await searchParams
  // Only accept known plan values; default to 'free'
  const validPlan = plan === 'starter' || plan === 'pro' ? plan : 'free'
  return <SignupForm initialPlan={validPlan} initialRef={ref ?? null} />
}
