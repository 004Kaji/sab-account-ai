'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { formatCurrency, formatDateAU } from '@/lib/utils'

interface Invoice {
  id: string
  invoice_number: string
  business_name: string
  business_abn: string
  business_email: string
  client_name: string
  total_inc_gst: number
  due_date: string
  issue_date: string
  status: string
}

export default function PayPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const invoiceId = params.invoiceId as string
  const isSuccess = searchParams.get('success') === 'true'

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, business_name, business_abn, business_email, client_name, total_inc_gst, due_date, issue_date, status')
        .eq('id', invoiceId)
        .single()
      if (error || !data) { setNotFound(true); setLoading(false); return }
      setInvoice(data as Invoice)
      setLoading(false)
    }
    load()
  }, [invoiceId])

  async function handlePay() {
    if (!invoice) return
    setPaying(true)
    try {
      const res = await fetch('/api/stripe/invoice-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Payment setup failed')
      window.location.href = data.url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong')
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem' }}>Invoice not found</h1>
          <p style={{ color: 'var(--text2)', fontSize: '0.9375rem' }}>This payment link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  if (!invoice) return null

  const alreadyPaid = invoice.status === 'paid'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Nav */}
      <header style={{ background: 'var(--char)', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--ember)" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem' }}>SAB Account AI</span>
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>Secure Payment</span>
      </header>

      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        {/* Success state */}
        {isSuccess || alreadyPaid ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '4.5rem', height: '4.5rem', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', margin: '0 auto 1.25rem' }}>
              ✓
            </div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              {isSuccess ? 'Payment successful!' : 'Already paid'}
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              {isSuccess
                ? `Invoice ${invoice.invoice_number} has been marked as paid. A receipt has been sent to your email.`
                : `Invoice ${invoice.invoice_number} has already been paid. Thank you!`}
            </p>
            <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>Invoice</span>
                <span style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.875rem' }}>{invoice.invoice_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <span style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>Amount paid</span>
                <span style={{ fontWeight: 700, color: '#15803d', fontSize: '1.125rem', fontFamily: 'var(--font-mono)' }}>{formatCurrency(invoice.total_inc_gst)}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* From */}
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '0.25rem' }}>Invoice from</p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
              {invoice.business_name || 'Your Supplier'}
            </h1>
            {invoice.business_abn && (
              <p style={{ color: 'var(--text3)', fontSize: '0.8125rem', marginBottom: '2rem' }}>ABN {invoice.business_abn}</p>
            )}
            {!invoice.business_abn && <div style={{ marginBottom: '2rem' }} />}

            {/* Invoice summary card */}
            <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Invoice', value: invoice.invoice_number },
                  { label: 'Billed to', value: invoice.client_name },
                  { label: 'Issued', value: formatDateAU(invoice.issue_date) },
                  { label: 'Due', value: formatDateAU(invoice.due_date) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--cream3)' }}>
                    <span style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.875rem' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)' }}>Total due (inc GST)</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ember)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                    {formatCurrency(invoice.total_inc_gst)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={paying}
              style={{
                width: '100%',
                background: 'var(--ember)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--r)',
                padding: '1rem',
                fontSize: '1.0625rem',
                fontWeight: 700,
                cursor: paying ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background 150ms',
                opacity: paying ? 0.7 : 1,
                marginBottom: '1rem',
              }}
              onMouseEnter={e => { if (!paying) (e.currentTarget as HTMLElement).style.background = 'var(--ember-l)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ember)' }}
            >
              {paying && <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />}
              {paying ? 'Redirecting to payment…' : `Pay ${formatCurrency(invoice.total_inc_gst)} now`}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text3)', lineHeight: 1.6 }}>
              🔒 Secure payment powered by Stripe. Your card details are never shared with {invoice.business_name || 'the supplier'}.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
