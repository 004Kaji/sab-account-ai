import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Work From Home Tax Deductions Australia 2026: The 67 Cents Method Explained',
  description: 'The ATO\'s revised fixed rate is 67 cents per hour worked from home. Here is exactly what it covers, what records you need, and when the actual cost method is better.',
  alternates: { canonical: 'https://sabaccountai.com/blog/work-from-home-tax-deductions-australia-2026' },
  openGraph: {
    title: 'Work From Home Tax Deductions Australia 2026: The 67 Cents Method Explained',
    description: 'ATO 67 cents per hour WFH method: what it covers, what records you need, and when to use the actual cost method instead.',
    url: 'https://sabaccountai.com/blog/work-from-home-tax-deductions-australia-2026',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Work From Home Tax Deductions Australia 2026: The 67 Cents Method Explained',
  description: 'Complete guide to the ATO 67 cents per hour method and actual cost method for work from home deductions in Australia for 2026.',
  datePublished: '2026-06-11',
  dateModified: '2026-06-11',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/work-from-home-tax-deductions-australia-2026' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the ATO work from home rate for 2025-26?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The ATO\'s revised fixed rate method allows you to claim 67 cents per hour for every hour worked from home during the 2025-26 financial year. This covers electricity, gas, internet, phone, and stationery costs.',
      },
    },
    {
      '@type': 'Question',
      name: 'What records do I need to claim work from home deductions?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For the 67 cents method, you need a continuous record of the actual hours worked from home for the entire income year — a timesheet, roster, diary, or similar. You also need at least one bill for each expense the rate covers (electricity, internet, etc.) to show you actually incurred those costs.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I claim depreciation on my laptop under the 67 cents method?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The 67 cents method does not cover the decline in value (depreciation) of assets like laptops, monitors, or office chairs. You can claim these separately using the ATO\'s depreciation methods — either the prime cost or diminishing value method.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can sole traders claim work from home deductions?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, but with extra care. Sole traders who use part of their home as a dedicated business space may claim home office running costs and potentially occupancy costs (rent or mortgage interest). However, using your home for business can affect your main residence CGT exemption — consult an accountant before claiming occupancy expenses.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I claim both the 67 cents method and the actual cost method?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. You must choose one method for the income year. You cannot combine them — for example, using the fixed rate for electricity but actual cost for internet. You should calculate your deduction under both methods to see which gives the larger result.',
      },
    },
  ],
}

export default function WorkFromHomeTaxPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{ color: 'var(--ember)', fontSize: '0.875rem', textDecoration: 'none' }}>← Blog</Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tax</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--char)', lineHeight: 1.2, marginBottom: '1rem' }}>
          Work From Home Tax Deductions Australia 2026: The 67 Cents Method Explained
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Working from home is now a standard part of Australian professional life. The ATO has adapted its rules to reflect this — replacing the old $0.52 rate with a revised 67 cents per hour fixed rate method from 2022-23 onwards. For the 2025-26 income year, this rate remains 67 cents, but the record-keeping requirements changed and many Australians are still claiming incorrectly or leaving money on the table by choosing the wrong method.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            Claim <strong>67 cents per hour</strong> for every hour worked from home in 2025-26. You must keep an actual record of hours — not an estimate. The rate covers electricity, gas, internet, phone, and stationery. Depreciation on equipment, and occupancy costs, are claimed separately.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>The two methods: fixed rate vs actual cost</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The ATO offers two methods for calculating work from home deductions. You must choose one per income year and apply it consistently — you cannot mix and match across different expenses.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', border: '2px solid var(--ember)', borderRadius: 'var(--r2)', padding: '1.25rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Fixed Rate Method</p>
            <p style={{ fontWeight: 700, color: 'var(--char)', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>67¢/hour</p>
            <p style={{ color: 'var(--text2)', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 0.75rem' }}>Covers electricity, gas, internet, phone, stationery, computer consumables</p>
            <p style={{ color: 'var(--text3)', fontSize: '0.8rem', margin: 0 }}>Best for: people with lower actual costs, or those who want simplicity</p>
          </div>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.25rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--char)', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Actual Cost Method</p>
            <p style={{ fontWeight: 700, color: 'var(--char)', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Actual $</p>
            <p style={{ color: 'var(--text2)', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 0.75rem' }}>Calculate real costs with a work-use percentage for each expense category</p>
            <p style={{ color: 'var(--text3)', fontSize: '0.8rem', margin: 0 }}>Best for: people with high home running costs, dedicated home offices</p>
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Fixed rate method: exactly what the 67 cents covers</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>
          The 67 cents per hour rate covers all of the following expenses. You cannot claim these separately if you use the fixed rate method:
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', overflow: 'hidden', marginBottom: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--ember-p)' }}>
                {['Expense', 'Included in 67¢?', 'Claim separately?'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--char)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Electricity and gas (heating/cooling/lighting)', '✓ Yes', 'No'],
                ['Internet access costs (work portion)', '✓ Yes', 'No'],
                ['Mobile and home phone (work portion)', '✓ Yes', 'No'],
                ['Stationery and office supplies', '✓ Yes', 'No'],
                ['Computer consumables (ink cartridges, paper)', '✓ Yes', 'No'],
                ['Decline in value of assets (laptop, monitor, desk)', '✗ No', 'Yes — separately'],
                ['Occupancy costs (rent, mortgage interest)', '✗ No', 'Yes — if dedicated space (sole traders, with CGT implications)'],
                ['Cleaning a dedicated work area', '✗ No', 'Yes — actual cost method only'],
              ].map(([exp, inc, sep]) => (
                <tr key={exp as string} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text2)' }}>{exp}</td>
                  <td style={{ padding: '0.65rem 1rem', color: inc === '✓ Yes' ? 'green' : 'var(--ember)', fontWeight: 600 }}>{inc}</td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text3)', fontSize: '0.85rem' }}>{sep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>How to calculate your deduction with the fixed rate method</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>
          The formula is straightforward:
        </p>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.5rem', marginBottom: '1.5rem', fontFamily: 'monospace', fontSize: '0.95rem', color: 'var(--char)' }}>
          <p style={{ margin: '0 0 0.5rem' }}>Total WFH hours × $0.67 = deduction</p>
          <p style={{ margin: 0, color: 'var(--text3)', fontSize: '0.85rem' }}>Example: 1,200 hours × $0.67 = <strong style={{ color: 'var(--ember)' }}>$804 deduction</strong></p>
        </div>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          For context: if you work 40 hours per week and spend 2 days at home, that is 16 WFH hours per week. Over a full year of 48 working weeks, that is 768 hours at $0.67 = $514 deduction. If you work entirely from home, 40 hours per week for 48 weeks = 1,920 hours = $1,286 deduction — just from the fixed rate alone, before any equipment depreciation.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Record keeping: what the ATO actually requires</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The biggest change from the old WFH rules is that from 2022-23 onwards, the ATO requires a contemporaneous record of your actual WFH hours for the full income year. A four-week representative diary is no longer acceptable for the fixed rate method.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          What counts as a compliant record:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>A timekeeping log in your calendar (Google Calendar, Outlook, Apple Calendar) showing days and hours worked from home</li>
          <li>A timesheet or roster from your employer that distinguishes WFH days from office days</li>
          <li>A diary or spreadsheet with daily entries</li>
          <li>Payroll records that specify WFH days (where your employer tracks this for flexible work arrangements)</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          You also need at least one document evidencing that you actually incurred each expense type — a single electricity bill, a phone bill, and an internet bill for the year is sufficient. You do not need every bill for every month, but you need to be able to show you paid for these things.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The ATO recommends starting your record now if you have not already. Records must be kept for five years after you lodge the tax return they relate to.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Claiming equipment depreciation separately</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Even if you use the 67 cents fixed rate method, you can still claim the decline in value (depreciation) of your work equipment. This is one of the most underutilised deductions for remote workers.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>
          Eligible items include: laptop, external monitor, keyboard, mouse, webcam, headset, office chair, desk, desk lamp, and any other equipment used primarily for work. The deduction is based on the work-use percentage of the item.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--char)', margin: '0 0 1rem', fontFamily: 'var(--font-fraunces)' }}>Depreciation example: laptop used 80% for work</p>
          {[
            { label: 'Purchase price', value: '$2,400' },
            { label: 'Work-use percentage', value: '80%' },
            { label: 'Effective life (ATO table for laptops)', value: '3 years' },
            { label: 'Diminishing value rate (200%/3)', value: '66.67%' },
            { label: 'Year 1 deduction ($2,400 × 80% × 66.67%)', value: '$1,280' },
            { label: 'Year 2 deduction (on reduced value)', value: '$427' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '0.4rem 0', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text2)' }}>{row.label}</span>
              <span style={{ color: 'var(--char)', fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', margin: '0.75rem 0 0' }}>Illustrative only. Verify effective life in the ATO&apos;s Tax Ruling TR 2024/1.</p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>When is the actual cost method better?</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The actual cost method requires more record keeping but can produce a larger deduction if your home running costs are high. You will generally get a better result from the actual cost method if:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>You live in a large home with high electricity bills and you work in a dedicated home office</li>
          <li>You pay for a high-speed internet plan primarily for work purposes</li>
          <li>You work from home full time or close to it</li>
          <li>You have recently set up a home office with significant purchases (furniture, monitors, standing desk)</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The actual cost method requires you to calculate the work-use percentage of each expense, keep receipts for all expenses, and apply an area-based formula for shared expenses like electricity. For example: if your home office occupies 10% of the floor area of your house, you can claim 10% of your total electricity costs as the home office&apos;s share, then apply a further percentage for the proportion of the day the room is used for work versus personal use.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Special rules for sole traders</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Sole traders running their business from home face a more complex calculation than employees. You can claim home office running costs using either method above, but there is also the question of occupancy costs.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          If you have a dedicated area of your home that is set aside exclusively for business use — not a desk in the lounge room, but a room or defined space used solely for business — you may be able to claim a proportion of rent, mortgage interest, council rates, and home insurance. This is calculated based on the floor area of the dedicated space relative to the total home.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The important warning: claiming occupancy costs may mean the portion of your home used for business is no longer fully exempt from capital gains tax when you sell. The main residence CGT exemption may be partially reduced. For most sole traders, the CGT risk outweighs the occupancy deduction benefit — particularly if you own your home and it has increased significantly in value. Get specific advice before claiming occupancy costs.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Track income and expenses automatically</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>SAB Account AI helps Australian sole traders track deductible business expenses throughout the year — so you are not scrambling at tax time. From $9/mo.</p>
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
            <Link href="/blog/sole-trader-tax-deductions-australia" style={{ color: 'var(--ember)' }}>Sole Trader Tax Deductions Australia</Link>
            {' · '}
            <Link href="/blog/eofy-checklist-sole-trader-2026" style={{ color: 'var(--ember)' }}>EOFY Checklist for Sole Traders</Link>
            {' · '}
            <Link href="/blog/how-much-tax-sole-trader-australia" style={{ color: 'var(--ember)' }}>How Much Tax Does a Sole Trader Pay?</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
