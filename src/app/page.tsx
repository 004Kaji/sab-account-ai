import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'SAB Account AI — ATO-Compliant Invoicing for Australian Small Business',
  description: 'Create professional tax invoices in 30 seconds with AI. ATO-verified PAYG payslips for Australian small businesses, freelancers and international workers. Free plan available.',
  alternates: { canonical: 'https://sabaccountai.com' },
}

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: 'AI Invoice Generation',
    desc: 'Describe the job in plain English. Claude AI extracts client details, line items, and pricing automatically.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
      </svg>
    ),
    title: 'ATO-Compliant Payslips',
    desc: 'Correct PAYG withholding using ATO Scale 1 & 2 tables. Superannuation at the current 12% rate. HELP repayment included.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zm9.75-5.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v12.375c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0112.75 19.5V7.5zm-4.875 4.5c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v7.875c0 .621-.504 1.125-1.125 1.125H9a1.125 1.125 0 01-1.125-1.125V12z" />
      </svg>
    ),
    title: 'GST & BAS Tracking',
    desc: 'Track income and expenses. See your GST position instantly. Export records for your BAS lodgement.',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    desc: 'Get started with basic invoicing.',
    cta: 'Start free',
    href: '/signup',
    highlight: false,
    features: ['3 invoices per month', 'Manual invoice builder', 'PDF download', 'GST calculation'],
  },
  {
    name: 'Starter',
    price: '$9',
    period: '/month',
    desc: 'For freelancers who invoice regularly.',
    cta: 'Start 14-day trial',
    href: '/signup?plan=starter',
    highlight: false,
    features: ['Unlimited invoices', 'AI invoice generation', 'Professional PDF', 'GST & BAS tracking', 'Income & expense records'],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    desc: 'Full ATO compliance for growing businesses.',
    cta: 'Start 14-day trial',
    href: '/signup?plan=pro',
    highlight: false,
    features: ['Everything in Starter', 'ATO-compliant payslips', 'PAYG withholding (Scale 1 & 2)', 'Payday Super tracking', 'BAS estimates', 'Priority support'],
  },
  {
    name: 'Autopilot',
    price: '$49',
    period: '/month',
    desc: 'Your business runs itself. You just approve.',
    cta: 'Start 14-day trial',
    href: '/signup?plan=autopilot',
    highlight: true,
    features: ['Everything in Pro', 'SAB Chat AI assistant', 'Create payslips & invoices by message', 'ATO compliance answers instantly', 'Business summaries on demand'],
    teaser: true,
  },
]

function Check({ highlight }: { highlight: boolean }) {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
      <path d="M2.5 7l3 3 6-6" stroke={highlight ? '#E05A3A' : '#4A7055'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const SOFTWARE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SAB Account AI',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  offers: [
    { '@type': 'Offer', price: '0',  priceCurrency: 'AUD', name: 'Free'      },
    { '@type': 'Offer', price: '9',  priceCurrency: 'AUD', name: 'Starter'   },
    { '@type': 'Offer', price: '19', priceCurrency: 'AUD', name: 'Pro'       },
    { '@type': 'Offer', price: '49', priceCurrency: 'AUD', name: 'Autopilot' },
  ],
  description: 'AI-powered invoicing and ATO-compliant payslips for Australian small businesses and freelancers.',
  url: 'https://sabaccountai.com',
  screenshot: 'https://sabaccountai.com/og-image.png',
  featureList: ['AI invoice generation', 'ATO-compliant PAYG calculation', 'Medicare levy exemption for international workers', 'ABN contractor payments', 'BAS estimate calculator'],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'How much does SAB Account AI cost?', acceptedAnswer: { '@type': 'Answer', text: 'Free plan includes 3 invoices per month. Starter plan is $9/month with unlimited invoices and AI generation. Pro plan is $19/month and adds ATO-compliant PAYG payslips, superannuation tracking, and BAS estimates.' } },
    { '@type': 'Question', name: 'Is SAB Account AI ATO compliant?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. PAYG calculations are verified across 19 ATO tax scenarios including Medicare levy, LITO, HELP/HECS debt repayment, and all visa types including working holiday makers and international students.' } },
    { '@type': 'Question', name: 'Does SAB Account AI handle Payday Super?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Payday Super starts 1 July 2026. SAB Account AI automatically calculates and tracks superannuation on every pay run, ensuring you meet the new ATO requirements from day one.' } },
    { '@type': 'Question', name: 'How long does it take to create an invoice?', acceptedAnswer: { '@type': 'Answer', text: 'About 30 seconds. Describe your job in plain English and the AI generates a professional ATO-compliant tax invoice with correct GST calculations instantly.' } },
  ],
}

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SAB Account AI',
  url: 'https://sabaccountai.com',
  logo: 'https://sabaccountai.com/icon-512.png',
  contactPoint: { '@type': 'ContactPoint', email: 'support@sabaccountai.com', contactType: 'customer support' },
  areaServed: 'AU',
  knowsAbout: ['Australian tax', 'PAYG withholding', 'GST', 'Superannuation', 'ATO compliance', 'Payday Super'],
}

export default function HomePage() {
  const showPaydayBanner = Date.now() < new Date('2026-07-28').getTime()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }} />

      {/* ── Payday Super urgency banner ────────────────────────── */}
      {showPaydayBanner && (
        <a href="/payday-super" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: 'var(--ember)',
            color: '#fff',
            textAlign: 'center',
            padding: '0.625rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}>
            ⚡ Payday Super starts <strong>1 July 2026</strong> — Every employer must pay super on every payday. <span style={{ textDecoration: 'underline' }}>Is your business ready? →</span>
          </div>
        </a>
      )}

      {/* ── Navigation ─────────────────────────────────────────── */}
      <style>{`
        .landing-nav { padding-top: max(1rem, env(safe-area-inset-top)); padding-bottom: 1rem; padding-left: 2rem; padding-right: 2rem; }
        @media (max-width: 640px) {
          .landing-nav { padding-left: 1rem; padding-right: 1rem; }
          .nav-desktop { display: none !important; }
          .nav-cta-full { display: none !important; }
          .nav-cta-short { display: inline-flex !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .product-input { font-size: 0.8125rem !important; }
          .trust-bar-inner { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 0.625rem 1rem !important; justify-items: start !important; }
        }
        .nav-cta-short { display: none; }
        .pricing-grid { display: grid !important; grid-template-columns: 1fr !important; gap: 1.25rem !important; align-items: start !important; }
        @media (min-width: 600px) { .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (min-width: 960px) { .pricing-grid { grid-template-columns: repeat(4, 1fr) !important; } }
      `}</style>
      <nav className="landing-nav" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)', background: '#ffffff',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--ember)" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="font-display" style={{ fontWeight: 600, color: 'var(--char)', fontSize: '1rem', letterSpacing: '-0.02em' }}>SAB Account AI</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="#pricing" className="nav-desktop" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>Pricing</a>
          <a href="/blog" className="nav-desktop" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>Blog</a>
          <a href="/login" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>Sign in</a>
          <a href="/signup" className="btn btn-ember nav-cta-full" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Get started free</a>
          <a href="/signup" className="btn btn-ember nav-cta-short" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Get started</a>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '5rem 1.5rem 3rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.8125rem',
          fontWeight: 500, padding: '0.375rem 0.875rem', borderRadius: '999px',
          marginBottom: '1.5rem', border: '1px solid rgba(200,75,47,0.2)',
        }}>
          <span>✦</span> Built for Australian small business
        </div>

        <h1 className="font-display" style={{
          fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', lineHeight: 1.1,
          letterSpacing: '-0.03em', color: 'var(--char)',
          maxWidth: '680px', margin: '0 auto 1.25rem',
        }}>
          Smart Invoicing &amp;<br />
          <span style={{ color: 'var(--ember)' }}>ATO Compliance</span><br />
          in One Place
        </h1>

        <p style={{ fontSize: '1.0625rem', color: 'var(--text2)', maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: 1.65 }}>
          Create ATO-compliant invoices and payslips your way — fill them in manually or let AI do it for you. You stay in control. No accounting knowledge needed.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/signup" className="btn btn-ember" style={{ padding: '0.75rem 1.75rem', fontSize: '0.9375rem' }}>Start for free</a>
          <a href="/login" className="btn btn-outline" style={{ padding: '0.75rem 1.75rem', fontSize: '0.9375rem' }}>Sign in</a>
        </div>

        <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>
          No credit card required · 14-day free trial on paid plans
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
          <a href="/ato-verification" style={{ color: 'var(--text3)', textDecoration: 'none' }}>✓ ATO NAT 1004 verified — 25 May 2026</a>
        </p>
      </section>

      {/* ── Trust bar ──────────────────────────────────────────── */}
      <div style={{ background: 'var(--char)', padding: '0.875rem 1.5rem' }}>
        <div className="trust-bar-inner" style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '2rem', flexWrap: 'wrap', maxWidth: '800px', margin: '0 auto',
        }}>
          {['ATO NAT 1004 verified', 'Australian owned & built', 'No credit card required', 'Cancel anytime'].map(item => (
            <span key={item} style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ color: '#4ade80' }}>✓</span> {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Product preview — SAB Chat demo ────────────────────── */}
      <section style={{ padding: '4rem 1.5rem 1rem', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--ember)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>See it in action</p>
          <h2 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--char)', letterSpacing: '-0.02em' }}>Just tell SAB what you need</h2>
          <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginTop: '0.5rem' }}>Your AI bookkeeper — payslips, invoices, ATO answers, and reminders before deadlines.</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          {/* chat header */}
          <div style={{ background: 'var(--char)', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--ember)' }}>SAB</span>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem' }}>SAB Chat</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em', color: '#B8AAFF', background: 'rgba(100,80,200,0.3)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>AUTOPILOT</span>
          </div>

          {/* thread */}
          <div style={{ background: 'var(--cream)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

            {/* invoice exchange */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ maxWidth: '80%', background: 'var(--ember)', color: '#fff', padding: '0.625rem 0.875rem', borderRadius: '16px 16px 4px 16px', fontSize: '0.875rem', lineHeight: 1.5 }}>
                Invoice John Smith — 3 hrs plumbing at $85/hr + $240 parts, inc GST
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--char)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.5625rem', fontWeight: 700, color: 'var(--ember)' }}>SAB</span>
              <div style={{ maxWidth: '82%' }}>
                <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '0.625rem 0.875rem', borderRadius: '16px 16px 16px 4px', fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.55 }}>
                  Done. Tax invoice <strong>#0042</strong> for John Smith:<br />
                  Labour (3 hrs × $85) $255.00 · Parts $240.00 · GST $49.50<br />
                  Total <strong>$544.50</strong>. Want me to send it?
                </div>
                <div style={{ marginTop: '0.5rem', display: 'inline-flex', background: 'var(--ember)', color: '#fff', borderRadius: '8px', padding: '0.4rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                  Send to John →
                </div>
              </div>
            </div>

            {/* user message — payslip */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ maxWidth: '80%', background: 'var(--ember)', color: '#fff', padding: '0.625rem 0.875rem', borderRadius: '16px 16px 4px 16px', fontSize: '0.875rem', lineHeight: 1.5 }}>
                Create a payslip for Sarah — 38 hours this week
              </div>
            </div>

            {/* SAB reply with payslip result */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--char)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.5625rem', fontWeight: 700, color: 'var(--ember)' }}>SAB</span>
              <div style={{ maxWidth: '82%' }}>
                <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '0.625rem 0.875rem', borderRadius: '16px 16px 16px 4px', fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.55 }}>
                  Done. Sarah&apos;s pay this week:<br />
                  Gross <strong>$1,330.00</strong> · PAYG tax $268.00 · Super $159.60<br />
                  Net <strong>$1,062.00</strong>. Want me to email it to her?
                </div>
                <div style={{ marginTop: '0.5rem', display: 'inline-flex', background: 'var(--ember)', color: '#fff', borderRadius: '8px', padding: '0.4rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                  Send to Sarah →
                </div>
              </div>
            </div>

            {/* proactive reminder */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--char)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.5625rem', fontWeight: 700, color: 'var(--ember)' }}>SAB</span>
              <div style={{ maxWidth: '82%' }}>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ember)' }}>🔔 Reminder from SAB</p>
                <div style={{ background: 'rgba(200,75,47,0.06)', border: '1px solid var(--border)', borderLeft: '3px solid var(--ember)', padding: '0.625rem 0.875rem', borderRadius: '16px 16px 16px 4px', fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.55 }}>
                  Heads up — <strong>$1,840</strong> in super is due across your team by <strong>30 Jun</strong> under the new Payday Super rules. Pay it from your own bank — I&apos;ll keep track, the transfer&apos;s yours to make.
                </div>
              </div>
            </div>
          </div>

          {/* input bar */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#fff' }}>
            <div style={{ flex: 1, color: 'var(--text3)', fontSize: '0.875rem' }}>Ask SAB anything…</div>
            <div style={{ background: 'var(--ember)', color: '#fff', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.8125rem', fontWeight: 600 }}>Send</div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text3)', marginTop: '1rem' }}>
          Payslips, invoices, BAS &amp; super — done by message. On the Autopilot plan.
        </p>
      </section>

      {/* ── Manual or AI — your choice ─────────────────────────── */}
      <section style={{ padding: '0 1.5rem 4rem', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Your way — manual or AI
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
            Not comfortable with AI doing your invoices? No problem. You can fill everything in yourself. AI is just an option, not a requirement.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Manual */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--r)', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
              </div>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--char)', fontSize: '1rem' }}>Fill it in yourself</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>Full manual control</p>
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                'Type client name, job description, amounts',
                'GST calculated automatically from ATO rules',
                'Professional PDF with your ABN and business details',
                'You decide every field — nothing is assumed',
              ].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text2)' }}>
                  <span style={{ color: '#4A7055', flexShrink: 0, marginTop: '0.1rem' }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* AI */}
          <div style={{ background: '#fff', border: '2px solid var(--ember)', borderRadius: 'var(--r2)', padding: '2rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-0.75rem', left: '1.5rem', background: 'var(--ember)', color: '#fff', fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Faster
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--r)', background: 'var(--ember-p)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ember)" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--char)', fontSize: '1rem' }}>Let AI draft it</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>You always review before sending</p>
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                'Describe the job in plain English',
                'AI fills in line items, GST, and client details',
                'You review and edit anything before saving',
                'Same ATO-compliant PDF — just takes 30 seconds',
              ].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--ember)', flexShrink: 0, marginTop: '0.1rem' }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: '1.25rem', fontSize: '0.8125rem', color: 'var(--text3)', lineHeight: 1.5 }}>
              AI is a shortcut, not a replacement. It never lodges anything with the ATO — you do.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section style={{ padding: '2rem 1.5rem 4rem', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--char)', letterSpacing: '-0.02em' }}>How it works</h2>
          <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginTop: '0.5rem' }}>Three steps. No accountant needed.</p>
        </div>
        <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {[
            { step: '1', title: 'Describe the job', desc: 'Type what you did in plain English. No templates, no confusing fields to fill in.' },
            { step: '2', title: 'AI builds the invoice', desc: 'Claude AI extracts line items, calculates GST, and formats everything to ATO standards.' },
            { step: '3', title: 'Download & send', desc: 'Get a professional PDF tax invoice instantly. Send it to your client. Done.' },
          ].map(item => (
            <div key={item.step} style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r2)' }}>
              <div style={{
                width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                background: 'var(--ember)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 700, margin: '0 auto 1rem',
              }}>
                {item.step}
              </div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section style={{ padding: '1rem 1.5rem 3rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--char)', letterSpacing: '-0.02em' }}>Everything you need to stay ATO-compliant</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="sab-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--r)', background: 'var(--ember-p)', color: 'var(--ember)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--char)' }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Payday Super callout ────────────────────────────────── */}
      {showPaydayBanner && (
        <section style={{ padding: '0 1.5rem 3rem', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{
            background: 'var(--char)', borderRadius: 'var(--r2)', padding: '2rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '1.5rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ background: 'var(--ember)', color: '#fff', fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1 July 2026
                </span>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Payday Super — 1 July 2026</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                Super must be paid on every payday from 1 July 2026
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, maxWidth: '480px' }}>
                ATO penalties start immediately with no grace period. SAB Account AI calculates and tracks Payday Super automatically on every pay run.
              </p>
            </div>
            <a href="/payday-super" className="btn btn-ember" style={{ whiteSpace: 'nowrap', padding: '0.75rem 1.5rem' }}>
              Learn more →
            </a>
          </div>
        </section>
      )}

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '2rem 1.5rem 4rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 className="font-display" style={{ fontSize: '2rem', color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Simple pricing</h2>
          <p style={{ color: 'var(--text2)', fontSize: '0.9375rem' }}>Start free. Upgrade only when you need more.</p>
        </div>

        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          {PLANS.map((plan) => (
            <div key={plan.name} style={{
              background: plan.highlight ? 'var(--char)' : '#ffffff',
              border: plan.highlight ? '2px solid var(--ember)' : '1px solid var(--border)',
              borderRadius: 'var(--r2)', padding: '1.75rem', position: 'relative', overflow: 'hidden',
            }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--ember)', color: '#fff', fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '999px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  ⭐ Popular
                </div>
              )}
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: plan.highlight ? '#fff' : 'var(--char)', marginBottom: '0.5rem' }}>{plan.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
                <span className="font-display" style={{ fontSize: '2.25rem', fontWeight: 700, color: plan.highlight ? '#fff' : 'var(--char)', lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: '0.875rem', color: plan.highlight ? 'rgba(255,255,255,0.5)' : 'var(--text3)' }}>{plan.period}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: plan.highlight ? 'rgba(255,255,255,0.6)' : 'var(--text2)', marginBottom: '1.5rem', lineHeight: 1.5 }}>{plan.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: plan.highlight ? 'rgba(255,255,255,0.8)' : 'var(--text)' }}>
                    <Check highlight={plan.highlight} />{feature}
                  </li>
                ))}
              </ul>
              {'teaser' in plan && plan.teaser && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                    … <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>One message. Everything done.</span>
                    {' '}Something new is coming for Autopilot members.{' '}
                    <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)' }}>Early access Q3 2026.</span>
                  </p>
                </div>
              )}
              <a href={plan.href} className="btn" style={{ display: 'flex', width: '100%', justifyContent: 'center', background: plan.highlight ? 'var(--ember)' : 'transparent', color: plan.highlight ? '#fff' : 'var(--char)', border: plan.highlight ? 'none' : '1px solid var(--border)', textDecoration: 'none' }}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>
          All prices in AUD + GST · Cancel anytime · No hidden fees
        </p>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '2.5rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--ember)" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)' }}>SAB Account AI</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', lineHeight: 1.6 }}>ATO-compliant invoicing and payroll<br />for Australian small businesses.</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginTop: '0.375rem' }}>ABN: 49 541 449 108</p>
          </div>
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--char)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>Product</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <a href="#pricing" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>Pricing</a>
                <a href="/signup" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>Sign up free</a>
                <a href="/login" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>Sign in</a>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--char)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>Resources</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <a href="/payday-super" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>Payday Super 2026</a>
                <a href="/blog" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>Australian tax guides</a>
                <a href="/terms" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>Terms of Service</a>
                <a href="/privacy" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>Privacy Policy</a>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--char)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>Contact</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <a href="mailto:support@sabaccountai.com" style={{ fontSize: '0.875rem', color: 'var(--text2)', textDecoration: 'none' }}>support@sabaccountai.com</a>
              </div>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>© {new Date().getFullYear()} SAB Account AI. For productivity purposes only — not a registered tax agent.</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>Made in Australia 🇦🇺</p>
        </div>
      </footer>
    </div>
  )
}
