'use client'

import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import { formatCurrency, formatDateAU, todayISO } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────
const INCOME_CATEGORIES  = ['Consulting', 'Labour', 'Materials & Goods', 'Retainer', 'Rental Income', 'Other Income']
const EXPENSE_CATEGORIES = ['Motor Vehicle', 'Office Supplies', 'Software & Subscriptions', 'Equipment', 'Travel', 'Meals & Entertainment', 'Insurance', 'Marketing', 'Rent & Utilities', 'Professional Services', 'Materials', 'Other']

type RecordType = 'income' | 'expense'
type FilterTab  = 'all' | 'income' | 'expense'

interface Record {
  id: string
  type: RecordType
  date: string
  description: string
  category: string
  amount: number
  gst_amount: number
  supplier_abn: string | null
  created_at: string
}

interface RecordForm {
  type: RecordType
  date: string
  description: string
  category: string
  amount: string
  has_gst: boolean
  supplier_abn: string
}

function fyRange() {
  const now   = new Date()
  const month = now.getMonth() + 1
  const yr    = month >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return {
    start:    `${yr}-07-01`,
    end:      `${yr + 1}-06-30`,
    label:    `FY${yr}–${String(yr + 1).slice(2)}`,
  }
}

function defaultForm(type: RecordType = 'income'): RecordForm {
  return {
    type,
    date: todayISO(),
    description: '',
    category: type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
    amount: '',
    has_gst: true,
    supplier_abn: '',
  }
}

// ── KPI card ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.125rem 1.5rem' }}>
      <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text3)', marginBottom: '0.375rem' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 700, color: color ?? 'var(--char)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: sub ? '0.25rem' : 0 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{sub}</p>}
    </div>
  )
}

// ── Add Record Modal ──────────────────────────────────────────────────
function AddRecordModal({ open, onClose, onSaved }: {
  open: boolean
  onClose: () => void
  onSaved: (record: Record) => void
}) {
  const { toast } = useToast()
  const [form, setForm]     = useState<RecordForm>(defaultForm())
  const [saving, setSaving] = useState(false)

  // Reset when modal opens
  useEffect(() => { if (open) setForm(defaultForm()) }, [open])

  function setField<K extends keyof RecordForm>(key: K, value: RecordForm[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'type') {
        next.category = (value as RecordType) === 'income'
          ? INCOME_CATEGORIES[0]
          : EXPENSE_CATEGORIES[0]
      }
      return next
    })
  }

  const amt     = parseFloat(form.amount) || 0
  const gstAmt  = form.has_gst ? Math.round(amt / 11 * 100) / 100 : 0
  const exGst   = form.has_gst ? Math.round((amt - gstAmt) * 100) / 100 : amt

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) { toast('Description is required', 'error'); return }
    if (!amt || amt <= 0)         { toast('Amount must be greater than 0', 'error'); return }

    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('records').insert({
        user_id:      user.id,
        type:         form.type,
        date:         form.date,
        description:  form.description.trim(),
        category:     form.category,
        amount:       amt,
        gst_amount:   gstAmt,
        supplier_abn: form.supplier_abn.trim() || null,
      }).select('*').single()

      if (error) throw error
      onSaved(data as Record)
      toast(`${form.type === 'income' ? 'Income' : 'Expense'} record added`, 'success')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <Modal open={open} onClose={onClose} title="Add Record">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Type toggle */}
        <div style={{ display: 'inline-flex', gap: '0.25rem', background: 'var(--cream2)', borderRadius: 'var(--r)', padding: '0.25rem', alignSelf: 'flex-start' }}>
          {(['income', 'expense'] as RecordType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setField('type', t)}
              style={{
                padding: '0.4rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: form.type === t ? (t === 'income' ? 'rgba(34,197,94,0.15)' : 'rgba(200,75,47,0.12)') : 'transparent',
                color: form.type === t ? (t === 'income' ? '#15803d' : 'var(--ember)') : 'var(--text2)',
                transition: 'all 150ms',
              }}
            >
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="sab-label">Date</label>
            <input type="date" className="sab-input" value={form.date}
              onChange={e => setField('date', e.target.value)} required />
          </div>
          <div>
            <label className="sab-label">Category</label>
            <select className="sab-input" value={form.category}
              onChange={e => setField('category', e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="sab-label">Description</label>
          <input className="sab-input" placeholder={form.type === 'income' ? 'e.g. Web design for Smith Co.' : 'e.g. Office printer ink'}
            value={form.description}
            onChange={e => setField('description', e.target.value)} required />
        </div>

        <div>
          <label className="sab-label">Amount (total, including GST if applicable)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="sab-input"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setField('amount', e.target.value)}
              style={{ paddingLeft: '1.5rem' }}
              required
            />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text2)' }}>
          <input
            type="checkbox"
            checked={form.has_gst}
            onChange={e => setField('has_gst', e.target.checked)}
            style={{ accentColor: 'var(--ember)', width: '1rem', height: '1rem' }}
          />
          <span>GST included in amount</span>
          {form.has_gst && amt > 0 && (
            <span style={{ color: 'var(--text3)', fontSize: '0.8125rem' }}>
              — {formatCurrency(exGst)} ex-GST + {formatCurrency(gstAmt)} GST
            </span>
          )}
        </label>

        {form.type === 'expense' && (
          <div>
            <label className="sab-label">Supplier ABN <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional — for BAS)</span></label>
            <input className="sab-input" placeholder="12 345 678 901"
              value={form.supplier_abn}
              onChange={e => setField('supplier_abn', e.target.value)} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
          <button type="submit" disabled={saving} className="btn btn-ember" style={{ flex: 1 }}>
            {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
            {saving ? 'Saving…' : 'Add Record'}
          </button>
          <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function RecordsPage() {
  const { toast } = useToast()
  useEffect(() => { document.title = 'Records — SAB Account AI' }, [])
  const [records, setRecords]   = useState<Record[]>([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter]     = useState<FilterTab>('all')
  const [defaultType, setDefaultType] = useState<RecordType>('income')

  const fy = fyRange()

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .gte('date', fy.start)
        .lte('date', fy.end)
        .order('date', { ascending: false })

      if (error) { toast('Failed to load records', 'error'); setLoading(false); return }
      setRecords((data ?? []) as Record[])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDelete(id: string) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('records').delete().eq('id', id)
    if (error) { toast('Delete failed', 'error'); return }
    setRecords(prev => prev.filter(r => r.id !== id))
    toast('Record deleted', 'info')
  }

  function openModal(type: RecordType) {
    setDefaultType(type)
    setModalOpen(true)
  }

  // Derived figures
  const income   = useMemo(() => records.filter(r => r.type === 'income'), [records])
  const expenses = useMemo(() => records.filter(r => r.type === 'expense'), [records])

  const totalIncome   = income.reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0)
  const netProfit     = totalIncome - totalExpenses

  const gstCollected = income.reduce((s, r) => s + Number(r.gst_amount), 0)
  const gstCredits   = expenses.reduce((s, r) => s + Number(r.gst_amount), 0)
  const netGst       = Math.max(0, gstCollected - gstCredits)

  const filtered = useMemo(() => {
    if (filter === 'income')  return income
    if (filter === 'expense') return expenses
    return records
  }, [records, income, expenses, filter])

  return (
    <>
      <AddRecordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={rec => setRecords(prev => [rec, ...prev].sort((a, b) => b.date.localeCompare(a.date)))}
      />

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Records
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>{fy.label} · Income & expense tracking</p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button onClick={() => openModal('expense')} className="btn btn-outline" style={{ fontSize: '0.875rem', padding: '0.45rem 1rem' }}>
              ↓ Add Expense
            </button>
            <button onClick={() => openModal('income')} className="btn btn-ember" style={{ fontSize: '0.875rem', padding: '0.45rem 1rem' }}>
              ↑ Add Income
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <KpiCard label="Total Income"    value={formatCurrency(totalIncome)}   sub={`${income.length} records`}   color="#15803d" />
          <KpiCard label="Total Expenses"  value={formatCurrency(totalExpenses)} sub={`${expenses.length} records`} color="var(--ember)" />
          <KpiCard label="Net Profit"      value={formatCurrency(netProfit)}     sub="Income minus expenses"        color={netProfit >= 0 ? 'var(--char)' : 'var(--ember)'} />
          <KpiCard label="GST to Remit"    value={formatCurrency(netGst)}        sub="Collected minus credits" />
        </div>

        {/* Main grid: table + BAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }} className="records-grid">

          {/* Records table */}
          <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>

            {/* Filter tabs */}
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['all', 'income', 'expense'] as FilterTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  style={{
                    padding: '0.3rem 0.875rem',
                    borderRadius: '999px',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    background: filter === tab ? 'var(--char)' : 'var(--cream2)',
                    color: filter === tab ? '#fff' : 'var(--text2)',
                    transition: 'all 150ms',
                  }}
                >
                  {tab === 'all' ? `All (${records.length})` : tab === 'income' ? `Income (${income.length})` : `Expenses (${expenses.length})`}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
                  {filter === 'income' ? '📈' : filter === 'expense' ? '📉' : '📊'}
                </div>
                <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.375rem' }}>No records yet</p>
                <p style={{ color: 'var(--text3)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  Track your income and expenses to generate BAS estimates.
                </p>
                <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center' }}>
                  <button onClick={() => openModal('income')} className="btn btn-ember" style={{ fontSize: '0.875rem', padding: '0.45rem 1rem' }}>
                    ↑ Add Income
                  </button>
                  <button onClick={() => openModal('expense')} className="btn btn-outline" style={{ fontSize: '0.875rem', padding: '0.45rem 1rem' }}>
                    ↓ Add Expense
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                      {['Type', 'Date', 'Description', 'Category', 'Amount', 'GST', ''].map(h => (
                        <th key={h} style={{
                          padding: '0.625rem 1rem',
                          textAlign: h === 'Amount' || h === 'GST' ? 'right' : 'left',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text3)',
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((rec, i) => (
                      <tr key={rec.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            background: rec.type === 'income' ? 'rgba(34,197,94,0.1)' : 'rgba(200,75,47,0.08)',
                            color: rec.type === 'income' ? '#15803d' : 'var(--ember)',
                          }}>
                            {rec.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {formatDateAU(rec.date)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--char)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.description}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {rec.category}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: rec.type === 'income' ? '#15803d' : 'var(--char)', whiteSpace: 'nowrap' }}>
                          {rec.type === 'income' ? '+' : '−'}{formatCurrency(rec.amount)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {Number(rec.gst_amount) > 0 ? formatCurrency(rec.gst_amount) : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem' }}>
                          <button
                            onClick={() => { if (confirm('Delete this record?')) handleDelete(rec.id) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '1rem', padding: '0.25rem', borderRadius: '4px', lineHeight: 1 }}
                            title="Delete"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* BAS Estimate sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.25rem' }}>BAS Estimate</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '1.25rem' }}>{fy.label} year-to-date</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
                {[
                  { label: 'GST Collected',     value: gstCollected, color: '#15803d' },
                  { label: 'Input Tax Credits', value: gstCredits,   color: 'var(--ember)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text2)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color }}>{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)' }}>Net GST Owing</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.125rem', color: netGst > 0 ? 'var(--ember)' : '#15803d' }}>
                    {formatCurrency(netGst)}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.375rem' }}>
                  Collected minus input tax credits
                </p>
              </div>
            </div>

            {/* P&L summary */}
            <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1rem' }}>P&amp;L Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {[
                  { label: 'Gross Income',    value: totalIncome,   color: '#15803d' },
                  { label: 'Total Expenses',  value: totalExpenses, color: 'var(--ember)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text2)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color }}>{formatCurrency(value)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)' }}>Net Profit</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.125rem', color: netProfit >= 0 ? 'var(--char)' : 'var(--ember)' }}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick add */}
            <div style={{ background: 'var(--cream)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.125rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.75rem' }}>Quick Add</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button onClick={() => openModal('income')} className="btn btn-ember" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem' }}>
                  ↑ Add Income
                </button>
                <button onClick={() => openModal('expense')} className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem' }}>
                  ↓ Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .records-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
