import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Payslip Requirements Australia 2026: What Every Employer Must Include',
  description: 'Fair Work requires payslips within 1 working day of payday. Here is exactly what must be on every payslip in Australia — and the penalties if you get it wrong.',
  alternates: { canonical: 'https://sabaccountai.com/blog/payslip-requirements-australia' },
  openGraph: {
    title: 'Payslip Requirements Australia 2026: What Every Employer Must Include',
    description: 'Payslips must be issued within 1 working day of payday under the Fair Work Act. Here is the complete checklist for 2026.',
    url: 'https://sabaccountai.com/blog/payslip-requirements-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Payslip Requirements Australia 2026: What Every Employer Must Include',
  description: 'Fair Work requires payslips within 1 working day of payday. Complete checklist of what must be on every Australian payslip in 2026.',
  datePublished: '2026-06-11',
  dateModified: '2026-06-11',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/payslip-requirements-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'When must an employer issue a payslip in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Under Section 536 of the Fair Work Act 2009, employers must issue a payslip within one working day of the employee\'s payday, even if the employee is on leave at the time.',
      },
    },
    {
      '@type': 'Question',
      name: 'What must be on a payslip in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A compliant Australian payslip must include: employer name and ABN, employee name, date of payment, pay period covered, gross and net pay amounts, ordinary hourly rate (if applicable), any loadings or allowances paid, any deductions made, and superannuation contributions and fund name.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are electronic payslips legal in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Electronic payslips are fully legal under the Fair Work Act, provided the employee can easily access and print the payslip. Emailing a PDF or providing access through a payroll portal both satisfy the requirement.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long must payroll records be kept in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Under the Fair Work Regulations, employers must retain payroll records — including copies of payslips — for a minimum of seven years. Records must be in English and produced on request to the Fair Work Ombudsman.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the penalty for not issuing payslips in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Failing to issue compliant payslips is a civil remedy provision under the Fair Work Act. Penalties can reach up to $16,500 per contravention for individuals and $82,500 for a company. Repeated or deliberate breaches attract higher penalties.',
      },
    },
  ],
}

const REQUIRED_ITEMS = [
  {
    item: 'Employer name and ABN',
    detail: 'The registered business name and Australian Business Number of the employing entity. If you trade under a business name, use the registered name — not just your trading name.',
    required: 'Always',
  },
  {
    item: 'Employee name',
    detail: 'The full legal name of the employee as recorded in your payroll system.',
    required: 'Always',
  },
  {
    item: 'Date of payment',
    detail: 'The actual date the payment was made to the employee — not the end of the pay period.',
    required: 'Always',
  },
  {
    item: 'Pay period',
    detail: 'The start and end dates of the period being paid. For example: "1 June 2026 – 14 June 2026".',
    required: 'Always',
  },
  {
    item: 'Gross and net amounts',
    detail: 'Gross pay is the total before tax and deductions. Net pay is the amount the employee actually receives. Both must be shown separately.',
    required: 'Always',
  },
  {
    item: 'Ordinary hourly rate',
    detail: 'For employees paid on an hourly basis, the rate per hour must be shown alongside the number of hours worked at that rate.',
    required: 'Hourly employees',
  },
  {
    item: 'Loadings and allowances',
    detail: 'Any casual loading, overtime rates, shift penalties, travel allowances, tool allowances, or other award-based payments must be itemised separately.',
    required: 'When applicable',
  },
  {
    item: 'Deductions',
    detail: 'Every deduction from gross pay — including tax (PAYG withholding), salary sacrifice, union fees, or voluntary deductions — must be listed with the amount and reason.',
    required: 'When applicable',
  },
  {
    item: 'Superannuation',
    detail: 'The amount of super contributed for the period, the name of the super fund, and the employee\'s member number must appear on the payslip.',
    required: 'Always',
  },
  {
    item: 'Overtime rate',
    detail: 'If overtime was worked, the rate per hour and number of overtime hours must be shown separately from ordinary hours.',
    required: 'When applicable',
  },
]

export default function PayslipRequirementsPage() {
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
          Payslip Requirements Australia 2026: What Every Employer Must Include
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Issuing a payslip sounds simple. But the Fair Work Act is specific about what must appear on every one — and the penalties for getting it wrong can reach $82,500 per contravention for a company. This guide covers exactly what your payslips must contain in 2026, including the new requirements that kick in with Payday Super from 1 July.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            Every Australian payslip must include the employer&apos;s name and ABN, the employee&apos;s name, the date of payment, the pay period, gross and net amounts, PAYG tax withheld, and superannuation details. Payslips must be issued <strong>within one working day of payday</strong>.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>The legal basis: Fair Work Act Section 536</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The obligation to issue payslips comes from Section 536 of the Fair Work Act 2009, supported by Regulation 3.46 of the Fair Work Regulations 2009. These provisions apply to all national system employers in Australia — which covers the vast majority of private sector businesses.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The rule is straightforward: employers must give each employee a payslip within one working day of their payday. This applies even if the employee is on leave when the payment is made. There is no exception for small businesses, casual employees, or part-time workers — every employee paid wages or a salary is entitled to a compliant payslip.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The Fair Work Ombudsman has significantly increased compliance activity in 2025 and 2026. In early 2026, UNSW was penalised $213,120 for systemic failures in casual academic payroll records. Payslip failures are not treated as administrative technicalities — they are civil contraventions with real financial consequences.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Complete payslip requirements checklist</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.5rem' }}>
          Here is every item the Fair Work Regulations require on an Australian payslip in 2026:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
          {REQUIRED_ITEMS.map((item) => (
            <div key={item.item} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <h3 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1rem', color: 'var(--char)', margin: 0 }}>{item.item}</h3>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 20,
                  background: item.required === 'Always' ? 'rgba(200,75,47,0.1)' : 'rgba(0,0,0,0.05)',
                  color: item.required === 'Always' ? 'var(--ember)' : 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>{item.required}</span>
              </div>
              <p style={{ color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>{item.detail}</p>
            </div>
          ))}
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>The superannuation section: what changes on 1 July 2026</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Before Payday Super, many employers paid super quarterly — so payslips sometimes showed super as an accrual rather than a payment made. From 1 July 2026, super must be paid on every payday and received by the employee&apos;s fund within 7 business days. This changes how superannuation appears on payslips.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Your payslip should now show the super contribution as a payment made in that pay cycle, not just an amount owing. Include the super fund name, the employee&apos;s member number, and the contribution amount for that pay period. If you use a clearing house, the payslip date should align with when you submitted the payment — not when the fund receives it.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The Australian Payroll Association notes that HR teams should update payslip formats to reflect this change. Employees will now see super as a real-time payment on every payslip rather than a periodic lump sum, and many will expect this visibility as the new normal from July 2026.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Electronic payslips: the rules</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Electronic payslips are fully legal and most employers now issue them exclusively. The Fair Work Act permits electronic delivery provided the employee can easily access and, if needed, print the payslip. Common compliant methods include:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Emailing a PDF directly to the employee&apos;s nominated email address</li>
          <li>Providing access through a payroll portal or HR software (such as SAB Account AI) where the employee can log in and download their payslip</li>
          <li>Sending via an employee self-service mobile app where the payslip can be saved or printed</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          What is not acceptable: sending a payslip in a format the employee cannot easily access (for example, a proprietary file format without a viewer), or expecting an employee to seek out their payslip rather than having it proactively delivered. The employer bears the obligation to deliver — not the employee to retrieve.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Record keeping: the 7-year rule</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Under the Fair Work Regulations, employers must retain payroll records — including payslip copies — for a minimum of seven years from the date they were made. Records must be kept in English, stored in a way that makes them easily retrievable, and made available to the Fair Work Ombudsman on request.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The records you must keep include: employee names, employment start dates, basis of engagement (full-time, part-time, casual), rate of pay, gross and net wages paid, any deductions, leave accruals and balances, super contributions, and hours worked for casual and part-time employees.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          A current employee has the right to request access to their pay records at any time. A former employee retains this right for the entire seven-year retention period. Refusing to produce records, or providing false or misleading records, is itself a contravention of the Fair Work Act — separate from and in addition to any underlying underpayment issue.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Common payslip mistakes and how to avoid them</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>
          The Fair Work Ombudsman&apos;s compliance campaigns consistently find the same errors. Here are the ones most likely to catch small business employers:
        </p>

        {[
          {
            mistake: 'Missing the ABN',
            fix: 'Your ABN must appear on every payslip. If you have not registered for an ABN, or if your ABN has lapsed, fix this before your next pay run.',
          },
          {
            mistake: 'Not showing the pay period',
            fix: 'Many payroll templates show only the payment date. Include both the start and end date of the period being paid — not just when the money was transferred.',
          },
          {
            mistake: 'Lumping all pay into one line',
            fix: 'Ordinary hours, overtime, casual loading, shift penalties, and allowances must each be shown as separate line items. A single figure labelled "wages" is not compliant for an employee on an award.',
          },
          {
            mistake: 'Not showing super contributions',
            fix: 'Even if you pay super quarterly (before 1 July 2026), the accrued super for the pay period must appear on the payslip. After July 2026, show the actual payment made.',
          },
          {
            mistake: 'Issuing payslips late',
            fix: 'Payslips must reach the employee within one working day of payday — not whenever it is convenient. If you run payroll on a Friday, the payslip must be sent by Monday at the latest.',
          },
          {
            mistake: 'Missing the employee\'s name',
            fix: 'Sounds obvious, but templated payslips sometimes omit the employee name field. Each payslip must identify the specific employee being paid.',
          },
        ].map(({ mistake, fix }) => (
          <div key={mistake} style={{ borderLeft: '3px solid var(--ember)', paddingLeft: '1rem', marginBottom: '1.25rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--char)', margin: '0 0 0.35rem', fontSize: '0.95rem' }}>{mistake}</p>
            <p style={{ color: 'var(--text2)', lineHeight: 1.65, margin: 0, fontSize: '0.9rem' }}>{fix}</p>
          </div>
        ))}

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Penalties for non-compliance</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Payslip failures are civil remedy provisions under the Fair Work Act. The maximum penalties as of 2026 are:
        </p>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', overflow: 'hidden', marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--ember-p)' }}>
                {['Contravention', 'Individual', 'Company'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--char)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Failing to issue a payslip', '$16,500', '$82,500'],
                ['Issuing a payslip late', '$16,500', '$82,500'],
                ['Issuing a payslip with missing information', '$16,500', '$82,500'],
                ['Failing to keep records for 7 years', '$16,500', '$82,500'],
                ['Providing false or misleading payslip', '$33,000', '$165,000'],
              ].map(([type, ind, co]) => (
                <tr key={type as string} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text2)' }}>{type}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--char)', fontWeight: 600 }}>{ind}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--ember)', fontWeight: 700 }}>{co}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Each payslip failure is a separate contravention. If you employ ten people and fail to issue compliant payslips for three consecutive months — that is potentially thirty contraventions. The Fair Work Ombudsman does not always pursue maximum penalties, but they have shown willingness to seek significant fines for systematic failures, particularly in industries under compliance scrutiny.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          The safest approach is to use payroll software that generates compliant payslips automatically as part of the pay run — removing the possibility of human error in the payslip generation process.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>What a compliant payslip looks like</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>
          A compliant payslip for a casual part-time employee for a two-week pay period might look like this:
        </p>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.5rem', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--char)', lineHeight: 1.8, marginBottom: '2.5rem' }}>
          <p style={{ margin: '0 0 0.25rem', fontWeight: 700 }}>PAYSLIP</p>
          <p style={{ margin: '0 0 1rem', color: 'var(--text3)' }}>Employer: Sunrise Cleaning Pty Ltd | ABN: 12 345 678 901</p>
          <p style={{ margin: '0 0 0.25rem' }}>Employee: Maria Santos</p>
          <p style={{ margin: '0 0 1rem', color: 'var(--text3)' }}>Pay period: 1 Jun 2026 – 14 Jun 2026 | Payment date: 14 Jun 2026</p>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
            <p style={{ margin: '0 0 0.25rem' }}>Ordinary hours (36 hrs @ $31.19/hr)......$1,122.84</p>
            <p style={{ margin: '0 0 0.25rem' }}>Casual loading (25%).......................$224.57</p>
            <p style={{ margin: '0 0 0.25rem', fontWeight: 700 }}>Gross pay..................................$1,347.41</p>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
            <p style={{ margin: '0 0 0.25rem' }}>PAYG tax withheld..........................-$201.00</p>
            <p style={{ margin: '0 0 0.25rem', fontWeight: 700 }}>Net pay....................................$1,146.41</p>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <p style={{ margin: '0 0 0.25rem' }}>Super contribution (12%)....................$161.69</p>
            <p style={{ margin: 0, color: 'var(--text3)' }}>Fund: Australian Super | Member: 987654321</p>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Generate compliant payslips automatically</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>SAB Account AI creates Fair Work-compliant payslips in seconds — including casual loading, PAYG withholding, and super contributions. From $9/mo.</p>
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
            <Link href="/blog/how-to-pay-super-employees-australia" style={{ color: 'var(--ember)' }}>How to Pay Super to Employees</Link>
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
