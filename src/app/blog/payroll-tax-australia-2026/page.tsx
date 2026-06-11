import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Payroll Tax Australia 2026: State Thresholds, Rates and When to Register',
  description: 'Payroll tax is a state tax — completely separate from PAYG withholding. Here are the 2026 thresholds and rates for NSW, VIC, QLD, WA, SA, TAS, ACT and NT.',
  alternates: { canonical: 'https://sabaccountai.com/blog/payroll-tax-australia-2026' },
  openGraph: {
    title: 'Payroll Tax Australia 2026: State Thresholds, Rates and When to Register',
    description: 'State-by-state payroll tax thresholds and rates for Australia in 2026. Learn when your business needs to register and what wages are included.',
    url: 'https://sabaccountai.com/blog/payroll-tax-australia-2026',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Payroll Tax Australia 2026: State Thresholds, Rates and When to Register',
  description: 'Complete guide to payroll tax in Australia 2026 — state-by-state thresholds, rates, what wages are included, and how to register.',
  datePublished: '2026-06-11',
  dateModified: '2026-06-11',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/payroll-tax-australia-2026' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is payroll tax in Australia and who pays it?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Payroll tax is a state and territory tax levied on businesses whose total Australian wages exceed the threshold set by their state. It is calculated as a percentage of wages (typically 4.75%–6.85% depending on the state). It is completely separate from the federal PAYG withholding system.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the payroll tax threshold in NSW for 2026?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'In NSW, the payroll tax threshold for 2025-26 is $1.2 million in total annual wages. The tax rate is 5.45%. Businesses with wages below this threshold do not pay NSW payroll tax, but must still register if they operate in multiple states where the combined wages exceed those states\' thresholds.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is payroll tax the same as PAYG withholding?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. PAYG withholding is a federal obligation — you withhold income tax from employee wages and send it to the ATO. Payroll tax is a state tax levied on the employer based on the total wages bill. They are reported separately, to different authorities, and have different thresholds and calculations.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does superannuation count toward payroll tax?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'In most states, superannuation contributions made by the employer count as taxable wages for payroll tax purposes. This includes the Superannuation Guarantee amounts. Salary-sacrificed super may also be included depending on the state. Check your specific state revenue office for the exact treatment.',
      },
    },
    {
      '@type': 'Question',
      name: 'If I operate in multiple states, do I pay payroll tax to each?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The threshold applies to your total Australian wages across all states. If you exceed the threshold, you register in each state where you pay wages and calculate the tax based on the proportion of wages paid in that state — but using each state\'s own rate. Some states have harmonised rules to simplify multi-state employers\' obligations.',
      },
    },
  ],
}

const STATE_DATA = [
  {
    state: 'NSW',
    fullName: 'New South Wales',
    threshold: '$1,200,000',
    rate: '5.45%',
    notes: 'Monthly payments required. Annual reconciliation in July.',
    authority: 'Revenue NSW',
  },
  {
    state: 'VIC',
    fullName: 'Victoria',
    threshold: '$900,000',
    rate: '4.85% (metro) · 1.2125% (regional)',
    notes: 'Regional employer rate applies to 85%+ regional wages. Threshold reduces for wages over $3M.',
    authority: 'State Revenue Office Victoria',
  },
  {
    state: 'QLD',
    fullName: 'Queensland',
    threshold: '$1,300,000',
    rate: '4.75% (up to $6.5M) · 4.95% (over $6.5M)',
    notes: 'Monthly or annual lodgement. Threshold phases out for wages $1.3M–$6.5M.',
    authority: 'Queensland Revenue Office',
  },
  {
    state: 'WA',
    fullName: 'Western Australia',
    threshold: '$1,000,000',
    rate: '5.5%',
    notes: 'Threshold tapers for wages between $1M–$7.5M — a reducing exemption applies.',
    authority: 'Department of Finance WA',
  },
  {
    state: 'SA',
    fullName: 'South Australia',
    threshold: '$1,500,000',
    rate: '4.95%',
    notes: 'Graduated rate applies. Monthly payments for wages above $600K/month.',
    authority: 'RevenueSA',
  },
  {
    state: 'TAS',
    fullName: 'Tasmania',
    threshold: '$1,250,000',
    rate: '6.1%',
    notes: 'Has the highest headline rate in Australia. Monthly or annual lodgement.',
    authority: 'State Revenue Office Tasmania',
  },
  {
    state: 'ACT',
    fullName: 'Australian Capital Territory',
    threshold: '$2,000,000',
    rate: '6.85%',
    notes: 'Highest threshold in Australia. Monthly lodgement required above threshold.',
    authority: 'ACT Revenue Office',
  },
  {
    state: 'NT',
    fullName: 'Northern Territory',
    threshold: '$1,500,000',
    rate: '5.5%',
    notes: 'Annual lodgement only. No monthly returns.',
    authority: 'Territory Revenue Office',
  },
]

export default function PayrollTaxAustraliaPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{ color: 'var(--ember)', fontSize: '0.875rem', textDecoration: 'none' }}>← Blog</Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tax</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--char)', lineHeight: 1.2, marginBottom: '1rem' }}>
          Payroll Tax Australia 2026: State Thresholds, Rates and When to Register
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Payroll tax trips up growing Australian businesses every year — primarily because many owners do not realise it exists until they receive a state revenue office notice. Unlike PAYG withholding (which you know about from day one of employing staff), payroll tax only becomes relevant once your wages bill crosses a threshold. And by then, you may already owe backdated tax from the month you crossed the line. Here is what you need to know.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            Payroll tax is a <strong>state tax on employers</strong> — completely separate from the federal PAYG system. Thresholds range from $900,000 (VIC) to $2,000,000 (ACT). Rates range from 4.75% (QLD) to 6.85% (ACT). Most small businesses with fewer than 20-30 employees will be below all state thresholds.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Payroll tax vs PAYG withholding: the critical difference</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          These two tax obligations are confused constantly — even by experienced business owners. Here is the precise difference:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.25rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--char)', margin: '0 0 0.75rem' }}>PAYG Withholding</p>
            <ul style={{ color: 'var(--text2)', fontSize: '0.875rem', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
              <li>Federal obligation (ATO)</li>
              <li>Applies from your first employee</li>
              <li>Withheld from employee wages</li>
              <li>You collect it on behalf of the ATO</li>
              <li>Reported via STP Phase 2</li>
              <li>No threshold — always applies</li>
            </ul>
          </div>
          <div style={{ background: 'white', border: '2px solid var(--ember)', borderRadius: 'var(--r2)', padding: '1.25rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.75rem' }}>Payroll Tax</p>
            <ul style={{ color: 'var(--text2)', fontSize: '0.875rem', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
              <li>State/territory tax (Revenue Offices)</li>
              <li>Only applies above a wage threshold</li>
              <li>Paid by the employer from business funds</li>
              <li>An additional cost on top of wages</li>
              <li>Reported monthly or annually to each state</li>
              <li>Different threshold and rate per state</li>
            </ul>
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>2026 payroll tax thresholds and rates by state</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Each state and territory sets its own threshold and rate. The threshold is based on your total Australian wages — not just the wages paid in that state. If you operate in multiple states and exceed any state&apos;s threshold, you must register in each state where wages are paid and calculate tax proportionally.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
          {STATE_DATA.map((s) => (
            <div key={s.state} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1rem', color: 'var(--char)', margin: 0 }}>{s.fullName} ({s.state})</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text3)', margin: '0.2rem 0 0' }}>{s.authority}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, color: 'var(--ember)', margin: 0, fontSize: '0.95rem' }}>{s.rate}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text2)', margin: '0.1rem 0 0' }}>Threshold: {s.threshold}</p>
                </div>
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text3)', margin: 0, borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>{s.notes}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text3)', marginBottom: '2rem' }}>
          Rates and thresholds are indicative for 2025-26 and may change from 1 July 2026. Always verify current figures with the relevant state revenue authority before registering.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>What counts as wages for payroll tax purposes?</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The definition of taxable wages is broader than most business owners expect. Across all states, the following are generally included in the wages calculation:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Salaries and wages paid to all employees (full-time, part-time, and casual)</li>
          <li>Superannuation contributions made by the employer (the Super Guarantee amount)</li>
          <li>Allowances (travel, tool, meal allowances where paid regularly)</li>
          <li>Fringe benefits — the grossed-up taxable value of fringe benefits</li>
          <li>Bonuses, commissions, and incentive payments</li>
          <li>Directors&apos; fees</li>
          <li>Payments to some contractors and labour-hire workers (varies by state)</li>
          <li>Salary sacrifice amounts (varies by state and type)</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Contractors and labour-hire workers are a particularly grey area. Most states apply payroll tax to contractor payments where the contractor is providing labour services to you personally — not a commercial result through a genuine business operation. If you engage contractors for longer than 90 days under a contract that looks like employment, those payments may be included in your wages for payroll tax purposes.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>When does payroll tax apply to my business?</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The threshold is based on annual wages. For most states, if your total wages bill for the financial year exceeds the threshold, you are required to register and pay payroll tax from the date you first exceeded the threshold — not from when you registered.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          This catches many growing businesses by surprise. You hit $1.3 million in wages in Queensland in, say, October, but do not realise payroll tax applies until your accountant mentions it in June. You now owe payroll tax from October — including interest on late payments. This is why businesses approaching the threshold should register proactively rather than waiting.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          As a rough guide: if you employ around 15-20 people on average wages, you will be approaching payroll tax thresholds in most states. A business with 15 employees earning $90,000 each has a total wages bill of $1.35 million — above the NSW and QLD thresholds and significantly above the VIC and WA thresholds.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>How to register for payroll tax</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Registration is handled separately by each state and territory revenue office. There is no federal registration — if you operate in three states and exceed each state&apos;s threshold, you register three times with three different authorities.
        </p>
        <ol style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Calculate your total annual Australian wages (including super and fringe benefits) to determine if you exceed any state threshold</li>
          <li>If you do, register online with each state revenue office where you pay wages — most now have online portals</li>
          <li>Determine which states require monthly lodgements vs annual lodgements</li>
          <li>Set up a system to calculate the proportion of wages in each state for multi-state reporting</li>
          <li>Lodge your first return and make the first payment by the required due date</li>
        </ol>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          Most states offer amnesty programs for businesses that self-report a payroll tax obligation they have overlooked. If you suspect you should have registered previously, contact the relevant revenue office proactively — voluntary disclosure typically results in reduced penalties and interest compared to being caught through an audit.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Payroll tax and Payday Super from July 2026</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          From 1 July 2026, super must be paid on every payday under the new Payday Super rules. This affects payroll tax because employer super contributions are included in taxable wages for payroll tax purposes.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          For most businesses already over the threshold, the super is already being included in wages — the only change is the timing and how you process the payments. But for businesses currently just under the threshold, the more frequent super payments (and the resulting increase in gross wages including super) may push their total wage figure over the threshold sooner than expected. If your wages are approaching a state threshold, factor in the 12% super guarantee when projecting whether and when you will cross it.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Track your wages and stay compliant</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>SAB Account AI tracks payroll, generates compliant payslips, and helps Australian small businesses stay on top of their obligations. From $9/mo.</p>
          <Link href="/signup" style={{ display: 'inline-block', background: 'var(--ember)', color: 'white', padding: '0.75rem 2rem', borderRadius: 'var(--r)', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}>
            Start free trial
          </Link>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Frequently asked questions</h2>
        {FAQ_SCHEMA.mainEntity.map((faq) => (
          <div key={faq.name} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem' }}>{faq.name}</h3>
            <p style={{ color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>{faq.acceptedAnswer.text}</p>
          </div>
        ))}

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
            Related:{' '}
            <Link href="/blog/payg-withholding-calculator-australia" style={{ color: 'var(--ember)' }}>PAYG Withholding Calculator</Link>
            {' · '}
            <Link href="/blog/payday-super-2026" style={{ color: 'var(--ember)' }}>Payday Super 2026 Guide</Link>
            {' · '}
            <Link href="/blog/single-touch-payroll-small-business-australia" style={{ color: 'var(--ember)' }}>Single Touch Payroll Guide</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
