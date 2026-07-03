import * as Sentry from '@sentry/nextjs'

export function parseAdminEmails(env: string | undefined): string[] {
  return (env ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
}

export const ADMIN_EMAILS: string[] = parseAdminEmails(process.env.ADMIN_EMAILS)

if (ADMIN_EMAILS.length === 0) {
  Sentry.captureMessage('ADMIN_EMAILS env var is empty — all admin routes will return 403', 'error')
}
