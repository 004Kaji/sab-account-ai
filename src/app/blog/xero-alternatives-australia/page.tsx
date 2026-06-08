import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Best Xero Alternatives in Australia 2026 (Cheaper Options)',
  description: 'Xero costs $35-70/mo in 2026. Here are the best Xero alternatives for Australian sole traders and small businesses — most under $20/mo.',
  alternates: { canonical: 'https://sabaccountai.com/blog/xero-alternatives-australia' },
  openGraph: {
    title: 'Best Xero Alternatives in Australia 2026 (Cheaper Options)',
    description: 'Xero costs $35-70/mo in 2026. Here are the best cheaper alternatives for Australian sole traders.',
    url: 'https://sabaccountai.com/blog/xero-alternatives-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Best Xero Alternatives in Australia 2026 (Cheaper Options)',
  description: 'Xero costs $35-70/mo in 2026. Here are the best Xero alternatives for Australian sole traders and small businesses.',
  datePublished: '2026-06-07',
  dateModified: '2026-06-07',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/xero-alternatives-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the cheapest alternative to Xero in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SAB Account AI at $9/mo is one of the cheapest ATO-compliant alternatives to Xero in Australia. It covers invoicing, GST tracking, expense records, and payslips — everything a sole trader needs without the $50-70/mo Xero price tag.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is MYOB cheaper than Xero in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'MYOB Essentials starts at around $27/mo, which is cheaper than Xero\'s Starter plan ($35/mo). However, both are more expensive than purpose-built sole trader tools like SAB Account AI.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I switch from Xero to a cheaper alternative without losing my data?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Most accounting platforms let you export your data as CSV or PDF. You can export your invoices, contacts, and transaction history from Xero before switching. The process takes about an hour.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why is Xero so expensive now?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Xero has increased prices significantly since 2022. As of 2026, the Starter plan is $35/mo and the Standard plan is $70/mo. Many sole traders are now looking for alternatives that offer the core features at a fraction of the price.',
      },
    },
  ],
}

export default function XeroAlternativesPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{ color: 'var(--ember)', fontSize: '0.875rem', textDecoration: 'none' }}>← Blog</Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoicing</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--char)', lineHeight: 1.2, marginBottom: '1rem' }}>
          Best Xero Alternatives in Australia 2026 (Cheaper Options)
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Xero has become one of the most complained-about expenses in Australian small business communities. At $35-70/mo in 2026, it&apos;s priced for mid-sized businesses — not the solo tradie or freelancer sending 10 invoices a month. Here are the best alternatives.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            The best cheap Xero alternative for sole traders is <strong>SAB Account AI at $9/mo</strong>. For small businesses needing more features, <strong>MYOB Essentials ($27/mo)</strong> or <strong>QuickBooks ($25/mo)</strong> are solid options.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Why people are leaving Xero</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Xero&apos;s pricing has increased dramatically. The Starter plan — which limits you to 20 invoices and 5 bills per month — now costs $35/mo. The Standard plan (unlimited invoices) is $70/mo. For a sole trader earning $80k/year, that&apos;s $840/year on accounting software alone.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The frustration is understandable: most sole traders use maybe 20% of Xero&apos;s features and pay for the other 80% they&apos;ll never touch.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Top Xero alternatives for Australians in 2026</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
          {[
            {
              name: 'SAB Account AI',
              price: '$9/mo (Starter) · $19/mo (Pro)',
              best: 'Sole traders, freelancers, contractors',
              pros: ['Built specifically for Australian sole traders', 'ATO-compliant invoicing with GST', 'Payslips + PAYG withholding on Pro', 'Simple — no accountant required'],
              cons: ['Not for businesses with complex inventory needs'],
              verdict: 'Best choice for Australian sole traders who want ATO-compliant invoicing without the Xero price tag.',
            },
            {
              name: 'MYOB Essentials',
              price: '$27/mo',
              best: 'Small businesses with employees',
              pros: ['Australian-made', 'Strong payroll features', 'STP reporting built in'],
              cons: ['More expensive than purpose-built sole trader tools', 'Interface feels dated'],
              verdict: 'Good for businesses with staff. Overkill for solo operators.',
            },
            {
              name: 'QuickBooks',
              price: 'From $25/mo',
              best: 'Small businesses wanting a Xero-like experience',
              pros: ['Clean interface', 'Good mobile app', 'Strong reporting'],
              cons: ['Still pricey for sole traders', 'US-focused features sometimes don\'t map to Australian tax'],
              verdict: 'A genuine Xero competitor at a slightly lower price, but still more than most sole traders need.',
            },
            {
              name: 'Invoice Ninja',
              price: 'Free (basic) · $10/mo (Pro)',
              best: 'Freelancers who just need invoicing',
              pros: ['Free tier available', 'Good invoice templates'],
              cons: ['Limited Australian tax features', 'No payroll', 'BAS tracking is manual'],
              verdict: 'Fine for simple invoicing but lacks the Australian-specific tax features most sole traders need.',
            },
          ].map(alt => (
            <div key={alt.name} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', margin: 0 }}>{alt.name}</h3>
                <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontWeight: 700, fontSize: '0.85rem', padding: '0.2rem 0.75rem', borderRadius: 20 }}>{alt.price}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text3)', marginBottom: '0.75rem' }}>Best for: {alt.best}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.4rem' }}>Pros</p>
                  {alt.pros.map(p => <p key={p} style={{ fontSize: '0.85rem', color: 'var(--text2)', margin: '0 0 0.25rem' }}>✓ {p}</p>)}
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.4rem' }}>Cons</p>
                  {alt.cons.map(c => <p key={c} style={{ fontSize: '0.85rem', color: 'var(--text2)', margin: '0 0 0.25rem' }}>✗ {c}</p>)}
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--char)', fontWeight: 500, margin: 0, paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>{alt.verdict}</p>
            </div>
          ))}
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>How to switch from Xero</h2>
        <ol style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Export your contacts, invoices, and transaction history from Xero (Settings → Export Data)</li>
          <li>Sign up for your new platform and import your client list</li>
          <li>Recreate any recurring invoice templates</li>
          <li>Cancel Xero before your next billing date</li>
        </ol>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          The whole process takes about an hour. Most people wish they had done it sooner.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Switch to SAB Account AI — $9/mo</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>ATO-compliant invoicing built for Australian sole traders. No lock-in contract.</p>
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Related: <Link href="/blog/best-invoicing-software-australia-sole-trader" style={{ color: 'var(--ember)' }}>Best Invoicing Software for Sole Traders</Link> · <Link href="/blog/gst-invoice-template-australia" style={{ color: 'var(--ember)' }}>GST Invoice Template Australia</Link></p>
        </div>

      </div>
    </div>
  )
}
