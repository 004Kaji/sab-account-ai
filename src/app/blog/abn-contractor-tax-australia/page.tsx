import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ABN Contractor Tax Australia: How to Handle Tax When You\'re Self-Employed',
  description: 'As an ABN contractor you\'re responsible for your own tax. Learn how to set aside the right amount, lodge your BAS, manage GST, and avoid ATO surprises at year end.',
  alternates: { canonical: 'https://sabaccountai.com.au/blog/abn-contractor-tax-australia' },
  openGraph: {
    title: 'ABN Contractor Tax Australia: How to Handle Tax When You\'re Self-Employed',
    description: 'As an ABN contractor you\'re responsible for your own tax. Learn how to set aside the right amount and avoid ATO surprises.',
    url: 'https://sabaccountai.com.au/blog/abn-contractor-tax-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'ABN Contractor Tax Australia: How to Handle Tax When You\'re Self-Employed',
  description: 'As an ABN contractor you\'re responsible for your own tax. Learn how to set aside the right amount, lodge your BAS, and avoid ATO surprises.',
  datePublished: '2026-04-28',
  dateModified: '2026-04-28',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com.au' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com.au' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com.au/blog/abn-contractor-tax-australia' },
}

export default function AbnContractorPage() {
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
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#dc2626', background: '#dc262618', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>ABN</span>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>28 Apr 2026 · 7 min read</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          ABN Contractor Tax Australia: How to Handle Tax When You&apos;re Self-Employed
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          When you work as an ABN contractor or sole trader, nobody withholds tax from your payments. You receive the full invoice amount, which feels great — until July when you owe the ATO thousands of dollars and you have already spent it. This guide shows you how to manage your tax obligations so you are never caught out.
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
        <h2>What Tax Do ABN Contractors Pay?</h2>
        <p>As a sole trader operating under an ABN, your business income is treated as personal income. You pay:</p>
        <ul>
          <li><strong>Income tax</strong> — at the standard Australian resident marginal rates (same as employees)</li>
          <li><strong>Medicare levy</strong> — 2% (if eligible; some visa holders are exempt)</li>
          <li><strong>GST</strong> — 10% on top of your prices, collected and remitted to the ATO quarterly (only if your GST turnover is $75,000 or more)</li>
        </ul>
        <p>
          Unlike employees, no one pre-pays this tax for you. You collect it, hold it, and pay it to the ATO via your Business Activity Statement (BAS) and your individual tax return.
        </p>

        <h2>Do You Need to Register for GST?</h2>
        <p>
          You must register for GST if your annual gross income (from all business activities) is <strong>$75,000 or more</strong>. This is not your profit — it is your total revenue before expenses.
        </p>
        <p>
          For ride-share and taxi drivers, the threshold is $0 — you must register from the first dollar.
        </p>
        <p>
          Once registered, you charge GST on every invoice (10% on top of your prices), collect it from clients, and pay the net amount to the ATO after deducting GST credits you paid on business expenses.
        </p>

        <div className="callout">
          <strong>Optional registration:</strong> You can register for GST voluntarily even below $75,000. This lets you claim back the GST on your business expenses. Whether it is worth it depends on how much GST you pay on inputs — often worth it for trades who buy materials.
        </div>

        <h2>How Much Tax Should You Set Aside?</h2>
        <p>
          The most important habit as a contractor is setting aside tax on every payment you receive. A practical rule:
        </p>
        <table>
          <thead>
            <tr><th>Annual Contractor Income</th><th>Suggested Tax Reserve</th></tr>
          </thead>
          <tbody>
            <tr><td>Under $45,000</td><td>20–25% of gross income</td></tr>
            <tr><td>$45,001 – $90,000</td><td>30–35% of gross income</td></tr>
            <tr><td>$90,001 – $120,000</td><td>35–38% of gross income</td></tr>
            <tr><td>Over $120,000</td><td>40–45% of gross income</td></tr>
          </tbody>
        </table>
        <p>
          These percentages cover income tax plus Medicare levy. If you are also registered for GST, the GST component of each invoice is not your income — it belongs to the ATO — so keep it in a separate account and do not touch it.
        </p>

        <h3>Worked Example: $120,000 Contractor Income</h3>
        <p>Suppose you earn <strong>$120,000 in the 2025–26 financial year</strong> as a sole trader (GST-exclusive):</p>
        <ol>
          <li>Income tax on $120,000 (Scale 1, after tax-free threshold):
            <ul>
              <li>$0 – $18,200: $0</li>
              <li>$18,201 – $45,000: 19% = $5,092</li>
              <li>$45,001 – $120,000: 32.5% = $24,375</li>
              <li>Total income tax: <strong>$29,467</strong></li>
            </ul>
          </li>
          <li>Medicare levy: $120,000 × 2% = <strong>$2,400</strong></li>
          <li>Total tax payable: $29,467 + $2,400 = <strong>$31,867</strong> (~26.5% of income)</li>
        </ol>
        <p>
          On $120,000 gross, setting aside 30% ($36,000) would cover your tax with a small buffer for any surprises.
        </p>

        <h2>What Is PAYG Instalments?</h2>
        <p>
          Once your tax assessment shows you owe more than $1,000 in income tax, the ATO will enrol you in the <strong>PAYG instalments system</strong>. Instead of owing a lump sum at year end, you pay instalments quarterly — like an employer withholds from employees, but you do it yourself.
        </p>
        <p>
          The ATO sets your instalment rate or amount based on your previous year&#39;s income. You can vary the amount if your income has changed significantly. Instalments are reported on your BAS.
        </p>

        <h2>The Business Activity Statement (BAS)</h2>
        <p>
          The BAS is the form where you report and pay your GST and PAYG instalments to the ATO. Most contractors lodge quarterly:
        </p>
        <table>
          <thead>
            <tr><th>Quarter</th><th>Period</th><th>BAS Due</th></tr>
          </thead>
          <tbody>
            <tr><td>Q1</td><td>Jul – Sep</td><td>28 October</td></tr>
            <tr><td>Q2</td><td>Oct – Dec</td><td>28 February</td></tr>
            <tr><td>Q3</td><td>Jan – Mar</td><td>28 April</td></tr>
            <tr><td>Q4</td><td>Apr – Jun</td><td>28 July</td></tr>
          </tbody>
        </table>
        <p>
          On each BAS you report: total GST collected (from your sales), total GST credits (from business purchases), PAYG instalment amount, and any other tax obligations.
        </p>

        <h2>What Business Expenses Can You Deduct?</h2>
        <p>
          As a sole trader you can deduct expenses that are directly related to earning your income. Common deductions include:
        </p>
        <ul>
          <li>Tools and equipment (depreciable over time or instant asset write-off if under the threshold)</li>
          <li>Vehicle expenses (cents per kilometre method or logbook method)</li>
          <li>Mobile phone and internet (the work-related percentage)</li>
          <li>Home office expenses (if you work from home)</li>
          <li>Professional software subscriptions</li>
          <li>Accounting fees</li>
          <li>Work-related training and courses</li>
          <li>Public liability and professional indemnity insurance</li>
        </ul>

        <div className="callout">
          <strong>Keep your receipts.</strong> You can claim deductions without receipts for amounts under $300, or for amounts over $300 if you have a written record (like a bank statement). For everything else, keep physical or digital receipts for 5 years.
        </div>

        <h2>Superannuation as a Sole Trader</h2>
        <p>
          As a sole trader, nobody pays super for you. However, you can make <strong>voluntary super contributions</strong> and claim a tax deduction for them (subject to the concessional contributions cap of $30,000 per year in 2025–26). This reduces your taxable income dollar-for-dollar.
        </p>
        <p>
          For example: if your taxable income is $90,000 and you contribute $10,000 to super:
        </p>
        <ul>
          <li>Taxable income reduces to $80,000</li>
          <li>Tax saving at 32.5% marginal rate: approximately $3,250</li>
          <li>The $10,000 is taxed at 15% inside super: $1,500</li>
          <li>Net benefit: $1,750 in your pocket, plus the $10,000 is invested for retirement</li>
        </ul>

        <h2>The ABN Withholding Rule (No TFN)</h2>
        <p>
          If you provide services under an ABN but do not quote your ABN on an invoice, the paying business is required to withhold <strong>47%</strong> of the payment under the no-ABN withholding rules. Always include your ABN on every invoice to avoid this.
        </p>
        <p>
          Similarly, if you quote an ABN but the payer has set up under the Pay As You Go withholding system for contractors — typically for certain payment types — they may still withhold at your nominated rate if you complete a voluntary agreement.
        </p>

        <h2>Keeping Good Records</h2>
        <p>
          Good records make tax time painless and protect you in an audit. You need to keep:
        </p>
        <ul>
          <li>All tax invoices you issue (5 years)</li>
          <li>All invoices and receipts for business expenses (5 years)</li>
          <li>Bank statements showing business income and expenses</li>
          <li>Any contracts with clients</li>
          <li>A logbook if you claim vehicle expenses</li>
        </ul>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--ember-p)', borderRadius: 'var(--r)', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>Keep all your contractor records in one place</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>SAB Account AI generates ATO-compliant tax invoices, tracks income and expenses, and stores everything for 5 years — no filing cabinet needed.</p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 'var(--r)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Start free — no credit card required
          </Link>
        </div>
      </div>
    </div>
  )
}
