import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EOFY 2026 Checklist for Sole Traders: 12 Things to Do Before 30 June',
  description: 'End of financial year is 30 June 2026. This EOFY checklist for Australian sole traders covers instant asset write-offs, super contributions, BAS, ATO crackdowns, and everything else to do before the deadline.',
  alternates: { canonical: 'https://sabaccountai.com/blog/eofy-checklist-sole-trader-2026' },
  openGraph: {
    title: 'EOFY 2026 Checklist for Sole Traders: 12 Things to Do Before 30 June',
    description: '12 things every Australian sole trader should do before 30 June 2026 — instant asset write-off, super, BAS, invoices, and ATO compliance.',
    url: 'https://sabaccountai.com/blog/eofy-checklist-sole-trader-2026',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'EOFY 2026 Checklist for Sole Traders: 12 Things to Do Before 30 June',
  description: 'A complete end-of-financial-year checklist for Australian sole traders covering instant asset write-offs, super contributions, BAS, ATO crackdown focus areas, and record-keeping obligations for FY2025–26.',
  datePublished: '2026-06-02',
  dateModified: '2026-06-02',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/eofy-checklist-sole-trader-2026' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'When is the EOFY 2026 deadline for sole traders?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The financial year ends on 30 June 2026. Most actions that affect your FY2025–26 tax return — such as buying assets, making super contributions, and paying prepaid expenses — must be completed by midnight on 30 June 2026. Your Q4 BAS (April–June) is due 28 July 2026. If you are self-lodging your tax return, the deadline is 31 October 2026.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the work from home deduction rate for 2025–26?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The ATO\'s fixed rate method for working from home deductions is 67 cents per hour for FY2025–26. You must keep a record of every hour worked from home — not an estimate or a four-week sample. The ATO has specifically flagged work from home claims as a compliance priority this year.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much super can I contribute before 30 June 2026 as a sole trader?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The concessional contributions cap for FY2025–26 is $30,000. This includes employer contributions (if you also have employment income) and any voluntary contributions you make and intend to claim as a deduction. To claim the deduction, you must lodge a Notice of Intent to Claim a Deduction with your super fund before lodging your tax return.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I prepay business expenses before 30 June?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Sole traders using the cash basis of accounting can prepay up to 12 months of qualifying expenses before 30 June and claim the full amount as a deduction in FY2025–26. Qualifying expenses include rent, insurance premiums, subscriptions, and professional memberships. The payment must be made before 30 June and the prepaid period cannot extend more than 12 months beyond the payment date.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the ATO cracking down on for FY2026 tax returns?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The ATO has flagged four specific areas for increased scrutiny in FY2026: work from home claims (particularly unsupported estimates), vehicle and travel deductions (ATO data-matching with registration and GPS data), rental income (especially short-stay platforms like Airbnb), and gig economy income (matching platform data with declared income). The ATO\'s $27.2 billion small business tax gap has driven significant investment in data matching technology.',
      },
    },
  ],
}

export default function EOFYChecklistPage() {
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
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#e11d48', background: '#e11d4818', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>EOFY</span>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>2 June 2026 · 11 min read</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          EOFY 2026 Checklist for Sole Traders: 12 Things to Do Before 30 June
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          The end of the 2025–26 financial year is <strong>30 June 2026</strong> — less than four weeks away. For Australian sole traders, EOFY is both a deadline and an opportunity: the right actions in the next few weeks can meaningfully reduce your tax bill, avoid ATO scrutiny, and set you up cleanly for FY2026–27. This checklist covers the 12 most important things to do before the clock runs out.
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
        .blog-content .callout-red { background: rgba(225,29,72,0.07); border-left: 3px solid #e11d48; padding: 1rem 1.25rem; border-radius: 0 var(--r) var(--r) 0; margin: 1.5rem 0; }
        .blog-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.875rem; }
        .blog-content th { background: var(--char); color: #fff; padding: 0.625rem 0.875rem; text-align: left; font-weight: 600; }
        .blog-content td { padding: 0.625rem 0.875rem; border-bottom: 1px solid var(--border); }
        .blog-content tr:nth-child(even) td { background: #f9f9f7; }
        .blog-content .faq-item { border: 1px solid var(--border); border-radius: var(--r); padding: 1.25rem; margin-bottom: 0.875rem; background: #fff; }
        .blog-content .faq-q { font-weight: 600; color: var(--char); margin-bottom: 0.5rem; font-size: 0.9375rem; }
        .blog-content .faq-a { color: var(--text2); margin: 0; }
        .blog-content .checklist-item { border: 1px solid var(--border); border-radius: var(--r); padding: 1.25rem 1.5rem; margin-bottom: 1rem; background: #fff; }
        .blog-content .checklist-num { display: inline-block; width: 1.75rem; height: 1.75rem; background: var(--ember); color: #fff; border-radius: 50%; font-size: 0.8125rem; font-weight: 700; line-height: 1.75rem; text-align: center; margin-right: 0.625rem; flex-shrink: 0; }
        .blog-content .checklist-title { font-size: 1rem; font-weight: 700; color: var(--char); margin-bottom: 0.5rem; display: flex; align-items: center; }
      `}</style>

      <div className="blog-content">

        <div className="callout-red">
          <strong>Key EOFY 2026 dates:</strong> 30 June — financial year ends, all actions below must be completed. 28 July — Q4 BAS due. 31 October — tax return lodgement deadline for self-lodgers.
        </div>

        <h2>Why FY2025–26 Is an Unusually Important EOFY</h2>
        <p>
          Every EOFY matters, but FY2025–26 has several specific factors that make the next four weeks more consequential than a typical year-end:
        </p>
        <ul>
          <li>The <strong>$20,000 instant asset write-off</strong> expires on 30 June — and its future beyond that date is legally uncertain</li>
          <li><strong>Payday Super starts 1 July 2026</strong> — sole traders who employ staff face a completely new payroll obligation from day one of the new financial year</li>
          <li>The ATO has announced an aggressive <strong>compliance crackdown</strong> on work from home, vehicles, and gig income, with expanded data-matching capabilities</li>
          <li>Interest charges on ATO debts are <strong>no longer tax deductible</strong> from 1 July 2025 — meaning if you owe tax, the cost of delay is higher than it used to be</li>
          <li>The lowest income tax bracket drops from 16% to <strong>15% from 1 July 2026</strong> — in some edge cases, deferring income to the new year can save slightly more</li>
        </ul>
        <p>
          With that context, here are the 12 most important actions to take before 30 June.
        </p>

        <h2>The 12-Point EOFY Checklist</h2>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">1</span>Reconcile All Invoices and Income</div>
          <p style={{ marginBottom: 0 }}>
            Pull together every invoice you issued in FY2025–26 and confirm it is recorded. Cross-check your bank statements against your records — the ATO pre-fills tax returns with data from your bank, payment platforms (Stripe, Square, PayPal), and income-reporting apps. If there are invoices missing from your records or amounts that do not match, address them now rather than at lodgement time. SAB Account AI keeps your invoices in one place with status tracking — now is the time to ensure every issued invoice shows as either paid, pending, or appropriately written off.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">2</span>Write Off Genuine Bad Debts</div>
          <p style={{ marginBottom: 0 }}>
            If you have outstanding invoices from clients you genuinely cannot recover — clients who have gone silent, gone into liquidation, or made clear they will not pay — you can write off those debts before 30 June and claim them as a deduction. For GST-registered businesses, writing off a bad debt also allows you to claim back the GST you already remitted to the ATO on that invoice. To qualify, the debt must be genuinely irrecoverable, not just slow. Make a written record of why you believe the debt is bad, and formally write it off in your accounts before 30 June.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">3</span>Buy and Install Eligible Assets Before 30 June</div>
          <p style={{ marginBottom: 0 }}>
            The <strong>$20,000 instant asset write-off</strong> is one of the most valuable EOFY actions available to small businesses, and it has a hard deadline. Assets must be <strong>first used or installed ready for use</strong> by midnight on 30 June 2026. This covers computers, phones, tools, equipment, vehicles under $69,674, and most depreciating business assets. Each individual asset must cost under $20,000 — but there is no limit on the number of qualifying assets you can claim. Read our full guide on the <Link href="/blog/instant-asset-write-off-2026" style={{ color: 'var(--ember)' }}>$20,000 instant asset write-off</Link> for the detail on what qualifies and what the deadline really requires.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">4</span>Make a Voluntary Super Contribution</div>
          <p style={{ marginBottom: 0 }}>
            As a sole trader, you can contribute to your own super fund and claim it as a tax deduction — one of the most tax-effective moves available to self-employed Australians. The <strong>concessional contributions cap for FY2025–26 is $30,000</strong> (including employer contributions if you have other employment). To claim the deduction, the contribution must be received by your fund before 30 June — allow at least 2–3 business days for processing — and you must lodge a <strong>Notice of Intent to Claim a Deduction</strong> with your fund before you lodge your tax return. This is the key step people forget: without the notice, the deduction is lost.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">5</span>Check and Lock In Your Work From Home Records</div>
          <p style={{ marginBottom: 0 }}>
            The ATO has specifically flagged <strong>work from home claims</strong> as a compliance focus for FY2026 tax returns. Under the fixed rate method (67 cents per hour), you must have a record of <strong>every single hour worked from home</strong> across the full financial year. The ATO no longer accepts four-week sample diaries extrapolated to the full year — it must be a full-year log. This applies from 1 July 2025 onwards. If you have been logging hours consistently, ensure your records are complete and cover the whole period. If you have not been logging, start now and reconstruct what you reasonably can from calendar entries, email records, and work deliverables — but be accurate, not optimistic.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">6</span>Review Your Vehicle Log Book</div>
          <p style={{ marginBottom: 0 }}>
            If you claim vehicle expenses using the <strong>logbook method</strong>, your logbook is valid for five years from the date you completed it. If your current logbook expires before 30 June 2026, or if your business use has changed materially since you last completed one, start a new logbook this month. A logbook must cover a continuous <strong>12-week period</strong> and record every trip — date, destination, purpose, and kilometres. Starting it before 30 June means it applies from this financial year. The <strong>cents per kilometre rate</strong> for FY2025–26 is <strong>88 cents/km</strong>, up to a maximum of 5,000 km — this method requires no log book but is capped and may understate your actual costs if you drive a lot for work.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">7</span>Prepay Deductible Business Expenses</div>
          <p style={{ marginBottom: 0 }}>
            Sole traders using cash basis accounting can prepay up to <strong>12 months of qualifying expenses</strong> before 30 June and claim the full amount as a deduction in FY2025–26 — even though the service extends into the next financial year. Expenses that work well for this strategy include: annual software subscriptions (accounting tools, design apps, industry platforms), professional indemnity and business insurance premiums, trade association or professional body memberships, and rent for your business premises. The payment must be made — not just invoiced — before 30 June, and the prepaid period cannot exceed 12 months beyond the payment date.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">8</span>Reconcile GST and Prepare for Your Q4 BAS</div>
          <p style={{ marginBottom: 0 }}>
            If you are GST-registered, your <strong>Q4 BAS (April–June 2026) is due 28 July 2026</strong>. The data collection happens now. Reconcile all GST collected on your sales and all GST credits on your business purchases for the April–June period. Common errors to check: GST claimed on personal expenses, GST claimed on items without a valid tax invoice (you need a full tax invoice for purchases over $82.50), and missing GST on sales you may have forgotten to include. Lodge and pay by 28 July to avoid late lodgement penalties — the ATO&apos;s failure-to-lodge penalty is $330 per 28-day period overdue.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">9</span>Review PAYG Instalments</div>
          <p style={{ marginBottom: 0 }}>
            If you pay <strong>PAYG instalments</strong> (quarterly tax prepayments based on your previous year&apos;s income), now is the time to check whether your instalments have been sufficient or excessive. If your income in FY2025–26 has been significantly lower than FY2024–25, you can vary your Q4 instalment downward using the ATO&apos;s variation process — but note that if you vary too aggressively and your actual tax liability is higher, you will pay a shortfall interest charge. If your income has been higher than the previous year, consider whether a voluntary lump sum payment before 30 June makes sense to avoid a large tax bill at lodgement time.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">10</span>Organise Receipts and Expense Records</div>
          <p style={{ marginBottom: 0 }}>
            The ATO requires you to keep records for <strong>five years</strong> from when you lodge the relevant return. Receipts fade, emails get deleted, and memory is unreliable — now is the time to ensure your FY2025–26 records are complete and stored properly. Go through your business bank and credit card statements month by month. For each business expense, confirm you have a matching receipt or invoice. Pay particular attention to cash transactions, which the ATO scrutinises more closely, and to any expense over $82.50 where you need a full tax invoice (not just a receipt) to claim the GST credit. SAB Account AI stores your invoices digitally — use it to attach supporting records against each transaction as you reconcile.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">11</span>Prepare for Payday Super Starting 1 July</div>
          <p style={{ marginBottom: 0 }}>
            If you have any employees, <strong>Payday Super starts 1 July 2026</strong> — which is less than four weeks away. From that date, you must pay super within <strong>7 days of every payday</strong>, not quarterly. This is the biggest structural change to payroll in a decade. The actions to take before 30 June: confirm your clearing house is SuperStream-compliant, update all employee super fund details (USI and member number), revise your cash flow to account for super leaving the account with each payrun, and test your clearing house submission process now so you are not scrambling on day one. Read our full guide to <Link href="/blog/payday-super-2026" style={{ color: 'var(--ember)' }}>Payday Super 2026</Link> for everything employers need to know.
          </p>
        </div>

        <div className="checklist-item">
          <div className="checklist-title"><span className="checklist-num">12</span>Know What the ATO Is Scrutinising in FY2026</div>
          <p style={{ marginBottom: 0 }}>
            The ATO has publicly stated its compliance priorities for FY2026 tax returns — and four areas are under heavy scrutiny. <strong>Work from home:</strong> claims without a proper full-year log will be questioned. <strong>Vehicles:</strong> ATO data-matching includes motor vehicle registry data, fuel receipts, and GPS data from fleet operators — inflated vehicle deductions are a red flag. <strong>Gig and platform income:</strong> the ATO receives data from Uber, Airbnb, Airtasker, and other platforms — all income must be declared, including cash tips. <strong>Rental income:</strong> all rental income including short-stay rental must be declared. The ATO&apos;s $27.2 billion small business tax gap has driven significant investment in automated data-matching. Claims that are accurate and well-substantiated have nothing to fear — but estimates, guesses, and inflated percentages will not survive a review.
          </p>
        </div>

        <h2>Key FY2025–26 Thresholds at a Glance</h2>

        <table>
          <thead>
            <tr><th>Item</th><th>Rate / Amount</th></tr>
          </thead>
          <tbody>
            <tr><td>Instant asset write-off threshold</td><td>$20,000 per asset (expires 30 June)</td></tr>
            <tr><td>Vehicle depreciation cost limit (cars)</td><td>$69,674</td></tr>
            <tr><td>Cents per kilometre rate</td><td>88 cents/km (max 5,000 km)</td></tr>
            <tr><td>Work from home fixed rate</td><td>67 cents/hour (full-year log required)</td></tr>
            <tr><td>Concessional super cap</td><td>$30,000</td></tr>
            <tr><td>Super Guarantee rate</td><td>12%</td></tr>
            <tr><td>GST registration threshold</td><td>$75,000 annual turnover</td></tr>
            <tr><td>Low income tax offset (LITO)</td><td>Up to $700 (income under $37,500)</td></tr>
            <tr><td>Small business aggregated turnover threshold</td><td>$10 million</td></tr>
            <tr><td>Tax return lodgement deadline (self-lodge)</td><td>31 October 2026</td></tr>
            <tr><td>Q4 BAS due date</td><td>28 July 2026</td></tr>
          </tbody>
        </table>

        <h2>What Changes From 1 July 2026</h2>
        <p>
          Once the financial year rolls over, several things change immediately:
        </p>
        <ul>
          <li><strong>Payday Super</strong> — super must be paid within 7 days of every payday for all employees</li>
          <li><strong>Lowest income tax bracket</strong> — drops from 16% to 15% for income up to $18,200 (marginal impact, but a legislative change)</li>
          <li><strong>Interest charge deductibility</strong> — general interest charges on ATO debts have not been deductible since 1 July 2025; this continues into FY2026–27</li>
          <li><strong>Instant asset write-off</strong> — the future threshold is legally uncertain pending the budget legislation; do not assume the $20,000 threshold continues automatically</li>
          <li><strong>Amended concessional contributions</strong> — the $30,000 cap may be indexed; check the ATO website for the FY2026–27 figure</li>
        </ul>

        <h2>The Most Common EOFY Mistakes Sole Traders Make</h2>
        <p>Avoiding these saves you money and reduces ATO scrutiny:</p>
        <ul>
          <li><strong>Forgetting the Notice of Intent for super deductions</strong> — contributing to super but not lodging the notice means you lose the deduction entirely</li>
          <li><strong>Ordering assets online close to 30 June without confirming delivery</strong> — if it arrives after 30 June, it does not qualify</li>
          <li><strong>Using a four-week WFH diary as a full-year record</strong> — the ATO no longer accepts this under the fixed rate method</li>
          <li><strong>Claiming 100% business use on clearly mixed-use items</strong> — phones, laptops, and vehicles are a trigger for ATO review</li>
          <li><strong>Missing the bad debt write-off window</strong> — debts that are genuinely irrecoverable must be formally written off before 30 June to claim the deduction this year</li>
          <li><strong>Not reconciling invoices against bank statements</strong> — the ATO can see your bank transactions; unexplained discrepancies between declared income and bank credits are an audit trigger</li>
          <li><strong>Leaving Q4 BAS until the last minute</strong> — the 28 July deadline is firm, and late lodgement penalties apply from day one</li>
        </ul>

        <div className="callout-green">
          <strong style={{ color: '#15803d' }}>Quick summary — action by priority:</strong>
          <ol style={{ marginTop: '0.625rem', marginBottom: 0, color: '#166534' }}>
            <li>Buy and install eligible assets before 30 June (write-off deadline)</li>
            <li>Transfer super contribution and lodge Notice of Intent to Claim</li>
            <li>Prepay deductible expenses (insurance, subscriptions, memberships)</li>
            <li>Complete and reconcile invoices; write off genuine bad debts</li>
            <li>Lock in WFH records and vehicle logbook</li>
            <li>Start a new vehicle logbook if yours is expired or usage has changed</li>
            <li>Prepare for Q4 BAS — due 28 July</li>
            <li>Brief yourself on Payday Super before 1 July if you have employees</li>
          </ol>
        </div>

        <h2>How SAB Account AI Helps at EOFY</h2>
        <p>
          SAB Account AI is built for Australian sole traders and small businesses. At EOFY, it helps you:
        </p>
        <ul>
          <li><strong>Reconcile invoices easily</strong> — every invoice you have created through the year is stored and searchable, with status (paid, pending, overdue) visible at a glance</li>
          <li><strong>Identify outstanding invoices</strong> — see which clients still owe you money and determine which qualify as genuine bad debts to write off</li>
          <li><strong>Track business expenses</strong> — categorise and record expenses throughout the year so EOFY is a review, not a reconstruction</li>
          <li><strong>Generate payslips with correct super</strong> — super is calculated at 12% on every payslip automatically, so your Payday Super obligations from 1 July are easy to calculate and pay on time</li>
          <li><strong>Keep clean records</strong> — tax invoices, quotes, and receipts stored digitally and accessible when your tax agent or the ATO asks for them</li>
        </ul>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--ember-p)', borderRadius: 'var(--r)', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>Make EOFY 2026 easier with SAB Account AI</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>Keep your invoices, payslips, and business records organised year-round so EOFY is never a scramble. Built for Australian sole traders.</p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 'var(--r)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Try SAB Account AI free — sabaccountai.com
          </Link>
        </div>

        <h2>Frequently Asked Questions</h2>

        <div className="faq-item">
          <p className="faq-q">When is the EOFY 2026 deadline for sole traders?</p>
          <p className="faq-a">The financial year ends 30 June 2026. Actions that affect your FY2025–26 tax — buying assets, making super contributions, prepaying expenses, and writing off bad debts — must be completed by midnight on 30 June. Your Q4 BAS is due 28 July 2026. If you self-lodge your tax return, the deadline is 31 October 2026. A registered tax agent can extend your lodgement deadline.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">What is the work from home deduction rate for 2025–26?</p>
          <p className="faq-a">The ATO&apos;s fixed rate method is 67 cents per hour for FY2025–26. You must record every single hour worked from home across the full year — not a sample or estimate. The ATO has flagged this as a compliance priority. Alternatively, the actual cost method may be more beneficial if you have a dedicated home office — speak to your tax agent about which method suits your situation.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">How much super can I contribute before 30 June 2026 as a sole trader?</p>
          <p className="faq-a">The concessional contributions cap is $30,000 for FY2025–26. To claim a deduction for your personal super contribution, you must lodge a Notice of Intent to Claim a Deduction with your fund before you lodge your tax return. The contribution itself must reach the fund before 30 June — allow several business days for processing.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">Can I prepay business expenses before 30 June?</p>
          <p className="faq-a">Yes — cash basis sole traders can prepay up to 12 months of qualifying expenses before 30 June and claim the full amount in FY2025–26. This works well for insurance premiums, software subscriptions, professional memberships, and similar recurring business costs. The payment must be made (not just invoiced) before 30 June, and the prepaid period cannot exceed 12 months.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">What is the ATO cracking down on for FY2026 tax returns?</p>
          <p className="faq-a">The ATO&apos;s stated compliance focus areas for FY2026 are: work from home claims without proper full-year records, vehicle and travel deductions (using data-matching with registration records), rental income including short-stay platforms like Airbnb, and gig economy income from Uber, Airtasker, and similar platforms. The ATO is also scrutinising businesses with large discrepancies between declared income and bank deposits visible through data-matching.</p>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.8125rem', color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <strong>Sources:</strong> ATO — End of financial year checklist (ato.gov.au); ATO — Deductions for individuals: work-related expenses; ATO — Instant asset write-off; ATO — Super for the self-employed; 2026–27 Federal Budget Papers; ATO Small Business Newsroom — Tax time 2026 priorities. This article is general information only and does not constitute financial or tax advice. Speak to a registered tax agent for advice specific to your situation.
        </p>
      </div>
    </div>
  )
}
