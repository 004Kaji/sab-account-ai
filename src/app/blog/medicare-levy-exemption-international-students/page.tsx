import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Medicare Levy Exemption for International Students in Australia',
  description: 'Most temporary visa holders are exempt from the 2% Medicare levy — but only if you apply correctly. Learn who qualifies, how to apply, and what to put on your tax return.',
  alternates: { canonical: 'https://sabaccountai.com.au/blog/medicare-levy-exemption-international-students' },
  openGraph: {
    title: 'Medicare Levy Exemption for International Students in Australia',
    description: 'Most temporary visa holders are exempt from the 2% Medicare levy — but only if you apply correctly.',
    url: 'https://sabaccountai.com.au/blog/medicare-levy-exemption-international-students',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Medicare Levy Exemption for International Students in Australia',
  description: 'Most temporary visa holders are exempt from the 2% Medicare levy. Learn who qualifies, how to apply, and what to do on your tax return.',
  datePublished: '2026-05-08',
  dateModified: '2026-05-08',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com.au' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com.au' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com.au/blog/medicare-levy-exemption-international-students' },
}

export default function MedicarePage() {
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
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#059669', background: '#05966918', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Medicare</span>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>8 May 2026 · 5 min read</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          Medicare Levy Exemption for International Students in Australia
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          The Medicare levy is a 2% tax on top of your income tax, used to fund Australia&#39;s public health system. But if you are an international student or temporary visa holder, you likely do not have access to Medicare — so you should not have to pay the levy. Here is how to claim your exemption and get it back.
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
        <h2>What Is the Medicare Levy?</h2>
        <p>
          Medicare is Australia&#39;s universal health insurance scheme. It is funded partly by a <strong>2% Medicare levy</strong> on the taxable income of most Australian residents. For someone earning $60,000 a year, that is $1,200 per year added to their tax bill.
        </p>
        <p>
          However, Medicare is not available to all visa holders. If your visa does not entitle you to access Medicare services, you should not pay the levy. The exemption means that 2% stays in your pocket — or comes back as a refund if it was withheld from your wages.
        </p>

        <h2>Who Qualifies for a Medicare Levy Exemption?</h2>
        <p>You may be entitled to a full or half exemption if you:</p>
        <ul>
          <li>Hold a <strong>student visa (subclass 500)</strong> — most international students qualify</li>
          <li>Hold a <strong>temporary work visa</strong> (e.g. subclass 482, 485, 407)</li>
          <li>Hold a <strong>Working Holiday Visa</strong> (subclass 417 or 462)</li>
          <li>Are a <strong>foreign resident</strong> for tax purposes during all or part of the year</li>
          <li>Are covered by a <strong>Ministerial order</strong> (e.g. certain diplomatic staff)</li>
        </ul>

        <div className="callout">
          <strong>Important:</strong> Even if you work in Australia and pay income tax, you are NOT automatically exempt from the Medicare levy. You must actively claim the exemption — either through your employer (by lodging a declaration) or on your tax return.
        </div>

        <h2>Reciprocal Health Care Agreements</h2>
        <p>
          Australia has reciprocal health care agreements (RHCAs) with certain countries, meaning residents of those countries can access some Medicare services while in Australia. If your home country has an RHCA with Australia, you are generally <strong>not exempt</strong> from the Medicare levy — because you can access Medicare.
        </p>
        <p>Countries with RHCAs (not exempt) include: New Zealand, United Kingdom, Ireland, Sweden, Netherlands, Finland, Norway, Belgium, Slovenia, and Malta.</p>
        <p>
          If your country is not on this list and your visa doesn&#39;t grant Medicare access, you are likely exempt.
        </p>

        <h2>How to Claim the Exemption from Your Employer</h2>
        <p>
          If you are employed (on a payroll), your employer withholds the Medicare levy from your wages by default. To stop this, you need to lodge a <strong>Medicare levy variation declaration</strong> (NAT 0929) with your employer. This form tells your employer:
        </p>
        <ol>
          <li>You are claiming a Medicare levy exemption (full or half)</li>
          <li>Your visa type and entitlement status</li>
        </ol>
        <p>
          Once lodged, your employer reduces your withholding accordingly. You will receive a higher net pay from that point forward, and you won&#39;t need to wait until tax return time to get the money back.
        </p>

        <h2>How to Claim the Exemption on Your Tax Return</h2>
        <p>
          If you did not lodge the declaration with your employer (or you were self-employed and paying tax instalments), you claim the exemption on your annual tax return via myTax:
        </p>
        <ol>
          <li>Log into myGov and open ATO myTax</li>
          <li>Find the <strong>Medicare levy</strong> section</li>
          <li>Answer the eligibility questions — indicate you hold a visa that does not entitle you to Medicare</li>
          <li>Select <strong>full exemption</strong> or <strong>half exemption</strong> based on your circumstances</li>
          <li>Submit your return</li>
        </ol>
        <p>
          If Medicare levy was withheld from your wages, it will appear as a credit in your tax assessment, and you will receive a refund for the overpaid amount.
        </p>

        <h2>Full Exemption vs Half Exemption</h2>
        <table>
          <thead>
            <tr><th>Exemption Type</th><th>When It Applies</th><th>Effect</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Full exemption</strong></td><td>You were a non-resident or ineligible for Medicare for the whole year</td><td>0% Medicare levy</td></tr>
            <tr><td><strong>Half exemption</strong></td><td>You became a resident or got Medicare access partway through the year</td><td>1% Medicare levy on the portion of the year when exempt</td></tr>
          </tbody>
        </table>

        <h2>What Documentation Do You Need?</h2>
        <p>The ATO may ask you to prove your visa status. Keep these documents on hand:</p>
        <ul>
          <li>Your passport with current visa stamp or e-visa grant notice</li>
          <li>Your visa grant letter from the Department of Home Affairs</li>
          <li>Evidence that you did not hold a Medicare card during the exempt period</li>
        </ul>
        <p>
          You do not need to attach these to your tax return, but if you are audited or receive an ATO query, having them ready saves time.
        </p>

        <h2>Real Dollar Example</h2>
        <p>
          Imagine you are an international student on a subclass 500 visa earning <strong>$35,000</strong> in part-time work during the financial year. Without the exemption:
        </p>
        <ul>
          <li>Income tax (after tax-free threshold, Scale 1): approximately $1,900</li>
          <li>Medicare levy: $35,000 × 2% = <strong>$700</strong></li>
          <li>Total tax: $2,600</li>
        </ul>
        <p>
          With the full Medicare levy exemption, you save <strong>$700</strong> — that is money back in your refund or reduced from what you owe.
        </p>

        <h2>Does Being Exempt Affect Superannuation?</h2>
        <p>
          No. Your Medicare levy exemption has no effect on your superannuation entitlements. If you work for an employer and earn more than $450 per month (note: the $450 threshold was removed from 1 July 2022 — super is now payable from the first dollar), your employer must still pay 12% super on top of your wages, regardless of your visa type.
        </p>
        <p>
          When you leave Australia permanently, you may be eligible to claim your super back as a <strong>Departing Australia Superannuation Payment (DASP)</strong>.
        </p>

        <h2>Common Mistakes</h2>
        <ul>
          <li><strong>Not lodging a tax return</strong> — If Medicare levy was withheld and you are exempt, you are leaving money on the table. Always lodge.</li>
          <li><strong>Assuming exemption is automatic</strong> — It is not. You must actively claim it.</li>
          <li><strong>Confusing Medicare levy and Medicare surcharge</strong> — The surcharge (an extra 1–1.5%) applies to higher-income earners who do not have private hospital cover. These are separate from the basic 2% levy.</li>
        </ul>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--ember-p)', borderRadius: 'var(--r)', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>Manage your work income in Australia</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>SAB Account AI handles PAYG payslips with Medicare levy exemption support for temporary visa holders.</p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 'var(--r)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Start free
          </Link>
        </div>
      </div>
    </div>
  )
}
