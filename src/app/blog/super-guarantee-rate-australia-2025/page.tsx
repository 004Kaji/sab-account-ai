import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Super Guarantee Rate Australia 2025–26: What Employers Must Pay',
  description: 'The Super Guarantee rate rose to 12% on 1 July 2025. This guide explains who must pay it, how to calculate it correctly, and the schedule for future increases.',
  alternates: { canonical: 'https://sabaccountai.com.au/blog/super-guarantee-rate-australia-2025' },
  openGraph: {
    title: 'Super Guarantee Rate Australia 2025–26: What Employers Must Pay',
    description: 'The Super Guarantee rate rose to 12% on 1 July 2025. Learn who must pay, how to calculate it, and the full schedule.',
    url: 'https://sabaccountai.com.au/blog/super-guarantee-rate-australia-2025',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Super Guarantee Rate Australia 2025–26: What Employers Must Pay',
  description: 'The Super Guarantee rate rose to 12% on 1 July 2025. This guide explains who must pay it and how to calculate it.',
  datePublished: '2026-05-02',
  dateModified: '2026-05-02',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com.au' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com.au' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com.au/blog/super-guarantee-rate-australia-2025' },
}

export default function SuperPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />

      <header style={{ background: 'var(--char)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 1.5rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ember)" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem' }}>SAB Account AI</span>
        </Link>
        <Link href="/blog" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.875rem' }}>← All guides</Link>
      </header>

      <main style={{ maxWidth: '740px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#7c3aed', background: '#7c3aed18', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Super</span>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>2 May 2026 · 5 min read</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          Super Guarantee Rate Australia 2025–26: What Employers Must Pay
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          The Superannuation Guarantee (SG) rate increased to <strong>12%</strong> on 1 July 2025 — the final step in a legislated schedule of annual increases that started at 9.5% in 2014. If you have employees, you must now pay 12 cents of super for every dollar of ordinary time earnings. Here is what that means in practice.
        </p>

        <Article />
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text3)' }}>
        © {new Date().getFullYear()} SAB Account AI ·{' '}
        <Link href="/terms" style={{ color: 'var(--text3)' }}>Terms</Link> ·{' '}
        <Link href="/privacy" style={{ color: 'var(--text3)' }}>Privacy</Link>
      </footer>
    </div>
  )
}

function Article() {
  return (
    <div style={{ fontSize: '0.9375rem', color: 'var(--text2)', lineHeight: 1.8 }}>
      <style>{`
        .blog-content h2 { font-size: 1.25rem; font-weight: 700; color: var(--char); margin: 2rem 0 0.75rem; letter-spacing: -0.01em; }
        .blog-content h3 { font-size: 1.0625rem; font-weight: 600; color: var(--char); margin: 1.5rem 0 0.5rem; }
        .blog-content p { margin-bottom: 1rem; }
        .blog-content ul, .blog-content ol { padding-left: 1.5rem; margin-bottom: 1rem; }
        .blog-content li { margin-bottom: 0.375rem; }
        .blog-content strong { color: var(--char); font-weight: 600; }
        .blog-content .callout { background: var(--ember-p); border-left: 3px solid var(--ember); padding: 1rem 1.25rem; border-radius: 0 var(--r) var(--r) 0; margin: 1.5rem 0; }
        .blog-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.875rem; }
        .blog-content th { background: var(--char); color: #fff; padding: 0.625rem 0.875rem; text-align: left; font-weight: 600; }
        .blog-content td { padding: 0.625rem 0.875rem; border-bottom: 1px solid var(--border); }
        .blog-content tr:nth-child(even) td { background: #f9f9f7; }
      `}</style>

      <div className="blog-content">
        <h2>The Super Guarantee Schedule</h2>
        <p>
          The SG rate has been climbing each financial year. Here is the full schedule:
        </p>
        <table>
          <thead>
            <tr><th>Financial Year</th><th>SG Rate</th></tr>
          </thead>
          <tbody>
            <tr><td>2021–22</td><td>10.0%</td></tr>
            <tr><td>2022–23</td><td>10.5%</td></tr>
            <tr><td>2023–24</td><td>11.0%</td></tr>
            <tr><td>2024–25</td><td>11.5%</td></tr>
            <tr><td><strong>2025–26 (current)</strong></td><td><strong>12.0%</strong></td></tr>
          </tbody>
        </table>
        <p>
          12% is the final rate legislated under the <em>Superannuation Guarantee (Administration) Act 1992</em>. There are no further scheduled increases after 2025–26 under current law.
        </p>

        <h2>Who Must Receive Super?</h2>
        <p>You must pay super for an employee if they:</p>
        <ul>
          <li>Are 18 years or older, <strong>regardless of hours worked or earnings</strong> (the old $450/month threshold was removed from 1 July 2022)</li>
          <li>Are under 18 and work more than 30 hours per week</li>
          <li>Are a contractor paid mainly for their labour (even if they quote an ABN)</li>
          <li>Are a casual or part-time employee</li>
        </ul>

        <div className="callout">
          <strong>Contractor super trap:</strong> If you pay a contractor mainly for their labour — rather than for a result — the ATO may deem them an employee for super purposes. This means you owe super even if you have a contract that calls them a contractor. When in doubt, get advice or use the ATO&#39;s employee vs contractor decision tool.
        </div>

        <h2>How to Calculate Super Correctly</h2>
        <p>
          Super is calculated on <strong>Ordinary Time Earnings (OTE)</strong> — your employee&#39;s regular pay for their normal hours, before tax. OTE includes:
        </p>
        <ul>
          <li>Base salary or hourly wages</li>
          <li>Commissions</li>
          <li>Allowances (such as car or tool allowances)</li>
          <li>Shift loading</li>
        </ul>
        <p>OTE does <strong>not</strong> include:</p>
        <ul>
          <li>Overtime (hours above the employee&#39;s ordinary hours)</li>
          <li>Reimbursements</li>
          <li>Parental leave payments</li>
          <li>Workers compensation payments</li>
        </ul>

        <h3>Worked Example</h3>
        <p>An employee earns <strong>$5,000 gross per month</strong> in base salary (no overtime). Super calculation:</p>
        <ul>
          <li>Monthly OTE: $5,000</li>
          <li>Super at 12%: $5,000 × 12% = <strong>$600 per month</strong></li>
          <li>Annual super contribution: $600 × 12 = <strong>$7,200 per year</strong></li>
        </ul>
        <p>
          Super is paid <em>on top of</em> the employee&#39;s gross wages (not out of their wage). So the total cost to you as the employer is $5,000 + $600 = $5,600 per month per employee.
        </p>

        <h2>The Maximum Super Contribution Base</h2>
        <p>
          You are not required to pay SG on earnings above the <strong>Maximum Super Contribution Base (MSCB)</strong>. For 2025–26, the MSCB is <strong>$65,070 per quarter</strong> ($260,280 per year).
        </p>
        <p>
          For a very high earner above this threshold, you cap your super obligation at: $65,070 × 12% = $7,808.40 per quarter.
        </p>

        <h2>When Must Super Be Paid?</h2>
        <p>
          Super must be paid at least <strong>quarterly</strong>, by the 28th day after the end of each quarter:
        </p>
        <table>
          <thead>
            <tr><th>Quarter</th><th>Covers</th><th>Due Date</th></tr>
          </thead>
          <tbody>
            <tr><td>Q1</td><td>1 July – 30 September</td><td>28 October</td></tr>
            <tr><td>Q2</td><td>1 October – 31 December</td><td>28 January</td></tr>
            <tr><td>Q3</td><td>1 January – 31 March</td><td>28 April</td></tr>
            <tr><td>Q4</td><td>1 April – 30 June</td><td>28 July</td></tr>
          </tbody>
        </table>
        <p>
          You can pay more frequently (monthly or weekly) if you choose, but you must meet the quarterly deadline at minimum.
        </p>

        <h2>What Happens If You Miss a Super Payment?</h2>
        <p>
          Missing a quarterly super deadline triggers the <strong>Super Guarantee Charge (SGC)</strong>. The SGC is not just the unpaid super — it includes:
        </p>
        <ul>
          <li>The shortfall amount (on gross earnings, not just OTE)</li>
          <li>Interest at 10% per annum</li>
          <li>An administration fee of $20 per employee per quarter</li>
        </ul>
        <p>
          Worse, the SGC is <strong>not tax deductible</strong>, unlike regular super contributions. This makes late payment significantly more expensive than paying on time. If you realise you have a shortfall, the ATO has a Super Guarantee Amnesty process — speak to an accountant.
        </p>

        <h2>Choosing a Super Fund</h2>
        <p>
          Since November 2021, employees can choose their own superannuation fund. If a new employee does not choose a fund, you must pay into their <strong>stapled super fund</strong> — the fund already associated with their TFN from a previous employer. To find a stapled fund, use the ATO&#39;s online service through your myGov business account.
        </p>
        <p>
          If the employee has no stapled fund and does not choose one, you may pay into your default fund.
        </p>

        <h2>Super on Payslips: What to Show</h2>
        <p>
          Every payslip must show the super amount paid or accrued for that pay period. Under the Fair Work Act, a payslip must include:
        </p>
        <ul>
          <li>The super fund name</li>
          <li>The employer&#39;s fund membership number (if applicable)</li>
          <li>The super amount paid or payable for the period</li>
        </ul>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--ember-p)', borderRadius: 'var(--r)', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>Super calculated automatically on every payslip</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>SAB Account AI applies the correct 12% SG rate and shows the super amount clearly on each payslip — ready to send to your employee.</p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 'var(--r)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Start free — generate your first payslip
          </Link>
        </div>
      </div>
    </div>
  )
}
