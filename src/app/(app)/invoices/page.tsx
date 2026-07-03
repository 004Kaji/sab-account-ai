'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDateAU, formatABN } from '@/lib/utils'
import { useProfile } from '@/app/(app)/profile-context'
import { AutopilotUpgradeBanner } from '@/components/ui/AutopilotUpgradeBanner'
import { PAGE_SIZE, getPageRange, calcOverdueDays } from '@/lib/invoice-utils'

type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue'
type DocumentType  = 'invoice' | 'quote'

interface Invoice {
  id: string
  invoice_number: string
  document_type: DocumentType
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
  paid_at?: string | null
  deleted_at?: string | null
}

type SummaryRow = { id: string; status: string; document_type: string; total_inc_gst: number; due_date: string }

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; color: string }> = {
  draft:   { bg: 'var(--cream2)',           color: 'var(--text3)' },
  pending: { bg: 'rgba(234,179,8,0.12)',     color: '#92400e'      },
  paid:    { bg: 'rgba(34,197,94,0.1)',      color: '#15803d'      },
  overdue: { bg: 'rgba(200,75,47,0.1)',      color: 'var(--ember)' },
}

type FilterStatus = 'all' | InvoiceStatus | 'quote'
type BulkAction   = 'mark_paid' | 'send_reminder' | 'delete' | 'soft_delete'

export default function InvoicesPage() {
  const { toast }   = useToast()
  const profile     = useProfile()
  const today       = new Date().toISOString().split('T')[0]

  useEffect(() => { document.title = 'Invoices — SAB Account AI' }, [])

  // ── data state ──
  const [invoices,    setInvoices]    = useState<Invoice[]>([])
  const [summary,     setSummary]     = useState<SummaryRow[]>([])
  const [totalCount,  setTotalCount]  = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [logoUrl,     setLogoUrl]     = useState<string | undefined>()

  // ── pagination + filter ──
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [page,   setPage]   = useState(0)

  // ── per-row loading ──
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [convertingId,  setConvertingId]  = useState<string | null>(null)

  // ── bulk select ──
  const [selectedIds,          setSelectedIds]          = useState<Set<string>>(new Set())
  const [bulkLoading,          setBulkLoading]          = useState<BulkAction | null>(null)
  const [showDeleteConfirm,    setShowDeleteConfirm]    = useState(false)

  // ── load lightweight summary (all rows, no pagination) ──────────────────
  const loadSummary = useCallback(async (userId: string) => {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('invoices')
      .select('id, status, document_type, total_inc_gst, due_date')
      .eq('user_id', userId)
      .is('deleted_at', null)

    const rows = (data ?? []) as SummaryRow[]

    // Auto-mark overdue in DB (pending + past due)
    const overdueIds = rows.filter(r => r.status === 'pending' && r.due_date < today && r.document_type !== 'quote').map(r => r.id)
    if (overdueIds.length) {
      await supabase.from('invoices').update({ status: 'overdue' }).in('id', overdueIds)
      rows.forEach(r => { if (overdueIds.includes(r.id)) r.status = 'overdue' })
    }

    setSummary(rows)
  }, [today])

  // ── load paginated page ──────────────────────────────────────────────────
  const loadPage = useCallback(async (userId: string, currentFilter: FilterStatus, currentPage: number) => {
    const supabase = createBrowserClient()
    const { from, to } = getPageRange(currentPage)

    let q = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (currentFilter === 'quote') {
      q = q.eq('document_type', 'quote')
    } else if (currentFilter !== 'all') {
      q = (q.eq('status', currentFilter) as typeof q).neq('document_type', 'quote')
    }

    const { data, count } = await q
    setInvoices((data ?? []) as Invoice[])
    setTotalCount(count ?? 0)
  }, [])

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true)
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: bizData } = await supabase.from('business_profiles').select('logo_url').eq('id', user.id).single()
      setLogoUrl(bizData?.logo_url || undefined)

      await Promise.all([
        loadSummary(user.id),
        loadPage(user.id, 'all', 0),
      ])
      setLoading(false)
    }
    init()
  }, [loadSummary, loadPage])

  // ── reload page when filter or page changes (after init) ─────────────────
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (!initialized) { setInitialized(true); return }
    async function reload() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setLoading(true)
      await loadPage(user.id, filter, page)
      setLoading(false)
    }
    reload()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page])

  // ── derived counts from summary ───────────────────────────────────────────
  const counts = {
    all:     summary.length,
    quote:   summary.filter(r => r.document_type === 'quote').length,
    pending: summary.filter(r => r.status === 'pending' && r.document_type !== 'quote').length,
    overdue: summary.filter(r => r.status === 'overdue').length,
    paid:    summary.filter(r => r.status === 'paid').length,
    draft:   summary.filter(r => r.status === 'draft'   && r.document_type !== 'quote').length,
  }

  const totalOutstanding = summary
    .filter(r => (r.status === 'pending' || r.status === 'overdue') && r.document_type !== 'quote')
    .reduce((s, r) => s + Number(r.total_inc_gst), 0)

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // ── filter change resets page + selection ─────────────────────────────────
  function handleFilterChange(f: FilterStatus) {
    setFilter(f)
    setPage(0)
    setSelectedIds(new Set())
  }

  // ── per-row actions (unchanged behaviour) ─────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setDeletingId(id)
    const supabase = createBrowserClient()
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Delete failed', 'error'); return }
    setInvoices(prev => prev.filter(inv => inv.id !== id))
    setSummary(prev => prev.filter(r => r.id !== id))
    setTotalCount(prev => Math.max(0, prev - 1))
    toast('Invoice deleted', 'info')
  }

  async function handleMarkPaid(id: string) {
    setMarkingPaidId(id)
    const supabase = createBrowserClient()
    const { error } = await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    setMarkingPaidId(null)
    if (error) { toast('Update failed', 'error'); return }
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'paid' as InvoiceStatus } : inv))
    setSummary(prev => prev.map(r => r.id === id ? { ...r, status: 'paid' } : r))
    toast('Invoice marked as paid', 'success')
  }

  async function handleConvertToInvoice(id: string) {
    setConvertingId(id)
    const supabase = createBrowserClient()
    const { error } = await supabase.from('invoices').update({ document_type: 'invoice', status: 'pending' }).eq('id', id)
    setConvertingId(null)
    if (error) { toast('Convert failed', 'error'); return }
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, document_type: 'invoice' as DocumentType, status: 'pending' as InvoiceStatus } : inv))
    toast('Quote converted to invoice', 'success')
  }

  async function handleDownloadPDF(inv: Invoice) {
    setDownloadingId(inv.id)
    try {
      const { downloadInvoicePDF } = await import('@/lib/pdf')
      await downloadInvoicePDF({
        invoice_number:       inv.invoice_number   || '',
        issue_date:           inv.issue_date        || '',
        due_date:             inv.due_date          || '',
        payment_terms:        inv.payment_terms     || '',
        business_name:        inv.business_name     || '',
        business_abn:         inv.business_abn ? formatABN(inv.business_abn) : '',
        business_email:       inv.business_email    || '',
        business_phone:       inv.business_phone    || '',
        business_address:     inv.business_address  || '',
        logo_url:             logoUrl,
        client_name:          inv.client_name       || '',
        client_business_name: inv.client_business_name || undefined,
        client_abn:           inv.client_abn ? formatABN(inv.client_abn) : '',
        client_email:         inv.client_email      || '',
        client_address:       inv.client_address    || '',
        line_items:           inv.line_items        ?? [],
        subtotal_ex_gst:      inv.subtotal_ex_gst   ?? 0,
        total_gst:            inv.total_gst         ?? 0,
        total_inc_gst:        inv.total_inc_gst     ?? 0,
        bank_name:            inv.bank_name         || '',
        account_name:         inv.account_name      || '',
        bsb:                  inv.bsb               || '',
        account_number:       inv.account_number    || '',
        notes:                inv.notes             || '',
        document_type:        inv.document_type     || 'invoice',
      })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'PDF generation failed', 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  // ── checkbox helpers ──────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const pageIds = invoices.map(inv => inv.id)
    const allSelected = pageIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(prev => { const next = new Set(prev); pageIds.forEach(id => next.delete(id)); return next })
    } else {
      setSelectedIds(prev => new Set([...prev, ...pageIds]))
    }
  }

  const pageIds        = invoices.map(inv => inv.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))
  const somePageSelected = pageIds.some(id => selectedIds.has(id))

  // ── bulk actions ──────────────────────────────────────────────────────────
  async function callBulkAPI(action: BulkAction) {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return false

    const res = await fetch('/api/invoices/bulk', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ action, ids: [...selectedIds] }),
    })
    return res.ok
  }

  async function refreshAfterBulk() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await Promise.all([loadSummary(user.id), loadPage(user.id, filter, page)])
    setSelectedIds(new Set())
  }

  async function handleBulkMarkPaid() {
    setBulkLoading('mark_paid')
    const ok = await callBulkAPI('mark_paid')
    setBulkLoading(null)
    if (ok) { toast(`Marked ${selectedIds.size} invoice(s) as paid`, 'success'); await refreshAfterBulk() }
    else { setSelectedIds(new Set()); toast('Failed to mark as paid', 'error') }
  }

  async function handleBulkReminder() {
    setBulkLoading('send_reminder')
    const ok = await callBulkAPI('send_reminder')
    setBulkLoading(null)
    if (ok) { toast('Reminder emails queued', 'success'); setSelectedIds(new Set()) }
    else { setSelectedIds(new Set()); toast('Failed to queue reminders', 'error') }
  }

  async function handleBulkDelete() {
    setShowDeleteConfirm(false)
    setBulkLoading('delete')
    const ok = await callBulkAPI('soft_delete')
    setBulkLoading(null)
    if (ok) { toast(`Deleted ${selectedIds.size} invoice(s)`, 'info'); await refreshAfterBulk() }
    else { setSelectedIds(new Set()); toast('Delete failed', 'error') }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      <AutopilotUpgradeBanner plan={profile.plan} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Invoices
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
            {counts.all} invoice{counts.all !== 1 ? 's' : ''}
            {totalOutstanding > 0 && (
              <span style={{ marginLeft: '0.5rem', color: 'var(--ember)', fontWeight: 600 }}>
                · {formatCurrency(totalOutstanding)} outstanding
              </span>
            )}
          </p>
        </div>
        <Link href="/invoice" className="btn btn-ember" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
          + New Invoice
        </Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {([
          ['all',     `All (${counts.all})`],
          ['pending', `Pending (${counts.pending})`],
          ['overdue', `Overdue (${counts.overdue})`],
          ['paid',    `Paid (${counts.paid})`],
          ['quote',   `Quotes (${counts.quote})`],
          ['draft',   `Draft (${counts.draft})`],
        ] as [FilterStatus, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
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

      {/* Bulk toolbar */}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          padding: '0.625rem 1rem', marginBottom: '0.75rem',
          background: 'var(--char)', borderRadius: 'var(--r)', color: '#fff',
        }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, marginRight: '0.25rem' }}>
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkMarkPaid}
            disabled={!!bulkLoading}
            style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500, border: 'none', background: 'rgba(34,197,94,0.2)', color: '#86efac', cursor: 'pointer' }}
          >
            {bulkLoading === 'mark_paid' ? '…' : 'Mark as paid'}
          </button>
          <button
            onClick={handleBulkReminder}
            disabled={!!bulkLoading}
            style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500, border: 'none', background: 'rgba(234,179,8,0.2)', color: '#fde68a', cursor: 'pointer' }}
          >
            {bulkLoading === 'send_reminder' ? '…' : 'Send reminder'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!!bulkLoading}
            style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500, border: 'none', background: 'rgba(200,75,47,0.25)', color: '#fca5a5', cursor: 'pointer' }}
          >
            {bulkLoading === 'delete' ? '…' : 'Delete'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft: 'auto', padding: '0.3rem 0.5rem', borderRadius: '6px', fontSize: '0.8125rem', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
          </div>
        ) : invoices.length === 0 ? (
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
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                    {/* Select-all checkbox */}
                    <th style={{ padding: '0.625rem 0.75rem 0.625rem 1rem', width: '2rem' }}>
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', accentColor: 'var(--ember)' }}
                      />
                    </th>
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
                  {invoices.map((inv, i) => {
                    const isQuote       = inv.document_type === 'quote'
                    const style         = STATUS_STYLES[inv.status] ?? STATUS_STYLES.pending
                    const isDeleting    = deletingId    === inv.id
                    const isDownloading = downloadingId === inv.id
                    const isMarking     = markingPaidId === inv.id
                    const isConverting  = convertingId  === inv.id
                    const isSelected    = selectedIds.has(inv.id)
                    const overdueDays   = !isQuote && inv.status !== 'paid'
                      ? calcOverdueDays(inv.due_date, today)
                      : null

                    return (
                      <tr
                        key={inv.id}
                        style={{
                          borderBottom: i < invoices.length - 1 ? '1px solid var(--border)' : 'none',
                          background: isSelected ? 'rgba(200,75,47,0.04)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '0.75rem 0.75rem 0.75rem 1rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(inv.id)}
                            style={{ cursor: 'pointer', accentColor: 'var(--ember)' }}
                          />
                        </td>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                            {isQuote ? (
                              <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'rgba(37,99,235,0.1)', color: '#1d4ed8' }}>
                                Quote
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '999px', background: style.bg, color: style.color }}>
                                {inv.status}
                              </span>
                            )}
                            {overdueDays !== null && (
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'rgba(200,75,47,0.1)', color: 'var(--ember)', whiteSpace: 'nowrap' }}>
                                {overdueDays}d overdue
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {isQuote && (
                              <button onClick={() => handleConvertToInvoice(inv.id)} disabled={isConverting}
                                style={{ padding: '0.25rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.08)', color: '#1d4ed8', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {isConverting ? '…' : 'Convert to Invoice'}
                              </button>
                            )}
                            {!isQuote && (inv.status === 'pending' || inv.status === 'overdue') && (
                              <button onClick={() => handleMarkPaid(inv.id)} disabled={isMarking}
                                style={{ padding: '0.25rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#15803d', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {isMarking ? '…' : 'Mark paid'}
                              </button>
                            )}
                            <button onClick={() => handleDownloadPDF(inv)} disabled={isDownloading}
                              style={{ padding: '0.25rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid var(--border)', background: '#fff', color: 'var(--char)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              {isDownloading ? '…' : '↓ PDF'}
                            </button>
                            <button onClick={() => handleDelete(inv.id)} disabled={isDeleting} title="Delete invoice"
                              style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '1rem', border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', lineHeight: 1 }}>
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

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--cream)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500, border: '1px solid var(--border)', background: '#fff', color: page === 0 ? 'var(--text3)' : 'var(--char)', cursor: page === 0 ? 'default' : 'pointer' }}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500, border: '1px solid var(--border)', background: '#fff', color: page >= totalPages - 1 ? 'var(--text3)' : 'var(--char)', cursor: page >= totalPages - 1 ? 'default' : 'pointer' }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk delete confirmation dialog */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--r)', padding: '1.5rem', maxWidth: '400px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
            <h3 style={{ margin: '0 0 0.75rem', color: 'var(--char)', fontSize: '1.0625rem', fontWeight: 700 }}>
              Delete {selectedIds.size} invoice{selectedIds.size !== 1 ? 's' : ''}?
            </h3>
            <p style={{ margin: '0 0 1.25rem', color: 'var(--text2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              These invoices will be archived (soft deleted) and removed from your list. This cannot be reversed from the UI.
            </p>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500, border: '1px solid var(--border)', background: '#fff', color: 'var(--char)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleBulkDelete}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, border: 'none', background: 'var(--ember)', color: '#fff', cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
