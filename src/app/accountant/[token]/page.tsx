import { createServiceClient } from '@/lib/supabase'
import { formatCurrency, formatABN, formatDateAU } from '@/lib/utils'
import {
  isLinkValid,
  getFinancialYearStart,
  aggregateInvoiceStats,
  aggregatePayrollStats,
  aggregateBASStats,
} from '@/lib/accountant-utils'

export const dynamic = 'force-dynamic'

// ── Status badge ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:   { bg: 'var(--cream2)',           color: '#78716C' },
  pending: { bg: 'rgba(234,179,8,0.12)',     color: '#92400E' },
  paid:    { bg: 'rgba(34,197,94,0.1)',      color: '#15803D' },
  overdue: { bg: 'rgba(200,75,47,0.1)',      color: '#C84B2F' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS.pending
  return (
    <span style={{
      fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.04em', padding: '0.2rem 0.5rem', borderRadius: '999px',
      background: s.bg, color: s.color,
    }}>
      {status}
    </span>
  )
}

// ── Summary card ────────────────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--cream)', borderRadius: '10px', padding: '1.25rem 1.5rem',
      border: '1px solid var(--border)',
    }}>
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </p>
      <p style={{ margin: '0.375rem 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--char)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </p>
    </div>
  )
}

// ── Section heading ─────────────────────────────────────────────────────────
function SectionHeading({ title }: { title: string }) {
  return (
    <h2 style={{
      fontSize: '1.0625rem', fontWeight: 700, color: 'var(--char)',
      margin: '0 0 1rem', letterSpacing: '-0.01em',
    }}>
      {title}
    </h2>
  )
}

// ── Invalid page ─────────────────────────────────────────────────────────────
function InvalidPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F0E8', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1C1917', marginBottom: '0.5rem' }}>
          Link expired or invalid
        </h1>
        <p style={{ color: '#78716C', fontSize: '0.9375rem' }}>
          This accountant link has expired, been revoked, or does not exist.
        </p>
        <p style={{ color: '#A09590', fontSize: '0.8125rem', marginTop: '1.5rem' }}>
          Ask your client to generate a new link from their SAB Account AI settings.
        </p>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default async function AccountantPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase  = createServiceClient()

  // Validate token
  const { data: link } = await supabase
    .from('accountant_links')
    .select('id, user_id, label, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle()

  if (!link || !isLinkValid(link)) return <InvalidPage />

  const userId   = link.user_id as string
  const fyStart  = getFinancialYearStart().toISOString()

  // Fetch all data in parallel
  const [
    { data: bizProfile },
    { data: invoicesData },
    { data: payslipsData },
    { data: recordsData },
  ] = await Promise.all([
    supabase.from('business_profiles').select('business_name, abn').eq('id', userId).single(),
    supabase.from('invoices')
      .select('id, invoice_number, issue_date, due_date, total_inc_gst, status, document_type, client_name')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('issue_date', fyStart.split('T')[0])
      .order('issue_date', { ascending: false }),
    supabase.from('payslips')
      .select('gross_pay, income_tax, super_sg')
      .eq('user_id', userId)
      .gte('payment_date', fyStart.split('T')[0]),
    supabase.from('records')
      .select('type, gst_amount')
      .eq('user_id', userId)
      .gte('date', fyStart.split('T')[0]),
  ])

  const invoices = invoicesData ?? []
  const payslips = payslipsData ?? []
  const records  = recordsData ?? []

  const invoiceStats  = aggregateInvoiceStats(invoices)
  const payrollStats  = aggregatePayrollStats(payslips)
  const basStats      = aggregateBASStats(records)

  const businessName  = (bizProfile?.business_name as string | null) ?? 'Business'
  const abn           = (bizProfile?.abn as string | null) ?? ''
  const expiresDateFmt = formatDateAU(link.expires_at.split('T')[0])
  const fyYear        = getFinancialYearStart().getFullYear()
  const fyLabel       = `FY${fyYear}–${String(fyYear + 1).slice(2)}`

  const last50Invoices = invoices.slice(0, 50)

  return (
    <div style={{
      minHeight: '100vh', background: '#F5F0E8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Banner */}
      <div style={{ background: '#1C1917', padding: '0.875rem 1.5rem', textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#A09590', fontSize: '0.8125rem' }}>
          Read-only view shared by{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>{businessName}</span>
          {' '}· Expires {expiresDateFmt}
          {' '}· Powered by{' '}
          <span style={{ color: '#C84B2F', fontWeight: 600 }}>SAB Account AI</span>
        </p>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="font-display" style={{
            fontSize: '1.75rem', fontWeight: 700, color: '#1C1917',
            letterSpacing: '-0.02em', marginBottom: '0.25rem',
          }}>
            {businessName}
          </h1>
          {abn && (
            <p style={{ color: '#78716C', fontSize: '0.875rem' }}>
              ABN {formatABN(abn)}
            </p>
          )}
          <p style={{ color: '#A09590', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            {fyLabel} financial year · Data as of {formatDateAU(new Date().toISOString().split('T')[0])}
          </p>
        </div>

        {/* ── Invoice Summary ─────────────────────────────────────────── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionHeading title={`Invoice Summary · ${fyLabel}`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <StatCard label="Total Invoiced"   value={formatCurrency(invoiceStats.totalInvoiced)} />
            <StatCard label="Total Paid"        value={formatCurrency(invoiceStats.totalPaid)} />
            <StatCard label="Outstanding"       value={formatCurrency(invoiceStats.totalOutstanding)} />
          </div>

          {last50Invoices.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #E5DDD5', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #E5DDD5' }}>
                      {['Invoice #', 'Client', 'Date', 'Due', 'Amount', 'Status'].map(h => (
                        <th key={h} style={{
                          padding: '0.625rem 1rem', textAlign: h === 'Amount' ? 'right' : 'left',
                          fontSize: '0.75rem', fontWeight: 600, color: '#78716C',
                          letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {last50Invoices.map((inv, i) => (
                      <tr key={inv.id} style={{ borderBottom: i < last50Invoices.length - 1 ? '1px solid #E5DDD5' : 'none' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', color: '#1C1917', whiteSpace: 'nowrap' }}>
                          {inv.invoice_number}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1C1917', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inv.client_name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#78716C', whiteSpace: 'nowrap' }}>
                          {formatDateAU(inv.issue_date)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#78716C', whiteSpace: 'nowrap' }}>
                          {formatDateAU(inv.due_date)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#1C1917', whiteSpace: 'nowrap' }}>
                          {formatCurrency(Number(inv.total_inc_gst))}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <StatusBadge status={inv.document_type === 'quote' ? 'quote' : inv.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p style={{ color: '#A09590', fontSize: '0.875rem' }}>No invoices this financial year.</p>
          )}
        </div>

        {/* ── Payroll Summary ─────────────────────────────────────────── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionHeading title={`Payroll Summary · ${fyLabel}`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Total Gross Paid"    value={formatCurrency(payrollStats.totalGross)} />
            <StatCard label="PAYG Withheld"        value={formatCurrency(payrollStats.totalPAYG)} />
            <StatCard label="Superannuation"       value={formatCurrency(payrollStats.totalSuper)} />
          </div>
          {payslips.length === 0 && (
            <p style={{ color: '#A09590', fontSize: '0.875rem', marginTop: '0.75rem' }}>No payslips this financial year.</p>
          )}
        </div>

        {/* ── BAS / GST Summary ───────────────────────────────────────── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionHeading title={`GST / BAS Summary · ${fyLabel}`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="GST Collected"    value={formatCurrency(basStats.gstCollected)} />
            <StatCard label="GST Credits"      value={formatCurrency(basStats.gstCredits)} />
            <StatCard label="Net GST Payable"  value={formatCurrency(basStats.netGST)} />
          </div>
          {records.length === 0 && (
            <p style={{ color: '#A09590', fontSize: '0.875rem', marginTop: '0.75rem' }}>No income/expense records this financial year.</p>
          )}
        </div>

        {/* Footer */}
        <p style={{ color: '#A09590', fontSize: '0.75rem', textAlign: 'center', borderTop: '1px solid #E5DDD5', paddingTop: '1.5rem' }}>
          This is a read-only view. No changes can be made from this page.
          · Powered by <a href="https://sabaccountai.com" style={{ color: '#C84B2F', textDecoration: 'none' }}>SAB Account AI</a>
        </p>
      </div>
    </div>
  )
}
