import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Australian Tax Guides — SAB Account AI Blog',
  description: 'Free guides for Australian small businesses and sole traders: GST invoices, PAYG withholding, Medicare levy, superannuation, and ABN contractor tax explained clearly.',
  alternates: { canonical: 'https://sabaccountai.com/blog' },
  openGraph: {
    title: 'Australian Tax Guides — SAB Account AI Blog',
    description: 'Free guides for Australian small businesses and sole traders: GST, PAYG, Medicare levy, super, and ABN contractor tax.',
    url: 'https://sabaccountai.com/blog',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'website',
  },
}

const POSTS = [
  {
    slug: 'payroll-tax-australia-2026',
    title: 'Payroll Tax Australia 2026: State Thresholds, Rates and When to Register',
    excerpt: 'Payroll tax is a state tax — completely separate from PAYG withholding. Thresholds range from $900K (VIC) to $2M (ACT). Here are the 2026 rates for all states and territories.',
    date: '11 Jun 2026',
    readTime: '10 min read',
    tag: 'Tax',
  },
  {
    slug: 'contractor-vs-employee-australia',
    title: 'Contractor vs Employee Australia 2026: How to Get the Classification Right',
    excerpt: 'Having an ABN does not make someone a contractor. The High Court looks at the totality of the relationship. Get it wrong and you face years of back-paid super, leave, and fines up to $82,500.',
    date: '11 Jun 2026',
    readTime: '9 min read',
    tag: 'Compliance',
  },
  {
    slug: 'work-from-home-tax-deductions-australia-2026',
    title: 'Work From Home Tax Deductions Australia 2026: The 67 Cents Method Explained',
    excerpt: 'The ATO\'s revised fixed rate is 67 cents per hour worked from home. Here is exactly what it covers, what records you must keep, and when the actual cost method gives a bigger deduction.',
    date: '11 Jun 2026',
    readTime: '9 min read',
    tag: 'Tax',
  },
  {
    slug: 'casual-employee-payroll-australia',
    title: 'How to Pay Casual Employees in Australia 2026: Rates, PAYG and Payslips',
    excerpt: 'Casual employees get 25% loading on top of the award rate, 12% super, and PAYG withholding on every payment. From July 2026 super must be paid on payday. Complete guide for employers.',
    date: '11 Jun 2026',
    readTime: '8 min read',
    tag: 'Payroll',
  },
  {
    slug: 'payslip-requirements-australia',
    title: 'Payslip Requirements Australia 2026: What Every Employer Must Include',
    excerpt: 'The Fair Work Act requires payslips within 1 working day of payday. Here is the complete checklist of what must appear on every Australian payslip — and the penalties if you get it wrong.',
    date: '11 Jun 2026',
    readTime: '8 min read',
    tag: 'Payroll',
  },
  {
    slug: 'instant-asset-write-off-2026',
    title: '$20,000 Instant Asset Write-Off 2026: What Sole Traders Must Buy Before 30 June',
    excerpt: 'Hard deadline: 30 June 2026. Assets must be first used or installed ready for use before midnight to claim the full $20,000 deduction. Learn exactly what qualifies, the install-by rule, mixed-use apportionment, and what records to keep.',
    date: '2 Jun 2026',
    readTime: '10 min read',
    tag: 'EOFY',
  },
  {
    slug: 'eofy-checklist-sole-trader-2026',
    title: 'EOFY 2026 Checklist for Sole Traders: 12 Things to Do Before 30 June',
    excerpt: 'Less than four weeks until the financial year ends. This checklist covers the instant asset write-off, super contributions, WFH records, vehicle logbooks, bad debt write-offs, and what the ATO is cracking down on in FY2026.',
    date: '2 Jun 2026',
    readTime: '11 min read',
    tag: 'EOFY',
  },
  {
    slug: 'payday-super-2026',
    title: 'Payday Super 2026: What Every Australian Employer Must Know Before 1 July',
    excerpt: 'From 1 July 2026, super must be paid within 7 days of every payday — not quarterly. Learn the 7-day rule, SuperStream requirements, penalties for non-compliance, and how to prepare.',
    date: '25 May 2026',
    readTime: '9 min read',
    tag: 'Super',
  },
  {
    slug: 'gst-invoice-template-australia',
    title: 'GST Invoice Template Australia: What Every Tax Invoice Must Include',
    excerpt: 'The ATO has strict rules about what makes a valid tax invoice. Missing even one required field means your clients can\'t claim GST credits. Here\'s exactly what to include.',
    date: '15 May 2026',
    readTime: '6 min read',
    tag: 'GST',
  },
  {
    slug: 'payg-withholding-calculator-australia',
    title: 'PAYG Withholding Calculator Australia: How to Work Out the Right Amount',
    excerpt: 'Get PAYG wrong and your employees face a big tax bill at year end — or you face ATO penalties. This guide walks through the ATO tax scales with real worked examples.',
    date: '12 May 2026',
    readTime: '8 min read',
    tag: 'PAYG',
  },
  {
    slug: 'medicare-levy-exemption-international-students',
    title: 'Medicare Levy Exemption for International Students in Australia',
    excerpt: 'Most temporary visa holders are exempt from the 2% Medicare levy — but only if you apply correctly. We explain who qualifies, how to apply, and what to do on your tax return.',
    date: '8 May 2026',
    readTime: '5 min read',
    tag: 'Medicare',
  },
  {
    slug: 'super-guarantee-rate-australia-2025',
    title: 'Super Guarantee Rate Australia 2025–26: What Employers Must Pay',
    excerpt: 'The Super Guarantee rate rose to 12% on 1 July 2025. This guide explains who must pay it, how to calculate it correctly, and when it rises again.',
    date: '2 May 2026',
    readTime: '5 min read',
    tag: 'Super',
  },
  {
    slug: 'abn-contractor-tax-australia',
    title: 'ABN Contractor Tax Australia: How to Handle Tax When You\'re Self-Employed',
    excerpt: 'As an ABN contractor you\'re responsible for your own tax — no employer withholds it for you. Learn how to set aside the right amount, lodge your BAS, and avoid ATO surprises.',
    date: '28 Apr 2026',
    readTime: '7 min read',
    tag: 'ABN',
  },
  {
    slug: 'best-invoicing-software-australia-sole-trader',
    title: 'Best Invoicing Software for Sole Traders in Australia 2026',
    excerpt: 'Xero costs $35-70/mo in 2026. We compare the best invoicing tools for Australian sole traders — from free options to purpose-built platforms under $20/mo.',
    date: '7 Jun 2026',
    readTime: '6 min read',
    tag: 'Invoicing',
  },
  {
    slug: 'xero-alternatives-australia',
    title: 'Best Xero Alternatives in Australia 2026 (Cheaper Options)',
    excerpt: 'Xero\'s price increases have frustrated Australian sole traders. Here are the best alternatives — most under $20/mo — with a straight comparison of what each one offers.',
    date: '7 Jun 2026',
    readTime: '6 min read',
    tag: 'Invoicing',
  },
  {
    slug: 'how-to-register-gst-australia',
    title: 'How to Register for GST in Australia: Step-by-Step Guide 2026',
    excerpt: 'If your turnover hits $75,000, GST registration is mandatory. Here\'s exactly how to register through the ATO, what changes after registration, and whether voluntary registration makes sense.',
    date: '7 Jun 2026',
    readTime: '7 min read',
    tag: 'GST',
  },
  {
    slug: 'bas-due-dates-australia-2026',
    title: 'BAS Due Dates Australia 2026: When to Lodge Your Business Activity Statement',
    excerpt: 'Missing a BAS deadline triggers ATO penalties and interest. All quarterly and monthly BAS due dates for 2026, plus what to do if you can\'t pay on time.',
    date: '7 Jun 2026',
    readTime: '5 min read',
    tag: 'GST',
  },
  {
    slug: 'sole-trader-tax-deductions-australia',
    title: 'Sole Trader Tax Deductions Australia: What You Can Claim in 2026',
    excerpt: 'Most sole traders leave money on the table at tax time. This guide covers every legitimate deduction — home office, vehicle, equipment, super contributions, and more.',
    date: '7 Jun 2026',
    readTime: '8 min read',
    tag: 'Tax',
  },
  {
    slug: 'accounting-software-tradies-australia',
    title: 'Best Accounting Software for Tradies in Australia 2026',
    excerpt: 'Tradies need software that works on-site, generates ATO-compliant invoices, and tracks GST without complexity. Here\'s what actually works for Australian tradies in 2026.',
    date: '7 Jun 2026',
    readTime: '6 min read',
    tag: 'Invoicing',
  },
  {
    slug: 'how-much-tax-sole-trader-australia',
    title: 'How Much Tax Does a Sole Trader Pay in Australia? 2026 Guide',
    excerpt: 'Sole traders pay individual marginal tax rates on net profit. See real tax examples for common income levels, how PAYG instalments work, and legal ways to reduce your bill.',
    date: '7 Jun 2026',
    readTime: '7 min read',
    tag: 'Tax',
  },
  {
    slug: 'do-sole-traders-pay-super-australia',
    title: 'Do Sole Traders Pay Super in Australia? 2026 Guide',
    excerpt: 'Your own super is optional but tax-deductible. Employee super is mandatory. Contractor super depends on the arrangement. Here\'s the full picture for 2026.',
    date: '7 Jun 2026',
    readTime: '6 min read',
    tag: 'Super',
  },
  {
    slug: 'single-touch-payroll-small-business-australia',
    title: 'Single Touch Payroll for Small Business: Complete Guide Australia 2026',
    excerpt: 'STP is mandatory for all Australian employers. This guide explains what STP Phase 2 requires, how it works in practice, and what small businesses need to do to comply.',
    date: '7 Jun 2026',
    readTime: '7 min read',
    tag: 'Payroll',
  },
  {
    slug: 'how-to-pay-super-employees-australia',
    title: 'How to Pay Super for Employees in Australia: Step-by-Step 2026',
    excerpt: 'Miss a super deadline and the ATO\'s Super Guarantee Charge kicks in — with interest and admin fees. Here\'s how to pay super correctly, including the Payday Super changes from July 2026.',
    date: '7 Jun 2026',
    readTime: '7 min read',
    tag: 'Super',
  },
]

const TAG_COLORS: Record<string, string> = {
  EOFY: '#e11d48',
  GST: '#d97706',
  PAYG: '#2563eb',
  Medicare: '#059669',
  Super: '#7c3aed',
  ABN: '#dc2626',
  Invoicing: '#0891b2',
  Tax: '#b45309',
  Payroll: '#6d28d9',
  Compliance: '#0f766e',
}

type DbPost = { slug: string; title: string; excerpt: string; tag: string; date_published: string; read_time: string }

async function getDbPosts(): Promise<DbPost[]> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, tag, date_published, read_time')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    return (data ?? []) as DbPost[]
  } catch {
    return []
  }
}

export default async function BlogPage() {
  const dbPosts = await getDbPosts()
  const allPosts = [
    ...dbPosts.map(p => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, tag: p.tag, date: p.date_published, readTime: p.read_time })),
    ...POSTS,
  ]

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
          <Link href="#pricing" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/signup" style={{ color: 'var(--ember)', textDecoration: 'none', fontWeight: 600 }}>Get started free</Link>
        </div>
      </header>

      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          Australian Tax Guides
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text2)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          Plain-English guides for Australian small businesses and sole traders — GST, PAYG, super, and more.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {allPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <article style={{
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${TAG_COLORS[post.tag] ?? 'var(--ember)'}`,
                borderRadius: 'var(--r)',
                padding: '1.5rem',
                transition: 'box-shadow 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: TAG_COLORS[post.tag] ?? 'var(--ember)',
                    background: `${TAG_COLORS[post.tag] ?? 'var(--ember)'}18`,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                  }}>
                    {post.tag}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>{post.date} · {post.readTime}</span>
                </div>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                  {post.title}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.6 }}>
                  {post.excerpt}
                </p>
                <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--ember)', fontWeight: 500 }}>
                  Read guide →
                </p>
              </article>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'var(--ember-p)', borderRadius: 'var(--r)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9375rem', color: 'var(--char)', fontWeight: 600, marginBottom: '0.5rem' }}>
            Ready to put this into practice?
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>
            SAB Account AI handles GST invoices, PAYG payslips, and expense tracking — all ATO-compliant.
          </p>
          <Link href="/signup" style={{
            display: 'inline-block',
            background: 'var(--ember)',
            color: '#fff',
            padding: '0.625rem 1.25rem',
            borderRadius: 'var(--r)',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            Start free — no credit card
          </Link>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text3)' }}>
        © {new Date().getFullYear()} SAB Account AI ·{' '}
        <Link href="/terms" style={{ color: 'var(--text3)' }}>Terms</Link> ·{' '}
        <Link href="/privacy" style={{ color: 'var(--text3)' }}>Privacy</Link>
      </footer>
    </div>
  )
}
