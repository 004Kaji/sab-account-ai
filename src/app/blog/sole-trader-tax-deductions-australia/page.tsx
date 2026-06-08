import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sole Trader Tax Deductions Australia: What You Can Claim in 2026',
  description: 'Complete guide to sole trader tax deductions in Australia for 2026. Home office, vehicle, equipment, software, super contributions — what\'s claimable and how.',
  alternates: { canonical: 'https://sabaccountai.com/blog/sole-trader-tax-deductions-australia' },
  openGraph: {
    title: 'Sole Trader Tax Deductions Australia: What You Can Claim in 2026',
    description: 'What can Australian sole traders claim as tax deductions in 2026? Home office, vehicle, equipment and more explained.',
    url: 'https://sabaccountai.com/blog/sole-trader-tax-deductions-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Sole Trader Tax Deductions Australia: What You Can Claim in 2026',
  description: 'Complete guide to sole trader tax deductions in Australia 2026 — home office, vehicle, equipment, software and more.',
  datePublished: '2026-06-07',
  dateModified: '2026-06-07',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/sole-trader-tax-deductions-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can a sole trader claim home office expenses in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Sole traders can claim home office expenses using either the fixed rate method (70 cents per hour worked from home in 2025-26) or the actual cost method. You must keep records of hours worked from home.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can sole traders claim vehicle expenses in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, for business use only. You can use the cents per kilometre method (88 cents/km in 2025-26, up to 5,000km) or the logbook method for larger claims. Personal travel cannot be claimed.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can a sole trader claim superannuation contributions?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Personal super contributions are tax deductible for sole traders. You need to lodge a Notice of Intent to Claim with your super fund before lodging your tax return. Contributions up to the concessional cap ($30,000 in 2025-26) are deductible.',
      },
    },
    {
      '@type': 'Question',
      name: 'What records do I need to keep for sole trader deductions?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The ATO requires you to keep records for 5 years. This includes receipts, invoices, bank statements, and logbooks for vehicle claims. Digital records are accepted — store them in accounting software or a cloud folder.',
      },
    },
  ],
}

export default function SoleTraderTaxDeductionsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{ color: 'var(--ember)', fontSize: '0.875rem', textDecoration: 'none' }}>← Blog</Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tax & GST</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--char)', lineHeight: 1.2, marginBottom: '1rem' }}>
          Sole Trader Tax Deductions Australia: What You Can Claim in 2026
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Most sole traders leave money on the table at tax time. They claim the obvious things but miss legitimate deductions that can meaningfully reduce their tax bill. Here&apos;s everything you can claim as an Australian sole trader in 2026.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Rule</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            To claim a deduction, the expense must be <strong>directly related to earning your business income</strong>. You can&apos;t claim personal expenses, and if something is partly personal and partly business, you can only claim the business portion.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Common sole trader tax deductions</h2>

        {[
          {
            category: 'Home office',
            items: [
              { name: 'Fixed rate method', detail: '70 cents per hour worked from home (2025-26). Covers electricity, internet, stationery, and phone usage.' },
              { name: 'Actual cost method', detail: 'Claim the actual proportion of rent/mortgage interest, utilities, and internet based on the percentage of your home used exclusively for work.' },
              { name: 'Equipment in home office', detail: 'Desk, chair, monitor, printer — claimable if used for work. Depreciation applies to items over $300.' },
            ],
          },
          {
            category: 'Vehicle & travel',
            items: [
              { name: 'Cents per kilometre', detail: '88 cents/km in 2025-26, up to 5,000km. Simple — no logbook needed. Just keep a record of trips.' },
              { name: 'Logbook method', detail: 'For larger claims. Keep a logbook for 12 weeks showing business vs personal use. Claim that percentage of all vehicle costs.' },
              { name: 'Parking & tolls', detail: 'Fully claimable for business travel. Keep receipts.' },
              { name: 'Public transport & flights', detail: 'Fully claimable for business travel.' },
            ],
          },
          {
            category: 'Equipment & technology',
            items: [
              { name: 'Instant asset write-off', detail: 'Eligible businesses can immediately deduct the full cost of assets. Check the current threshold at ato.gov.au.' },
              { name: 'Laptop, phone, tablet', detail: 'Claimable for the business-use percentage. If you use your phone 60% for business, claim 60%.' },
              { name: 'Software subscriptions', detail: 'Invoicing software, accounting tools, project management apps — all deductible.' },
              { name: 'Tools and equipment', detail: 'Tradies can claim work tools. Items under the instant asset write-off threshold are fully deductible immediately.' },
            ],
          },
          {
            category: 'Professional services',
            items: [
              { name: 'Accountant and bookkeeper fees', detail: 'Fully deductible.' },
              { name: 'Legal fees', detail: 'Deductible if related to business operations (contracts, disputes).' },
              { name: 'Professional memberships', detail: 'Industry associations, professional body memberships related to your work.' },
            ],
          },
          {
            category: 'Insurance & finance',
            items: [
              { name: 'Business insurance', detail: 'Public liability, professional indemnity, income protection — all deductible.' },
              { name: 'Bank fees', detail: 'Fees on your business bank account are fully deductible.' },
              { name: 'Interest on business loans', detail: 'Interest on money borrowed for business purposes is deductible.' },
            ],
          },
          {
            category: 'Super contributions',
            items: [
              { name: 'Personal super contributions', detail: 'Deductible up to the concessional cap ($30,000 in 2025-26). Lodge a Notice of Intent to Claim with your fund before lodging your return.' },
            ],
          },
        ].map(section => (
          <div key={section.category} style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--ember-p)' }}>{section.category}</h3>
            {section.items.map(item => (
              <div key={item.name} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ember)', flexShrink: 0, marginTop: 8 }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--char)', margin: '0 0 0.25rem', fontSize: '0.9rem' }}>{item.name}</p>
                  <p style={{ color: 'var(--text2)', margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        ))}

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>What you can&apos;t claim</h2>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Personal groceries, clothing (unless a uniform or protective gear), or entertainment</li>
          <li>Traffic fines</li>
          <li>Income tax itself (you can&apos;t deduct the tax you pay)</li>
          <li>Domestic travel that is primarily personal with a minor business component</li>
        </ul>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Record keeping tips</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The ATO requires records to be kept for <strong>5 years</strong>. The easiest approach: snap a photo of every receipt immediately and upload it to your accounting software or a cloud folder. If you&apos;re ever audited, organised records are your best defence.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Track income and expenses with SAB Account AI</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Categorise your expenses, track GST, and stay tax-ready all year. $9/mo for sole traders.</p>
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Related: <Link href="/blog/eofy-checklist-sole-trader-2026" style={{ color: 'var(--ember)' }}>EOFY Checklist Sole Trader 2026</Link> · <Link href="/blog/how-to-register-gst-australia" style={{ color: 'var(--ember)' }}>How to Register for GST Australia</Link></p>
        </div>

      </div>
    </div>
  )
}
