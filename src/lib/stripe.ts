// Stripe client helper for SAB Account AI
// This module is ONLY used on the server side (API routes).
// Never import this in client components — it would expose the secret key.

import Stripe from 'stripe'

// Singleton Stripe client instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Stripe price IDs for each plan (create these in your Stripe dashboard)
// After creating prices, add these to .env.local:
//   STRIPE_PRICE_STARTER=price_xxxxx
//   STRIPE_PRICE_PRO=price_xxxxx
export const PRICE_IDS: Record<'starter' | 'pro', string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
}

// Plan display names and amounts (for UI reference)
export const PLAN_CONFIG = {
  free: {
    label: 'Free',
    price: 0,
    description: 'Up to 3 invoices/month',
  },
  starter: {
    label: 'Starter',
    price: 9,
    description: 'Unlimited invoices + AI + PDF',
  },
  pro: {
    label: 'Pro',
    price: 19,
    description: 'Everything + ATO payslips + BAS',
  },
} as const
