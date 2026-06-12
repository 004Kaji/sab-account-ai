import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accountant Partner Program — SAB Account AI',
  description: 'Refer your clients to SAB Account AI and earn 20% ongoing commission. Free to join, no minimums, paid monthly.',
  alternates: { canonical: 'https://sabaccountai.com/partners' },
  openGraph: {
    title: 'Accountant Partner Program — SAB Account AI',
    description: 'Refer your clients and earn 20% ongoing commission. Free to join.',
    url: 'https://sabaccountai.com/partners',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'website',
  },
}

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Sign up as a partner',
    body: 'Fill in the form below — takes 2 minutes. We\'ll send you a unique referral link within 24 hours.',
  },
  {
    step: '2',
    title: 'Share your link',
    body: 'Send it to clients who need invoicing, payslip, or BAS help. Use email, your website, or in-person.',
  },
  {
    step: '3',
    title: 'Earn 20% every month',
    body: 'You earn 20% of each referred client\'s subscription — every month they stay. No cap, no expiry.',
  },
]

const FAQS = [
  {
    q: 'How much can I earn?',
    a: 'A client on the Pro plan ($19/mo) earns you $3.80/mo. Refer 10 active clients = $38/mo. 50 clients = $190/mo in passive income — ongoing, not one-off.',
  },
  {
    q: 'When do I get paid?',
    a: 'Commissions are paid monthly via bank transfer. Minimum payout is $20. We\'ll send a statement each month showing clicks, signups, and earnings.',
  },
  {
    q: 'Do my clients get anything?',
    a: 'Yes — referred clients get their first month free. A good reason for them to try it.',
  },
  {
    q: 'Is there a cost to join?',
    a: 'No. The partner program is completely free. There are no minimums and no lock-in.',
  },
  {
    q: 'What types of clients is this best for?',
    a: 'Sole traders, freelancers, tradies, and small businesses (under 20 staff) who currently do invoicing and payslips manually or with Xero/MYOB.',
  },
  {
    q: 'Can I use it myself?',
    a: 'Yes. Many partner accountants use SAB Account AI for their own business tasks too. We\'re happy to set you up on a complimentary account.',
  },
]

export default function PartnersPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Nav */}
      <header style={{ background: 'var(--char)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 1.5rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ember)" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem' }}>SAB Account AI</span>
        </Link>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', alignItems: 'center' }}>
          <Link href="/blog" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Blog</Link>
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/signup" style={{ color: 'var(--ember)', textDecoration: 'none', fontWeight: 600 }}>Get started free</Link>
        </div>
      </header>

      <main>

        {/* Hero */}
        <section style={{ background: 'var(--char)', padding: '4rem 1.5rem 5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ember)', background: 'rgba(200,75,47,0.15)', border: '1px solid rgba(200,75,47,0.3)', borderRadius: '999px', padding: '0.3rem 0.875rem', marginBottom: '1.5rem' }}>
              Partner Program
            </span>
            <h1 className="font-display" style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Refer clients.<br />
              <em style={{ color: 'var(--ember)', fontStyle: 'italic' }}>Earn 20% every month.</em>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.0625rem', lineHeight: 1.65, marginBottom: '2rem', maxWidth: '520px', margin: '0 auto 2rem' }}>
              Australian accountants and bookkeepers — recommend SAB Account AI to your clients and earn 20% ongoing commission. No cap, no expiry, paid monthly.
            </p>
            <a href="#apply" style={{ display: 'inline-block', background: 'var(--ember)', color: '#fff', padding: '0.875rem 2rem', borderRadius: 'var(--r)', fontWeight: 700, fontSize: '1rem', textDecoration: 'none' }}>
              Apply now — it&apos;s free
            </a>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8125rem', marginTop: '0.875rem' }}>
              No minimums · No lock-in · Paid monthly
            </p>
          </div>
        </section>

        {/* Commission callout */}
        <section style={{ background: '#fff', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '2.5rem 1.5rem' }}>
          <div style={{ maxWidth: '780px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
            {[
              { value: '20%', label: 'Commission rate', sub: 'on every referred subscription' },
              { value: '$0', label: 'Cost to join', sub: 'completely free, always' },
              { value: 'Monthly', label: 'Payout schedule', sub: 'bank transfer, no delays' },
              { value: 'Forever', label: 'Commission duration', sub: 'as long as the client stays' },
            ].map(({ value, label, sub }) => (
              <div key={label}>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ember)', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>{value}</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: '4rem 1.5rem', maxWidth: '780px', margin: '0 auto' }}>
          <h2 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.5rem', textAlign: 'center' }}>
            How it works
          </h2>
          <p style={{ color: 'var(--text2)', textAlign: 'center', marginBottom: '3rem', fontSize: '0.9375rem' }}>
            Three steps from sign-up to monthly income.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {HOW_IT_WORKS.map(({ step, title, body }) => (
              <div key={step} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.75rem' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', background: 'var(--ember)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9375rem' }}>{step}</span>
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What your clients get */}
        <section style={{ background: 'var(--char)', padding: '4rem 1.5rem' }}>
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <h2 className="font-display" style={{ fontSize: '1.75rem', color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.5rem', textAlign: 'center' }}>
              What your clients get
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '3rem', fontSize: '0.9375rem' }}>
              The product you&apos;re recommending — ATO-compliant, Australian-built.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { icon: '🧾', title: 'AI Tax Invoices', body: 'Describe the job in plain English — AI generates a fully ATO-compliant GST invoice in seconds.' },
                { icon: '💼', title: 'PAYG Payslips', body: 'Correct PAYG withholding using ATO tax scales, super at 12%, Fair Work compliant.' },
                { icon: '📊', title: 'BAS Estimates', body: 'Running GST summary for quarterly BAS lodgement — no spreadsheets needed.' },
                { icon: '⚡', title: 'Payday Super', body: 'Built-in super tracking aligned with the July 2026 Payday Super changes.' },
              ].map(({ icon, title, body }) => (
                <div key={title} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--r)', padding: '1.5rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{icon}</div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{title}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{body}</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>
              Clients get their first month free when they use your referral link.
            </p>
          </div>
        </section>

        {/* FAQs */}
        <section style={{ padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto' }}>
          <h2 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '2.5rem', textAlign: 'center' }}>
            Common questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {FAQS.map(({ q, a }) => (
              <div key={q} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem 1.5rem' }}>
                <p style={{ fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>{q}</p>
                <p style={{ color: 'var(--text2)', fontSize: '0.875rem', lineHeight: 1.65 }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Application form */}
        <section id="apply" style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '4rem 1.5rem' }}>
          <div style={{ maxWidth: '520px', margin: '0 auto' }}>
            <h2 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.5rem', textAlign: 'center' }}>
              Apply to become a partner
            </h2>
            <p style={{ color: 'var(--text2)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9375rem' }}>
              We review applications within 1 business day and send your referral link by email.
            </p>

            {/* Mailto form — simple, no backend needed */}
            <form
              action="mailto:basnet@sabaccountai.com"
              method="get"
              encType="text/plain"
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label className="sab-label">Your name *</label>
                <input type="text" name="Your name" required className="sab-input" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="sab-label">Business / firm name *</label>
                <input type="text" name="Firm name" required className="sab-input" placeholder="Smith & Co Accounting" />
              </div>
              <div>
                <label className="sab-label">Email address *</label>
                <input type="email" name="Email" required className="sab-input" placeholder="jane@smithaccounting.com.au" />
              </div>
              <div>
                <label className="sab-label">Phone number</label>
                <input type="tel" name="Phone" className="sab-input" placeholder="0400 000 000" />
              </div>
              <div>
                <label className="sab-label">How many clients do you think you could refer?</label>
                <select name="Estimated referrals" className="sab-input" style={{ cursor: 'pointer' }}>
                  <option value="">Select an option</option>
                  <option value="1-5">1–5 clients</option>
                  <option value="6-20">6–20 clients</option>
                  <option value="21-50">21–50 clients</option>
                  <option value="50+">50+ clients</option>
                </select>
              </div>
              <div>
                <label className="sab-label">Anything else you&apos;d like us to know?</label>
                <textarea
                  name="Notes"
                  rows={3}
                  className="sab-input"
                  style={{ resize: 'vertical', minHeight: '80px' }}
                  placeholder="Optional — any questions, or how you found us"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Send application
              </button>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
                This opens your email client. Or email us directly at{' '}
                <a href="mailto:basnet@sabaccountai.com" style={{ color: 'var(--ember)' }}>basnet@sabaccountai.com</a>
              </p>
            </form>
          </div>
        </section>

      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text3)' }}>
        © {new Date().getFullYear()} SAB Account AI ·{' '}
        <Link href="/terms" style={{ color: 'var(--text3)' }}>Terms</Link> ·{' '}
        <Link href="/privacy" style={{ color: 'var(--text3)' }}>Privacy</Link>
      </footer>
    </div>
  )
}
