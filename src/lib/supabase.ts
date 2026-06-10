// ── What this file does ───────────────────────────────────────────────
// Creates two different connections to your Supabase database.
// Each one has a different level of access — like a bank card vs a master key.
//
// RULE: createBrowserClient()  → use in browser pages and components
//       createServiceClient()  → use only in server API routes and webhooks
//
// ⚠️  NEVER use createServiceClient() in a browser page or component.
//     The SERVICE_ROLE_KEY would be exposed and anyone could access all your data.
//
// ⚠️  NEVER use createBrowserClient() in a webhook.
//     It has no user session so Supabase RLS rules will block every write.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── SERVER CLIENT (master key) ────────────────────────────────────────
// Uses SUPABASE_SERVICE_ROLE_KEY — a secret that exists ONLY on the server.
// It bypasses all Row Level Security rules (the "bouncer" database rules).
// Used in: stripe/webhook, referral routes, any API route that needs
// to read or write data without a logged-in user session.
//
// The ! at the end of each env var means "I promise this is not empty."
// If the env var is missing, the app will crash at startup — which is
// intentional. A missing key is a configuration problem, not a runtime error.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── BROWSER CLIENT (user's card) ──────────────────────────────────────
// Uses NEXT_PUBLIC_SUPABASE_ANON_KEY — a safe public key that respects
// Row Level Security rules. Users can only see their own invoices,
// their own profile, their own clients. Nothing else.
//
// The variable name starts with NEXT_PUBLIC_ because Next.js only sends
// environment variables to the browser if the name starts with that prefix.
// SUPABASE_SERVICE_ROLE_KEY does NOT start with NEXT_PUBLIC_ — that is
// intentional, it never gets sent to the browser.
//
// The "singleton" pattern (if !browserClient): creates the connection once
// and reuses it across the whole app. Creating a new connection on every
// function call would be slow and wasteful.
let browserClient: SupabaseClient | null = null

export function createBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    if (!url || !key) throw new Error('Supabase env vars not set — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    browserClient = createClient(url, key)
  }
  return browserClient
}
