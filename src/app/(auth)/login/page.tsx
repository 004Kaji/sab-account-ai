import type { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Sign in — SAB Account AI',
  description: 'Sign in to your SAB Account AI account to manage invoices, payslips and records.',
  alternates: { canonical: 'https://sabaccountai.com/login' },
}

export default function LoginPage() {
  return <LoginClient />
}
