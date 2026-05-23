import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PAYG Withholding Calculator Australia: How to Work Out the Right Amount',
  description: 'Get PAYG wrong and your employees face a big tax bill at year end. This guide walks through the ATO tax scales with real worked examples for 2025–26.',
  alternates: { canonical: 'https://sabaccountai.com/blog/payg-withholding-calculator-australia' },
  openGraph: {
    title: 'PAYG Withholding Calculator Australia: How to Work Out the Right Amount',
    description: 'Get PAYG wrong and your employees face a big tax bill at year end. This guide walks through the ATO tax scales with real worked examples.',
    url: 'https://sabaccountai.com/blog/payg-withholding-calculator-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'PAYG Withholding Calculator Australia: How to Work Out the Right Amount',
  description: 'Get PAYG wrong and your employees face a big tax bill at year end. This guide walks through the ATO tax scales with real worked examples for 2025–26.',
  datePublished: '2026-05-12',
  dateModified: '2026-05-12',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/payg-withholding-calculator-australia' },
}

export default function PaygPage() {
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
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#2563eb', background: '#2563eb18', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>PAYG</span>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>12 May 2026 · 8 min read</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          PAYG Withholding Calculator Australia: How to Work Out the Right Amount
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          PAYG withholding is the system where employers deduct income tax from employee wages before paying them. Get it wrong and your employees could face an unexpected tax debt at year end — or you could face ATO penalties for under-withholding. This guide explains exactly how it works with real dollar examples.
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
        <h2>What Is PAYG Withholding?</h2>
        <p>
          PAYG stands for <strong>Pay As You Go</strong>. The withholding part means you (the employer) collect the employee&#39;s income tax and send it directly to the ATO each quarter (or monthly if you withhold more than $25,000 per year). The employee then receives their wages <em>after</em> tax has been removed.
        </p>
        <p>
          This system exists so that employees don&#39;t get a massive tax bill on 31 October each year. Instead, tax is collected gradually throughout the year. Think of it as pre-paying the employee&#39;s tax bill on their behalf.
        </p>

        <h2>Which Tax Scale Applies?</h2>
        <p>The ATO uses different withholding scales depending on the employee&#39;s situation. The most common are:</p>
        <table>
          <thead>
            <tr><th>Scale</th><th>Who It Applies To</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Scale 1</strong></td><td>Australian residents who claim the tax-free threshold</td></tr>
            <tr><td><strong>Scale 2</strong></td><td>Australian residents who do NOT claim the tax-free threshold (e.g. second job)</td></tr>
            <tr><td><strong>Scale 3</strong></td><td>Foreign residents (no tax-free threshold, different rates)</td></tr>
            <tr><td><strong>Scale 15</strong></td><td>Working Holiday Makers (WHM) on subclass 417 or 462 visas</td></tr>
          </tbody>
        </table>
        <p>
          The employee tells you which scale applies by completing a <strong>Tax File Number (TFN) Declaration form</strong> (NAT 3092) when they start work. If they don&#39;t provide a TFN, you must withhold at 47% (the top rate).
        </p>

        <h2>Worked Example: Scale 1 (Resident, Claiming Threshold)</h2>
        <p>
          Let&#39;s say you pay an employee <strong>$1,500 gross per week</strong>. They are an Australian resident and have claimed the tax-free threshold.
        </p>
        <p>The ATO&#39;s Scale 1 weekly withholding table (2025–26) gives you the withholding amount based on weekly earnings. The process:</p>
        <ol>
          <li>Annual equivalent salary = $1,500 × 52 = <strong>$78,000</strong></li>
          <li>Apply the 2025–26 income tax rates to $78,000:
            <ul>
              <li>$0 – $18,200: $0 (tax-free threshold)</li>
              <li>$18,201 – $45,000: 19% on $26,800 = $5,092</li>
              <li>$45,001 – $78,000: 32.5% on $33,000 = $10,725</li>
              <li>Total income tax: $15,817</li>
            </ul>
          </li>
          <li>Subtract the Low Income Tax Offset (LITO): for $78,000, no LITO applies (phased out above $66,667)</li>
          <li>Add Medicare levy (2%): $78,000 × 2% = $1,560</li>
          <li>Total annual withholding: $15,817 + $1,560 = <strong>$17,377</strong></li>
          <li>Weekly withholding: $17,377 ÷ 52 = <strong>$334 per week</strong></li>
        </ol>

        <div className="callout">
          <strong>Practical tip:</strong> Rather than doing this maths manually each time, use the ATO&#39;s official Tax Withheld Calculator at ato.gov.au, or use payslip software that handles it automatically. SAB Account AI calculates PAYG withholding per payslip based on the employee&#39;s annual salary and tax scale.
        </div>

        <h2>Worked Example: Scale 2 (Resident, No Threshold — Second Job)</h2>
        <p>
          If your employee has told you this is their second job, they do not claim the tax-free threshold. The same $1,500 weekly gross becomes:
        </p>
        <ol>
          <li>Annual equivalent: $78,000</li>
          <li>Tax at Scale 2 (no threshold): 19% applies from $0, so the full $18,200 that was tax-free under Scale 1 now attracts 19%</li>
          <li>Extra tax: $18,200 × 19% = $3,458 more than Scale 1</li>
          <li>Approximate weekly withholding: <strong>$401 per week</strong> (vs $334 on Scale 1)</li>
        </ol>
        <p>
          This is why employees with multiple jobs pay more tax during the year — the second employer withholds as if there is no tax-free threshold.
        </p>

        <h2>Working Holiday Maker (Scale 15)</h2>
        <p>
          Working Holiday Makers on subclass 417 or 462 visas have their own flat rate withholding:
        </p>
        <table>
          <thead>
            <tr><th>Annual Income Bracket</th><th>WHM Tax Rate</th></tr>
          </thead>
          <tbody>
            <tr><td>$0 – $45,000</td><td>15%</td></tr>
            <tr><td>$45,001 – $120,000</td><td>32.5%</td></tr>
            <tr><td>$120,001 – $180,000</td><td>37%</td></tr>
            <tr><td>Over $180,000</td><td>45%</td></tr>
          </tbody>
        </table>
        <p>
          WHMs do not get the tax-free threshold or LITO. If you employ WHMs and are registered as a <strong>working holiday maker employer</strong> with the ATO, you apply these rates. If you are not registered, you must withhold at 32.5% from the first dollar.
        </p>

        <h2>The Low Income Tax Offset (LITO)</h2>
        <p>
          LITO reduces the tax owed by lower-income earners. For 2025–26:
        </p>
        <ul>
          <li>Full offset: <strong>$700</strong> for incomes up to $37,500</li>
          <li>Phases out: reduces by 5 cents per dollar from $37,500 to $45,000, then by 1.5 cents per dollar to $66,667</li>
          <li>Nil offset: above $66,667</li>
        </ul>
        <p>
          This offset is built into the ATO&#39;s withholding tables, so you don&#39;t calculate it separately — the table accounts for it automatically.
        </p>

        <h2>Medicare Levy</h2>
        <p>
          The Medicare levy is 2% of taxable income for most Australian residents. It is added on top of income tax. The withholding tables include it, so again — no separate calculation needed if you use the official tables.
        </p>
        <p>
          Employees who are exempt (e.g. temporary visa holders) can claim a Medicare levy exemption by lodging a <strong>Medicare levy variation declaration</strong> with you.
        </p>

        <h2>How Often Do You Pay PAYG Withholding to the ATO?</h2>
        <ul>
          <li><strong>Monthly</strong> — if you withhold $25,000 or more per year</li>
          <li><strong>Quarterly</strong> — if you withhold less than $25,000 per year (most small businesses)</li>
          <li><strong>Annually</strong> — if you withhold $3,000 or less per year</li>
        </ul>
        <p>
          You report and pay via your <strong>Business Activity Statement (BAS)</strong>. Due dates are typically 28 days after the end of each quarter.
        </p>

        <h2>What Happens If You Under-Withhold?</h2>
        <p>
          If you withhold less than required, the ATO can hold you liable for the shortfall — not the employee. You may face penalties and general interest charges. The employee still gets a tax bill at year end and might not be able to pay it, which reflects badly on your payroll process.
        </p>
        <p>
          It is always safer to match the ATO tables exactly rather than rounding down.
        </p>

        <h2>Generate ATO-Compliant Payslips Instantly</h2>
        <p>
          SAB Account AI calculates PAYG withholding automatically for each pay run. Enter the employee&#39;s gross salary, select their tax scale, and the app applies the correct ATO rates including LITO and Medicare levy. The resulting payslip shows gross pay, PAYG withheld, super, and net take-home — ready to send to your employee.
        </p>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--ember-p)', borderRadius: 'var(--r)', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>Stop calculating PAYG manually</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>SAB Account AI handles Scale 1, Scale 2, and WHM (Scale 15) withholding automatically.</p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 'var(--r)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Start free — generate your first payslip
          </Link>
        </div>
      </div>
    </div>
  )
}
