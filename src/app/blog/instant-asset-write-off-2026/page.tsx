import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '$20,000 Instant Asset Write-Off 2026: What Sole Traders Must Buy Before 30 June',
  description: 'The $20,000 instant asset write-off expires 30 June 2026. Sole traders must have assets installed and in use before midnight. Learn exactly what qualifies, what the deadline means, and how to record it correctly.',
  alternates: { canonical: 'https://sabaccountai.com/blog/instant-asset-write-off-2026' },
  openGraph: {
    title: '$20,000 Instant Asset Write-Off 2026: What Sole Traders Must Buy Before 30 June',
    description: 'Hard deadline: 30 June 2026. Assets must be installed and in use before midnight to claim the full $20,000 write-off. Here is exactly what to do.',
    url: 'https://sabaccountai.com/blog/instant-asset-write-off-2026',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '$20,000 Instant Asset Write-Off 2026: What Sole Traders Must Buy Before 30 June',
  description: 'The $20,000 instant asset write-off threshold expires 30 June 2026. Assets must be first used or installed ready for use before midnight on 30 June to qualify. This guide explains what qualifies, who is eligible, and what records you need.',
  datePublished: '2026-06-02',
  dateModified: '2026-06-02',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/instant-asset-write-off-2026' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the instant asset write-off threshold for 2025–26?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The instant asset write-off threshold for the 2025–26 financial year is $20,000 per asset. Eligible businesses can deduct the full cost of a qualifying asset up to $20,000 in the year it is first used or installed ready for use — rather than depreciating it over several years.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does the asset have to be physically in my hands by 30 June?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The legal test is that the asset must be "first used or installed ready for use" by 30 June 2026. Ordering an asset before 30 June but receiving it after that date does NOT qualify — the asset must be in your possession and ready to operate by midnight on 30 June 2026.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is the $20,000 limit per asset or per business?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The $20,000 limit is per asset, not per business. You can buy and deduct multiple assets as long as each individual asset costs no more than $20,000. For example, you could buy a $19,000 laptop setup and a $15,000 piece of equipment in the same year and claim both in full.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does the May 2026 Budget change mean I can wait until after 30 June?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. The May 2026 Federal Budget announced an intention to make the $20,000 threshold permanent from 1 July 2026, but that legislation has not yet passed Parliament. Until it does, acting after 30 June 2026 without the law passing would mean the threshold reverts to $1,000 per asset. The only safe approach is to act before 30 June.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I claim a mixed-use asset like a phone or laptop I also use personally?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, but only the business-use portion. If you buy a $2,000 laptop and use it 70% for work and 30% personally, you can claim $1,400 as an instant write-off. You must be able to substantiate the business-use percentage — keep a log or record of how you use the device.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens to assets costing more than $20,000?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Assets costing more than $20,000 cannot be fully written off under the instant asset write-off. They are instead added to your small business depreciation pool and written off at 15% in the first year and 30% per year thereafter. The $20,000 threshold applies per asset — you cannot split a single $25,000 asset into two invoices.',
      },
    },
  ],
}

export default function InstantAssetWriteOffPage() {
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
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>2 June 2026 · 10 min read</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          $20,000 Instant Asset Write-Off 2026: What Sole Traders Must Buy Before 30 June
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          There are fewer than <strong>four weeks left</strong> before the $20,000 instant asset write-off deadline expires. Assets must be <strong>first used or installed ready for use</strong> by midnight on <strong>30 June 2026</strong> to qualify — and with the future of the $20,000 threshold still uncertain beyond that date, now is the moment to act. This guide explains exactly what qualifies, who is eligible, what the deadline actually requires, and what records you need to keep.
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
      `}</style>

      <div className="blog-content">

        <h2>What Is the Instant Asset Write-Off?</h2>
        <p>
          The instant asset write-off is an Australian tax concession that allows eligible small businesses to deduct the <strong>full purchase cost of a qualifying asset</strong> in the financial year they buy it — rather than claiming depreciation over multiple years. In practical terms, it means a $15,000 laptop, a $19,000 trailer, or an $18,000 piece of equipment can reduce your taxable income by that full amount in FY2025–26, rather than a fraction each year for the next five or seven years.
        </p>
        <p>
          For FY2025–26, the threshold is <strong>$20,000 per asset</strong>. Each qualifying asset you purchase and put to use before 30 June 2026 can be fully written off — and there is no cap on how many assets you can claim, as long as each individual one costs under $20,000.
        </p>
        <p>
          This is not a new concession — the ATO has extended it each year since 2015, though the threshold has varied (it dropped to $1,000 between 2023 and 2024 before being raised back to $20,000). The May 2026 Federal Budget announced the government&apos;s intention to make the $20,000 threshold permanent from 1 July 2026. However, that legislation has <strong>not yet passed Parliament</strong>, which means acting before 30 June remains the only legally certain path.
        </p>

        <div className="callout-red">
          <strong>Hard deadline:</strong> Assets must be <strong>first used or installed ready for use</strong> by <strong>30 June 2026</strong>. Ordering before 30 June but receiving delivery on 1 July does NOT qualify. The physical asset must be in your possession and ready to operate before the financial year ends.
        </div>

        <h2>Who Is Eligible?</h2>
        <p>
          To claim the $20,000 instant asset write-off in FY2025–26, you must be a <strong>small business entity</strong> — defined by the ATO as a business with an <strong>aggregated annual turnover of less than $10 million</strong>. This covers the vast majority of Australian sole traders, freelancers, tradies, and small business owners.
        </p>
        <p>
          Aggregated turnover includes not just your own business income but also income from any connected entities or affiliates. For most sole traders operating independently, this threshold is unlikely to be an issue — if your business makes under $10 million per year, you qualify.
        </p>
        <p>
          There is no minimum turnover, no minimum time in business, and no requirement to be GST-registered. Even if you only started your sole trader business in the last few months of FY2025–26, you can still claim qualifying assets you purchased and put to work before 30 June.
        </p>

        <h2>What Qualifies as an Eligible Asset?</h2>
        <p>
          The asset must be a <strong>depreciating asset</strong> used wholly or partly for business purposes. This is a broad category that covers most business purchases. Common qualifying assets for sole traders include:
        </p>

        <h3>Technology and Equipment</h3>
        <ul>
          <li>Laptops, desktop computers, monitors, and tablets</li>
          <li>Smartphones used for business</li>
          <li>Cameras and video equipment (photographers, content creators)</li>
          <li>Printers, scanners, and office equipment</li>
          <li>Software (when it is a separately identifiable depreciating asset — most one-off licence purchases qualify; ongoing subscription software is generally a deductible operating expense each year regardless)</li>
          <li>Servers and networking equipment</li>
        </ul>

        <h3>Vehicles and Transport</h3>
        <ul>
          <li>Utes, vans, and work vehicles — subject to the <strong>car limit of $69,674</strong> for FY2025–26 (if the car costs more than this, only $69,674 can be depreciated)</li>
          <li>Trailers and tow equipment</li>
          <li>Motorbikes and scooters used for deliveries or site visits</li>
          <li>Forklifts, pallet jacks, and similar equipment</li>
        </ul>

        <h3>Trade Tools and Machinery</h3>
        <ul>
          <li>Power tools, hand tools, and trade equipment</li>
          <li>Workshop machinery and industrial equipment</li>
          <li>Medical or professional equipment (dentists, physios, consultants)</li>
          <li>Salon or beauty equipment</li>
          <li>Kitchen equipment for hospitality</li>
          <li>Construction equipment and site tools</li>
        </ul>

        <h3>Office Furniture and Fittings</h3>
        <ul>
          <li>Desks, chairs, and office furniture</li>
          <li>Shelving, storage systems, and display units</li>
          <li>Whiteboards, projectors, and presentation equipment</li>
        </ul>

        <div className="callout">
          <strong>What does NOT qualify:</strong> Trading stock (goods you buy to sell), land, financial assets like shares or bonds, items you already own personally and now &apos;move&apos; into business use (you may be able to claim a partial deduction but not the instant write-off on pre-owned items), and assets forming part of a set where the total set value exceeds $20,000.
        </div>

        <h2>The 30 June Deadline: What It Actually Means</h2>
        <p>
          This is the most misunderstood part of the instant asset write-off, and getting it wrong means losing the claim entirely. The legal test under the Income Tax Assessment Act is that the asset must be <strong>&quot;first used or installed ready for use&quot;</strong> before 30 June 2026.
        </p>
        <p>
          &quot;Installed ready for use&quot; means the asset is physically in your possession and in a state where you could begin using it for business purposes — even if you have not actually switched it on yet. A laptop sitting in your home office on 29 June qualifies. A laptop still in transit from the warehouse on 30 June does not.
        </p>
        <p>
          The purchase date on your invoice is not sufficient on its own. If you ordered online on 20 June but the item does not arrive until 5 July, you cannot claim it this financial year regardless of when you were charged.
        </p>

        <table>
          <thead>
            <tr><th>Scenario</th><th>Qualifies for FY2025–26?</th></tr>
          </thead>
          <tbody>
            <tr><td>Purchased 15 June, received and set up 20 June</td><td>✅ Yes</td></tr>
            <tr><td>Purchased 28 June, delivered 28 June, unpacked and in office</td><td>✅ Yes</td></tr>
            <tr><td>Purchased 25 June online, delivered 2 July</td><td>❌ No — not installed by 30 June</td></tr>
            <tr><td>Ordered 10 June, custom-built, delivered 15 July</td><td>❌ No — not in possession by 30 June</td></tr>
            <tr><td>Purchased 30 June in-store, taken home same day</td><td>✅ Yes — if in your possession by midnight</td></tr>
            <tr><td>Paid deposit 20 June, balance and delivery on 5 July</td><td>❌ No — not installed until July</td></tr>
          </tbody>
        </table>

        <p>
          For assets being purchased online or through suppliers with lead times, it is already very late. If you are buying locally — from a physical store or a supplier who can deliver immediately — you still have time, but act this week.
        </p>

        <h2>Mixed Business and Personal Use</h2>
        <p>
          Many assets sole traders purchase are used for both business and personal purposes — a phone, a laptop, a vehicle. The instant asset write-off only applies to the <strong>business-use portion</strong>.
        </p>
        <p>
          If you buy a $2,200 phone and use it 80% for work and 20% personally, you can deduct $1,760 under the instant write-off ($2,200 × 80%). The remaining $440 is a private expense and cannot be claimed.
        </p>
        <p>
          You must be able to substantiate your business-use percentage. For phones and devices, this typically means keeping a record of your usage over a representative 4-week period that you can then apply to the full year. For vehicles, a logbook is the most thorough method, though the cents-per-kilometre method (88 cents per km, up to 5,000 km in FY2025–26) is an alternative for cars.
        </p>
        <p>
          The ATO is actively cracking down on exaggerated business-use claims, particularly for vehicles and home office equipment. Keep honest, substantiable records — do not inflate the business-use percentage.
        </p>

        <h2>How Much Will You Actually Save?</h2>
        <p>
          The amount you save depends on your marginal tax rate — the rate you pay on the last dollar of income. For sole traders, this is your personal income tax rate. Here is a practical illustration:
        </p>

        <table>
          <thead>
            <tr><th>Annual Income</th><th>Marginal Rate (FY25–26)</th><th>Asset Cost</th><th>Tax Saved</th></tr>
          </thead>
          <tbody>
            <tr><td>$45,000 – $60,000</td><td>32.5% + 2% Medicare</td><td>$10,000</td><td>~$3,450</td></tr>
            <tr><td>$60,000 – $90,000</td><td>32.5% + 2% Medicare</td><td>$15,000</td><td>~$5,175</td></tr>
            <tr><td>$90,000 – $120,000</td><td>37% + 2% Medicare</td><td>$19,000</td><td>~$7,410</td></tr>
            <tr><td>$120,000 – $190,000</td><td>45% + 2% Medicare</td><td>$20,000</td><td>~$9,400</td></tr>
          </tbody>
        </table>

        <p>
          These figures assume 100% business use and do not account for GST-registered businesses (who claim GST credits separately and would only write off the GST-exclusive amount). Speak to your accountant for figures specific to your situation.
        </p>

        <h2>The Super Top-Up: A Double Tax Win Before 30 June</h2>
        <p>
          If you are buying equipment and want to maximise your tax position before 30 June, consider pairing the instant asset write-off with a <strong>personal super contribution</strong>.
        </p>
        <p>
          As a sole trader, you can make a voluntary super contribution to your own fund before 30 June and claim it as a tax deduction — up to the concessional contributions cap of <strong>$30,000 for FY2025–26</strong> (including any employer SG contributions if you have other employment income). To claim the deduction, you must lodge a <strong>Notice of Intent to Claim a Deduction</strong> with your super fund before you lodge your tax return.
        </p>
        <p>
          Together, an equipment purchase under the write-off and a voluntary super contribution can significantly reduce your taxable income — both must be completed before 30 June.
        </p>

        <h2>What Records Do You Need to Keep?</h2>
        <p>
          The ATO requires you to keep records for <strong>five years</strong> from the date you lodge the tax return in which you claim the deduction. For instant asset write-offs, you need:
        </p>
        <ul>
          <li><strong>Tax invoice or receipt</strong> showing the purchase date, seller, description of the asset, and total cost</li>
          <li><strong>Proof of delivery or installation date</strong> — a delivery confirmation, installation note, or photo with date metadata if it is close to 30 June</li>
          <li><strong>Business-use records</strong> — your usage log or the basis on which you calculated the business-use percentage</li>
          <li><strong>Asset register entry</strong> — a simple log noting the asset description, purchase date, cost, and business-use percentage</li>
        </ul>
        <p>
          SAB Account AI lets you attach notes and expense records directly to your business profile so your records are organised from day one — not something you need to reconstruct at tax time.
        </p>

        <h2>What Happens After 30 June? The Budget Announcement Explained</h2>
        <p>
          The May 2026 Federal Budget included an announcement that the government intends to make the <strong>$20,000 instant asset write-off permanent</strong> — meaning it would apply indefinitely from 1 July 2026 without needing annual extensions. This was widely covered in the press.
        </p>
        <p>
          However, budget announcements are not law. The legislation must be introduced to Parliament, debated, and passed before it takes effect. As of June 2026, that process has not been completed.
        </p>
        <p>
          If the legislation passes before or shortly after 30 June, the $20,000 threshold will continue into FY2026–27. If it does not pass, the threshold reverts to $1,000 per asset — meaning assets costing between $1,001 and $20,000 would go back to the depreciation pool. <strong>Do not rely on the budget announcement to justify delaying your purchase.</strong>
        </p>

        <div className="callout-green">
          <strong style={{ color: '#15803d' }}>Bottom line:</strong> <span style={{ color: '#166534' }}>If you have been thinking about buying equipment, technology, or tools for your business — and the total cost is under $20,000 per item — the safest financial decision is to buy before 30 June and have it in your possession and ready to use. Four weeks is enough time to act, but not enough to delay.</span>
        </div>

        <h2>How to Claim It in Your Tax Return</h2>
        <p>
          If you are a sole trader lodging your own tax return through myTax, the instant asset write-off is claimed as a <strong>deduction for depreciating assets</strong> in the business income section. You will need to:
        </p>
        <ol>
          <li>List the asset under &quot;Other deductions&quot; or &quot;Depreciation of assets&quot; in the sole trader business schedule</li>
          <li>Enter the full cost (or the business-use portion if mixed use)</li>
          <li>Select the instant asset write-off method rather than depreciation</li>
          <li>Ensure the asset is listed as &quot;first used or installed ready for use&quot; in FY2025–26</li>
        </ol>
        <p>
          If you use a tax agent, provide them with the invoice, the date you received and started using the asset, and your business-use percentage. They will handle the claim in the appropriate schedule.
        </p>
        <p>
          Note that if you are <strong>GST-registered</strong>, you should claim the GST credit on your BAS separately. The instant asset write-off is then applied to the <strong>GST-exclusive cost</strong> — not the full price. If you are not GST-registered, you claim the full purchase price.
        </p>

        <h2>How SAB Account AI Helps You Stay Organised</h2>
        <p>
          Claiming the instant asset write-off correctly requires good records — and good records start at the time of purchase, not at tax time. SAB Account AI helps sole traders and small business owners keep their finances organised year-round:
        </p>
        <ul>
          <li>Track business expenses and attach invoices as you go — no end-of-year scramble</li>
          <li>Record asset purchases with date, cost, and business-use percentage in your expense log</li>
          <li>Generate and store invoices, quotes, and receipts in one place</li>
          <li>Keep payslip and super records accurate and compliant, ready for lodgement</li>
        </ul>
        <p>
          When your accountant or myTax asks for records, you already have everything — organised, dated, and accessible.
        </p>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--ember-p)', borderRadius: 'var(--r)', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>Keep your records straight before 30 June</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>SAB Account AI helps sole traders track expenses, manage invoices, and stay organised at EOFY — so the instant asset write-off is easy to substantiate.</p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 'var(--r)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Try SAB Account AI free — sabaccountai.com
          </Link>
        </div>

        <h2>Frequently Asked Questions</h2>

        <div className="faq-item">
          <p className="faq-q">What is the instant asset write-off threshold for 2025–26?</p>
          <p className="faq-a">The threshold is $20,000 per asset for FY2025–26. Eligible small businesses (aggregated annual turnover under $10 million) can deduct the full cost of qualifying assets up to $20,000 each in the year the asset is first used or installed ready for use — rather than depreciating the cost over multiple years.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">Does the asset have to be physically in my hands by 30 June?</p>
          <p className="faq-a">Yes — it must be &quot;first used or installed ready for use&quot; by 30 June 2026. This means the asset must be in your physical possession and capable of being used. An asset you ordered before 30 June but that arrives after that date does not qualify. If it is being shipped, confirm the delivery date before purchasing.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">Is the $20,000 limit per asset or per business?</p>
          <p className="faq-a">Per asset. There is no limit on the total number of assets you can claim under the instant write-off — only a $20,000 cap per individual asset. You could purchase five $18,000 assets and write off all five in the same year, provided each individually costs under $20,000.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">Does the May 2026 Budget change mean I can wait until after 30 June?</p>
          <p className="faq-a">No. The Budget announced an intent to make the $20,000 threshold permanent, but the enabling legislation has not yet passed Parliament. Without that law, the threshold reverts to $1,000 from 1 July. Acting before 30 June is the only certainty. If the law passes later in 2026, you will have two years covered — but gambling on that outcome is not advisable.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">Can I claim a mixed-use asset like a phone or laptop I also use personally?</p>
          <p className="faq-a">Yes — the business-use portion only. Determine the percentage of time you use the asset for work versus personal purposes and apply that percentage to the cost. Keep a usage log covering at least four weeks to substantiate the split. The ATO can and does query inflated business-use claims, particularly for phones, laptops, and vehicles.</p>
        </div>

        <div className="faq-item">
          <p className="faq-q">What happens to assets costing more than $20,000?</p>
          <p className="faq-a">Assets above $20,000 cannot be instantly written off — they go into the small business simplified depreciation pool at 15% in year one and 30% per year thereafter. You cannot split a single asset across two invoices to bring each under $20,000; the ATO treats a single asset as a single asset regardless of how it is billed.</p>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.8125rem', color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <strong>Sources:</strong> ATO — Instant asset write-off for eligible businesses (ato.gov.au); ATO — Small business entity concessions; 2026–27 Federal Budget Papers — Small Business Measures; Income Tax Assessment Act 1997 s. 328-180. This article is general information only and does not constitute financial or tax advice. Speak to a registered tax agent for advice specific to your situation.
        </p>
      </div>
    </div>
  )
}
