import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ATO PAYG Verification — SAB Account AI',
  description: 'Independent verification of SAB Account AI PAYG withholding calculations against ATO NAT 1004 published sample data. All 5 test cases pass with zero variance.',
  alternates: { canonical: 'https://sabaccountai.com/ato-verification' },
}

const PASS = '✅'

const testCases = [
  { tc: 1, scenario: 'International student', scale: 'Scale 5', gross: '$1,000', expected: '$44',    got: '$44',    diff: '$0' },
  { tc: 2, scenario: 'Australian resident',   scale: 'Scale 2', gross: '$2,564', expected: '$468',   got: '$468',   diff: '$0' },
  { tc: 3, scenario: 'Second job (no threshold)', scale: 'Scale 1', gross: '$4,240', expected: '$1,226', got: '$1,226', diff: '$0' },
  { tc: 4, scenario: 'Foreign resident (482 visa)', scale: 'Scale 3', gross: '$3,690', expected: '$1,106', got: '$1,106', diff: '$0' },
  { tc: 5, scenario: 'High income resident',  scale: 'Scale 2', gross: '$5,192', expected: '$1,310', got: '$1,310', diff: '$0' },
]

const checks = [
  { id: 'A', desc: 'Medicare not double-counted on Scale 2' },
  { id: 'B', desc: 'Scale 5 withholds less than Scale 2 at same income' },
  { id: 'C', desc: 'Scale 1 withholds more than Scale 2 at same income' },
  { id: 'D', desc: 'Foreign residents (Scale 3) pay $0 Medicare' },
]

export default function ATOVerificationPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <header style={{ background: 'var(--char)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 1.5rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', textDecoration: 'none', letterSpacing: '-0.01em' }}>
          SAB Account AI
        </Link>
        <Link href="/signup" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
          Get started free →
        </Link>
      </header>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginBottom: '0.5rem' }}>
            <Link href="/" style={{ color: 'var(--text3)', textDecoration: 'none' }}>SAB Account AI</Link>
            {' '}/ ATO Verification
          </p>
          <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            PAYG Withholding Verification
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text2)', lineHeight: 1.6 }}>
            Independent verification of PAYG withholding calculations against ATO NAT 1004 published sample data.
            Verified 25 May 2026 · FY2025-26 Stage 3 rates.
          </p>
        </div>

        {/* Summary badge */}
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 'var(--r)', padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>✅</span>
          <div>
            <p style={{ fontWeight: 700, color: '#166534', fontSize: '0.9375rem' }}>All 5 test cases pass — zero variance</p>
            <p style={{ fontSize: '0.8125rem', color: '#166534', marginTop: '0.125rem' }}>ATO-permitted tolerance: ±$1 per NAT 1004 rounding rules. Actual variance: $0.</p>
          </div>
        </div>

        {/* Test results table */}
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem' }}>Test Results</h2>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--cream2)' }}>
                {['#', 'Scenario', 'Scale', 'Gross (fn)', 'Expected', 'Got', 'Variance', ''].map(h => (
                  <th key={h} style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 600, color: 'var(--text2)', fontSize: '0.75rem', letterSpacing: '0.03em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {testCases.map((t, i) => (
                <tr key={t.tc} style={{ borderBottom: i < testCases.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '0.625rem 0.875rem', color: 'var(--text3)', fontWeight: 500 }}>{t.tc}</td>
                  <td style={{ padding: '0.625rem 0.875rem', color: 'var(--char)', fontWeight: 500 }}>{t.scenario}</td>
                  <td style={{ padding: '0.625rem 0.875rem', color: 'var(--text2)' }}>{t.scale}</td>
                  <td style={{ padding: '0.625rem 0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--char)' }}>{t.gross}</td>
                  <td style={{ padding: '0.625rem 0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{t.expected}</td>
                  <td style={{ padding: '0.625rem 0.875rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--char)' }}>{t.got}</td>
                  <td style={{ padding: '0.625rem 0.875rem', fontFamily: 'var(--font-mono)', color: '#16a34a' }}>{t.diff}</td>
                  <td style={{ padding: '0.625rem 0.875rem' }}>{PASS}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Integrity checks */}
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--char)', marginBottom: '1rem' }}>Integrity Checks</h2>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: '2rem' }}>
          {checks.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', borderBottom: i < checks.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontWeight: 700, color: 'var(--text3)', fontSize: '0.8125rem', width: '20px', flexShrink: 0 }}>{c.id}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--char)', flex: 1 }}>{c.desc}</span>
              <span>✅</span>
            </div>
          ))}
        </div>

        {/* Method */}
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.75rem' }}>Method</h2>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '2rem', fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: '0.75rem' }}>
            The engine implements the ATO NAT 1004 (Schedule 1) weekly coefficient formula:
          </p>
          <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <li>Convert period earnings to weekly equivalent: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', background: 'var(--cream2)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>x = floor(earnings / divisor) + 0.99</code></li>
            <li>Locate the correct bracket where <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', background: 'var(--cream2)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>x &lt; limit</code></li>
            <li>Apply the formula: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', background: 'var(--cream2)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>weekly = a × x − b</code></li>
            <li>Round the weekly result to the nearest dollar</li>
            <li>Scale back to the pay period</li>
          </ol>
          <p style={{ marginTop: '0.75rem' }}>
            LITO is embedded in Scale 2 and Scale 5 coefficients. Medicare levy is embedded in Scale 1 and Scale 2.
            Monthly pay cycles apply the ATO&apos;s 33-cent adjustment before conversion.
          </p>
        </div>

        {/* Source */}
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.75rem' }}>Source</h2>
        <div style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.8 }}>
          <p>ATO NAT 1004: <em>Statement of formulas for calculating amounts to be withheld</em></p>
          <p>ATO Schedule 15: <em>Tax table for working holiday makers</em> (NAT 75331)</p>
          <p>ATO sample data: withholding-amounts-sample-data</p>
          <p>Stage 3 rates confirmed unchanged for FY2025-26 per ATO, May 2025</p>
        </div>

      </main>
    </div>
  )
}
