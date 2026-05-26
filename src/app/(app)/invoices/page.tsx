'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDateAU, formatABN } from '@/lib/utils'

type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue'

interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_business_name?: string
  client_abn: string
  client_email: string
  client_address: string
  business_name: string
  business_abn: string
  business_email: string
  business_phone: string
  business_address: string
  line_items: Array<{ description: string; qty: number; unit_price: number; amount: number; has_gst: boolean }>
  subtotal_ex_gst: number
  total_gst: number
  total_inc_gst: number
  issue_date: string
  due_date: string
  payment_terms: string
  bank_name: string
  account_name: string
  bsb: string
  account_number: string
  notes: string
  status: InvoiceStatus
  created_at: string
}

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; color: string }> = {
  draft:   { bg: 'var(--cream2)',           color: 'var(--text3)' },
  pending: { bg: 'rgba(234,179,8,0.12)',     color: '#92400e'      },
  paid:    { bg: 'rgba(34,197,94,0.1)',      color: '#15803d'      },
  overdue: { bg: 'rgba(200,75,47,0.1)',      color: 'var(--ember)' },
}

type FilterStatus = 'all' | InvoiceStatus

export default function InvoicesPage() {
  const { toast } = useToast()
  useEffect(() => { document.title = 'Invoices — SAB Account AI' }, [])

  const [invoices, setInvoices]         = useState<Invoice[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState<FilterStatus>('all')
  const [logoUrl, setLogoUrl]           = useState<string | undefined>()
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: invData }, { data: bizData }] = await Promise.all([
        supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('business_profiles').select('logo_url').eq('id', user.id).single(),
      ])
      setInvoices((invData ?? []) as Invoice[])
      setLogoUrl(bizData?.logo_url || undefined)
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setDeletingId(id)
    const supabase = createBrowserClient()
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Delete failed', 'error'); return }
    setInvoices(prev => prev.filter(inv => inv.id !== id))
    toast('Invoice deleted', 'info')
  }

  async function handleMarkPaid(id: string) {
    setMarkingPaidId(id)
    const supabase = createBrowserClient()
    const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', id)
    setMarkingPaidId(null)
    if (error) { toast('Update failed', 'error'); return }
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'paid' as InvoiceStatus } : inv))
    toast('Invoice marked as paid', 'success')
  }

  async function handleDownloadPDF(inv: Invoice) {
    setDownloadingId(inv.id)
    try {
      const { downloadInvoicePDF } = await import('@/lib/pdf')
      await downloadInvoicePDF({
        invoice_number:   inv.invoice_number,
        issue_date:       inv.issue_date,
        due_date:         inv.due_date,
        payment_terms:    inv.payment_terms,
        business_name:    inv.business_name,
        business_abn:     inv.business_abn ? formatABN(inv.business_abn) : '',
        business_email:   inv.business_email,
        business_phone:   inv.business_phone,
        business_address: inv.business_address,
        logo_url:         logoUrl,
        client_name:      inv.client_name,
        client_business_name: inv.client_business_name || undefined,
        client_abn:       inv.client_abn ? formatABN(inv.client_abn) : '',
        client_email:     inv.client_email,
        client_address:   inv.client_address,
        line_items:       inv.line_items ?? [],
        subtotal_ex_gst:  inv.subtotal_ex_gst,
        total_gst:        inv.total_gst,
        total_inc_gst:    inv.total_inc_gst,
        bank_name:        inv.bank_name,
        account_name:     inv.account_name,
        bsb:              inv.bsb,
        account_number:   inv.account_number,
        notes:            inv.notes,
      })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'PDF generation failed', 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  const filtered = filter === 'all' ? invoices : invoices.filter(inv => inv.status === filter)

  const counts = {
    all:     invoices.length,
    pending: invoices.filter(i => i.status === 'pending').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    paid:    invoices.filter(i => i.status === 'paid').length,
    draft:   invoices.filter(i => i.status === 'draft').length,
  }

  const totalOutstanding = invoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((s, i) => s + Number(i.total_inc_gst), 0)

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Invoices
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            {totalOutstanding > 0 && ` · ${formatCurrency(totalOutstanding)} outstanding`}
          </p>
        </div>
        <Link href="/invoice" className="btn btn-ember" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
          + New Invoice
        </Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {([
          ['all',     `All (${counts.all})`],
          ['pending', `Pending (${counts.pending})`],
          ['overdue', `Overdue (${counts.overdue})`],
          ['paid',    `Paid (${counts.paid})`],
          ['draft',   `Draft (${counts.draft})`],
        ] as [FilterStatus, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '0.3rem 0.875rem', borderRadius: '999px', fontSize: '0.8125rem',
              fontWeight: 500, border: 'none', cursor: 'pointer',
              background: filter === key ? 'var(--char)' : 'var(--cream2)',
              color: filter === key ? '#fff' : 'var(--text2)', transition: 'all 150ms',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🧾</p>
            <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.375rem' }}>
              {filter === 'all' ? 'No invoices yet' : `No ${filter} invoices`}
            </p>
            {filter === 'all' && (
              <Link href="/invoice" className="btn btn-ember" style={{ textDecoration: 'none', fontSize: '0.875rem', marginTop: '0.75rem', display: 'inline-flex' }}>
                Create your first invoice
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  {['Invoice', 'Client', 'Issued', 'Due', 'Amount', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '0.625rem 1rem',
                      textAlign: h === 'Amount' ? 'right' : 'left',
                      fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)',
                      letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, i) => {
                  const style = STATUS_STYLES[inv.status] ?? STATUS_STYLES.pending
                  const isDeleting    = deletingId    === inv.id
                  const isDownloading = downloadingId === inv.id
                  const isMarking     = markingPaidId === inv.id
                  return (
                    <tr key={inv.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--char)', whiteSpace: 'nowrap' }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--char)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.client_name}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                        {formatDateAU(inv.issue_date)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: inv.status === 'overdue' ? 'var(--ember)' : 'var(--text2)', whiteSpace: 'nowrap', fontWeight: inv.status === 'overdue' ? 600 : 400 }}>
                        {formatDateAU(inv.due_date)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--char)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(inv.total_inc_gst)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em',
                          textTransform: 'uppercase', padding: '0.2rem 0.5rem',
                          borderRadius: '999px', background: style.bg, color: style.color,
                        }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {(inv.status === 'pending' || inv.status === 'overdue') && (
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              disabled={isMarking}
                              style={{ padding: '0.25rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#15803d', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              {isMarking ? '…' : 'Mark paid'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            disabled={isDownloading}
                            style={{ padding: '0.25rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid var(--border)', background: '#fff', color: 'var(--char)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {isDownloading ? '…' : '↓ PDF'}
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            disabled={isDeleting}
                            title="Delete invoice"
                            style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '1rem', border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', lineHeight: 1 }}
                          >
                            {isDeleting ? '…' : '×'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
