import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Pay Casual Employees in Australia 2026: Rates, PAYG and Payslips',
  description: 'Casual employees get 25% loading on top of the award rate, PAYG withholding, and 12% super. Here is the complete guide to paying casuals correctly in 2026.',
  alternates: { canonical: 'https://sabaccountai.com/blog/casual-employee-payroll-australia' },
  openGraph: {
    title: 'How to Pay Casual Employees in Australia 2026: Rates, PAYG and Payslips',
    description: 'Complete guide to casual employee pay in Australia — loading, PAYG withholding, super, and payslip requirements for 2026.',
    url: 'https://sabaccountai.com/blog/casual-employee-payroll-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Pay Casual Employees in Australia 2026: Rates, PAYG and Payslips',
  description: 'Casual employees get 25% loading on top of the award rate, PAYG withholding, and 12% super. Complete guide for Australian employers in 2026.',
  datePublished: '2026-06-11',
  dateModified: '2026-06-11',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/casual-employee-payroll-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the casual loading rate in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The casual loading rate is 25% above the equivalent permanent employee\'s hourly rate, as set by the relevant modern award or enterprise agreement. For award-free employees, the 25% loading applies on top of the National Minimum Wage.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do casual employees get superannuation in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Casual employees are entitled to the Super Guarantee at the same rate as permanent employees — 12% of ordinary time earnings from 1 July 2025. From 1 July 2026 under Payday Super, this must be paid on every payday rather than quarterly.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I withhold PAYG tax from casual employees?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. PAYG withholding applies to all employees including casuals. You must withhold tax based on the employee\'s tax file number declaration and the ATO tax tables. Report this through Single Touch Payroll (STP) Phase 2.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can a casual employee convert to permanent in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Under the Fair Work Act (as amended in 2024), eligible casual employees can request conversion to permanent employment. Non-small business employers must assess eligibility at 6 and 12 months. Small businesses (under 15 employees) assess at 12 months.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are casual employees entitled to leave in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Casual employees are not entitled to paid annual leave, personal/carer\'s leave, or notice of termination. They are entitled to 10 days paid family and domestic violence leave per year, 2 days unpaid carer\'s leave per occasion, and unpaid compassionate leave.',
      },
    },
  ],
}

export default function CasualEmployeePayrollPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{ color: 'var(--ember)', fontSize: '0.875rem', textDecoration: 'none' }}>← Blog</Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payroll</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--char)', lineHeight: 1.2, marginBottom: '1rem' }}>
          How to Pay Casual Employees in Australia 2026: Rates, PAYG and Payslips
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Australia has over 2.7 million casual workers. If you employ even one casual staff member, you have a set of payroll obligations that differ from permanent employees. The good news: once you understand the structure, it is straightforward to get right. The bad news: many small employers get the casual loading calculation wrong, skip super for short shifts, or miss the new Payday Super requirements starting July 2026.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            Casual employees receive <strong>25% loading</strong> on top of the relevant award rate, <strong>12% super</strong> on ordinary time earnings, and <strong>PAYG withholding</strong> on every payment. From 1 July 2026, super must be paid on every payday, not quarterly.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>What makes someone a casual employee?</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          From 26 August 2024, the Fair Work Act includes a new statutory definition of casual employment. An employee is casual if, at the time of engagement, there is no firm advance commitment to continuing and indefinite work, assessed by looking at the real substance and practical reality of the employment relationship.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Practically, this means: the employee works irregular hours that change from week to week, does not have guaranteed ongoing work, and is paid a casual loading in lieu of leave entitlements. The critical point is that calling someone casual in the contract is not enough — if they work the same hours every week and you always expect them to, they may legally be a permanent employee regardless of how the contract is worded.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          To be safe, casual employees should receive a Casual Employment Information Statement (CEIS) when they start — this is a Fair Work Ombudsman document explaining their rights, and providing it is a legal requirement.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Casual loading: the 25% explained</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The casual loading compensates employees for the entitlements they do not receive: annual leave, personal/carer&apos;s leave, public holiday pay when they do not work, and notice of termination. The standard rate is 25%, applied on top of the permanent equivalent rate for the same work.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>
          Calculating casual pay is a two-step process:
        </p>
        <ol style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Find the ordinary hourly rate for the employee&apos;s classification under their relevant modern award (or the National Minimum Wage if award-free)</li>
          <li>Multiply that rate by 1.25 to get the casual hourly rate</li>
        </ol>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--char)', margin: '0 0 1rem', fontFamily: 'var(--font-fraunces)' }}>Casual loading calculation examples</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { scenario: 'National Minimum Wage (from July 2026)', perm: '$24.95', loading: '$6.24', casual: '$31.19' },
              { scenario: 'Hospitality Industry General Award – Food & Beverage Level 2', perm: '$27.00', loading: '$6.75', casual: '$33.75' },
              { scenario: 'Retail Industry Award – Level 1', perm: '$25.80', loading: '$6.45', casual: '$32.25' },
              { scenario: 'Cleaning Services Award – Level 2', perm: '$26.40', loading: '$6.60', casual: '$33.00' },
            ].map(row => (
              <div key={row.scenario} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.65rem' }}>
                <span style={{ color: 'var(--text2)' }}>{row.scenario}</span>
                <span style={{ color: 'var(--text3)', textAlign: 'right' }}>{row.perm}/hr</span>
                <span style={{ color: 'var(--text3)', textAlign: 'right' }}>+{row.loading}</span>
                <span style={{ color: 'var(--ember)', fontWeight: 700, textAlign: 'right' }}>{row.casual}/hr</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', margin: '0.75rem 0 0' }}>Rates are indicative. Always verify the current rate in the relevant Modern Award at fairwork.gov.au.</p>
        </div>

        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Weekend penalty rates and overtime apply on top of the casual rate, not instead of it. For example, under many awards a casual working Saturday receives the Saturday penalty rate calculated on top of their already-loaded casual rate — resulting in total pay significantly above the ordinary rate. The relevant award will specify the exact calculation method.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>PAYG withholding for casual employees</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          PAYG withholding applies to all employees, including casuals. When a casual employee starts, ask them to complete a Tax File Number (TFN) Declaration. This tells you whether they are claiming the tax-free threshold, have a HELP or STSL debt, or are a working holiday maker subject to different rates.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          If a casual employee does not provide their TFN, you must withhold at the top marginal rate (47% as of 2026) from all payments. This is not punitive — it protects the employee from owing large amounts at tax time — but it does mean more of each payment goes to the ATO until the employee provides their details.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          A common challenge with casual employees is that their income varies significantly from week to week. The ATO&apos;s PAYG withholding tables are based on annualised income — so a casual who works a very busy fortnight may have more tax withheld than necessary during high-income periods. This corrects at tax time via a refund, but employees often ask about it. Your payroll software should handle this automatically using the correct ATO tax tables.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Report PAYG withholding through Single Touch Payroll (STP) Phase 2 on or before every payday. STP Phase 2 has been mandatory since January 2022 and requires more granular breakdown of income types, including separating ordinary earnings, casual loading, and allowances as distinct income categories.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Superannuation for casual employees in 2026</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Casual employees are entitled to the Superannuation Guarantee at the same rate as all other employees: 12% of ordinary time earnings from 1 July 2025. There is no minimum hours threshold for casual employees to qualify for super — if they earn $450 or more in a calendar month, super is payable. (The $450/month threshold was abolished in November 2022, so even very small casual earners may now be entitled to super if they are under 18 and working 30+ hours per week, or 18 and over regardless of hours.)
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          From 1 July 2026, Payday Super means super must be paid on every payday and received by the employee&apos;s fund within 7 business days. This affects casual payroll more than any other employment type, because casual employees are often paid weekly or fortnightly with irregular amounts. Your clearing house must be able to process small, frequent super payments rather than one quarterly batch.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The super is calculated on ordinary time earnings — this means the casual loading is included in the base for calculating super. If a casual employee earns $1,000 including their 25% loading, super is 12% of that $1,000, not 12% of the base rate before loading.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>What casual employees are and are not entitled to</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.25rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--char)', margin: '0 0 0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entitled to</p>
            {[
              '25% casual loading',
              '12% superannuation',
              '10 days paid family & domestic violence leave',
              '2 days unpaid carer\'s leave per occasion',
              'Unpaid compassionate leave',
              'Unpaid community service leave',
              'A compliant payslip within 1 working day',
              'Casual Employment Information Statement',
              'Pathway to convert to permanent (after 6-12 months)',
            ].map(item => (
              <p key={item} style={{ color: 'var(--text2)', fontSize: '0.85rem', margin: '0 0 0.3rem' }}>✓ {item}</p>
            ))}
          </div>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.25rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--char)', margin: '0 0 0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Not entitled to</p>
            {[
              'Paid annual leave',
              'Paid personal/carer\'s leave',
              'Notice of termination',
              'Redundancy pay',
              'Guaranteed hours',
              'Paid public holidays (on days not worked)',
              'Annual leave loading',
              'Long service leave (in most states, early years)',
            ].map(item => (
              <p key={item} style={{ color: 'var(--text2)', fontSize: '0.85rem', margin: '0 0 0.3rem' }}>✗ {item}</p>
            ))}
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Casual conversion: the pathway to permanent</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Since 2024, eligible casual employees have a new statutory pathway to convert to permanent employment. The rules differ by employer size:
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          <strong>Non-small business employers</strong> (15 or more employees): must give each eligible casual employee an assessment of whether they could be offered permanent employment at the 6-month mark and again at 12 months, then every 12 months thereafter.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          <strong>Small business employers</strong> (fewer than 15 employees): must give the assessment at 12 months of engagement.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          An employee can also make a direct request for conversion at any time after 6 months of regular work. You can refuse on reasonable business grounds — for example, if the position genuinely requires casual hours due to unpredictable demand — but you must respond in writing within 21 days and explain the reason. Ignoring or dismissing the request without proper process is a contravention.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Payslip requirements for casual employees</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Casual employees have the same right to compliant payslips as permanent employees. Your payslip must show:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Employer name and ABN</li>
          <li>Employee name</li>
          <li>Date of payment and pay period</li>
          <li>Gross and net pay amounts shown separately</li>
          <li>The ordinary hourly rate and number of hours at that rate</li>
          <li>The casual loading amount — shown as a separate line item, not bundled into the base rate</li>
          <li>Any overtime, penalty rates, or allowances as separate line items</li>
          <li>PAYG tax withheld</li>
          <li>Super contribution amount, fund name, and member number</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          The payslip must be issued within one working day of payday. This applies to every casual payment — including short one-off shifts. There is no minimum payment size below which payslip obligations do not apply.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Payroll for casuals, done right</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>SAB Account AI calculates casual loading, PAYG withholding, and super automatically — and generates compliant payslips for every pay run. From $9/mo.</p>
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
            Related:{' '}
            <Link href="/blog/payslip-requirements-australia" style={{ color: 'var(--ember)' }}>Payslip Requirements Australia</Link>
            {' · '}
            <Link href="/blog/payg-withholding-calculator-australia" style={{ color: 'var(--ember)' }}>PAYG Withholding Calculator</Link>
            {' · '}
            <Link href="/blog/payday-super-2026" style={{ color: 'var(--ember)' }}>Payday Super 2026 Guide</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
