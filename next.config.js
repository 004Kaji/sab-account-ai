const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['jspdf'],
}

module.exports = withSentryConfig(nextConfig, {
  org: 'sab-account-ai',
  project: 'sab-account-ai',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
})
