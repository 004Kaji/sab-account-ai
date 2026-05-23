import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — SAB Account AI',
  description: 'Privacy Policy for SAB Account AI. Learn how we collect, use and protect your data in accordance with the Australian Privacy Act 1988.',
  alternates: { canonical: 'https://sabaccountai.com/privacy' },
}

const UPDATED  = '20 May 2026'
const COMPANY  = 'SAB Account AI'
const EMAIL    = 'basnet@sabaccountai.com'
const OPERATOR = 'Sanjog Basnet'
const ABN      = '49 541 449 108'

export default function PrivacyPage() {
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
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Sign In</Link>
        </div>
      </header>

      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginBottom: '0.5rem' }}>Last updated: {UPDATED}</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Privacy Policy</h1>
        <p style={{ fontSize: '1rem', color: 'var(--text2)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          {COMPANY} is committed to protecting your privacy in accordance with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs). This policy explains how we collect, use, disclose, and protect your personal information.
        </p>

        <Section title="1. Who We Are">
          <p>{COMPANY} is an Australian software-as-a-service business operated by {OPERATOR} (ABN {ABN}) that provides invoicing, payroll, and financial record-keeping tools for small businesses. References to "we", "us", or "our" in this policy refer to {COMPANY}.</p>
        </Section>

        <Section title="2. What Personal Information We Collect">
          <p>We collect the following categories of information:</p>
          <ul>
            <li><strong>Account information:</strong> your name, email address, and password (stored as a hashed value).</li>
            <li><strong>Business information:</strong> business name, ABN, and business address.</li>
            <li><strong>Financial data you enter:</strong> invoices, client details, income/expense records, and payslip information (including employee names, salary, and tax details). This data belongs to you.</li>
            <li><strong>Billing information:</strong> subscription plan and payment method details (handled by Stripe — we do not store card numbers).</li>
            <li><strong>Usage data:</strong> log data, IP addresses, browser type, pages visited, and timestamps, collected automatically when you use the service.</li>
          </ul>
        </Section>

        <Section title="3. How We Collect Information">
          <ul>
            <li><strong>Directly from you</strong> when you create an account, enter business or financial data, or contact us.</li>
            <li><strong>Automatically</strong> through cookies, server logs, and analytics tools as you use the service.</li>
            <li><strong>From third-party services</strong> such as Supabase (authentication and database), Stripe (payments), Resend (email delivery), and Vercel (hosting and edge network), which process data on our behalf.</li>
          </ul>
        </Section>

        <Section title="4. How We Use Your Information">
          <p>We use your personal information to:</p>
          <ul>
            <li>Provide, operate, and improve the service.</li>
            <li>Process payments and manage your subscription.</li>
            <li>Send transactional emails (e.g. account confirmation, password reset, invoices, payslips you choose to email).</li>
            <li>Respond to your support enquiries.</li>
            <li>Comply with our legal obligations under Australian law.</li>
            <li>Detect and prevent fraud, security incidents, and abuse.</li>
          </ul>
          <p>We do not sell your personal information or use it for advertising purposes.</p>
        </Section>

        <Section title="5. Disclosure of Your Information">
          <p>We may share your personal information with:</p>
          <ul>
            <li><strong>Sub-processors</strong> that help us operate the service, including Supabase (database/auth, servers in Australia and US), Stripe (payment processing), Resend (email delivery), Anthropic (AI generation — only the content of your invoice prompts), and Vercel (application hosting and global CDN — processes request metadata including IP addresses). Each is bound by confidentiality obligations and their own privacy policies.</li>
            <li><strong>Legal authorities</strong> where required by Australian law, a court order, or to protect our legal rights.</li>
            <li><strong>Business transfers:</strong> in the event of a merger, acquisition, or sale of assets, your information may be transferred, subject to the same privacy protections.</li>
          </ul>
          <p>We do not disclose your information to any other third parties without your consent.</p>
        </Section>

        <Section title="6. Data Storage and Security">
          <p>Your data is stored on servers operated by Supabase, which uses AWS infrastructure. Data may be stored in the United States in addition to Australia. We take reasonable technical and organisational measures to protect your personal information, including encryption in transit (TLS 1.2+) and at rest (AES-256).</p>
          <p>Despite these measures, no system is completely secure. You are responsible for maintaining the security of your account credentials.</p>
        </Section>

        <Section title="7. Data Retention">
          <p>We retain your personal information for as long as your account is active or as needed to provide the service. If you close your account, we will delete or anonymise your personal information within 90 days, except where we are required to retain it by law (e.g. financial records required under the <em>Corporations Act 2001</em> or tax law).</p>
        </Section>

        <Section title="8. Cookies">
          <p>We use session cookies and local storage for authentication and preferences. We do not use advertising trackers or third-party analytics cookies. You may disable cookies in your browser, but this may affect the functionality of the service.</p>
        </Section>

        <Section title="9. Your Rights">
          <p>Under the Australian Privacy Principles, you have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you.</li>
            <li>Request correction of inaccurate or out-of-date information.</li>
            <li>Request deletion of your account and associated data (subject to legal retention requirements).</li>
            <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a> if you believe we have breached your privacy rights.</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href={`mailto:${EMAIL}`} style={{ color: 'var(--ember)' }}>{EMAIL}</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="10. Children">
          <p>The service is not directed at individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.</p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or in-app notice at least 14 days before the change takes effect. The current version is always available at this URL.</p>
        </Section>

        <Section title="12. Contact Us">
          <p>For privacy-related enquiries, corrections, or complaints, contact our privacy officer at:</p>
          <p><strong>{COMPANY}</strong><br />Email: <a href={`mailto:${EMAIL}`} style={{ color: 'var(--ember)' }}>{EMAIL}</a></p>
        </Section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text3)' }}>
        © {new Date().getFullYear()} SAB Account AI ·{' '}
        <Link href="/terms" style={{ color: 'var(--text3)' }}>Terms</Link> ·{' '}
        <Link href="/privacy" style={{ color: 'var(--text3)' }}>Privacy</Link>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.625rem' }}>{title}</h2>
      <div style={{ fontSize: '0.9375rem', color: 'var(--text2)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {children}
      </div>
      <style>{`
        div ul { padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.375rem; }
        div ul li { line-height: 1.6; }
        div p a { color: var(--ember); }
      `}</style>
    </div>
  )
}
