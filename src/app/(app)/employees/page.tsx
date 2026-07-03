'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import PlanGate from '@/components/ui/PlanGate'
import AbnVerifyBadge from '@/components/ui/AbnVerifyBadge'

interface Employee {
  id: string
  name: string
  email: string | null
  phone: string | null
  tfn: string | null
  abn: string | null
  employment_type: string
  pay_cycle: string
  pay_basis: string
  annual_salary: number | null
  hourly_rate: number | null
  ordinary_hours: number | null
  super_fund_name: string | null
  member_number: string | null
  residency_status: string
  notes: string | null
  annual_leave_hours: number | null
  personal_leave_hours: number | null
  claiming_threshold: boolean | null
  has_help: boolean | null
}

interface EmployeeForm {
  name: string
  email: string
  phone: string
  tfn: string
  abn: string
  employment_type: string
  pay_cycle: string
  pay_basis: string
  annual_salary: string
  hourly_rate: string
  ordinary_hours: string
  super_fund_name: string
  member_number: string
  residency_status: string
  notes: string
  claiming_threshold: boolean
  has_help: boolean
  annual_leave_hours: string
  personal_leave_hours: string
}

function emptyForm(): EmployeeForm {
  return {
    name: '', email: '', phone: '', tfn: '', abn: '',
    employment_type: 'casual', pay_cycle: 'fortnightly',
    pay_basis: 'salary', annual_salary: '', hourly_rate: '',
    ordinary_hours: '76', super_fund_name: '', member_number: '',
    residency_status: 'citizen_pr', notes: '',
    claiming_threshold: true, has_help: false,
    annual_leave_hours: '', personal_leave_hours: '',
  }
}

function validateTFN(tfn: string): boolean {
  const digits = tfn.replace(/\s/g, '')
  return digits === '' || /^\d{9}$/.test(digits)
}

function validateABN(abn: string): boolean {
  const digits = abn.replace(/\s/g, '')
  return digits === '' || /^\d{11}$/.test(digits)
}

const RESIDENCY_LABELS: Record<string, string> = {
  citizen_pr: 'AU Citizen / PR',
  student: "Int'l Student",
  temp_work: 'Temp Work Visa',
  whm: 'Working Holiday',
  partner: 'Partner Visa',
  other_temp: 'Other Temp',
}

export default function EmployeesPage() {
  useEffect(() => { document.title = 'Employees — SAB Account AI' }, [])
  const { toast } = useToast()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EmployeeForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/employees', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return
    setEmployees(await res.json() as Employee[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(emp: Employee) {
    setEditingId(emp.id)
    setForm({
      name: emp.name,
      email: emp.email ?? '',
      phone: emp.phone ?? '',
      tfn: emp.tfn ?? '',
      abn: emp.abn ?? '',
      employment_type: emp.employment_type,
      pay_cycle: emp.pay_cycle,
      pay_basis: emp.pay_basis,
      annual_salary: emp.annual_salary != null ? String(emp.annual_salary) : '',
      hourly_rate: emp.hourly_rate != null ? String(emp.hourly_rate) : '',
      ordinary_hours: emp.ordinary_hours != null ? String(emp.ordinary_hours) : '76',
      super_fund_name: emp.super_fund_name ?? '',
      member_number: emp.member_number ?? '',
      residency_status: emp.residency_status,
      notes: emp.notes ?? '',
      claiming_threshold: emp.claiming_threshold ?? true,
      has_help: emp.has_help ?? false,
      annual_leave_hours:   emp.annual_leave_hours   != null ? String(emp.annual_leave_hours)   : '',
      personal_leave_hours: emp.personal_leave_hours != null ? String(emp.personal_leave_hours) : '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast('Name is required', 'error'); return }
    if (!form.tfn.trim() && !form.abn.trim()) { toast('TFN or ABN is required', 'error'); return }
    if (form.tfn.trim() && !validateTFN(form.tfn)) { toast('TFN must be 9 digits', 'error'); return }
    if (!validateABN(form.abn)) { toast('ABN must be 11 digits', 'error'); return }

    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        tfn: form.tfn.replace(/\s/g, '') || null,
        abn: form.abn.replace(/\s/g, '') || null,
        employment_type: form.employment_type,
        pay_cycle: form.pay_cycle,
        pay_basis: form.pay_basis,
        annual_salary: form.annual_salary ? parseFloat(form.annual_salary) : null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        ordinary_hours: form.ordinary_hours ? parseFloat(form.ordinary_hours) : null,
        super_fund_name: form.super_fund_name.trim() || null,
        member_number: form.member_number.trim() || null,
        residency_status: form.residency_status,
        notes: form.notes.trim() || null,
        claiming_threshold: form.claiming_threshold,
        has_help: form.has_help,
        annual_leave_hours:   form.annual_leave_hours   ? parseFloat(form.annual_leave_hours)   : null,
        personal_leave_hours: form.personal_leave_hours ? parseFloat(form.personal_leave_hours) : null,
      }

      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }

      if (editingId) {
        const res = await fetch('/api/employees', { method: 'PUT', headers, body: JSON.stringify({ id: editingId, ...payload }) })
        if (!res.ok) {
          const text = await res.text()
          const json = text ? JSON.parse(text) : {}
          throw new Error(json.error ?? `Save failed (${res.status})`)
        }
        toast('Employee updated', 'success')
      } else {
        const res = await fetch('/api/employees', { method: 'POST', headers, body: JSON.stringify(payload) })
        if (!res.ok) {
          const text = await res.text()
          const json = text ? JSON.parse(text) : {}
          throw new Error(json.error ?? `Save failed (${res.status})`)
        }
        toast('Employee added', 'success')
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const res = await fetch(`/api/employees?id=${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Delete failed')
      toast('Employee deleted', 'success')
      setDeleteId(null)
      load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return (
    <PlanGate requiredPlan="pro">
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
      </div>
    </PlanGate>
  )

  return (
    <PlanGate requiredPlan="pro">
    <div className="page-pad" style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Employees
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
            {employees.length} {employees.length === 1 ? 'employee' : 'employees'}
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-ember" style={{ fontSize: '0.875rem' }}>
          + Add Employee
        </button>
      </div>

      <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {employees.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.875rem' }}>👤</div>
            <p style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>No employees yet</p>
            <p style={{ color: 'var(--text3)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Add employees to auto-fill payslip details.
            </p>
            <button onClick={openAdd} className="btn btn-ember" style={{ fontSize: '0.875rem' }}>
              + Add Employee
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="emp-desktop-table" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Email', 'TFN / ABN', 'Employment', 'Pay', 'Super Fund', 'Leave Balance', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, i) => (
                    <tr key={emp.id} style={{ borderBottom: i < employees.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--char)' }}>
                        <div>{emp.name}</div>
                        {emp.phone && <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text3)' }}>{emp.phone}</div>}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)' }}>
                        {emp.email ?? '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
                        {emp.tfn
                          ? <div><span style={{ fontSize: '0.6875rem', color: 'var(--text3)', fontFamily: 'inherit' }}>TFN </span>••• ••• {emp.tfn.slice(-3)}</div>
                          : emp.abn
                            ? <div><span style={{ fontSize: '0.6875rem', color: 'var(--text3)', fontFamily: 'inherit' }}>ABN </span>{emp.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')}</div>
                            : '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)' }}>
                        <div style={{ textTransform: 'capitalize' }}>{emp.employment_type}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'capitalize' }}>
                          {emp.pay_cycle} · {RESIDENCY_LABELS[emp.residency_status] ?? emp.residency_status}
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)' }}>
                        {emp.pay_basis === 'salary' && emp.annual_salary
                          ? `$${emp.annual_salary.toLocaleString()}/yr`
                          : emp.pay_basis === 'hourly' && emp.hourly_rate
                            ? `$${emp.hourly_rate}/hr`
                            : '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)' }}>
                        {emp.super_fund_name ?? '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                        {emp.employment_type === 'casual' ? (
                          <span style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>Casual — no leave</span>
                        ) : (emp.annual_leave_hours != null || emp.personal_leave_hours != null) ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {emp.annual_leave_hours != null && (
                              <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text3)', width: '56px' }}>Annual</span>
                                <span style={{ fontWeight: 600, color: emp.annual_leave_hours < 8 ? 'var(--ember)' : 'var(--char)', fontFamily: 'var(--font-mono)' }}>
                                  {emp.annual_leave_hours.toFixed(1)} hrs
                                </span>
                              </div>
                            )}
                            {emp.personal_leave_hours != null && (
                              <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text3)', width: '56px' }}>Personal</span>
                                <span style={{ fontWeight: 600, color: emp.personal_leave_hours < 8 ? 'var(--ember)' : 'var(--char)', fontFamily: 'var(--font-mono)' }}>
                                  {emp.personal_leave_hours.toFixed(1)} hrs
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>Not yet tracked</span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => openEdit(emp)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--text2)' }}>Edit</button>
                          <button onClick={() => setDeleteId(emp.id)} style={{ background: 'none', border: '1px solid rgba(200,75,47,0.2)', borderRadius: '6px', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--ember)' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="emp-mobile-cards" style={{ display: 'none', flexDirection: 'column' }}>
              {employees.map((emp, i) => (
                <div key={emp.id} style={{ padding: '1rem', borderBottom: i < employees.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--char)', marginBottom: '0.2rem' }}>{emp.name}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '0.125rem', textTransform: 'capitalize' }}>
                        {emp.employment_type} · {emp.pay_cycle}
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginBottom: '0.125rem' }}>
                        {emp.pay_basis === 'salary' && emp.annual_salary
                          ? `$${emp.annual_salary.toLocaleString()}/yr`
                          : emp.pay_basis === 'hourly' && emp.hourly_rate
                            ? `$${emp.hourly_rate}/hr`
                            : null}
                        {emp.tfn && <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>TFN ••• ••• {emp.tfn.slice(-3)}</span>}
                        {!emp.tfn && emp.abn && <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>ABN {emp.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')}</span>}
                      </p>
                      {emp.email && <p style={{ fontSize: '0.75rem', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button onClick={() => openEdit(emp)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '0.375rem 0.75rem', fontSize: '0.8125rem', color: 'var(--text2)', fontWeight: 500 }}>Edit</button>
                      <button onClick={() => setDeleteId(emp.id)} style={{ background: 'none', border: '1px solid rgba(200,75,47,0.2)', borderRadius: '6px', cursor: 'pointer', padding: '0.375rem 0.75rem', fontSize: '0.8125rem', color: 'var(--ember)', fontWeight: 500 }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <style>{`
              @media (max-width: 640px) {
                .emp-desktop-table { display: none !important; }
                .emp-mobile-cards { display: flex !important; }
              }
            `}</style>
          </>
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Employee' : 'Add Employee'} maxWidth="580px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Name */}
          <div>
            <label className="sab-label">Full Name <span style={{ color: 'var(--ember)' }}>*</span></label>
            <input className="sab-input" placeholder="Jane Smith" autoComplete="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          {/* Email + Phone */}
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="sab-label">Email <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
              <input className="sab-input" type="email" placeholder="jane@example.com" autoComplete="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="sab-label">Phone <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
              <input className="sab-input" placeholder="04XX XXX XXX" autoComplete="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          {/* TFN + ABN */}
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="sab-label">
                TFN <span style={{ color: 'var(--ember)' }}>*</span>
                <span style={{ color: 'var(--text3)', fontWeight: 400 }}> (or ABN)</span>
              </label>
              <input className="sab-input" placeholder="XXX XXX XXX" autoComplete="off" value={form.tfn} onChange={e => setForm(f => ({ ...f, tfn: e.target.value }))} />
            </div>
            <div>
              <label className="sab-label">
                ABN <span style={{ color: 'var(--ember)' }}>*</span>
                <span style={{ color: 'var(--text3)', fontWeight: 400 }}> (or TFN)</span>
              </label>
              <input className="sab-input" placeholder="XX XXX XXX XXX" autoComplete="off" value={form.abn} onChange={e => setForm(f => ({ ...f, abn: e.target.value }))} />
              <AbnVerifyBadge abn={form.abn} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '-0.5rem' }}>
            Employees have a TFN (9 digits). Contractors/sole traders use an ABN (11 digits). At least one is required.
          </p>
          {!form.tfn.trim() && !form.abn.trim() && (
            <p style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '-0.25rem' }}>
              Without a TFN, PAYG withholding will be 47% of gross earnings (ATO Scale 4).
            </p>
          )}

          {/* Employment type / pay cycle / pay basis */}
          <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="sab-label">Employment Type</label>
              <select className="sab-input" value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div>
              <label className="sab-label">Pay Cycle</label>
              <select className="sab-input" value={form.pay_cycle} onChange={e => setForm(f => ({ ...f, pay_cycle: e.target.value }))}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="sab-label">Pay Basis</label>
              <select className="sab-input" value={form.pay_basis} onChange={e => setForm(f => ({ ...f, pay_basis: e.target.value }))}>
                <option value="salary">Annual Salary</option>
                <option value="hourly">Hourly Rate</option>
              </select>
            </div>
          </div>

          {/* Pay amount */}
          {form.pay_basis === 'salary' ? (
            <div>
              <label className="sab-label">Annual Salary <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                <input type="number" min={0} step={1000} className="sab-input" placeholder="75000" value={form.annual_salary} onChange={e => setForm(f => ({ ...f, annual_salary: e.target.value }))} onWheel={e => (e.target as HTMLInputElement).blur()} style={{ paddingLeft: '1.5rem' }} />
              </div>
            </div>
          ) : (
            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="sab-label">Hourly Rate <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '0.875rem' }}>$</span>
                  <input type="number" min={0} step={0.5} className="sab-input" placeholder="35.00" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} onWheel={e => (e.target as HTMLInputElement).blur()} style={{ paddingLeft: '1.5rem' }} />
                </div>
              </div>
              <div>
                <label className="sab-label">Ordinary Hours/Period <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                <input type="number" min={0} step={0.5} className="sab-input" placeholder="76" value={form.ordinary_hours} onChange={e => setForm(f => ({ ...f, ordinary_hours: e.target.value }))} onWheel={e => (e.target as HTMLInputElement).blur()} />
              </div>
            </div>
          )}

          {/* Residency */}
          <div>
            <label className="sab-label">Residency Status</label>
            <select className="sab-input" value={form.residency_status} onChange={e => setForm(f => ({ ...f, residency_status: e.target.value }))}>
              <option value="citizen_pr">Australian citizen or permanent resident</option>
              <option value="student">International student (student visa)</option>
              <option value="temp_work">Temporary work visa (482, 457, etc)</option>
              <option value="whm">Working holiday maker (417 or 462 visa)</option>
              <option value="partner">Partner or dependent visa (temporary)</option>
              <option value="other_temp">Other temporary resident</option>
            </select>
          </div>

          {/* Tax Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '0.875rem 1rem', background: 'var(--cream)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--char)', marginBottom: '0.125rem' }}>Tax Settings</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--char)' }}>
              <input
                type="checkbox"
                checked={form.claiming_threshold}
                onChange={e => setForm(f => ({ ...f, claiming_threshold: e.target.checked }))}
                style={{ width: 15, height: 15, accentColor: 'var(--ember)', cursor: 'pointer', flexShrink: 0 }}
              />
              <span>Claims tax-free threshold</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 400 }}>(tick for main/only job)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--char)' }}>
              <input
                type="checkbox"
                checked={form.has_help}
                onChange={e => setForm(f => ({ ...f, has_help: e.target.checked }))}
                style={{ width: 15, height: 15, accentColor: 'var(--ember)', cursor: 'pointer', flexShrink: 0 }}
              />
              <span>Has HELP / HECS debt</span>
            </label>
          </div>

          {/* Super */}
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="sab-label">Super Fund <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
              <input className="sab-input" placeholder="AustralianSuper" autoComplete="off" value={form.super_fund_name} onChange={e => setForm(f => ({ ...f, super_fund_name: e.target.value }))} />
            </div>
            <div>
              <label className="sab-label">Member Number <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
              <input className="sab-input" placeholder="123456789" autoComplete="off" value={form.member_number} onChange={e => setForm(f => ({ ...f, member_number: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="sab-label">Notes <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
            <textarea className="sab-input" rows={2} placeholder="Any notes about this employee..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>

          {form.employment_type !== 'casual' && (
            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="sab-label">Annual Leave Balance <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(hrs, optional)</span></label>
                <input type="number" min={0} step={0.5} className="sab-input" placeholder="e.g. 80" value={form.annual_leave_hours} onChange={e => setForm(f => ({ ...f, annual_leave_hours: e.target.value }))} onWheel={e => (e.target as HTMLInputElement).blur()} />
              </div>
              <div>
                <label className="sab-label">Personal Leave Balance <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(hrs, optional)</span></label>
                <input type="number" min={0} step={0.5} className="sab-input" placeholder="e.g. 40" value={form.personal_leave_hours} onChange={e => setForm(f => ({ ...f, personal_leave_hours: e.target.value }))} onWheel={e => (e.target as HTMLInputElement).blur()} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.5rem' }}>
            <button onClick={handleSave} disabled={saving} className="btn btn-ember" style={{ flex: 1 }}>
              {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
              {saving ? 'Saving…' : editingId ? 'Update Employee' : 'Save Employee'}
            </button>
            <button onClick={() => setModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Employee" maxWidth="420px">
        <p style={{ fontSize: '0.9375rem', color: 'var(--text)', marginBottom: '1.5rem' }}>
          Are you sure you want to delete this employee? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button onClick={handleDelete} disabled={deleting} className="btn btn-ember" style={{ flex: 1 }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button onClick={() => setDeleteId(null)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
        </div>
      </Modal>
    </div>
    </PlanGate>
  )
}
