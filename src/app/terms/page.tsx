import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — SAB Account AI',
}

const UPDATED = '11 May 2025'
const COMPANY = 'SAB Account AI'
const EMAIL   = 'support@sabaccountai.com'

export default function TermsPage() {
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
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Sign In</Link>
        </div>
      </header>

      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginBottom: '0.5rem' }}>Last updated: {UPDATED}</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Terms of Service</h1>
        <p style={{ fontSize: '1rem', color: 'var(--text2)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          Please read these Terms of Service carefully before using {COMPANY}. By creating an account or using the service, you agree to be bound by these terms.
        </p>

        <Section title="1. About the Service">
          <p>{COMPANY} is an Australian-based software-as-a-service (SaaS) platform that helps small businesses and sole traders create tax invoices, generate PAYG payslips, track income and expenses, and estimate GST obligations. The service is operated in accordance with Australian law.</p>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be at least 18 years old and have the legal capacity to enter into a binding contract. By using {COMPANY} you represent that you meet these requirements. The service is intended for use by Australian businesses and individuals operating in Australia.</p>
        </Section>

        <Section title="3. Accounts">
          <ul>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must provide accurate and complete information when creating your account.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must notify us immediately at <a href={`mailto:${EMAIL}`}>{EMAIL}</a> if you suspect unauthorised access to your account.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
          </ul>
        </Section>

        <Section title="4. Subscription Plans and Billing">
          <ul>
            <li><strong>Free plan:</strong> Available at no charge, subject to usage limits set out on our pricing page.</li>
            <li><strong>Paid plans (Starter, Pro):</strong> Billed monthly in Australian dollars (AUD) plus GST at 10%. Prices are displayed inclusive of GST where required by Australian Consumer Law.</li>
            <li><strong>Free trial:</strong> Paid plans include a 14-day free trial. You will not be charged until the trial period ends. You may cancel at any time before the trial ends without charge.</li>
            <li><strong>Cancellation:</strong> You may cancel your subscription at any time through your account settings. Access continues until the end of the current billing period. No refunds are provided for partial billing periods.</li>
            <li><strong>Price changes:</strong> We will give at least 30 days notice before changing subscription prices, by email or in-app notice.</li>
            <li>Payments are processed securely by Stripe. We do not store your payment card details.</li>
          </ul>
        </Section>

        <Section title="5. Australian Consumer Law">
          <p>Nothing in these Terms limits any rights you may have under the Australian Consumer Law (Schedule 2 to the <em>Competition and Consumer Act 2010</em> (Cth)) or other applicable Australian legislation, including any consumer guarantees that cannot be excluded by contract. Where the Australian Consumer Law applies, our liability for failure to comply with a consumer guarantee is limited to re-supplying the service or paying the cost of having it re-supplied.</p>
        </Section>

        <Section title="6. Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any unlawful purpose or in violation of Australian law.</li>
            <li>Attempt to gain unauthorised access to any part of the service or its infrastructure.</li>
            <li>Transmit malware, spam, or other harmful content.</li>
            <li>Resell or sublicense access to the service without our written permission.</li>
            <li>Use the service to process data relating to persons other than your legitimate business contacts without appropriate consent.</li>
          </ul>
        </Section>

        <Section title="7. Tax Calculations — Disclaimer">
          <p>{COMPANY} provides tax-related calculations (including PAYG withholding, Medicare levy, super guarantee, and GST estimates) as a convenience tool based on publicly available ATO guidelines. These calculations are <strong>estimates only</strong> and are not a substitute for professional tax advice. You should consult a registered tax agent or accountant to confirm your tax obligations. {COMPANY} accepts no liability for errors in tax calculations or for any penalties, interest, or loss arising from reliance on the service's outputs.</p>
        </Section>

        <Section title="8. Intellectual Property">
          <p>All content, software, trademarks, and materials provided by {COMPANY} remain our exclusive property or that of our licensors. You are granted a limited, non-exclusive, non-transferable licence to use the service for your own business purposes. You retain ownership of all data you input into the service.</p>
        </Section>

        <Section title="9. Privacy">
          <p>Our collection and use of personal information is governed by our <Link href="/privacy" style={{ color: 'var(--ember)' }}>Privacy Policy</Link>, which forms part of these Terms. By using the service you consent to the practices described in that policy.</p>
        </Section>

        <Section title="10. Data Security">
          <p>We take reasonable technical and organisational steps to protect your data, including encryption in transit (TLS) and at rest. However, no internet transmission is completely secure and we cannot guarantee absolute security. You are responsible for keeping your login credentials confidential.</p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>To the maximum extent permitted by law, {COMPANY} and its directors, employees, and agents are not liable for any indirect, incidental, special, consequential, or punitive loss or damage (including lost profits, lost data, or business interruption) arising from your use of or inability to use the service, even if we have been advised of the possibility of such damages. Our total liability to you for any claim arising from these Terms or your use of the service is limited to the total fees you paid to us in the 12 months preceding the claim.</p>
        </Section>

        <Section title="12. Indemnity">
          <p>You agree to indemnify and hold harmless {COMPANY} and its directors, employees, and agents from any claims, losses, damages, or expenses (including legal fees) arising from your use of the service, your breach of these Terms, or your violation of any third-party rights.</p>
        </Section>

        <Section title="13. Modifications to the Service and Terms">
          <p>We may modify or discontinue any part of the service at any time, with or without notice, though we will endeavour to give reasonable notice of significant changes. We may update these Terms from time to time. We will notify you of material changes by email or in-app notice at least 14 days in advance. Continued use of the service after any change constitutes your acceptance of the updated Terms.</p>
        </Section>

        <Section title="14. Governing Law">
          <p>These Terms are governed by the laws of New South Wales, Australia. Any dispute arising from these Terms or your use of the service will be subject to the exclusive jurisdiction of the courts of New South Wales, or the Federal Court of Australia, as applicable.</p>
        </Section>

        <Section title="15. Contact">
          <p>If you have any questions about these Terms, please contact us at <a href={`mailto:${EMAIL}`} style={{ color: 'var(--ember)' }}>{EMAIL}</a>.</p>
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
