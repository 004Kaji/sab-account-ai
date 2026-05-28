const { withSentryConfig } = require('@sentry/nextjs')

const securityHeaders = [
  // Force HTTPS for 1 year — browsers will refuse to load the site over HTTP
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Prevents browsers from guessing the content type (stops certain XSS attacks)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Stops your pages from being embedded in iframes on other sites (clickjacking protection)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Tells browsers not to send the full URL as a referrer to external sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restricts access to browser features (camera, microphone, etc.) — this app needs none
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Content Security Policy — restricts which origins can load resources
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://hooks.stripe.com https://*.ingest.sentry.io https://vitals.vercel-insights.com https://abr.business.gov.au",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
]

// Authenticated routes that must never appear in search results
const noindexRoutes = [
  '/dashboard', '/invoice', '/payslip', '/records',
  '/settings', '/clients', '/employees', '/employers', '/abn-payments',
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['jspdf'],
  eslint: { ignoreDuringBuilds: true }, // ESLint 9 flat config; run `npx eslint src/` separately
  async headers() {
    return [
      // Security headers on every route
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // noindex via HTTP header on all authenticated app pages
      // Works even though those layouts are 'use client' (can't export metadata)
      ...noindexRoutes.map(route => ({
        source: `${route}/:path*`,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
      // Exact-match the routes too (without trailing path)
      ...noindexRoutes.map(route => ({
        source: route,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: 'sab-account-ai',
  project: 'sab-account-ai',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
})
