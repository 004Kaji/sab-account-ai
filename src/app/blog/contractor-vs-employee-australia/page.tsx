import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contractor vs Employee Australia 2026: How to Get the Classification Right',
  description: 'Misclassifying an employee as a contractor can cost you years of back-paid super, leave, and $82,500 in fines. Here is how the ATO and Fair Work determine the difference.',
  alternates: { canonical: 'https://sabaccountai.com/blog/contractor-vs-employee-australia' },
  openGraph: {
    title: 'Contractor vs Employee Australia 2026: How to Get the Classification Right',
    description: 'How to correctly classify workers as employees vs contractors in Australia — the High Court test, ATO rules, and the sham contracting penalties.',
    url: 'https://sabaccountai.com/blog/contractor-vs-employee-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Contractor vs Employee Australia 2026: How to Get the Classification Right',
  description: 'Misclassifying an employee as a contractor can cost years of back-paid super and significant fines. Complete guide to worker classification in Australia for 2026.',
  datePublished: '2026-06-11',
  dateModified: '2026-06-11',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/contractor-vs-employee-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does having an ABN mean someone is a contractor in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Having an ABN does not automatically make a worker an independent contractor. The High Court looks at the totality of the relationship, including control, integration, and risk. A worker can have an ABN and still be legally classified as an employee for tax, super, and Fair Work purposes.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is sham contracting in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sham contracting is when an employer deliberately misrepresents an employment relationship as a contracting arrangement to avoid providing employee entitlements. It is illegal under the Fair Work Act. Penalties can reach $82,500 per contravention for companies.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does a contractor get superannuation in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It depends. True independent contractors generally do not receive super from the engaging business. However, if a contractor is paid wholly or principally for their personal labour (not a commercial result), and works under the direction of the engaging business, they may be entitled to the Super Guarantee regardless of their ABN status.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the 80/20 rule for contractors in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The 80% rule (Personal Services Income test) applies when a contractor earns 80% or more of their business income from a single client. In this case, the income is classified as Personal Services Income and different tax rules apply — expenses cannot be deducted as freely as a genuine business would be able to.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if I misclassify an employee as a contractor?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You may be liable for years of unpaid super (with interest), unpaid annual leave and personal leave entitlements, PAYG withholding shortfalls, and penalties from both the ATO and Fair Work Ombudsman. The ATO has an active program specifically targeting worker classification errors.',
      },
    },
  ],
}

const FACTORS = [
  {
    factor: 'Control over how work is done',
    employee: 'Employer directs how, when, and where work is done',
    contractor: 'Worker decides how to complete the task — only the outcome is specified',
    weight: 'High',
  },
  {
    factor: 'Ability to subcontract',
    employee: 'Must perform the work personally — cannot send a substitute',
    contractor: 'Can subcontract the work to others or delegate to staff',
    weight: 'High',
  },
  {
    factor: 'Who provides tools and equipment',
    employee: 'Employer provides tools, equipment, and workspace',
    contractor: 'Worker provides their own tools and bears their own costs',
    weight: 'Medium',
  },
  {
    factor: 'Integration into the business',
    employee: 'Part of the organisational structure — has a job title, reports to manager',
    contractor: 'Operates as an independent business — not on the org chart',
    weight: 'High',
  },
  {
    factor: 'Commercial risk',
    employee: 'Employer bears the risk of bad results, must still be paid',
    contractor: 'Worker bears risk of defective work, may not be paid if outcome is not met',
    weight: 'High',
  },
  {
    factor: 'Payment basis',
    employee: 'Paid for time worked (hourly, weekly salary)',
    contractor: 'Paid for a result — by quote, milestone, or project deliverable',
    weight: 'Medium',
  },
  {
    factor: 'Exclusivity',
    employee: 'Usually works exclusively for one employer',
    contractor: 'Advertises services to the public and works for multiple clients',
    weight: 'Medium',
  },
  {
    factor: 'Uniforms and branding',
    employee: 'May wear the employer\'s uniform or represent the employer\'s brand',
    contractor: 'Operates under their own business name and branding',
    weight: 'Low',
  },
]

export default function ContractorVsEmployeePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{ color: 'var(--ember)', fontSize: '0.875rem', textDecoration: 'none' }}>← Blog</Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compliance</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--char)', lineHeight: 1.2, marginBottom: '1rem' }}>
          Contractor vs Employee Australia 2026: How to Get the Classification Right
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Worker classification is one of the most expensive mistakes a small Australian business can make. Get it wrong — even unintentionally — and you can face years of back-paid superannuation, unpaid leave entitlements, PAYG withholding shortfalls, and fines from both the ATO and the Fair Work Ombudsman. The 2022 High Court cases changed how the courts assess the question, and 2026 brings new enforcement energy around the issue.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            Classification depends on the <strong>totality of the relationship</strong> — not just the contract wording, not whether someone has an ABN, and not what you call them. Key factors are: who controls how the work is done, who bears the risk, and whether the worker is integrated into your business or operating as a separate enterprise.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>The 2022 High Court decisions that changed everything</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          In 2022, the High Court of Australia handed down two landmark decisions — <em>CFMMEU v Personnel Contracting</em> and <em>ZG Operations v Jamsek</em> — that fundamentally changed how worker classification is assessed.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Before these cases, courts looked at the practical reality of how work was performed — whether the business actually controlled the worker day-to-day, regardless of what the contract said. The High Court shifted this: where parties have a comprehensive written contract, the rights and obligations in that contract are the primary focus of the analysis, not the conduct that followed.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          What this means in practice: your written contract now matters more than it used to. But it does not mean you can simply write &ldquo;contractor&rdquo; in a contract and be protected — the totality of the contractual relationship is assessed, and if the contract gives you the right to direct the worker extensively, they will likely still be an employee regardless of the label.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>The key classification factors: a complete comparison</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          No single factor determines classification. Courts and the ATO look at the whole picture. Here are the factors with the most weight:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {FACTORS.map((f) => (
            <div key={f.factor} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1rem', color: 'var(--char)', margin: 0 }}>{f.factor}</h3>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 20,
                  background: f.weight === 'High' ? 'rgba(200,75,47,0.1)' : 'rgba(0,0,0,0.05)',
                  color: f.weight === 'High' ? 'var(--ember)' : 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>{f.weight} weight</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.3rem' }}>Employee indicator</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text2)', margin: 0 }}>{f.employee}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'green', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.3rem' }}>Contractor indicator</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text2)', margin: 0 }}>{f.contractor}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Why an ABN alone does not make someone a contractor</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          This is the single most common misunderstanding among small business owners. Many employers believe that if a worker registers for an ABN, that creates a contractor relationship and removes employment obligations.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          It does not. The ATO and Fair Work Ombudsman assess the actual relationship using the factors above — the existence of an ABN is one minor indicator among many. If a worker with an ABN comes to your premises every day, uses your equipment, is directed by your managers, and cannot send someone else in their place, they are almost certainly an employee under both Fair Work and tax law — regardless of their ABN status.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          There have been numerous successful Fair Work prosecutions where businesses argued that ABN status settled the question. It does not. The ATO&apos;s Employee/Contractor tool on their website runs through the actual factors and is worth completing before engaging any worker on a contracting basis.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Super obligations for contractors: when they apply</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Even a genuine independent contractor may be entitled to superannuation from the engaging business in certain circumstances. The Super Guarantee applies to contractors who are paid wholly or principally for their personal labour and skills — not for a commercial result — and who work under the direction of the engaging business.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          This catches many tradespeople, cleaners, and gig workers who technically run their own ABN businesses but whose work arrangements look like employment. The ATO has pursued super recovery from businesses in these situations, and from 1 July 2026 under Payday Super, any super owed to contractors in this category must also be paid on every payday.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Sham contracting: what it is and the penalties</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Sham contracting occurs when a business deliberately misrepresents or disguises an employment relationship as an independent contracting arrangement. Under Section 357 of the Fair Work Act, it is unlawful to:
        </p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Represent to an employee that they are an independent contractor when they are not</li>
          <li>Dismiss or threaten to dismiss an employee in order to re-engage them as a contractor performing the same or substantially similar work</li>
          <li>Make a false statement to persuade an employee to become an independent contractor</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Importantly, intent is not required to commit sham contracting. If you misclassify a worker recklessly — without genuinely considering whether the arrangement is lawful — that can still constitute a contravention. The penalties as of 2026 are up to $16,500 per contravention for individuals and $82,500 per contravention for companies. Each worker who is misclassified is a separate contravention.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Personal Services Income (PSI): the 80% rule</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          Even if a worker is a genuine independent contractor, they may be subject to the Personal Services Income (PSI) rules if 80% or more of their business income comes from a single client. PSI rules restrict what business deductions the contractor can claim and how income is taxed — they cannot, for example, split income with a spouse or divert it through a trust to reduce tax.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          A contractor can escape the PSI rules if they pass one of the ATO&apos;s tests: the results test (paid for a specific outcome, not just time), the unrelated clients test (income comes from at least two unrelated clients), the employment test (employs others to help deliver at least 20% of work), or the business premises test (operates from premises not provided by the client).
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          This matters for how contractors lodge their tax returns and what they can deduct — and for businesses that engage contractors, it is worth understanding whether your contractors are aware of their PSI obligations, as ATO audits sometimes flow from contractor tax issues to the engaging business.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>Invoice and payroll for contractors and employees</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>SAB Account AI handles ABN invoicing for contractors and PAYG payslips for employees — in one platform, from $9/mo.</p>
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
            <Link href="/blog/abn-contractor-tax-australia" style={{ color: 'var(--ember)' }}>ABN Contractor Tax Australia</Link>
            {' · '}
            <Link href="/blog/payg-withholding-calculator-australia" style={{ color: 'var(--ember)' }}>PAYG Withholding Calculator</Link>
            {' · '}
            <Link href="/blog/payslip-requirements-australia" style={{ color: 'var(--ember)' }}>Payslip Requirements Australia</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
