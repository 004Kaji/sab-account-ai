import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Register for GST in Australia: Step-by-Step Guide 2026',
  description: 'Learn how to register for GST in Australia. Who must register, the $75,000 threshold, how to apply online through the ATO, and what happens after registration.',
  alternates: { canonical: 'https://sabaccountai.com/blog/how-to-register-gst-australia' },
  openGraph: {
    title: 'How to Register for GST in Australia: Step-by-Step Guide 2026',
    description: 'Who must register for GST in Australia, the $75,000 threshold explained, and how to apply through the ATO.',
    url: 'https://sabaccountai.com/blog/how-to-register-gst-australia',
    siteName: 'SAB Account AI',
    locale: 'en_AU',
    type: 'article',
  },
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Register for GST in Australia: Step-by-Step Guide 2026',
  description: 'Learn how to register for GST in Australia — who must register, the $75,000 threshold, and how to apply through the ATO.',
  datePublished: '2026-06-07',
  dateModified: '2026-06-07',
  author: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://sabaccountai.com/blog/how-to-register-gst-australia' },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the GST threshold in Australia for 2026?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The GST registration threshold is $75,000 in annual turnover for most businesses, and $150,000 for non-profit organisations. Ride-share and taxi drivers must register regardless of turnover.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to register for GST in Australia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'GST registration through the ATO Business Portal or myGov is usually processed within 1-5 business days. In most cases your GST registration is effective from the date you applied.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I register for GST voluntarily before reaching $75,000?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can voluntarily register for GST even if your turnover is below $75,000. This can be beneficial if your clients are businesses that can claim GST credits, or if you have significant business expenses with GST you want to claim back.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if I don\'t register for GST when I should?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'If you exceed the $75,000 threshold and don\'t register, the ATO can backdate your registration and require you to pay GST on all sales from when you should have registered — even if you didn\'t collect it from clients. Penalties and interest may also apply.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need to charge GST on all my invoices?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Once registered for GST, you must add 10% GST to most goods and services. Some items are GST-free (fresh food, medical services, education) or input-taxed (residential rent, financial services). Always check the ATO\'s GST classification for your specific services.',
      },
    },
  ],
}

export default function HowToRegisterGSTPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{ color: 'var(--ember)', fontSize: '0.875rem', textDecoration: 'none' }}>← Blog</Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <span style={{ background: 'var(--ember-p)', color: 'var(--ember)', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tax & GST</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--char)', lineHeight: 1.2, marginBottom: '1rem' }}>
          How to Register for GST in Australia: Step-by-Step Guide 2026
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          If your Australian business turnover hits $75,000, GST registration isn&apos;t optional — it&apos;s the law. Here&apos;s exactly how to register, what it means for your invoices, and what to do once you&apos;re registered.
        </p>

        <div style={{ background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)', borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Answer</p>
          <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>
            Register for GST through the <strong>ATO Business Portal</strong> or <strong>myGov</strong>. You must register if your annual turnover exceeds <strong>$75,000</strong> ($150,000 for non-profits). Registration usually takes 1-5 business days.
          </p>
        </div>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Who must register for GST?</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1rem' }}>You must register for GST if:</p>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Your business turnover is <strong>$75,000 or more</strong> in any 12-month period</li>
          <li>You provide <strong>taxi or ride-share services</strong> (regardless of turnover)</li>
          <li>You want to claim fuel tax credits</li>
        </ul>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          The $75,000 threshold applies to your <em>gross</em> turnover — total revenue before expenses, not profit. If you expect to hit this in the next 12 months, register now rather than scrambling later.
        </p>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Step-by-step: How to register for GST in Australia</h2>

        {[
          { step: '1', title: 'Get your ABN first', body: 'You need an Australian Business Number (ABN) before you can register for GST. If you don\'t have one, apply at abr.gov.au. ABN registration is free and usually instant.' },
          { step: '2', title: 'Log into the ATO Business Portal or myGov', body: 'Go to business.gov.au or sign in to myGov and link your ATO account. Both methods work — the Business Portal is preferred for business registrations.' },
          { step: '3', title: 'Navigate to GST registration', body: 'In the ATO portal, go to "Manage your registrations" and select "Register for GST." Alternatively, you can register by calling the ATO on 13 28 66.' },
          { step: '4', title: 'Enter your business details', body: 'You\'ll need your ABN, business name, business activity, estimated annual turnover, and the date from which you want GST to apply. Choose your BAS lodgement frequency (monthly, quarterly, or annually).' },
          { step: '5', title: 'Submit and wait', body: 'GST registration is usually processed within 1-5 business days. You\'ll receive a confirmation letter from the ATO with your GST registration details.' },
          { step: '6', title: 'Update your invoices', body: 'Once registered, all your invoices must include GST. Update your invoice template to show the GST amount separately and the words "Tax Invoice." Your ABN must also be on every invoice.' },
        ].map(item => (
          <div key={item.step} style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ember)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{item.step}</div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.4rem' }}>{item.title}</h3>
              <p style={{ color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>{item.body}</p>
            </div>
          </div>
        ))}

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>What changes after you register for GST</h2>
        <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>You must add 10% GST to your invoices</li>
          <li>You must lodge a <strong>Business Activity Statement (BAS)</strong> — quarterly or monthly</li>
          <li>You can claim back GST on your business expenses (input tax credits)</li>
          <li>You keep the GST collected and pay it to the ATO when your BAS is due</li>
        </ul>

        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem', color: 'var(--char)', margin: '2.5rem 0 1rem' }}>Should you register voluntarily?</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
          If you&apos;re close to the $75,000 threshold, registering voluntarily can make sense. It signals professionalism to business clients (who can claim your GST back), and lets you claim input tax credits on your own expenses — things like equipment, software, and professional services.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '2rem' }}>
          The downside: you need to lodge a BAS regularly and manage the GST component on your invoices. Good invoicing software handles this automatically.
        </p>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>SAB Account AI handles GST automatically</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>ATO-compliant invoices with GST calculated and tracked for BAS time. $9/mo for sole traders.</p>
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Related: <Link href="/blog/gst-invoice-template-australia" style={{ color: 'var(--ember)' }}>GST Invoice Template Australia</Link> · <Link href="/blog/bas-due-dates-australia-2026" style={{ color: 'var(--ember)' }}>BAS Due Dates Australia 2026</Link></p>
        </div>

      </div>
    </div>
  )
}
