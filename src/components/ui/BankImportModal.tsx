'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import { parseBankCSV, type ParsedTransaction } from '@/lib/bank-csv'
import { formatCurrency, formatDateAU } from '@/lib/utils'

// ── Categories (must match records page) ──────────────────────────────
const INCOME_CATEGORIES  = ['Consulting', 'Labour', 'Materials & Goods', 'Retainer', 'Rental Income', 'Other Income']
const EXPENSE_CATEGORIES = ['Motor Vehicle', 'Office Supplies', 'Software & Subscriptions', 'Equipment', 'Travel', 'Meals & Entertainment', 'Insurance', 'Marketing', 'Rent & Utilities', 'Professional Services', 'Materials', 'Other']

// ── Types ─────────────────────────────────────────────────────────────
interface ReviewRow extends ParsedTransaction {
  rowKey:      string
  category:    string
  gst:         boolean
  confidence:  'high' | 'low'
  include:     boolean
  isDuplicate: boolean
}

export interface ImportedRecord {
  id: string
  type: 'income' | 'expense'
  date: string
  description: string
  category: string
  amount: number
  gst_amount: number
  supplier_abn: null
  created_at: string
}

interface Props {
  open: boolean
  onClose: () => void
  onImported: (records: ImportedRecord[], batchId: string) => void
}

type Step = 'upload' | 'categorising' | 'review' | 'saving'
type RowFilter = 'all' | 'income' | 'expense' | 'review'

const BATCH_SIZE = 20

// ── Step indicator ────────────────────────────────────────────────────
function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 700,
        background: done ? '#15803d' : active ? 'var(--ember)' : 'var(--cream2)',
        color: done || active ? '#fff' : 'var(--text3)',
        transition: 'background 200ms',
      }}>
        {done ? '✓' : n}
      </div>
      <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: active ? 'var(--ember)' : 'var(--text3)', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────
export default function BankImportModal({ open, onClose, onImported }: Props) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep]           = useState<Step>('upload')
  const [file, setFile]           = useState<File | null>(null)
  const [dragOver, setDragOver]   = useState(false)
  const [parseError, setParseError] = useState('')
  const [bank, setBank]           = useState('')
  const [rows, setRows]           = useState<ReviewRow[]>([])
  const [progress, setProgress]   = useState({ done: 0, total: 0 })
  const [rowFilter, setRowFilter] = useState<RowFilter>('all')

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      setStep('upload')
      setFile(null)
      setDragOver(false)
      setParseError('')
      setBank('')
      setRows([])
      setProgress({ done: 0, total: 0 })
      setRowFilter('all')
    }
  }, [open])

  // ── File handling ──────────────────────────────────────────────────
  function handleFile(f: File) {
    if (!f.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setParseError('File is too large. Maximum size is 5 MB.')
      return
    }
    setFile(f)
    setParseError('')
  }

  async function handleNext() {
    if (!file) return
    setParseError('')

    const text = await file.text()
    const result = parseBankCSV(text)

    if (result.error || result.bank === 'unknown') {
      setParseError(result.error ?? "We couldn't recognise this bank format.")
      return
    }

    setBank(result.bank)
    await categoriseAndReview(result.transactions)
  }

  // ── AI categorisation ──────────────────────────────────────────────
  async function categoriseAndReview(transactions: ParsedTransaction[]) {
    setStep('categorising')
    setProgress({ done: 0, total: transactions.length })

    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { toast('Session expired', 'error'); setStep('upload'); return }

    // Fetch existing records for duplicate detection
    const { data: { user } } = await supabase.auth.getUser()
    let existingKeys = new Set<string>()
    if (user) {
      const { data: existing } = await supabase
        .from('records')
        .select('date, amount, description')
        .eq('user_id', user.id)
      if (existing) {
        existingKeys = new Set(existing.map(r =>
          `${r.date}|${Number(r.amount).toFixed(2)}|${(r.description ?? '').toLowerCase().slice(0, 40)}`
        ))
      }
    }

    // Categorise in batches
    const allResults: Array<{ type: 'income' | 'expense'; category: string; gst: boolean; confidence: 'high' | 'low' }> = []
    const batches = Math.ceil(transactions.length / BATCH_SIZE)

    for (let b = 0; b < batches; b++) {
      const slice = transactions.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
      try {
        const res = await fetch('/api/bank-import/categorise', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ transactions: slice }),
        })
        const json = await res.json()
        allResults.push(...(json.results ?? []))
      } catch {
        // Fallback for this batch
        slice.forEach(t => allResults.push({ type: t.type, category: t.type === 'income' ? 'Other Income' : 'Other', gst: false, confidence: 'low' }))
      }
      setProgress({ done: Math.min((b + 1) * BATCH_SIZE, transactions.length), total: transactions.length })
    }

    // Build review rows
    const reviewRows: ReviewRow[] = transactions.map((t, i) => {
      const ai = allResults[i] ?? { type: t.type, category: t.type === 'income' ? 'Other Income' : 'Other', gst: false, confidence: 'low' as const }
      const dupKey = `${t.date}|${t.amount.toFixed(2)}|${t.bankDescription.toLowerCase().slice(0, 40)}`
      return {
        ...t,
        rowKey:      `${i}-${t.date}-${t.amount}`,
        type:        ai.type,
        category:    ai.category,
        gst:         ai.gst,
        confidence:  ai.confidence,
        include:     true,
        isDuplicate: existingKeys.has(dupKey),
      }
    })

    setRows(reviewRows)
    setStep('review')
  }

  // ── Row editing ────────────────────────────────────────────────────
  function updateRow<K extends keyof ReviewRow>(key: string, field: K, value: ReviewRow[K]) {
    setRows(prev => prev.map(r => {
      if (r.rowKey !== key) return r
      const next = { ...r, [field]: value }
      // Reset category when type changes
      if (field === 'type') {
        const cats = value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
        next.category = cats[0]
      }
      return next
    }))
  }

  // ── Confirm import ─────────────────────────────────────────────────
  async function handleConfirm() {
    const toImport = rows.filter(r => r.include)
    if (!toImport.length) { toast('No rows selected to import', 'error'); return }

    setStep('saving')
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const batchId = crypto.randomUUID()

      const payload = toImport.map(r => {
        const gstAmt = r.gst ? Math.round(r.amount / 11 * 100) / 100 : 0
        return {
          user_id:          user.id,
          type:             r.type,
          date:             r.date,
          description:      r.description || r.bankDescription,
          category:         r.category,
          amount:           r.amount,
          gst_amount:       gstAmt,
          supplier_abn:     null,
          source:           'bank_import',
          import_batch_id:  batchId,
          bank_description: r.bankDescription,
          confidence:       r.confidence,
        }
      })

      const { data, error } = await supabase.from('records').insert(payload).select('*')
      if (error) throw error

      onImported((data ?? []) as ImportedRecord[], batchId)
      onClose()
      toast(`✓ Imported ${toImport.length} transactions`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed', 'error')
      setStep('review')
    }
  }

  // ── Derived stats ──────────────────────────────────────────────────
  const included   = rows.filter(r => r.include)
  const incomeRows = included.filter(r => r.type === 'income')
  const expRows    = included.filter(r => r.type === 'expense')
  const skipped    = rows.filter(r => !r.include).length
  const needsReview = rows.filter(r => r.confidence === 'low')

  const totalIncome  = incomeRows.reduce((s, r) => s + r.amount, 0)
  const totalExpense = expRows.reduce((s, r) => s + r.amount, 0)

  const filteredRows = rows.filter(r => {
    if (rowFilter === 'income')  return r.type === 'income'
    if (rowFilter === 'expense') return r.type === 'expense'
    if (rowFilter === 'review')  return r.confidence === 'low'
    return true
  })

  const _stepNum = step === 'upload' ? 1 : 2
  const isDone1 = step !== 'upload'
  const isDone2 = step === 'review' || step === 'saving'

  return (
    <Modal
      open={open}
      onClose={step === 'categorising' || step === 'saving' ? () => {} : onClose}
      title="Import Bank Statement"
      maxWidth={step === 'review' ? '860px' : '540px'}
    >
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
        <StepDot n={1} label="Upload"  active={step === 'upload'}                    done={isDone1} />
        <div style={{ flex: 1, height: '2px', background: isDone1 ? 'var(--ember)' : 'var(--cream2)', transition: 'background 200ms' }} />
        <StepDot n={2} label="Review"  active={step === 'review' || step === 'categorising'} done={isDone2} />
        <div style={{ flex: 1, height: '2px', background: isDone2 ? 'var(--ember)' : 'var(--cream2)', transition: 'background 200ms' }} />
        <StepDot n={3} label="Confirm" active={step === 'saving'}                    done={false} />
      </div>

      {/* ── STEP 1: Upload ───────────────────────────────────────────── */}
      {step === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--ember)' : file ? '#15803d' : 'var(--border)'}`,
              borderRadius: 'var(--r)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'rgba(200,75,47,0.04)' : file ? 'rgba(34,197,94,0.04)' : 'var(--cream)',
              transition: 'all 150ms',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <div style={{ fontSize: '2rem', marginBottom: '0.625rem' }}>
              {file ? '✓' : '☁'}
            </div>
            {file ? (
              <>
                <p style={{ fontWeight: 600, color: '#15803d', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{file.name}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to change
                </p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                  Drop your bank CSV here
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>or click to browse</p>
              </>
            )}
          </div>

          {parseError && (
            <div style={{ background: 'rgba(200,75,47,0.08)', border: '1px solid rgba(200,75,47,0.25)', borderRadius: '8px', padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--ember)' }}>
              {parseError}
            </div>
          )}

          {/* Help text */}
          <div style={{ background: 'var(--cream)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1.125rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              Download your bank statement as CSV from your bank&apos;s internet banking, then upload it here.
            </p>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem' }}>Supported banks:</p>
            {[
              ['CBA', 'NetBank → Statements → Download'],
              ['ANZ', 'ANZ Internet Banking → Accounts → Export'],
              ['Westpac', 'Westpac Online → eStatements → Export'],
              ['NAB', 'NAB Internet Banking → Export transactions'],
            ].map(([b, hint]) => (
              <div key={b} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.25rem' }}>
                <span style={{ color: '#15803d', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span><strong>{b}</strong> — {hint}</span>
              </div>
            ))}
            <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.875rem', fontStyle: 'italic' }}>
              Your bank data never leaves your device until you confirm the import.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button
              onClick={handleNext}
              disabled={!file}
              className="btn btn-ember"
              style={{ flex: 1 }}
            >
              Next →
            </button>
            <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2a: Categorising ────────────────────────────────────── */}
      {step === 'categorising' && (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)', margin: '0 auto 1.25rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.375rem', fontSize: '0.9375rem' }}>
            Categorising transactions…
          </p>
          {progress.total > 0 && (
            <>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginBottom: '1rem' }}>
                {progress.done} / {progress.total} done
              </p>
              <div style={{ height: '6px', background: 'var(--cream2)', borderRadius: '999px', overflow: 'hidden', maxWidth: '280px', margin: '0 auto' }}>
                <div style={{
                  height: '100%', background: 'var(--ember)', borderRadius: '999px',
                  width: `${Math.min(100, (progress.done / progress.total) * 100)}%`,
                  transition: 'width 300ms ease',
                }} />
              </div>
            </>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '1rem' }}>
            AI is analysing each transaction — this takes a few seconds
          </p>
        </div>
      )}

      {/* ── STEP 2b: Review ──────────────────────────────────────────── */}
      {(step === 'review' || step === 'saving') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Header info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>
              Found <strong>{rows.length}</strong> transactions from <strong>{bank}</strong>. AI has categorised them below. Review and edit before importing.
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {([
              ['all',     `All (${rows.length})`],
              ['income',  `Income (${rows.filter(r => r.type === 'income').length})`],
              ['expense', `Expenses (${rows.filter(r => r.type === 'expense').length})`],
              ['review',  `Needs review (${needsReview.length})`],
            ] as [RowFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRowFilter(key)}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  border: key === 'review' && rowFilter !== key ? '1px solid rgba(234,179,8,0.5)' : 'none',
                  cursor: 'pointer',
                  background: rowFilter === key ? 'var(--char)' : (key === 'review' ? 'rgba(234,179,8,0.1)' : 'var(--cream2)'),
                  color: rowFilter === key ? '#fff' : (key === 'review' ? '#92400e' : 'var(--text2)'),
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', maxHeight: '380px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Description', 'Amount', 'Type', 'Category', 'GST', 'Include'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.625rem', textAlign: 'left', fontWeight: 600, color: 'var(--text3)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => {
                  const isAmber = row.confidence === 'low'
                  const rowBg = row.isDuplicate
                    ? 'rgba(234,179,8,0.07)'
                    : isAmber
                    ? 'rgba(234,179,8,0.04)'
                    : i % 2 === 0 ? '#fff' : 'var(--cream)'
                  const cats = row.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

                  return (
                    <tr
                      key={row.rowKey}
                      style={{
                        background: rowBg,
                        borderBottom: '1px solid var(--border)',
                        opacity: row.include ? 1 : 0.4,
                      }}
                    >
                      <td style={{ padding: '0.4rem 0.625rem', whiteSpace: 'nowrap', color: 'var(--text2)' }}>
                        {formatDateAU(row.date)}
                      </td>
                      <td style={{ padding: '0.4rem 0.625rem', maxWidth: '160px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--char)' }} title={row.bankDescription}>
                          {row.bankDescription}
                        </div>
                        {row.isDuplicate && (
                          <div style={{ fontSize: '0.6875rem', color: '#92400e', fontWeight: 600 }}>⚠ Possible duplicate</div>
                        )}
                        {isAmber && !row.isDuplicate && (
                          <div style={{ fontSize: '0.6875rem', color: '#92400e' }}>Low confidence</div>
                        )}
                      </td>
                      <td style={{ padding: '0.4rem 0.625rem', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', color: row.type === 'income' ? '#15803d' : 'var(--char)', fontWeight: 600 }}>
                        {row.type === 'income' ? '+' : '−'}{formatCurrency(row.amount)}
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <select
                          value={row.type}
                          onChange={e => updateRow(row.rowKey, 'type', e.target.value as 'income' | 'expense')}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: '#fff', color: 'var(--char)', cursor: 'pointer' }}
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <select
                          value={row.category}
                          onChange={e => updateRow(row.rowKey, 'category', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: '#fff', color: 'var(--char)', cursor: 'pointer', maxWidth: '140px' }}
                        >
                          {cats.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.4rem 0.625rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={row.gst}
                          onChange={e => updateRow(row.rowKey, 'gst', e.target.checked)}
                          style={{ accentColor: 'var(--ember)', width: '14px', height: '14px' }}
                        />
                      </td>
                      <td style={{ padding: '0.4rem 0.625rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={e => updateRow(row.rowKey, 'include', e.target.checked)}
                          style={{ accentColor: 'var(--ember)', width: '14px', height: '14px' }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--cream)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 500 }}>Income to import</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#15803d', fontSize: '0.9375rem' }}>
                {formatCurrency(totalIncome)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text3)' }}>({incomeRows.length} txns)</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 500 }}>Expenses to import</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ember)', fontSize: '0.9375rem' }}>
                {formatCurrency(totalExpense)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text3)' }}>({expRows.length} txns)</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 500 }}>Skipped</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text2)', fontSize: '0.9375rem' }}>{skipped} txns</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button
              onClick={() => { setStep('upload'); setRows([]) }}
              className="btn btn-outline"
              style={{ flex: 1 }}
              disabled={step === 'saving'}
            >
              ← Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={included.length === 0 || step === 'saving'}
              className="btn btn-ember"
              style={{ flex: 2 }}
            >
              {step === 'saving' && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
              {step === 'saving' ? 'Importing…' : `Confirm import (${included.length} transactions) →`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
