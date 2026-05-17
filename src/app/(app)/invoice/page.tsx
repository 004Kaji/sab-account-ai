'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { useProfile } from '@/app/(app)/profile-context'
import { useToast } from '@/components/ui/Toast'
import AutocompleteDropdown from '@/components/ui/AutocompleteDropdown'
import {
  formatCurrency, formatDateAU, todayISO, addDays,
  uid, generateInvoiceNumber, formatABN,
} from '@/lib/utils'

interface LineItem {
  id: string
  description: string
  qty: number
  unit_price: number
  has_gst: boolean
  amount: number
}

interface BizProfile {
  business_name: string
  abn: string
  email: string
  phone: string
  address: string
}

interface ClientRecord {
  id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  abn: string | null
}

const PAYMENT_TERMS = ['7 days', '14 days', '30 days', 'On receipt'] as const

function defaultItem(): LineItem {
  return { id: uid(), description: '', qty: 1, unit_price: 0, has_gst: true, amount: 0 }
}

function calcTotals(items: LineItem[]) {
  const subtotal_ex_gst = items.reduce((s, it) => s + it.amount, 0)
  const total_gst = items.reduce((s, it) => s + (it.has_gst ? Math.round(it.amount * 10) / 100 : 0), 0)
  const total_inc_gst = Math.round((subtotal_ex_gst + total_gst) * 100) / 100
  return {
    subtotal_ex_gst: Math.round(subtotal_ex_gst * 100) / 100,
    total_gst: Math.round(total_gst * 100) / 100,
    total_inc_gst,
  }
}

function termsToDays(terms: string): number {
  if (terms === '7 days') return 7
  if (terms === '14 days') return 14
  if (terms === '30 days') return 30
  return 0
}

function InvoicePreview({ form, biz, totals }: {
  form: ReturnType<typeof makeForm>
  biz: BizProfile | null
  totals: ReturnType<typeof calcTotals>
}) {
  const bizName = biz?.business_name || 'Your Business'
  return (
    <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '2rem', fontSize: '0.8125rem', color: '#1C1917', lineHeight: 1.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>{bizName}</p>
          {biz?.abn && <p style={{ color: '#646060' }}>ABN: {formatABN(biz.abn)}</p>}
          {biz?.email && <p style={{ color: '#646060' }}>{biz.email}</p>}
          {biz?.phone && <p style={{ color: '#646060' }}>{biz.phone}</p>}
          {biz?.address && <p style={{ color: '#646060', maxWidth: '180px' }}>{biz.address}</p>}
        </div>
        <div style={{ background: '#C84B2F', color: '#fff', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.06em', padding: '0.3rem 0.875rem', borderRadius: '4px' }}>TAX INVOICE</div>
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid #E5DDD5', margin: '1rem 0' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, color: '#A09590', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>BILL TO</p>
          <p style={{ fontWeight: 700 }}>{form.client_name || '—'}</p>
          {form.client_business_name && <p style={{ color: '#646060' }}>{form.client_business_name}</p>}
          {form.client_abn && <p style={{ color: '#646060' }}>ABN: {formatABN(form.client_abn)}</p>}
          {form.client_email && <p style={{ color: '#646060' }}>{form.client_email}</p>}
          {form.client_address && <p style={{ color: '#646060', whiteSpace: 'pre-line' }}>{form.client_address}</p>}
        </div>
        <div>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, color: '#A09590', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>INVOICE DETAILS</p>
          <p style={{ fontWeight: 700 }}>{form.invoice_number}</p>
          <p style={{ color: '#646060' }}>Issued: {form.issue_date ? formatDateAU(form.issue_date) : '—'}</p>
          <p style={{ color: '#646060' }}>Due: {form.due_date ? formatDateAU(form.due_date) : '—'}</p>
          <p style={{ color: '#646060' }}>Terms: {form.payment_terms}</p>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
        <thead>
          <tr style={{ background: '#F5F0E8' }}>
            {['Description', 'Qty', 'Unit Price', 'GST', 'Amount'].map(h => (
              <th key={h} style={{ padding: '0.375rem 0.5rem', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: '0.625rem', fontWeight: 700, color: '#A09590', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {form.line_items.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 1 ? '#FAF8F5' : 'transparent' }}>
              <td style={{ padding: '0.375rem 0.5rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || '—'}</td>
              <td style={{ padding: '0.375rem 0.5rem' }}>{item.qty}</td>
              <td style={{ padding: '0.375rem 0.5rem' }}>{formatCurrency(item.unit_price)}</td>
              <td style={{ padding: '0.375rem 0.5rem' }}>{item.has_gst ? 'Yes' : 'No'}</td>
              <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <span style={{ color: '#646060' }}>Subtotal (ex GST)</span>
          <span style={{ fontFamily: 'var(--font-mono)', minWidth: '80px', textAlign: 'right' }}>{formatCurrency(totals.subtotal_ex_gst)}</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <span style={{ color: '#646060' }}>GST (10%)</span>
          <span style={{ fontFamily: 'var(--font-mono)', minWidth: '80px', textAlign: 'right' }}>{formatCurrency(totals.total_gst)}</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', background: '#C84B2F', color: '#fff', padding: '0.375rem 0.75rem', borderRadius: '4px', fontWeight: 700, marginTop: '0.25rem' }}>
          <span>TOTAL DUE (INC GST)</span>
          <span style={{ fontFamily: 'var(--font-mono)', minWidth: '80px', textAlign: 'right' }}>{formatCurrency(totals.total_inc_gst)}</span>
        </div>
      </div>
      {(form.bank_name || form.bsb || form.account_number) && (
        <div style={{ background: '#F5F0E8', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.625rem', color: '#A09590', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>PAYMENT DETAILS</p>
          {form.bank_name && <p>Bank: {form.bank_name}</p>}
          {form.account_name && <p>Account Name: {form.account_name}</p>}
          {form.bsb && <p>BSB: {form.bsb}</p>}
          {form.account_number && <p>Account: {form.account_number}</p>}
        </div>
      )}
      {form.notes && <p style={{ color: '#646060', fontSize: '0.75rem', whiteSpace: 'pre-line' }}>{form.notes}</p>}
      <p style={{ color: '#C0BAB5', fontSize: '0.625rem', textAlign: 'center', marginTop: '1.5rem' }}>Generated by SAB Account AI</p>
    </div>
  )
}

function makeForm(invoiceNumber: string) {
  const today = todayISO()
  return {
    invoice_number: invoiceNumber,
    issue_date: today,
    due_date: addDays(today, 14),
    payment_terms: '14 days',
    client_name: '',
    client_business_name: '',
    client_abn: '',
    client_email: '',
    client_address: '',
    line_items: [defaultItem()] as LineItem[],
    bank_name: '',
    account_name: '',
    bsb: '',
    account_number: '',
    notes: '',
  }
}
type InvoiceForm = ReturnType<typeof makeForm>

export default function InvoicePage() {
  const router = useRouter()
  const profile = useProfile()
  const { toast } = useToast()
  useEffect(() => { document.title = 'Create Invoice — SAB Account AI' }, [])

  const [biz, setBiz] = useState<BizProfile | null>(null)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [savingClient, setSavingClient] = useState(false)
  const [clientSaved, setClientSaved] = useState(false)
  const [form, setForm] = useState<InvoiceForm>(makeForm('INV-…'))
  const [mode, setMode] = useState<'ai' | 'manual'>('ai')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedInvoice, setSavedInvoice] = useState<{ id: string; number: string } | null>(null)
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const totals = calcTotals(form.line_items)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: bizData }, { data: lastInv }, { data: clientData }] = await Promise.all([
        supabase.from('business_profiles').select('business_name,abn,email,phone,address').eq('id', user.id).single(),
        supabase.from('invoices').select('invoice_number').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('clients').select('id,business_name,contact_name,email,phone,address,abn').eq('user_id', user.id).order('business_name'),
      ])
      setBiz(bizData ?? null)
      setClients((clientData ?? []) as ClientRecord[])
      // Derive next number from the last invoice_number (avoids duplicates when invoices are deleted)
      const lastSeq = lastInv?.invoice_number
        ? parseInt(lastInv.invoice_number.split('-').pop() ?? '0', 10)
        : 0
      const nextNum = generateInvoiceNumber(lastSeq + 1)
      setForm(makeForm(nextNum))
    }
    load()
  }, [])

  const setField = useCallback(<K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if ((key === 'payment_terms' || key === 'issue_date') && next.issue_date) {
        next.due_date = addDays(next.issue_date, termsToDays(next.payment_terms))
      }
      return next
    })
  }, [])

  function updateItem(id: string, patch: Partial<LineItem>) {
    setForm(prev => ({
      ...prev,
      line_items: prev.line_items.map(it => {
        if (it.id !== id) return it
        const merged = { ...it, ...patch }
        merged.amount = Math.round(merged.qty * merged.unit_price * 100) / 100
        return merged
      }),
    }))
  }

  function addItem() {
    setForm(prev => ({ ...prev, line_items: [...prev.line_items, defaultItem()] }))
  }

  function removeItem(id: string) {
    setForm(prev => ({
      ...prev,
      line_items: prev.line_items.length > 1 ? prev.line_items.filter(it => it.id !== id) : prev.line_items,
    }))
  }

  async function handleGenerate() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/invoice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ prompt: aiPrompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const items: LineItem[] = (data.line_items ?? []).map((it: { description: string; qty: number; unit_price: number; has_gst: boolean }) => {
        const amount = Math.round(it.qty * it.unit_price * 100) / 100
        return { id: uid(), description: it.description, qty: it.qty, unit_price: it.unit_price, has_gst: it.has_gst ?? true, amount }
      })
      setForm(prev => ({ ...prev, line_items: items.length > 0 ? items : prev.line_items, notes: data.notes ?? prev.notes }))
      setMode('manual')
      toast('Invoice generated — review and save', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Generation failed', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSave(status: 'draft' | 'pending') {
    if (!form.client_name.trim()) { toast('Client name is required', 'error'); return }
    if (form.line_items.every(it => !it.description.trim())) { toast('Add at least one line item', 'error'); return }

    if (profile.plan === 'free') {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Use local date string (YYYY-MM-01) to avoid UTC timezone shift for AU users
        const now = new Date()
        const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfMonth)
        if ((count ?? 0) >= 3) { toast('Free plan limit reached (3/month) — upgrade to create more', 'error'); return }
      }
    }

    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase.from('invoices').insert({
        user_id: user.id,
        invoice_number: form.invoice_number,
        status,
        client_name: form.client_name,
        client_abn: form.client_abn,
        client_email: form.client_email,
        client_address: form.client_address,
        business_name: biz?.business_name ?? '',
        business_abn: biz?.abn ?? '',
        business_email: biz?.email ?? '',
        business_phone: biz?.phone ?? '',
        business_address: biz?.address ?? '',
        line_items: form.line_items.map(({ id: _id, ...it }) => it),
        has_gst: form.line_items.some(it => it.has_gst),
        subtotal_ex_gst: totals.subtotal_ex_gst,
        total_gst: totals.total_gst,
        total_inc_gst: totals.total_inc_gst,
        issue_date: form.issue_date,
        due_date: form.due_date,
        payment_terms: form.payment_terms,
        bank_name: form.bank_name,
        account_name: form.account_name,
        bsb: form.bsb,
        account_number: form.account_number,
        notes: form.notes,
      }).select('id').single()
      if (error) throw error
      setSavedInvoice({ id: data.id, number: form.invoice_number })
      if (form.client_email) setEmailTo(form.client_email)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadPDF() {
    const { downloadInvoicePDF } = await import('@/lib/pdf')
    await downloadInvoicePDF({
      invoice_number: form.invoice_number,
      issue_date: form.issue_date,
      due_date: form.due_date,
      payment_terms: form.payment_terms,
      business_name: biz?.business_name ?? '',
      business_abn: biz?.abn ? formatABN(biz.abn) : '',
      business_email: biz?.email ?? '',
      business_phone: biz?.phone ?? '',
      business_address: biz?.address ?? '',
      client_name: form.client_name,
      client_business_name: form.client_business_name || undefined,
      client_abn: form.client_abn ? formatABN(form.client_abn) : '',
      client_email: form.client_email,
      client_address: form.client_address,
      line_items: form.line_items,
      subtotal_ex_gst: totals.subtotal_ex_gst,
      total_gst: totals.total_gst,
      total_inc_gst: totals.total_inc_gst,
      bank_name: form.bank_name,
      account_name: form.account_name,
      bsb: form.bsb,
      account_number: form.account_number,
      notes: form.notes,
    })
  }

  async function handleSaveNewClient() {
    if (!form.client_name.trim()) return
    setSavingClient(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('clients').insert({
        user_id:       user.id,
        contact_name:  form.client_name.trim(),
        business_name: form.client_business_name.trim() || form.client_name.trim(),
        abn:           form.client_abn.replace(/\s/g, '') || null,
        email:         form.client_email.trim() || null,
        address:       form.client_address.trim() || null,
      })
      setClientSaved(true)
      toast(`${form.client_name} saved to your client list`, 'success')
    } catch {
      toast('Could not save client', 'error')
    } finally {
      setSavingClient(false)
    }
  }

  async function handleSendEmail() {
    if (!emailTo.trim()) { toast('Enter an email address', 'error'); return }
    setEmailSending(true)
    try {
      const { getInvoicePDFBase64 } = await import('@/lib/pdf')
      const pdfBase64 = await getInvoicePDFBase64({
        invoice_number: form.invoice_number,
        issue_date: form.issue_date,
        due_date: form.due_date,
        payment_terms: form.payment_terms,
        business_name: biz?.business_name ?? '',
        business_abn: biz?.abn ? formatABN(biz.abn) : '',
        business_email: biz?.email ?? '',
        business_phone: biz?.phone ?? '',
        business_address: biz?.address ?? '',
        client_name: form.client_name,
        client_business_name: form.client_business_name || undefined,
        client_abn: form.client_abn ? formatABN(form.client_abn) : '',
        client_email: form.client_email,
        client_address: form.client_address,
        line_items: form.line_items,
        subtotal_ex_gst: totals.subtotal_ex_gst,
        total_gst: totals.total_gst,
        total_inc_gst: totals.total_inc_gst,
        bank_name: form.bank_name,
        account_name: form.account_name,
        bsb: form.bsb,
        account_number: form.account_number,
        notes: form.notes,
      })
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const res = await fetch('/api/email/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          to: emailTo.trim(),
          clientName: form.client_name,
          businessName: biz?.business_name ?? '',
          invoiceNumber: form.invoice_number,
          totalDue: formatCurrency(totals.total_inc_gst),
          dueDate: form.due_date ? formatDateAU(form.due_date) : '',
          pdfBase64,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to send')
      setEmailSent(true)
      toast('Invoice sent successfully!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send email', 'error')
    } finally {
      setEmailSending(false)
    }
  }

  if (savedInvoice) {
    return (
      <div style={{ maxWidth: '520px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.25rem' }}>✓</div>
        <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Invoice Saved!</h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginBottom: '2rem' }}>{savedInvoice.number} · {formatCurrency(totals.total_inc_gst)} has been saved.</p>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '1rem', textAlign: 'left' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.625rem' }}>Send invoice by email</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="sab-input" type="email" placeholder="client@example.com" value={emailTo} onChange={e => { setEmailTo(e.target.value); setEmailSent(false) }} style={{ flex: 1 }} />
            <button onClick={handleSendEmail} disabled={emailSending || emailSent} className="btn btn-char" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              {emailSending && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
              {emailSending ? 'Sending…' : emailSent ? '✓ Sent' : 'Send Email'}
            </button>
          </div>
          {emailSent && <p style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.5rem' }}>Invoice emailed to {emailTo}</p>}
        </div>
        {!selectedClientId && form.client_name && !clientSaved && (
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem', marginBottom: '1rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.375rem' }}>
              Save &ldquo;{form.client_name}&rdquo; to your client list?
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.875rem' }}>
              Auto-fill their details next time you create an invoice.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleSaveNewClient} disabled={savingClient} className="btn btn-char" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem' }}>
                {savingClient ? 'Saving…' : 'Save client'}
              </button>
              <button onClick={() => setClientSaved(true)} className="btn btn-ghost" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem' }}>
                Not now
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={handleDownloadPDF} className="btn btn-ember" style={{ width: '100%' }}>Download PDF</button>
          <button
            onClick={() => {
              setSavedInvoice(null)
              setAiPrompt('')
              setMode('ai')
              setEmailTo('')
              setEmailSent(false)
              setSelectedClientId(null)
              setClientSaved(false)
              setForm(makeForm(generateInvoiceNumber(parseInt(savedInvoice.number.split('-')[2] ?? '1') + 1)))
            }}
            className="btn btn-outline"
            style={{ width: '100%' }}
          >
            Create Another Invoice
          </button>
          <button onClick={() => router.push('/dashboard')} className="btn btn-ghost" style={{ width: '100%' }}>Back to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Create Invoice</h1>
        <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>{form.invoice_number} · {biz?.business_name || profile.business_name || 'Your Business'}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem', alignItems: 'start' }} className="invoice-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'inline-flex', gap: '0.25rem', background: 'var(--cream2)', borderRadius: 'var(--r)', padding: '0.25rem', alignSelf: 'flex-start' }}>
            {(['ai', 'manual'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '0.4rem 1.125rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer', background: mode === m ? '#ffffff' : 'transparent', color: mode === m ? 'var(--char)' : 'var(--text2)', boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 150ms' }}>
                {m === 'ai' ? '✦ AI Mode' : 'Manual'}
              </button>
            ))}
          </div>

          {mode === 'ai' && (
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid rgba(200,75,47,0.25)', padding: '1.25rem' }}>
              <label className="sab-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Describe the job in plain English</label>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. Built a deck for John Smith. 3 days labour at $550/day, materials including treated pine $850, delivery fee $120."
                rows={4}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0.625rem 0.75rem', fontSize: '0.875rem', color: 'var(--text)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-p)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              />
              <button onClick={handleGenerate} disabled={aiLoading || !aiPrompt.trim()} className="btn btn-ember" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
                {aiLoading && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
                {aiLoading ? 'Generating…' : '✦ Generate Invoice'}
              </button>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.5rem' }}>Claude AI will create line items from your description. Review before saving.</p>
            </div>
          )}

          <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Invoice Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }} className="form-grid-2">
              <div><label className="sab-label">Invoice Number</label><input className="sab-input" value={form.invoice_number} onChange={e => setField('invoice_number', e.target.value)} /></div>
              <div><label className="sab-label">Payment Terms</label><select className="sab-input" value={form.payment_terms} onChange={e => setField('payment_terms', e.target.value)}>{PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="sab-label">Issue Date</label><input type="date" className="sab-input" value={form.issue_date} onChange={e => setField('issue_date', e.target.value)} /></div>
              <div><label className="sab-label">Due Date</label><input type="date" className="sab-input" value={form.due_date} onChange={e => setField('due_date', e.target.value)} /></div>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Client Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <AutocompleteDropdown
                label={<>Client Name <span style={{ color: 'var(--ember)' }}>*</span></>}
                placeholder="Search clients or type a new name…"
                items={clients.map(c => ({ id: c.id, label: c.contact_name || c.business_name, sublabel: c.business_name !== (c.contact_name || c.business_name) ? c.business_name : (c.abn ? `ABN ${c.abn}` : c.email ?? undefined) }))}
                value={form.client_name}
                onSelect={item => {
                  const c = clients.find(x => x.id === item.id)
                  if (!c) return
                  setSelectedClientId(c.id)
                  setForm(prev => ({
                    ...prev,
                    client_name: c.contact_name || c.business_name,
                    client_business_name: c.business_name,
                    client_abn: c.abn ?? '',
                    client_email: c.email ?? '',
                    client_address: c.address ?? '',
                  }))
                }}
                onClear={() => { setSelectedClientId(null); setForm(prev => ({ ...prev, client_name: '', client_business_name: '' })) }}
                onAddNew={() => router.push('/clients')}
                addNewLabel="+ Add new client"
              />
              {selectedClientId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#15803d', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                  <span>✓</span>
                  <span><strong>{form.client_name}</strong> loaded from client list</span>
                  <button onClick={() => { setSelectedClientId(null); setForm(prev => ({ ...prev, client_name: '', client_business_name: '' })) }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: '#15803d', textDecoration: 'underline' }}>Change</button>
                </div>
              )}
              <div>
                <label className="sab-label">Business Name <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                <input className="sab-input" placeholder="Acme Pty Ltd" value={form.client_business_name} onChange={e => setField('client_business_name', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="form-grid-2">
                <div><label className="sab-label">Client ABN <span style={{ color: 'var(--text3)' }}>(optional)</span></label><input className="sab-input" placeholder="12 345 678 901" value={form.client_abn} onChange={e => setField('client_abn', e.target.value)} /></div>
                <div><label className="sab-label">Client Email <span style={{ color: 'var(--text3)' }}>(optional)</span></label><input className="sab-input" placeholder="accounts@client.com.au" value={form.client_email} onChange={e => setField('client_email', e.target.value)} /></div>
              </div>
              <div><label className="sab-label">Client Address <span style={{ color: 'var(--text3)' }}>(optional)</span></label><textarea className="sab-input" rows={2} placeholder="123 Main St, Sydney NSW 2000" value={form.client_address} onChange={e => setField('client_address', e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} /></div>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Line Items</h3>
            <div className="line-items-scroll">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 50px 36px', gap: '0.5rem', marginBottom: '0.375rem' }} className="line-items-row">
                {['Description', 'Qty', 'Unit Price (ex GST)', 'GST', ''].map(h => <span key={h} className="sab-label" style={{ margin: 0, fontSize: '0.6875rem' }}>{h}</span>)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.875rem' }}>
                {form.line_items.map((item) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 50px 36px', gap: '0.5rem', alignItems: 'center' }} className="line-items-row">
                    <input className="sab-input" placeholder="e.g. Labour — Deck Construction" value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} style={{ fontSize: '0.8125rem' }} />
                    <input type="number" min={0} step="0.5" className="sab-input" value={item.qty} onChange={e => updateItem(item.id, { qty: Math.max(0, parseFloat(e.target.value) || 0) })} style={{ fontSize: '0.8125rem', textAlign: 'right' }} />
                    <input type="number" min={0} step="0.01" className="sab-input" value={item.unit_price} onChange={e => updateItem(item.id, { unit_price: Math.max(0, parseFloat(e.target.value) || 0) })} style={{ fontSize: '0.8125rem', textAlign: 'right' }} />
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><input type="checkbox" checked={item.has_gst} onChange={e => updateItem(item.id, { has_gst: e.target.checked })} style={{ accentColor: 'var(--ember)', width: '1rem', height: '1rem' }} /></label>
                    <button onClick={() => removeItem(item.id)} disabled={form.line_items.length === 1} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)', borderRadius: '4px', fontSize: '1.125rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: form.line_items.length === 1 ? 0.3 : 1 }} title="Remove line">×</button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={addItem} className="btn btn-ghost" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.875rem' }}>+ Add Line</button>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
              {[['Subtotal (ex GST)', formatCurrency(totals.subtotal_ex_gst)], ['GST (10%)', formatCurrency(totals.total_gst)]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text2)' }}>{l}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', minWidth: '80px', textAlign: 'right', color: 'var(--char)' }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--char)', borderTop: '1px solid var(--border)', paddingTop: '0.375rem', marginTop: '0.125rem' }}>
                <span>Total (inc GST)</span>
                <span style={{ fontFamily: 'var(--font-mono)', minWidth: '80px', textAlign: 'right', color: 'var(--ember)' }}>{formatCurrency(totals.total_inc_gst)}</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>Payment Details <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text3)' }}>(optional)</span></h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }} className="form-grid-2">
              {([
                ['bank_name', 'Bank Name', 'e.g. Commonwealth Bank'],
                ['account_name', 'Account Name', 'e.g. John Smith Trading'],
                ['bsb', 'BSB', '062-000'],
                ['account_number', 'Account Number', '1234 5678'],
              ] as const).map(([key, label, placeholder]) => (
                <div key={key}><label className="sab-label">{label}</label><input className="sab-input" placeholder={placeholder} value={form[key]} onChange={e => setField(key, e.target.value)} /></div>
              ))}
            </div>
            <div><label className="sab-label">Notes <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text3)' }}>(optional)</span></label><textarea className="sab-input" rows={2} placeholder="e.g. Thank you for your business. Please reference the invoice number when paying." value={form.notes} onChange={e => setField('notes', e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} /></div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingBottom: '2rem' }}>
            <button onClick={() => handleSave('pending')} disabled={saving} className="btn btn-ember" style={{ flex: 1 }}>
              {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
              {saving ? 'Saving…' : 'Save Invoice'}
            </button>
            <button onClick={() => handleSave('draft')} disabled={saving} className="btn btn-outline" style={{ flex: 1 }}>Save as Draft</button>
          </div>
        </div>

        <div style={{ position: 'sticky', top: '76px' }} className="invoice-preview-col">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text2)' }}>Live Preview</p>
            <button onClick={handleDownloadPDF} className="btn btn-char" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.875rem' }}>↓ Download PDF</button>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
            <InvoicePreview form={form} biz={biz} totals={totals} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .invoice-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) {
          .invoice-preview-col { display: none !important; }
          .form-grid-2 { grid-template-columns: 1fr !important; }
          .line-items-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .line-items-row { min-width: 450px; }
        }
      `}</style>

    </div>
  )
}
