import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Payday Super 2026: What Every Australian Employer Must Know Before 1 July',
  description: 'Payday Super starts 1 July 2026. Employers must pay super within 7 days of every payday — not quarterly. Learn the rules, penalties, SuperStream requirements, and how to prepare.',
  alternates: { canonical: 'https://sabaccountai.com/blog/payday-super-2026' },
  openGraph: {
    title: 'Payday Super 2026: What Every Australian Employer Must Know Before 1 July',
    description: 'Payday Super starts 1 July 2026. Super must be paid within 7 days of each payday. Learn the rules, penalties, and how to prepare.',
    url: 'https://sabaccountai.com/blog/payday-super-2026',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Payday Super 2026: What Every Australian Employer Must Know Before 1 July',
  description: 'Payday Super starts 1 July 2026. Employers must pay super within 7 days of every payday instead of quarterly. Learn the rules, penalties, and how to prepare.',
  datePublished: '2026-05-25',
  dateModified: '2026-05-25',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/payday-super-2026' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does Payday Super apply to casual employees?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Payday Super applies to all employees who are entitled to super — including casual workers. If you pay a casual employee wages, you must also pay their super within 7 days of that payday.',
      },
    },
    {
      '@type': 'Question',
      name: 'If my payroll is weekly, do I pay super every single week?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Under Payday Super, super must be paid within 7 days of each payday. If you run weekly payroll, you will make weekly super contributions. If you run fortnightly payroll, you will make fortnightly contributions.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I still use the Small Business Super Clearing House (SBSCH) after 1 July 2026?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The ATO\'s Small Business Super Clearing House (SBSCH) will continue to operate and is a free option for businesses with 19 or fewer employees (or an annual turnover under $10 million). You will still be able to use it to meet your Payday Super obligations — you just need to submit payments within the 7-day window.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if I miss the 7-day payday super deadline?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Missing the 7-day deadline triggers the Super Guarantee Charge (SGC). Under Payday Super, the SGC applies from the first day the payment is late — unlike the old quarterly system where you had until the 28th of the following month. The SGC includes the shortfall, 10% annual interest, and a $20 per-employee administration fee. It is also not tax deductible.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Payday Super change the super rate?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. The Superannuation Guarantee rate remains at 12% — the final rate under the legislated schedule that reached 12% on 1 July 2025. Payday Super only changes when you must pay, not how much.',
      },
    },
  ],
}

export default function PaydaySuperPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

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
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>25 May 2026 · 9 min read</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          Payday Super 2026: What Every Australian Employer Must Know Before 1 July
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          On <strong>1 July 2026</strong>, the way Australian employers pay superannuation changes permanently. Instead of the current quarterly system, you will be required to pay super within <strong>7 days of every single payday</strong>. This is one of the biggest changes to Australia&apos;s super system in a decade — and with the deadline now weeks away, every employer needs to understand what is changing and what they must do before it arrives.
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
        .blog-content .callout-green { background: rgba(34,197,94,0.08); border-left: 3px solid #16a34a; padding: 1rem 1.25rem; border-radius: 0 var(--r) var(--r) 0; margin: 1.5rem 0; }
        .blog-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.875rem; }
        .blog-content th { background: var(--char); color: #fff; padding: 0.625rem 0.875rem; text-align: left; font-weight: 600; }
        .blog-content td { padding: 0.625rem 0.875rem; border-bottom: 1px solid var(--border); }
        .blog-content tr:nth-child(even) td { background: #f9f9f7; }
        .blog-content .faq-item { border: 1px solid var(--border); border-radius: var(--r); padding: 1.25rem; margin-bottom: 0.875rem; background: #fff; }
        .blog-content .faq-q { font-weight: 600; color: var(--char); margin-bottom: 0.5rem; font-size: 0.9375rem; }
        .blog-content .faq-a { color: var(--text2); margin: 0; }
      `}</style>

      <div className="blog-content">

        <h2>What Is Payday Super?</h2>
        <p>
          Payday Super is a reform announced in the 2023–24 Federal Budget that requires employers to pay superannuation contributions on the same day — or within 7 days of — each employee&apos;s payday. Under the current system, super only needs to be paid quarterly, by the 28th day after each quarter ends.
        </p>
        <p>
          The policy exists because the ATO estimates that billions of dollars in super go unpaid or are significantly delayed each year. By linking super payments directly to paydays, the government aims to ensure workers actually receive what they are owed in real time — rather than discovering a shortfall months later when a quarterly deadline passes.
        </p>
        <p>
          For employees, this means their super balance grows more consistently and benefits from more frequent compounding. For employers, it means tighter cash flow management and a much stricter compliance window.
        </p>

        <h2>When Does Payday Super Start?</h2>
        <p>
          Payday Super applies to all payments made <strong>on or after 1 July 2026</strong>. If you process a payrun on 30 June 2026, the old quarterly rules still apply. If you process a payrun on 1 July 2026 or later, the new 7-day rule applies immediately.
        </p>
        <p>
          There is no phased transition based on business size. Whether you have 1 employee or 100, the obligation is the same from day one.
        </p>

        <div className="callout">
          <strong>Weeks away:</strong> As of May 2026, Payday Super starts in approximately 5 weeks. If you have not already reviewed your payroll process, now is the time.
        </div>

        <h2>Who Does Payday Super Affect?</h2>
        <p>Payday Super affects you if you employ anyone who is entitled to the Superannuation Guarantee (SG). That includes:</p>
        <ul>
          <li><strong>Full-time employees</strong> — all earnings</li>
          <li><strong>Part-time employees</strong> — all earnings</li>
          <li><strong>Casual employees</strong> — every single shift payment</li>
          <li><strong>Contractors paid mainly for their labour</strong> — even if they quote an ABN, the ATO may treat them as employees for super purposes</li>
          <li><strong>Employees under 18</strong> who work more than 30 hours per week</li>
        </ul>
        <p>
          The only employees excluded from SG are those earning below the minimum threshold in a given quarter — though note the old $450/month threshold was removed in 2022, so nearly all workers now qualify regardless of earnings.
        </p>

        <h2>How Is Payday Super Different From the Current System?</h2>
        <p>
          The shift from quarterly to payday super is not a minor administrative change — it fundamentally changes when money must leave your account. Here is a direct comparison:
        </p>
        <table>
          <thead>
            <tr><th>Current System (to 30 June 2026)</th><th>Payday Super (from 1 July 2026)</th></tr>
          </thead>
          <tbody>
            <tr><td>Pay super quarterly</td><td>Pay super each payday</td></tr>
            <tr><td>Due 28 days after quarter end</td><td>Due within 7 days of payday</td></tr>
            <tr><td>SGC applies after quarterly deadline missed</td><td>SGC applies from day 1 of late payment</td></tr>
            <tr><td>4 payments per year per employee</td><td>Up to 52 payments per year (weekly payroll)</td></tr>
            <tr><td>Super rate: 12%</td><td>Super rate: 12% (unchanged)</td></tr>
            <tr><td>SuperStream recommended</td><td>SuperStream required</td></tr>
          </tbody>
        </table>

        <h2>The 7-Day Rule Explained</h2>
        <p>
          Under Payday Super, employers must make super contributions within <strong>7 calendar days</strong> of each payday. If the 7th day falls on a weekend or public holiday, the payment must be made by the next business day.
        </p>
        <p>
          The clock starts from the date the employee is actually paid — not the date wages are processed in your payroll software. If you run payroll on Monday but wages hit employee accounts on Wednesday, the 7-day window starts on Wednesday.
        </p>
        <p>
          For businesses with fortnightly payroll, you will make a super payment every fortnight. For weekly payroll, every week. The amount each time is 12% of that period&apos;s ordinary time earnings — there is no minimum threshold per payment.
        </p>

        <div className="callout">
          <strong>Cash flow tip:</strong> If you currently pay super quarterly in a lump sum, you may be used to holding that cash throughout the quarter. Under Payday Super, you must have the super amount available within a week of each payrun. Review your business account balance and cash flow forecasting before 1 July.
        </div>

        <h2>The SuperStream Requirement</h2>
        <p>
          From 1 July 2026, all super contributions must be made through <strong>SuperStream</strong> — the ATO&apos;s electronic data and payment standard. Manual cheques, direct EFT transfers to funds, or any non-SuperStream method will not satisfy your Payday Super obligation.
        </p>
        <p>
          SuperStream works through a clearing house that receives your payment and employee data, then distributes contributions to each employee&apos;s fund. Your options include:
        </p>
        <ul>
          <li><strong>Small Business Super Clearing House (SBSCH)</strong> — free via the ATO&apos;s Business Portal, available to businesses with 19 or fewer employees or turnover under $10 million</li>
          <li><strong>Your payroll software&apos;s built-in clearing house</strong> — most major payroll platforms (Xero, MYOB, QuickBooks) have integrated SuperStream</li>
          <li><strong>Third-party clearing houses</strong> — commercial options like Beam, BPay Super, and others</li>
        </ul>
        <p>
          Note that when using a clearing house, the 7-day window is measured from payday to when you <em>submit</em> to the clearing house — not when the fund receives the money. However, your clearing house must allocate funds to member accounts within 3 business days of receipt, so in practice the full cycle takes around 5–10 days.
        </p>

        <h2>Penalties for Non-Compliance</h2>
        <p>
          Missing the Payday Super deadline triggers the <strong>Super Guarantee Charge (SGC)</strong> — and unlike the old quarterly system where you had weeks of buffer before facing consequences, under Payday Super the SGC applies from the <strong>first day</strong> a payment is late.
        </p>
        <p>The SGC is deliberately punitive to encourage compliance. It includes:</p>
        <ul>
          <li><strong>The shortfall amount</strong> — calculated on total earnings (not just ordinary time earnings, which is a broader base than regular super)</li>
          <li><strong>Interest at 10% per annum</strong> — accruing daily from the start of the relevant quarter</li>
          <li><strong>Administration fee of $20 per employee per quarter</strong></li>
          <li><strong>Not tax deductible</strong> — unlike regular super contributions, the SGC cannot be claimed as a business expense</li>
        </ul>
        <p>
          For persistent or wilful non-compliance, the ATO can also apply a <strong>Part 7 penalty</strong> of up to 200% of the SGC amount, personal liability for company directors, and referral for prosecution.
        </p>

        <div className="callout">
          <strong>Real cost example:</strong> You have 3 employees and miss a fortnightly super deadline by 5 days. Each employee earned $2,500 that fortnight. Super owed: 3 × $300 = $900. SGC interest at 10% p.a. on $900 for 5 days ≈ $1.23. Admin fee: 3 × $20 = $60. Total SGC cost: ~$961, plus it is not deductible. A $900 obligation costs you $961 and you lose the tax deduction — for a 5-day delay.
        </div>

        <h2>How to Prepare Before 1 July 2026</h2>
        <p>You have weeks, not months. Here is a practical checklist:</p>

        <div className="callout-green">
          <strong style={{ color: '#15803d' }}>✓ Preparation checklist</strong>
          <ul style={{ marginTop: '0.625rem', marginBottom: 0, color: '#166534' }}>
            <li>Confirm your clearing house is SuperStream-compliant and can process payments within 7 days</li>
            <li>Check that all employee super fund details (USI, member number) are up to date in your system</li>
            <li>Review your pay cycle — if you pay employees mid-month and at month end, you will now have two super submissions per month</li>
            <li>Update your cash flow plan to account for super leaving the account each payday, not quarterly</li>
            <li>If using manual bank transfers for super, switch to a clearing house immediately</li>
            <li>Ensure any new employees have their stapled super fund details captured at onboarding before their first payday</li>
            <li>Test your clearing house submission process before 1 July so you know exactly how long it takes</li>
          </ul>
        </div>

        <h2>How SAB Account AI Handles Payday Super</h2>
        <p>
          SAB Account AI calculates super automatically on every payslip at the correct 12% SG rate, applied to ordinary time earnings only. Each payslip clearly shows:
        </p>
        <ul>
          <li>The super amount due for that pay period</li>
          <li>The employee&apos;s super fund name and member number</li>
          <li>Ordinary time earnings (the super base) separated from overtime</li>
        </ul>
        <p>
          When Payday Super begins on 1 July 2026, you will know the exact super amount to pay with each payrun — no manual calculations, no end-of-quarter scramble. Simply generate the payslip, confirm the super figure, and submit it through your clearing house within 7 days.
        </p>
        <p>
          SAB Account AI also supports the <a href="/payday-super" style={{ color: 'var(--ember)' }}>Payday Super calculator</a> — a free tool that estimates your super obligations per pay period based on your employees&apos; pay details.
        </p>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--ember-p)', borderRadius: 'var(--r)', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>Ready for Payday Super from 1 July?</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>SAB Account AI generates ATO-compliant payslips with super calculated automatically — so you always know exactly what to pay and when.</p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 'var(--r)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Try SAB Account AI free — sabaccountai.com
          </Link>
        </div>

        <h2>Frequently Asked Questions</h2>

        <div className="faq-item">
          <p className="faq-q">Does Payday Super apply to casual employees?</p>
          <p className="faq-a">Yes. Payday Super applies to all employees entitled to super — including casuals. Every time you pay a casual employee wages, you must pay their super within 7 days of that payday. There is no minimum hours or earnings threshold for casuals since the $450/month rule was removed in 2022.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">If my payroll is weekly, do I pay super every single week?</p>
          <p className="faq-a">Yes. The 7-day rule applies to every payday, so weekly payroll means weekly super contributions. If this is a significant cash flow change for your business, you may want to review whether moving to fortnightly payroll makes administration more manageable — though both are valid and the super obligation is the same either way.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">Can I still use the Small Business Super Clearing House (SBSCH) after 1 July 2026?</p>
          <p className="faq-a">Yes. The ATO&apos;s SBSCH will continue to operate and is free for businesses with 19 or fewer employees or annual turnover under $10 million. You can use it to meet Payday Super obligations — you just need to submit each contribution within 7 days of payday. Note that the SBSCH can take a few days to process, so submit early in the 7-day window.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">What happens if I miss the 7-day Payday Super deadline?</p>
          <p className="faq-a">Missing the deadline triggers the Super Guarantee Charge (SGC) from day one of the late payment. The SGC includes the shortfall (on total earnings, not just OTE), 10% annual interest, and a $20 per-employee administration fee — and it is not tax deductible. For small amounts, the admin fee alone can exceed the interest, making even short delays costly. If you realise you have missed a deadline, pay as quickly as possible and lodge a SGC statement with the ATO.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">Does Payday Super change the super rate?</p>
          <p className="faq-a">No. The Superannuation Guarantee rate remains at 12% — the final rate under the legislated schedule that reached 12% on 1 July 2025. Payday Super only changes <em>when</em> you must pay, not <em>how much</em>. The calculation is still 12% of ordinary time earnings per pay period.</p>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.8125rem', color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <strong>Sources:</strong> ATO — Payday Super information for employers; Treasury — Better Targeted Super and Payday Super consultation; Superannuation Guarantee (Administration) Act 1992. This article is general information only and does not constitute financial or tax advice. Speak to a registered tax agent for advice specific to your situation.
        </p>
      </div>
    </div>
  )
}
