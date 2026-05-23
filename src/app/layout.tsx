import type { Metadata } from 'next'
import { Fraunces, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import IOSInstallBanner from '@/components/ui/IOSInstallBanner'
import CookieConsent from '@/components/ui/CookieConsent'
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
    default: 'SAB Account AI — ATO-Compliant Invoicing for Australian Small Business',
    template: '%s | SAB Account AI',
  },
  description: 'Create professional tax invoices in 30 seconds with AI. ATO-verified PAYG payslips for Australian small businesses, freelancers and international workers. Free plan available.',
  metadataBase: new URL('https://sabaccountai.com.au'),
  alternates: {
    canonical: '/',
  },
  keywords: [
    'invoice software australia',
    'payslip calculator australia',
    'ato invoice',
    'payg calculator',
    'gst invoice template',
    'international student tax australia',
    'abn invoice generator',
    'australian small business invoicing',
    'ato compliant payslip',
    'working holiday maker tax',
  ],
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
    description: 'AI-powered invoicing and ATO-compliant payslips for Australian small businesses and freelancers.',
    url: 'https://sabaccountai.com.au',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'website',
    images: [
      {
        url: 'https://sabaccountai.com.au/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SAB Account AI — Smart Invoicing for Australian Business',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SAB Account AI — Smart Invoicing for Australian Business',
    description: 'AI-powered invoicing and ATO-compliant payslips for Australian small businesses and freelancers.',
    images: ['https://sabaccountai.com.au/og-image.png'],
    creator: '@sabaccountai',
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
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  )
}
