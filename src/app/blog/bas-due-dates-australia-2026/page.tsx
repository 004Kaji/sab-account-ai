import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BAS Due Dates Australia 2026: When to Lodge Your Business Activity Statement',
  description: 'BAS due dates for Australian businesses in 2026. Quarterly and monthly lodgement deadlines, what happens if you miss one, and how to lodge your BAS.',
  alternates: { canonical: 'https://sabaccountai.com/blog/bas-due-dates-australia-2026' },
  openGraph: {
    title: 'BAS Due Dates Australia 2026: When to Lodge Your Business Activity Statement',
    description: 'All BAS lodgement deadlines for 2026 — quarterly and monthly. Don\'t miss an ATO deadline.',
    url: 'https://sabaccountai.com/blog/bas-due-dates-australia-2026',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'BAS Due Dates Australia 2026: When to Lodge Your Business Activity Statement',
  description: 'All BAS due dates for Australian businesses in 2026 — quarterly and monthly lodgement deadlines.',
  datePublished: '2026-06-07',
  dateModified: '2026-06-07',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/bas-due-dates-australia-2026' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'When is the next BAS due in Australia 2026?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For quarterly lodgers, Q4 2025-26 (April-June 2026) BAS is due 28 July 2026. If you lodge through a registered tax agent, you may have until 25 August 2026. Monthly lodgers must lodge within 21 days of the end of each month.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if I miss my BAS due date?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Missing your BAS due date triggers a Failure to Lodge (FTL) penalty. The penalty is one penalty unit ($313 in 2026) for each 28-day period (or part thereof) the lodgement is late, up to a maximum of five penalty units ($1,565). Interest also accrues on unpaid amounts.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I get an extension on my BAS lodgement?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can request a deferral through your ATO online services account or by calling the ATO on 13 28 66. Extensions are not guaranteed but the ATO is generally reasonable for first-time requests with a genuine reason.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do sole traders need to lodge a BAS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Only if you are registered for GST. If your turnover is under $75,000 and you are not registered for GST, you do not need to lodge a BAS. Once you register for GST, BAS lodgement is mandatory.',
      },
    },
  ],
}

export default function BASDueDatesPage() {
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
          BAS Due Dates Australia 2026: When to Lodge Your Business Activity Statement
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Missing a BAS deadline means ATO penalties and interest charges. Here are all the BAS due dates for 2026, whether you lodge quarterly or monthly.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            Most small businesses lodge <strong>quarterly</strong>. The due date is the <strong>28th of the month</strong> after each quarter ends. If you use a registered tax agent, you get an extra 4 weeks.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Quarterly BAS due dates 2025–26</h2>

        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--char)', color: 'white' }}>
                {['Quarter', 'Period', 'Due Date (self-lodge)', 'Due Date (tax agent)'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Q1 2025–26', 'Jul – Sep 2025', '28 October 2025', '25 November 2025'],
                ['Q2 2025–26', 'Oct – Dec 2025', '28 February 2026', '28 February 2026'],
                ['Q3 2025–26', 'Jan – Mar 2026', '28 April 2026', '26 May 2026'],
                ['Q4 2025–26', 'Apr – Jun 2026', '28 July 2026', '25 August 2026'],
              ].map(([q, period, selfLodge, agent], i) => (
                <tr key={q} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--cream)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--char)' }}>{q}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)' }}>{period}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ember)', fontWeight: 600 }}>{selfLodge}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)' }}>{agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Monthly BAS due dates</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>
          Monthly lodgers must lodge and pay within <strong>21 days</strong> of the end of each month. For example:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>January BAS → due 21 February</li>
          <li>February BAS → due 21 March</li>
          <li>March BAS → due 21 April</li>
          <li>June BAS → due 21 July</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Monthly lodgement is mandatory if your annual GST turnover is $20 million or more. Most small businesses lodge quarterly.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>What&apos;s in a BAS?</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>Your BAS summarises:</p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>GST collected</strong> from your sales</li>
          <li><strong>GST credits</strong> you can claim on business purchases</li>
          <li><strong>PAYG withholding</strong> (tax withheld from employees)</li>
          <li><strong>PAYG instalments</strong> (income tax prepayments for your own income)</li>
        </ul>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Penalties for late BAS lodgement</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The ATO applies a Failure to Lodge (FTL) penalty for late BAS submissions. In 2026, each penalty unit is $313. The penalty starts at one unit ($313) and increases by one unit for every 28-day period it remains outstanding, up to a maximum of $1,565.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          On top of this, the ATO charges the General Interest Charge (GIC) on any unpaid amount — currently around 11% annually. Lodge on time, even if you can&apos;t pay the full amount immediately.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Track GST automatically with SAB Account AI</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Every invoice automatically tracks GST collected — so BAS time takes minutes, not hours.</p>
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Related: <Link href="/blog/how-to-register-gst-australia" style={{ color: 'var(--ember)' }}>How to Register for GST Australia</Link> · <Link href="/blog/gst-invoice-template-australia" style={{ color: 'var(--ember)' }}>GST Invoice Template Australia</Link></p>
        </div>

      </div>
    </div>
  )
}
