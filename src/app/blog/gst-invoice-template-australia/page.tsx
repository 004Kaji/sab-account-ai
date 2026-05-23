import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GST Invoice Template Australia: What Every Tax Invoice Must Include',
  description: 'The ATO has strict rules about what makes a valid GST tax invoice. Missing even one field means clients can\'t claim GST credits. Here\'s the complete 2025 checklist.',
  alternates: { canonical: 'https://sabaccountai.com.au/blog/gst-invoice-template-australia' },
  openGraph: {
    title: 'GST Invoice Template Australia: What Every Tax Invoice Must Include',
    description: 'The ATO has strict rules about what makes a valid GST tax invoice. Missing even one field means clients can\'t claim GST credits.',
    url: 'https://sabaccountai.com.au/blog/gst-invoice-template-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'GST Invoice Template Australia: What Every Tax Invoice Must Include',
  description: 'The ATO has strict rules about what makes a valid GST tax invoice. Missing even one field means clients can\'t claim GST credits. Here\'s the complete 2025 checklist.',
  datePublished: '2026-05-15',
  dateModified: '2026-05-15',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com.au' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com.au' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com.au/blog/gst-invoice-template-australia' },
}

export default function GstInvoicePage() {
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
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#d97706', background: '#d9770618', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>GST</span>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>15 May 2026 · 6 min read</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          GST Invoice Template Australia: What Every Tax Invoice Must Include
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          If you are registered for GST in Australia, every invoice you send for $82.50 or more (including GST) must meet the ATO&#39;s tax invoice requirements. Missing even one required field means your client technically cannot claim a GST credit — and that makes you look unprofessional or, worse, puts your business relationship at risk.
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
        <h2>Why GST Invoice Requirements Matter</h2>
        <p>
          The ATO distinguishes between a regular invoice and a <strong>tax invoice</strong>. Only a tax invoice allows your client to claim an input tax credit (GST credit) on their own BAS. If your invoice does not meet the requirements, the ATO can disallow your client&#39;s GST credit — meaning they paid GST but cannot get it back. That is a real financial loss for them, and they will likely come back to you for a corrected invoice.
        </p>
        <p>
          The good news: the requirements are straightforward once you know them.
        </p>

        <h2>The 7 Required Fields on Every Australian Tax Invoice</h2>
        <p>For any invoice where the total (including GST) is <strong>$82.50 or more</strong>, the ATO requires all seven of these fields:</p>

        <table>
          <thead>
            <tr><th>#</th><th>Required Field</th><th>Example</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>The words &quot;Tax Invoice&quot; clearly stated</td><td>Heading at the top: &quot;Tax Invoice&quot;</td></tr>
            <tr><td>2</td><td>Your identity (business name or your name)</td><td>Sanjog Basnet Trading as SAB Builds</td></tr>
            <tr><td>3</td><td>Your ABN</td><td>ABN: 49 541 449 108</td></tr>
            <tr><td>4</td><td>Date the invoice was issued</td><td>15 May 2026</td></tr>
            <tr><td>5</td><td>A description of what was supplied</td><td>Timber deck construction — 12 sqm</td></tr>
            <tr><td>6</td><td>The GST amount payable, OR a statement that the total price includes GST</td><td>GST: $220.00 &mdash; or &mdash; &quot;Total includes GST&quot;</td></tr>
            <tr><td>7</td><td>The total price including GST</td><td>Total: $2,420.00</td></tr>
          </tbody>
        </table>

        <div className="callout">
          <strong>ATO Rule:</strong> For invoices $1,000 or more (including GST), you must also include the <strong>buyer&#39;s identity or ABN</strong>. So if your client is a business and the invoice is over $1,000, add their ABN or business name.
        </div>

        <h2>How to Calculate GST Correctly</h2>
        <p>
          GST in Australia is 10% on top of the GST-exclusive price. Here is how the maths works:
        </p>
        <ul>
          <li><strong>Your price (ex-GST):</strong> $2,200.00</li>
          <li><strong>GST (10%):</strong> $220.00</li>
          <li><strong>Total (inc-GST):</strong> $2,420.00</li>
        </ul>
        <p>
          If you only know the GST-inclusive total and need to find the GST amount, divide the total by 11:
          <br /><strong>$2,420 ÷ 11 = $220 GST</strong>
        </p>
        <p>
          This shortcut works because $220 is exactly 1/11th of $2,420. It is a useful trick when a client asks you to confirm the GST portion of an existing invoice.
        </p>

        <h2>What Does NOT Attract GST?</h2>
        <p>Not everything you sell attracts GST. The main GST-free supplies relevant to small businesses are:</p>
        <ul>
          <li>Basic food (fresh produce, bread, milk — but not restaurant meals)</li>
          <li>Residential rent</li>
          <li>Medical and health services</li>
          <li>Some educational courses</li>
          <li>Exports (goods physically sent overseas)</li>
        </ul>
        <p>
          If you sell a mix of GST and GST-free items, your invoice must clearly show which items attract GST and which do not. Most invoicing software handles this with a &quot;GST-free&quot; or &quot;GST-applicable&quot; flag per line item.
        </p>

        <h2>Invoice Numbering: Is It Required?</h2>
        <p>
          Strictly speaking, the ATO does not require invoice numbers on tax invoices. However, every accountant will tell you to use them anyway. Invoice numbers let you:
        </p>
        <ul>
          <li>Match payments to invoices easily</li>
          <li>Track overdue invoices</li>
          <li>Reference invoices in disputes</li>
          <li>Satisfy auditors quickly (they expect sequential numbers)</li>
        </ul>
        <p>Use a simple sequential format like INV-0001, INV-0002, etc. Do not reuse or skip numbers once issued.</p>

        <h2>Payment Terms: What to Include</h2>
        <p>
          The ATO does not mandate payment terms, but including them protects you legally and sets expectations. Standard Australian small business terms include:
        </p>
        <ul>
          <li><strong>Net 7</strong> — payment due within 7 days (common for trades and services)</li>
          <li><strong>Net 14</strong> — payment within 14 days</li>
          <li><strong>Net 30</strong> — payment within 30 days (common in corporate and government contracts)</li>
          <li><strong>Due on receipt</strong> — immediate payment expected (for one-off jobs)</li>
        </ul>
        <p>
          Under the <em>Payment Times Reporting Act 2020</em>, large businesses (annual turnover over $100 million) are required to pay small businesses within 30 days. Knowing this means you can confidently quote Net 30 and enforce it.
        </p>

        <h2>Common Mistakes That Invalidate a Tax Invoice</h2>
        <ol>
          <li><strong>Missing ABN</strong> — The most common mistake. No ABN = not a valid tax invoice.</li>
          <li><strong>No GST amount shown</strong> — You must either show the GST figure separately or include the words &quot;Total price includes GST.&quot;</li>
          <li><strong>Wrong GST calculation</strong> — Applying GST to already-inclusive prices (double-dipping) or forgetting that some items are GST-free.</li>
          <li><strong>Calling it an &quot;Invoice&quot; not a &quot;Tax Invoice&quot;</strong> — Yes, this technically matters. The words must appear.</li>
          <li><strong>No issue date</strong> — Required by the ATO. Undated invoices are technically non-compliant.</li>
        </ol>

        <h2>Record Keeping: How Long Must You Keep Invoices?</h2>
        <p>
          You must keep copies of all tax invoices you issue <strong>for 5 years</strong> from when you prepared or obtained the record. This applies whether you store them digitally or in paper form. Cloud-based invoicing software like SAB Account AI stores all invoices automatically and makes them searchable — so you never have to hunt through a filing cabinet during an ATO audit.
        </p>

        <h2>Simplify GST Invoicing with SAB Account AI</h2>
        <p>
          SAB Account AI generates ATO-compliant tax invoices in under 30 seconds. Just describe the job (e.g. &quot;Built a deck for 3 days at $550/day, plus $200 in materials&quot;) and the AI creates a fully structured invoice with:
        </p>
        <ul>
          <li>All 7 required ATO fields pre-filled</li>
          <li>Correct GST calculations per line item</li>
          <li>Professional PDF ready to email or download</li>
          <li>Automatic invoice numbering</li>
        </ul>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--ember-p)', borderRadius: 'var(--r)', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>Ready to create your first ATO-compliant invoice?</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>Free plan includes 5 AI-generated invoices per month. No credit card required.</p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 'var(--r)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Start free — create your first invoice
          </Link>
        </div>

        <h2>Summary Checklist</h2>
        <p>Before you send any tax invoice, run through this list:</p>
        <ul>
          <li>☑ The words &quot;Tax Invoice&quot; appear at the top</li>
          <li>☑ Your business name or your name is shown</li>
          <li>☑ Your ABN is shown</li>
          <li>☑ The invoice has an issue date</li>
          <li>☑ Each item has a clear description</li>
          <li>☑ GST is shown separately, or &quot;Total includes GST&quot; is stated</li>
          <li>☑ The total price (including GST) is clearly shown</li>
          <li>☑ For invoices over $1,000: buyer&#39;s name or ABN is included</li>
        </ul>
        <p>
          Get all eight right and your invoice is fully ATO-compliant. Your clients can claim their GST credits, and you have a clean paper trail for audit time.
        </p>
      </div>
    </div>
  )
}
