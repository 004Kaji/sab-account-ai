import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How Much Tax Does a Sole Trader Pay in Australia? 2026 Guide',
  description: 'How much tax do Australian sole traders pay in 2026? Income tax rates, Medicare levy, PAYG instalments, and how to reduce your tax bill legally.',
  alternates: { canonical: 'https://sabaccountai.com/blog/how-much-tax-sole-trader-australia' },
  openGraph: {
    title: 'How Much Tax Does a Sole Trader Pay in Australia? 2026 Guide',
    description: 'Australian sole trader income tax rates for 2026. How PAYG instalments work and how to reduce your tax legally.',
    url: 'https://sabaccountai.com/blog/how-much-tax-sole-trader-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How Much Tax Does a Sole Trader Pay in Australia? 2026 Guide',
  description: 'How much tax do Australian sole traders pay in 2026? Income tax rates, Medicare levy, and PAYG instalments explained.',
  datePublished: '2026-06-07',
  dateModified: '2026-06-07',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/how-much-tax-sole-trader-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do sole traders pay more tax than employees in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sole traders pay the same income tax rates as employees — the individual marginal tax rates. However, sole traders can also claim business deductions that employees cannot, which can reduce their taxable income significantly.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do sole traders pay tax on every dollar they earn?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Sole traders pay tax on their net profit (revenue minus allowable deductions), not gross revenue. The tax-free threshold ($18,200) also means the first $18,200 of income is tax-free.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are PAYG instalments for sole traders?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'PAYG (Pay As You Go) instalments are quarterly income tax prepayments the ATO requires once your tax bill exceeds a certain threshold. They\'re included in your BAS and ensure you don\'t face a large tax debt at year end. Your first year as a sole trader you usually pay nothing during the year, then get a tax bill — after that, the ATO puts you on quarterly instalments.',
      },
    },
    {
      '@type': 'Question',
      name: 'How can sole traders reduce their tax in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Legal ways to reduce sole trader tax include: claiming all allowable deductions (home office, vehicle, equipment, software), making personal superannuation contributions (deductible up to the concessional cap), prepaying deductible expenses before 30 June, and claiming the small business income tax offset.',
      },
    },
  ],
}

export default function HowMuchTaxSoleTraderPage() {
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
          How Much Tax Does a Sole Trader Pay in Australia? 2026 Guide
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Sole traders pay income tax at individual marginal rates — the same rates as employees. But unlike employees, you&apos;re responsible for calculating and paying your own tax. Here&apos;s exactly how it works in 2026.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            A sole trader earning <strong>$80,000 net profit</strong> pays approximately <strong>$18,067 in income tax</strong> plus $1,600 Medicare levy — about 25% effective tax rate. Tax is paid on <strong>net profit after deductions</strong>, not gross revenue.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Australian income tax rates 2025–26</h2>

        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--char)', color: 'white' }}>
                {['Taxable Income', 'Tax Rate', 'Tax on this bracket'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['$0 – $18,200', '0%', 'Nil'],
                ['$18,201 – $45,000', '19%', '19c per $1 over $18,200'],
                ['$45,001 – $120,000', '32.5%', '$5,092 + 32.5c per $1 over $45,000'],
                ['$120,001 – $180,000', '37%', '$29,467 + 37c per $1 over $120,000'],
                ['$180,001+', '45%', '$51,667 + 45c per $1 over $180,000'],
              ].map(([income, rate, tax], i) => (
                <tr key={income} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--cream)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--char)' }}>{income}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ember)', fontWeight: 700 }}>{rate}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)' }}>{tax}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Plus 2% Medicare Levy on most incomes. Low Income Tax Offset (LITO) applies for incomes under $66,667.</p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Tax examples for common sole trader incomes</h2>

        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--char)', color: 'white' }}>
                {['Net Profit', 'Income Tax', 'Medicare Levy', 'Total Tax', 'Effective Rate'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['$50,000', '$6,717', '$1,000', '$7,717', '15.4%'],
                ['$75,000', '$14,842', '$1,500', '$16,342', '21.8%'],
                ['$100,000', '$22,967', '$2,000', '$24,967', '24.9%'],
                ['$150,000', '$43,567', '$3,000', '$46,567', '31.0%'],
              ].map(([income, tax, medicare, total, rate], i) => (
                <tr key={income} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--cream)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--char)' }}>{income}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)' }}>{tax}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)' }}>{medicare}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--ember)' }}>{total}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)' }}>{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Estimates only. Actual tax depends on deductions, offsets, and your specific circumstances. Always consult a registered tax agent.</p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>How sole traders pay tax</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Unlike employees who have tax withheld from every pay, sole traders pay tax in two ways:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Annual tax return:</strong> Lodge by 31 October each year (or later if using a tax agent). This is where you declare your business income and claim deductions.</li>
          <li><strong>PAYG instalments:</strong> Once your tax bill exceeds a threshold, the ATO puts you on quarterly prepayments. These appear on your BAS and spread your tax burden across the year.</li>
        </ul>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>How to reduce your sole trader tax</h2>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Claim all allowable deductions</strong> — home office, vehicle, equipment, software, insurance, professional memberships</li>
          <li><strong>Contribute to super</strong> — personal super contributions are deductible up to $30,000/year</li>
          <li><strong>Small Business Income Tax Offset</strong> — sole traders may be eligible for up to $1,000 offset</li>
          <li><strong>Prepay deductible expenses before 30 June</strong> — pay next year&apos;s subscriptions, insurance, or rent in advance</li>
          <li><strong>Defer income</strong> — if possible, delay receiving some income until after 30 June</li>
        </ul>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Track your income and expenses year-round</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>SAB Account AI keeps your records organised so tax time doesn&apos;t hurt. $9/mo for sole traders.</p>
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Related: <Link href="/blog/sole-trader-tax-deductions-australia" style={{ color: 'var(--ember)' }}>Sole Trader Tax Deductions Australia</Link> · <Link href="/blog/eofy-checklist-sole-trader-2026" style={{ color: 'var(--ember)' }}>EOFY Checklist Sole Trader 2026</Link></p>
        </div>

      </div>
    </div>
  )
}
