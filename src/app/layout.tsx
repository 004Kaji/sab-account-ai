import type { Metadata } from 'next'
import { Fraunces, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import IOSInstallBanner from '@/components/ui/IOSInstallBanner'
import './globals.css'

// Fraunces: serif display font for headings and logo
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

// DM Sans: clean sans-serif for body text
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// JetBrains Mono: monospaced font for invoice numbers and currency
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: {
    default: 'SAB Account AI — Smart Invoicing for Australian Business',
    template: '%s | SAB Account AI',
  },
  description: 'AI-powered invoicing and ATO-compliant payslips for Australian small businesses and freelancers.',
  keywords: ['invoicing', 'GST', 'payslip', 'ATO', 'Australian small business', 'accounting'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'SAB Account AI',
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: 'SAB Account AI',
    description: 'AI-powered invoicing for Australian small business',
    url: 'https://sabaccountai.com',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body
        className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <IOSInstallBanner />
        <Analytics />
      </body>
    </html>
  )
}
