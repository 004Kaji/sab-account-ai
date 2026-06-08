import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Single Touch Payroll for Small Business: Complete Guide Australia 2026',
  description: 'What is Single Touch Payroll (STP) and how does it affect your small business? Australia\'s STP Phase 2 requirements, how to comply, and the best STP software for 2026.',
  alternates: { canonical: 'https://sabaccountai.com/blog/single-touch-payroll-small-business-australia' },
  openGraph: {
    title: 'Single Touch Payroll for Small Business: Complete Guide Australia 2026',
    description: 'Single Touch Payroll (STP) explained for Australian small businesses. What you need to do, deadlines, and how to comply easily.',
    url: 'https://sabaccountai.com/blog/single-touch-payroll-small-business-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Single Touch Payroll for Small Business: Complete Guide Australia 2026',
  description: 'What is Single Touch Payroll (STP) and how does it affect Australian small businesses in 2026.',
  datePublished: '2026-06-07',
  dateModified: '2026-06-07',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/single-touch-payroll-small-business-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Single Touch Payroll mandatory for small businesses in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Single Touch Payroll (STP) is mandatory for all Australian employers, including small businesses with one or more employees. STP Phase 2 (expanded reporting) became mandatory from January 2022 for most businesses.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between STP Phase 1 and Phase 2?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'STP Phase 1 reported salary/wage totals and PAYG withholding. STP Phase 2 added more detailed reporting including income type (salary, allowances, overtime), employment basis (full-time, part-time, casual), and disaggregated gross amounts. Phase 2 helps the ATO pre-fill tax returns more accurately.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do sole traders need to use Single Touch Payroll?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Only if they have employees. Sole traders with no employees are not required to use STP. If you hire even one employee (including a family member), STP reporting becomes mandatory.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if I don\'t comply with STP requirements?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Failure to report through STP can result in penalties. The ATO may apply Failure to Lodge (FTL) penalties. However, the ATO has generally taken an education-first approach for small businesses new to STP — contact them if you\'re struggling to comply.',
      },
    },
  ],
}

export default function SingleTouchPayrollPage() {
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
          Single Touch Payroll for Small Business: Complete Guide Australia 2026
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Single Touch Payroll (STP) changed how Australian businesses report payroll to the ATO. If you have employees, STP isn&apos;t optional. Here&apos;s what it means for your small business and how to stay compliant in 2026.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            Single Touch Payroll means you report <strong>each employee&apos;s wages, PAYG withholding, and super</strong> to the ATO every time you run payroll — instead of once a year. It&apos;s mandatory for all employers in Australia.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>What is Single Touch Payroll?</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Single Touch Payroll (STP) is the ATO&apos;s system for real-time payroll reporting. Every time you pay an employee, your payroll software sends a report to the ATO containing:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Gross wages paid</li>
          <li>PAYG withholding (tax withheld)</li>
          <li>Super Guarantee amounts</li>
          <li>Employee details (TFN, employment type, income type)</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          This replaced the old system where employers submitted payment summaries (group certificates) to the ATO once a year. Under STP, the ATO has real-time visibility of payroll.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>STP Phase 2 — what changed</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          STP Phase 2 expanded the data reported to the ATO. Key additions:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Disaggregated gross:</strong> Salary, allowances, overtime, leave loading reported separately</li>
          <li><strong>Employment basis:</strong> Full-time, part-time, casual, labour hire</li>
          <li><strong>Income type:</strong> Salary, working holiday maker, inbound assignee, etc.</li>
          <li><strong>Child support deductions:</strong> Reported directly through STP</li>
        </ul>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>How STP works in practice</h2>
        {[
          { step: '1', title: 'Run payroll in your software', body: 'Calculate wages, PAYG withholding, and super for each employee as usual.' },
          { step: '2', title: 'Software submits STP report automatically', body: 'When you finalise payroll, your software sends the STP report to the ATO digitally. You don\'t manually submit anything — the software handles it.' },
          { step: '3', title: 'ATO receives and processes', body: 'The ATO updates each employee\'s myGov account with their year-to-date earnings and tax withheld. Employees can see this in real time.' },
          { step: '4', title: 'Year-end finalisation', body: 'At the end of the financial year, you submit an STP finalisation to confirm all payroll is complete. This replaces the old payment summary (group certificate) process.' },
        ].map(item => (
          <div key={item.step} style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ember)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{item.step}</div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.4rem' }}>{item.title}</h3>
              <p style={{ color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>{item.body}</p>
            </div>
          </div>
        ))}

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Do sole traders need STP?</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Only if you have employees. A sole trader with no employees has no STP obligations.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          The moment you hire your first employee — even casual, even family — STP reporting becomes mandatory. You&apos;ll need payroll software that is STP-enabled and registered with the ATO.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Payslips and payroll sorted with SAB Account AI</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Generate STP-ready payslips with PAYG withholding and super calculated automatically. Pro plan $19/mo.</p>
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Related: <Link href="/blog/payday-super-2026" style={{ color: 'var(--ember)' }}>Payday Super 2026</Link> · <Link href="/blog/how-to-pay-super-employees-australia" style={{ color: 'var(--ember)' }}>How to Pay Super for Employees</Link></p>
        </div>

      </div>
    </div>
  )
}
