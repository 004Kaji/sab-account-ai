import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Pay Super for Employees in Australia: Step-by-Step 2026',
  description: 'How to pay superannuation for employees in Australia in 2026. Super rates, payment deadlines, SuperStream, and what happens when Payday Super starts in July 2026.',
  alternates: { canonical: 'https://sabaccountai.com/blog/how-to-pay-super-employees-australia' },
  openGraph: {
    title: 'How to Pay Super for Employees in Australia: Step-by-Step 2026',
    description: 'Step-by-step guide to paying employee superannuation in Australia. Rates, deadlines, SuperStream, and Payday Super from July 2026.',
    url: 'https://sabaccountai.com/blog/how-to-pay-super-employees-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Pay Super for Employees in Australia: Step-by-Step 2026',
  description: 'Step-by-step guide to paying employee superannuation in Australia for 2026.',
  datePublished: '2026-06-07',
  dateModified: '2026-06-07',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/how-to-pay-super-employees-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'When must I pay super for my employees in 2026?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Currently (before 1 July 2026), super must be paid quarterly — by 28 October, 28 January, 28 April, and 28 July. From 1 July 2026, Payday Super requires super to be paid within 7 days of each payday.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I pay super through SuperStream?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SuperStream is the ATO\'s electronic super payment system. You can use: payroll software with SuperStream built in, a clearing house (including the ATO\'s free Small Business Super Clearing House for businesses with 19 or fewer employees), or your bank\'s super payment service. All payments must be made electronically.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the super rate for employees in Australia in 2026?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Superannuation Guarantee rate is 12% from 1 July 2025 (2025-26 financial year). This is the final legislated rate — it will remain at 12% going forward.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the Super Guarantee Charge?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'If you miss the super payment deadline, the ATO applies the Super Guarantee Charge (SGC). The SGC includes the unpaid super amount, 10% annual interest, and a $20 per-employee administration fee. Unlike regular super contributions, the SGC is not tax deductible.',
      },
    },
  ],
}

export default function HowToPaySuperEmployeesPage() {
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
          How to Pay Super for Employees in Australia: Step-by-Step 2026
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Paying super correctly is one of the most important obligations for any Australian employer. Get it wrong and the ATO penalties are significant. Here&apos;s exactly how it works — including the major change coming in July 2026.
        </p>

        <div style={{ background: 'rgba(200,75,47,0.08)', border: '1px solid rgba(200,75,47,0.25)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Important: Major change from 1 July 2026</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            <strong>Payday Super</strong> starts 1 July 2026. Super must be paid <strong>within 7 days of each payday</strong> — not quarterly. If you pay employees weekly, you&apos;ll pay super weekly. <Link href="/blog/payday-super-2026" style={{ color: 'var(--ember)' }}>Read the full Payday Super guide →</Link>
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Current super payment deadlines (before July 2026)</h2>

        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--char)', color: 'white' }}>
                {['Quarter', 'Period', 'Super Due Date'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Q1', 'Jul – Sep', '28 October'],
                ['Q2', 'Oct – Dec', '28 January'],
                ['Q3', 'Jan – Mar', '28 April'],
                ['Q4', 'Apr – Jun', '28 July'],
              ].map(([q, period, due], i) => (
                <tr key={q} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--cream)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--char)' }}>{q}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text2)' }}>{period}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ember)', fontWeight: 600 }}>{due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>How to calculate super</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>
          Super is calculated on <strong>ordinary time earnings (OTE)</strong> — the amount an employee earns for their ordinary hours of work. The rate from 1 July 2025 is <strong>12%</strong>.
        </p>
        <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', fontFamily: 'var(--font-jetbrains)', fontSize: '0.9rem' }}>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--text3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Example calculation</p>
          <p style={{ margin: '0 0 0.25rem', color: 'var(--char)' }}>Employee weekly wage: $1,200</p>
          <p style={{ margin: '0 0 0.25rem', color: 'var(--char)' }}>Super rate: 12%</p>
          <p style={{ margin: 0, color: 'var(--ember)', fontWeight: 700 }}>Super payable: $1,200 × 12% = $144/week</p>
        </div>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Super is paid <strong>on top of wages</strong> — it&apos;s not deducted from the employee&apos;s pay. It&apos;s an additional cost to you as the employer.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Step-by-step: How to pay super</h2>

        {[
          { step: '1', title: 'Collect your employee\'s super fund details', body: 'When an employee starts, they choose their super fund and provide you with their fund name, USI (Unique Superannuation Identifier), and member number. If they don\'t choose, use their stapled super fund (the ATO can look this up) or your default fund.' },
          { step: '2', title: 'Calculate super each pay period', body: 'Multiply ordinary time earnings by 12% (from July 2025). Most payroll software does this automatically. Keep records of super calculated vs super paid.' },
          { step: '3', title: 'Pay via SuperStream', body: 'All employer super payments must be made electronically through SuperStream. Options: the ATO\'s free Small Business Super Clearing House (SBSCH) — free for businesses with 19 or fewer employees — or your payroll software\'s SuperStream integration.' },
          { step: '4', title: 'Meet the deadline', body: 'Currently: quarterly by the 28th of the month after each quarter ends. From 1 July 2026: within 7 days of each payday (Payday Super).' },
          { step: '5', title: 'Keep records', body: 'Keep records of all super contributions paid — date, amount, and fund — for at least 5 years. Your payroll software should handle this automatically.' },
        ].map(item => (
          <div key={item.step} style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ember)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{item.step}</div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.4rem' }}>{item.title}</h3>
              <p style={{ color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>{item.body}</p>
            </div>
          </div>
        ))}

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>What happens if you miss a super payment</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Missing a super deadline triggers the <strong>Super Guarantee Charge (SGC)</strong>:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '2rem' }}>
          <li>The unpaid super amount</li>
          <li>10% annual interest from the start of the quarter</li>
          <li>$20 per employee administration fee</li>
          <li>The SGC is <strong>not tax deductible</strong> — unlike regular super contributions</li>
        </ul>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Super calculated automatically on every payslip</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>SAB Account AI calculates 12% SGC on every payslip — so you always know exactly what&apos;s owed. Pro plan $19/mo.</p>
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Related: <Link href="/blog/payday-super-2026" style={{ color: 'var(--ember)' }}>Payday Super 2026</Link> · <Link href="/blog/do-sole-traders-pay-super-australia" style={{ color: 'var(--ember)' }}>Do Sole Traders Pay Super?</Link> · <Link href="/blog/super-guarantee-rate-australia-2025" style={{ color: 'var(--ember)' }}>Super Guarantee Rate Australia</Link></p>
        </div>

      </div>
    </div>
  )
}
