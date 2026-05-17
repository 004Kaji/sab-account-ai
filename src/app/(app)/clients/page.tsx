'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'

interface Client {
  id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  abn: string | null
  website: string | null
  notes: string | null
  total_invoiced: number
  invoice_count: number
  last_invoiced_at: string | null
}

interface ClientForm {
  business_name: string
  contact_name: string
  email: string
  phone: string
  address: string
  abn: string
  website: string
  notes: string
}

function emptyForm(): ClientForm {
  return { business_name: '', contact_name: '', email: '', phone: '', address: '', abn: '', website: '', notes: '' }
}

function validateABN(abn: string): boolean {
  const digits = abn.replace(/\s/g, '')
  return digits === '' || /^\d{11}$/.test(digits)
}

export default function ClientsPage() {
  useEffect(() => { document.title = 'Clients — SAB Account AI' }, [])
  const { toast } = useToast()

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('business_name')
    setClients((data ?? []) as Client[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd(prefill?: Partial<ClientForm>) {
    setEditingId(null)
    setForm({ ...emptyForm(), ...prefill })
    setModalOpen(true)
  }

  function openEdit(client: Client) {
    setEditingId(client.id)
    setForm({
      business_name: client.business_name,
      contact_name:  client.contact_name  ?? '',
      email:         client.email         ?? '',
      phone:         client.phone         ?? '',
      address:       client.address       ?? '',
      abn:           client.abn           ?? '',
      website:       client.website       ?? '',
      notes:         client.notes         ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.contact_name.trim())  { toast('Contact name is required', 'error'); return }
    if (!form.email.trim())         { toast('Email is required', 'error'); return }
    if (!form.phone.trim())         { toast('Phone is required', 'error'); return }
    if (!validateABN(form.abn)) { toast('ABN must be 11 digits', 'error'); return }
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        business_name: form.business_name.trim() || form.contact_name.trim(),
        contact_name:  form.contact_name.trim()  || null,
        email:         form.email.trim()          || null,
        phone:         form.phone.trim()          || null,
        address:       form.address.trim()        || null,
        abn:           form.abn.replace(/\s/g,'') || null,
        website:       form.website.trim()        || null,
        notes:         form.notes.trim()          || null,
      }

      if (editingId) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editingId)
        if (error) throw error
        toast('Client updated', 'success')
      } else {
        const { error } = await supabase.from('clients').insert({ ...payload, user_id: user.id })
        if (error) throw error
        toast('Client added', 'success')
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
      const { error } = await supabase.from('clients').delete().eq('id', deleteId)
      if (error) throw error
      toast('Client deleted', 'success')
      setDeleteId(null)
      load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const totalInvoiced   = clients.reduce((s, c) => s + Number(c.total_invoiced), 0)
  const avgInvoice      = clients.length > 0
    ? clients.filter(c => c.invoice_count > 0).reduce((s, c) => s + Number(c.total_invoiced), 0) /
      Math.max(1, clients.filter(c => c.invoice_count > 0).reduce((s, c) => s + c.invoice_count, 0))
    : 0

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Clients
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </p>
        </div>
        <button onClick={() => openAdd()} className="btn btn-ember" style={{ fontSize: '0.875rem' }}>
          + Add Client
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Clients',     value: String(clients.length),          mono: false },
          { label: 'Total Invoiced',    value: formatCurrency(totalInvoiced),   mono: true  },
          { label: 'Avg Invoice Value', value: formatCurrency(avgInvoice),      mono: true  },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginBottom: '0.5rem' }}>{stat.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--char)', fontFamily: stat.mono ? 'var(--font-mono)' : undefined, letterSpacing: '-0.02em' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Client list */}
      <div style={{ background: '#ffffff', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {clients.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.875rem' }}>👥</div>
            <p style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>No clients yet</p>
            <p style={{ color: 'var(--text3)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Add your first client to auto-fill invoice details.
            </p>
            <button onClick={() => openAdd()} className="btn btn-ember" style={{ fontSize: '0.875rem' }}>
              + Add Client
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  {['Business Name', 'ABN', 'Email', 'Invoices', 'Total Invoiced', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client, i) => (
                  <tr key={client.id} style={{ borderBottom: i < clients.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--char)' }}>
                      <div>{client.business_name}</div>
                      {client.contact_name && <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text3)' }}>{client.contact_name}</div>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
                      {client.abn ? client.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4') : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text2)' }}>
                      {client.email ?? '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--char)', textAlign: 'center' }}>
                      {client.invoice_count}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--char)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {formatCurrency(client.total_invoiced)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEdit(client)}
                          title="Edit client"
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--text2)' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(client.id)}
                          title="Delete client"
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Client' : 'Add Client'} maxWidth="560px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label className="sab-label">Business Name <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
            <input className="sab-input" placeholder="Acme Pty Ltd" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="sab-label">ABN <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
              <input className="sab-input" placeholder="61 234 567 890" value={form.abn} onChange={e => setForm(f => ({ ...f, abn: e.target.value }))} />
            </div>
            <div>
              <label className="sab-label">Contact Name <span style={{ color: 'var(--ember)' }}>*</span></label>
              <input className="sab-input" placeholder="Jane Smith" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="sab-label">Email <span style={{ color: 'var(--ember)' }}>*</span></label>
              <input className="sab-input" type="email" placeholder="accounts@acme.com.au" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="sab-label">Phone <span style={{ color: 'var(--ember)' }}>*</span></label>
              <input className="sab-input" placeholder="02 9000 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="sab-label">Business Address <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
            <textarea className="sab-input" rows={2} placeholder="123 Main St, Sydney NSW 2000" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
          <div>
            <label className="sab-label">Website <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
            <input className="sab-input" placeholder="https://acme.com.au" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
          </div>
          <div>
            <label className="sab-label">Notes <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
            <textarea className="sab-input" rows={2} placeholder="Any notes about this client..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.5rem' }}>
            <button onClick={handleSave} disabled={saving} className="btn btn-ember" style={{ flex: 1 }}>
              {saving && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
              {saving ? 'Saving…' : editingId ? 'Update Client' : 'Save Client'}
            </button>
            <button onClick={() => setModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Client" maxWidth="420px">
        <p style={{ fontSize: '0.9375rem', color: 'var(--text)', marginBottom: '1.5rem' }}>
          Are you sure you want to delete this client? This cannot be undone.
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
