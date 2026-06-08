import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Do Sole Traders Pay Super in Australia? 2026 Guide',
  description: 'Do Australian sole traders have to pay superannuation? Learn about super for sole traders — your own super, paying super for employees, and the rules for contractors.',
  alternates: { canonical: 'https://sabaccountai.com/blog/do-sole-traders-pay-super-australia' },
  openGraph: {
    title: 'Do Sole Traders Pay Super in Australia? 2026 Guide',
    description: 'Do Australian sole traders have to pay super? Rules for your own super, employee super, and contractor super explained.',
    url: 'https://sabaccountai.com/blog/do-sole-traders-pay-super-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Do Sole Traders Pay Super in Australia? 2026 Guide',
  description: 'Rules around superannuation for Australian sole traders — your own super, paying super for employees and contractors.',
  datePublished: '2026-06-07',
  dateModified: '2026-06-07',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/do-sole-traders-pay-super-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Are sole traders required to pay themselves super in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Sole traders are not legally required to pay themselves superannuation. Unlike employees, there is no obligation to make Superannuation Guarantee contributions on your own behalf. However, it\'s strongly recommended for retirement planning, and personal super contributions are tax deductible up to the concessional cap.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do sole traders have to pay super for contractors?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, in some circumstances. If a contractor is paid mainly for their personal labour and skills (not for a result), the ATO may classify them as an employee for super purposes. If the contractor works only for you and provides labour, you may be required to pay super on their payments — regardless of whether they have an ABN.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much super should a sole trader contribute for themselves?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The concessional (before-tax) contribution cap in 2025-26 is $30,000. Many financial advisers recommend contributing enough to stay on track for a comfortable retirement. As a sole trader, personal super contributions are fully tax-deductible up to this cap — making it one of the most effective ways to reduce your tax bill.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the super rate for employees in 2026?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Superannuation Guarantee rate is 11.5% for the 2024-25 financial year, rising to 12% from 1 July 2025 (2025-26 financial year). This rate applies to all eligible employees\' ordinary time earnings.',
      },
    },
  ],
}

export default function DoSoleTradersPaySuperPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{ color: 'var(--ember)', fontSize: '0.875rem', textDecoration: 'none' }}>← Blog</Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Super & Payroll</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--char)', lineHeight: 1.2, marginBottom: '1rem' }}>
          Do Sole Traders Pay Super in Australia? 2026 Guide
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Super rules for sole traders are often misunderstood. There&apos;s a difference between your own super (optional but smart) and super for people who work for you (potentially mandatory). Here&apos;s the full picture for 2026.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            <strong>Your own super:</strong> Not legally required, but strongly recommended — and tax deductible.<br />
            <strong>Employee super:</strong> Mandatory at 12% from July 2026.<br />
            <strong>Contractor super:</strong> May be required depending on the arrangement.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Your own super as a sole trader</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          There is <strong>no legal requirement</strong> for sole traders to pay themselves superannuation. Unlike employees, you have no employer obligated to make Super Guarantee contributions on your behalf.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          However, not contributing to your own super is a mistake many sole traders regret later. Two compelling reasons to contribute voluntarily:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Tax deduction:</strong> Personal super contributions are fully tax deductible up to the concessional cap ($30,000 in 2025-26). At a 32.5% marginal tax rate, a $10,000 contribution saves you $3,250 in tax.</li>
          <li><strong>Retirement savings:</strong> Every year without contributions is compounding growth you can never get back.</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          To claim the deduction, you must lodge a <strong>Notice of Intent to Claim a Deduction</strong> with your super fund before lodging your tax return.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Super for your employees</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          If you have employees, super is <strong>mandatory</strong>. The Superannuation Guarantee (SGC) rate is:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>11.5%</strong> — 2024-25 financial year (until 30 June 2025)</li>
          <li><strong>12%</strong> — 2025-26 financial year (from 1 July 2025) and permanently going forward</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Super is calculated on ordinary time earnings (base wages, not overtime). It must be paid to the employee&apos;s nominated super fund. From 1 July 2026, under <Link href="/blog/payday-super-2026" style={{ color: 'var(--ember)' }}>Payday Super</Link>, it must be paid on the same day as wages.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Super for contractors — the catch</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          This is where many sole traders get caught out. The ATO can require you to pay super for contractors in certain situations:
        </p>
        <div style={{ background: 'rgba(200,75,47,0.06)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--char)', margin: '0 0 0.75rem' }}>You must pay super for a contractor if:</p>
          <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', margin: 0 }}>
            <li>The contract is mainly for their personal labour and skills (not a business outcome)</li>
            <li>They work solely or mainly for you</li>
            <li>They don&apos;t employ others to do the work for them</li>
          </ul>
        </div>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          Having an ABN doesn&apos;t automatically mean a contractor is exempt from super. If in doubt, check the ATO&apos;s employee/contractor decision tool at ato.gov.au.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Auto-calculate super on every payslip</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>SAB Account AI calculates SGC automatically on payslips — correct rate, every time. $19/mo Pro plan.</p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: 'white', padding: '0.75rem 2rem', borderRadius: 'var(--r)', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}>
            Start free trial
          </Link>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Frequently asked questions</h2>
        {FAQ_SCHEMA.mainEntity.map((faq) => (
          <div key={faq.name} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem' }}>{faq.name}</h3>
            <p style={{ color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>{faq.acceptedAnswer.text}</p>
          </div>
        ))}

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Related: <Link href="/blog/payday-super-2026" style={{ color: 'var(--ember)' }}>Payday Super 2026</Link> · <Link href="/blog/super-guarantee-rate-australia-2025" style={{ color: 'var(--ember)' }}>Super Guarantee Rate Australia</Link></p>
        </div>

      </div>
    </div>
  )
}
