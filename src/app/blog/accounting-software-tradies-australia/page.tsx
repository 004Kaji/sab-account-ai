import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Best Accounting Software for Tradies in Australia 2026',
  description: 'The best accounting and invoicing software for Australian tradies in 2026. Builders, plumbers, electricians — compare tools built for the trade industry.',
  alternates: { canonical: 'https://sabaccountai.com/blog/accounting-software-tradies-australia' },
  openGraph: {
    title: 'Best Accounting Software for Tradies in Australia 2026',
    description: 'Compare the best invoicing and accounting software for Australian tradies — builders, plumbers, electricians, and more.',
    url: 'https://sabaccountai.com/blog/accounting-software-tradies-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Best Accounting Software for Tradies in Australia 2026',
  description: 'The best accounting and invoicing software for Australian tradies in 2026.',
  datePublished: '2026-06-07',
  dateModified: '2026-06-07',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/accounting-software-tradies-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What accounting software do most Australian tradies use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Many tradies use Xero, MYOB, or ServiceM8 for field jobs. However, sole trader tradies (plumbers, electricians, builders running their own business) are increasingly moving to simpler, cheaper tools like SAB Account AI ($9/mo) that handle invoicing and payroll without the complexity of full accounting platforms.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do tradies need accounting software or just invoicing software?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most sole trader tradies need invoicing software with GST tracking and basic expense records — not full accounting software. Full accounting platforms like Xero are designed for businesses with accountants on staff. Invoicing-focused tools are simpler and cheaper for most tradies.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use accounting software on my phone as a tradie?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Most modern invoicing software has a mobile app or mobile-friendly web interface. SAB Account AI works on any device with a browser — you can create and send invoices from your phone on-site.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do tradies need to charge GST in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Only if their annual turnover exceeds $75,000. Most tradies earning more than $75k must register for GST and add 10% to their invoices. Below that threshold, GST registration is optional.',
      },
    },
  ],
}

export default function AccountingSoftwareTradiesPage() {
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
          Best Accounting Software for Tradies in Australia 2026
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          As a tradie running your own business in Australia, you need software that generates invoices on-site, tracks GST, handles employee payslips, and doesn&apos;t require an accounting degree to operate. Here&apos;s what actually works in 2026.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            For sole trader tradies: <strong>SAB Account AI ($9/mo)</strong> covers invoicing, GST, and payslips simply. For tradies needing job management + scheduling: <strong>ServiceM8</strong> or <strong>Tradify</strong>. For full accounting: <strong>Xero</strong> (but it&apos;s expensive at $35-70/mo).
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>What tradies actually need from software</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>
          The needs of a tradie running a small business are different from an office-based business. You need:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Fast invoice creation on-site or from your phone</li>
          <li>ATO-compliant invoices with your ABN and GST</li>
          <li>Track who has paid and who hasn&apos;t</li>
          <li>Payslips for your employees or subbies (if applicable)</li>
          <li>Basic expense tracking for materials and fuel</li>
          <li>BAS-ready GST tracking</li>
        </ul>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Best options for tradies in 2026</h2>

        {[
          {
            name: 'SAB Account AI',
            price: '$9/mo',
            type: 'Invoicing + Payroll',
            bestFor: 'Sole trader tradies and small trade businesses',
            description: 'Built specifically for Australian sole traders. Creates ATO-compliant invoices with GST instantly, tracks expenses, generates payslips with PAYG withholding and super calculations. No job management features, but covers the financial side cleanly.',
            pros: ['Cheapest option for what tradies actually need', 'Payslips with super and PAYG built in', 'Works on mobile browser — invoice on-site', 'No complicated setup'],
            cons: ['No job scheduling or quoting tools'],
          },
          {
            name: 'ServiceM8',
            price: 'From $29/mo',
            type: 'Job Management + Basic Invoicing',
            bestFor: 'Tradies who need job scheduling, quoting, and client management',
            description: 'Popular with plumbers, electricians, and HVAC technicians. Handles job scheduling, client communication, quoting, and invoicing in one app. Integrates with Xero or MYOB for accounting.',
            pros: ['Job scheduling and dispatch', 'Client portal', 'GPS tracking for technicians'],
            cons: ['More expensive', 'Requires Xero or MYOB integration for full accounting'],
          },
          {
            name: 'Tradify',
            price: 'From $35/mo per user',
            type: 'Trade-specific Job Management',
            bestFor: 'Trade businesses with multiple employees and complex job tracking',
            description: 'Specifically built for the trades. Quote, schedule, track, and invoice jobs. Popular with builders, electricians, and plumbers who run crews.',
            pros: ['Built for trades', 'Timesheets and job costing', 'Quote-to-invoice workflow'],
            cons: ['Expensive per user for larger teams', 'Complex for solo operators'],
          },
          {
            name: 'Xero',
            price: 'From $35/mo',
            type: 'Full Accounting',
            bestFor: 'Established trade businesses with an accountant',
            description: 'Comprehensive accounting software. Great if you have a bookkeeper or accountant managing your books. Overkill for most sole trader tradies.',
            pros: ['Full accounting capability', 'Integrates with many trade apps'],
            cons: ['Expensive', 'Complex for non-accountants', 'Pricing increased significantly'],
          },
        ].map(tool => (
          <div key={tool.name} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.2rem', color: 'var(--char)', margin: 0 }}>{tool.name}</h3>
              <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontWeight: 700, fontSize: '0.85rem', padding: '0.2rem 0.75rem', borderRadius: 20 }}>{tool.price}</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: '0.6rem' }}>{tool.type} · Best for: {tool.bestFor}</p>
            <p style={{ color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '0.75rem' }}>{tool.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>{tool.pros.map(p => <p key={p} style={{ fontSize: '0.82rem', color: 'var(--text2)', margin: '0 0 0.2rem' }}>✓ {p}</p>)}</div>
              <div>{tool.cons.map(c => <p key={c} style={{ fontSize: '0.82rem', color: 'var(--text2)', margin: '0 0 0.2rem' }}>✗ {c}</p>)}</div>
            </div>
          </div>
        ))}

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>GST and super: what tradies need to know</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Most tradies earning over $75k/year are GST registered. This means every invoice must include GST (10%) and you must lodge a BAS quarterly. If you have employees or pay subcontractors under a labour hire arrangement, you also need to manage PAYG withholding and super contributions.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          Good invoicing software handles all of this automatically — so you can focus on the job, not the paperwork.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Invoice from site, get paid faster</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>SAB Account AI — ATO-compliant invoicing for Australian tradies. $9/mo, no lock-in.</p>
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Related: <Link href="/blog/best-invoicing-software-australia-sole-trader" style={{ color: 'var(--ember)' }}>Best Invoicing Software for Sole Traders</Link> · <Link href="/blog/xero-alternatives-australia" style={{ color: 'var(--ember)' }}>Xero Alternatives Australia</Link></p>
        </div>

      </div>
    </div>
  )
}
