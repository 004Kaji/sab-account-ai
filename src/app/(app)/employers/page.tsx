'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'

interface Employer {
  id: string
  business_name: string
  abn: string | null
  address: string | null
  email: string | null
  phone: string | null
  contact_name: string | null
  default_super_fund: string | null
  default_pay_cycle: string
  default_employment_type: string
  notes: string | null
}

interface EmployerForm {
  business_name: string
  abn: string
  contact_name: string
  email: string
  phone: string
  address: string
  default_pay_cycle: string
  default_employment_type: string
  default_super_fund: string
  notes: string
}

function emptyForm(): EmployerForm {
  return {
    business_name: '', abn: '', contact_name: '', email: '', phone: '', address: '',
    default_pay_cycle: 'fortnightly', default_employment_type: 'casual', default_super_fund: '', notes: '',
  }
}

function validateABN(abn: string): boolean {
  const digits = abn.replace(/\s/g, '')
  return digits === '' || /^\d{11}$/.test(digits)
}

export default function EmployersPage() {
  useEffect(() => { document.title = 'Employers — SAB Account AI' }, [])
  const { toast } = useToast()

  const [employers, setEmployers] = useState<Employer[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EmployerForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('employers')
      .select('*')
      .eq('user_id', user.id)
      .order('business_name')
    setEmployers((data ?? []) as Employer[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd(prefill?: Partial<EmployerForm>) {
    setEditingId(null)
    setForm({ ...emptyForm(), ...prefill })
    setModalOpen(true)
  }

  function openEdit(employer: Employer) {
    setEditingId(employer.id)
    setForm({
      business_name:          employer.business_name,
      abn:                    employer.abn              ?? '',
      contact_name:           employer.contact_name     ?? '',
      email:                  employer.email            ?? '',
      phone:                  employer.phone            ?? '',
      address:                employer.address          ?? '',
      default_pay_cycle:      employer.default_pay_cycle,
      default_employment_type: employer.default_employment_type,
      default_super_fund:     employer.default_super_fund ?? '',
      notes:                  employer.notes            ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.business_name.trim()) { toast('Business name is required', 'error'); return }
    if (!validateABN(form.abn)) { toast('ABN must be 11 digits', 'error'); return }
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        business_name:          form.business_name.trim(),
        abn:                    form.abn.replace(/\s/g, '') || null,
        contact_name:           form.contact_name.trim()    || null,
        email:                  form.email.trim()            || null,
        phone:                  form.phone.trim()            || null,
        address:                form.address.trim()          || null,
        default_pay_cycle:      form.default_pay_cycle,
        default_employment_type: form.default_employment_type,
        default_super_fund:     form.default_super_fund.trim() || null,
        notes:                  form.notes.trim()            || null,
      }

      if (editingId) {
        const { error } = await supabase.from('employers').update(payload).eq('id', editingId)
        if (error) throw error
        toast('Employer updated', 'success')
      } else {
        const { error } = await supabase.from('employers').insert({ ...payload, user_id: user.id })
        if (error) throw error
        toast('Employer added', 'success')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.from('employers').delete().eq('id', deleteId)
      if (error) throw error
      toast('Employer deleted', 'success')
      setDeleteId(null)
      load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
    </div>
  )

  return (
    <div className="page-pad" style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Employers
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
            {employers.length} {employers.length === 1 ? 'employer' : 'employers'}
          </p>
        </div>
        <button onClick={() => openAdd()} className="btn btn-ember" style={{ fontSize: '0.875rem' }}>
          + Add Employer
        </button>
      </div>

      {/* Employer list */}
      <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {employers.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.875rem' }}>🏢</div>
            <p style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>No employers yet</p>
            <p style={{ color: 'var(--text3)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Add an employer to auto-fill payslip details.
            </p>
            <button onClick={() => openAdd()} className="btn btn-ember" style={{ fontSize: '0.875rem' }}>
              + Add Employer
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  {['Business Name', 'ABN', 'Pay Cycle', 'Employment Type', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employers.map((emp, i) => (
                  <tr key={emp.id} style={{ borderBottom: i < employers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--char)' }}>
                      <div>{emp.business_name}</div>
                      {emp.contact_name && <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text3)' }}>{emp.contact_name}</div>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
                      {emp.abn ? emp.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4') : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', textTransform: 'capitalize' }}>
                      {emp.default_pay_cycle}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', textTransform: 'capitalize' }}>
                      {emp.default_employment_type}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEdit(emp)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--text2)' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(emp.id)}
                          style={{ background: 'none', border: '1px solid rgba(200,75,47,0.2)', borderRadius: '6px', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--ember)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Employer' : 'Add Employer'} maxWidth="560px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label className="sab-label">Business Name <span style={{ color: 'var(--ember)' }}>*</span></label>
            <input className="sab-input" placeholder="Lordsprings Pty Ltd" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="sab-label">ABN</label>
              <input className="sab-input" placeholder="75 633 095 735" value={form.abn} onChange={e => setForm(f => ({ ...f, abn: e.target.value }))} />
            </div>
            <div>
              <label className="sab-label">Contact Name</label>
              <input className="sab-input" placeholder="John Smith" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="sab-label">Email</label>
              <input className="sab-input" type="email" placeholder="payroll@company.com.au" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="sab-label">Phone</label>
              <input className="sab-input" placeholder="02 9000 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="sab-label">Address</label>
            <textarea className="sab-input" rows={2} placeholder="123 Business Rd, Melbourne VIC 3000" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="sab-label">Default Pay Cycle</label>
              <select className="sab-input" value={form.default_pay_cycle} onChange={e => setForm(f => ({ ...f, default_pay_cycle: e.target.value }))}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="sab-label">Default Employment Type</label>
              <select className="sab-input" value={form.default_employment_type} onChange={e => setForm(f => ({ ...f, default_employment_type: e.target.value }))}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="casual">Casual</option>
              </select>
            </div>
          </div>
          <div>
            <label className="sab-label">Default Super Fund</label>
            <input className="sab-input" placeholder="AustralianSuper" value={form.default_super_fund} onChange={e => setForm(f => ({ ...f, default_super_fund: e.target.value }))} />
          </div>
          <div>
            <label className="sab-label">Notes</label>
            <textarea className="sab-input" rows={2} placeholder="Any notes about this employer..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.5rem' }}>
            <button onClick={handleSave} disabled={saving} className="btn btn-ember" style={{ flex: 1 }}>
              {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
              {saving ? 'Saving…' : editingId ? 'Update Employer' : 'Save Employer'}
            </button>
            <button onClick={() => setModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Employer" maxWidth="420px">
        <p style={{ fontSize: '0.9375rem', color: 'var(--text)', marginBottom: '1.5rem' }}>
          Are you sure you want to delete this employer? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button onClick={handleDelete} disabled={deleting} className="btn btn-ember" style={{ flex: 1 }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button onClick={() => setDeleteId(null)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
        </div>
      </Modal>
    </div>
  )
}
