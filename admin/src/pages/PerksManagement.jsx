import { useEffect, useState } from 'react'
import {
  AlertCircle,
  BadgePercent,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

const CATEGORIES = ['tires', 'wheels', 'parts', 'mechanics', 'carwash', 'other']
const EMPTY_FORM = {
  title: '',
  category: 'other',
  partner: '',
  discount_label: '',
  description: '',
  terms: '',
  is_active: true,
  sort_order: 0,
}

/**
 * Member perks catalog moderation: merchant offers (tires, mags,
 * mechanics, carwash…) members unlock with the ₱100/yr club.
 */
export default function PerksManagement() {
  const [perks, setPerks] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | {} | perk
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)

  const fetchPerks = async () => {
    setLoading(true)
    try {
      const data = await adminApi.getPerks()
      setPerks(Array.isArray(data) ? data : [])
    } catch {
      setPerks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerks()
  }, [])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditing({})
  }

  const openEdit = (perk) => {
    setForm({
      title: perk.title || '',
      category: perk.category || 'other',
      partner: perk.partner || '',
      discount_label: perk.discount_label || '',
      description: perk.description || '',
      terms: perk.terms || '',
      is_active: perk.is_active !== false,
      sort_order: perk.sort_order ?? 0,
    })
    setEditing(perk)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.discount_label.trim()) {
      setError('Title and discount label are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (editing?.id) {
        await adminApi.updatePerk(editing.id, { ...form, sort_order: Number(form.sort_order || 0) })
        setNotice(`Updated “${form.title}”.`)
      } else {
        await adminApi.createPerk({ ...form, sort_order: Number(form.sort_order || 0) })
        setNotice(`Published “${form.title}”.`)
      }
      setEditing(null)
      fetchPerks()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save perk.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (perk) => {
    if (!window.confirm(`Remove perk “${perk.title}”?`)) return
    setBusy(true)
    try {
      await adminApi.deletePerk(perk.id)
      setNotice(`Removed “${perk.title}”.`)
      fetchPerks()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not remove perk.')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (perk) => {
    setBusy(true)
    try {
      await adminApi.updatePerk(perk.id, { is_active: !perk.is_active })
      fetchPerks()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update perk.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="admin-page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            Member Perks Catalog
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Merchant offers members unlock — tires, mags, mechanics, carwash and more.
          </p>
        </div>
        <div className="admin-actions-row">
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchPerks}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={14} /> New perk
          </button>
        </div>
      </div>

      {notice && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-success)', background: 'var(--admin-success-bg)', color: 'var(--admin-success)', fontWeight: 600, fontSize: 14 }}>
          {notice}
        </div>
      )}
      {error && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-danger)', background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)', fontWeight: 600, fontSize: 14 }}>
          <AlertCircle size={15} style={{ verticalAlign: -2 }} /> {error}
        </div>
      )}

      <div className="admin-card mod-queue-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ marginBottom: 12 }} />
            <div>Loading perks catalog…</div>
          </div>
        ) : perks.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <BadgePercent size={32} style={{ marginBottom: 8, opacity: 0.6 }} />
            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: 4 }}>No perks yet</div>
            <p style={{ margin: '0 0 14px', fontSize: 13 }}>Publish the first merchant offer for members.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={14} /> New perk
            </button>
          </div>
        ) : (
          <div className="table-container mod-queue-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Offer</th>
                  <th>Category</th>
                  <th>Discount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {perks.map((perk) => (
                  <tr key={perk.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{perk.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{perk.partner || '—'}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{perk.category}</td>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>{perk.discount_label}</td>
                    <td>
                      <span className={`badge ${perk.is_active ? 'badge-success' : 'badge-neutral'}`}>
                        {perk.is_active ? 'Live' : 'Hidden'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(perk)} title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${perk.is_active ? 'btn-secondary' : 'btn-success'}`}
                          onClick={() => toggleActive(perk)}
                          title={perk.is_active ? 'Hide' : 'Publish'}
                        >
                          {perk.is_active ? 'Hide' : 'Publish'}
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(perk)} title="Delete">
                          <Trash2 size={13} />
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

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-container" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing.id ? 'Edit perk' : 'New perk'}</h3>
              <button type="button" onClick={() => setEditing(null)} className="modal-close" aria-label="Close">×</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="admin-label">Title *</label>
                  <input type="text" className="admin-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={160} required style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="admin-label">Category</label>
                    <select className="admin-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%' }}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="admin-label">Discount label *</label>
                    <input type="text" className="admin-input" value={form.discount_label} onChange={(e) => setForm({ ...form, discount_label: e.target.value })} maxLength={80} placeholder="e.g. 20% off" required style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <label className="admin-label">Partner merchant</label>
                  <input type="text" className="admin-input" value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })} maxLength={160} placeholder="e.g. Gulong King Makati" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="admin-label">Description</label>
                  <textarea rows={3} className="admin-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="admin-label">Terms (members only)</label>
                  <textarea rows={2} className="admin-input" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="admin-label">Sort order</label>
                    <input type="number" min="0" className="admin-input" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} style={{ width: '100%' }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                    Live on site
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : editing.id ? 'Save changes' : 'Publish perk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
