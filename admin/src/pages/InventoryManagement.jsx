import { useEffect, useState } from 'react'
import {
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Truck,
  Warehouse as WarehouseIcon,
  RefreshCw,
  Plus,
  Search,
  X,
  Trash2,
  Package,
} from 'lucide-react'
import { inventoryApi, MOVEMENT_TYPES, MOVEMENT_LABELS } from '../api/inventory.js'

const money = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

// House catalog context: parts are sold exclusively by GAP Valenzuela Main,
// so this page always operates on the house inventory (admins resolve to it
// server-side; explicit ?seller_id= remains for audits).
export default function InventoryManagement() {
  const [tab, setTab] = useState('stock') // stock | movements | suppliers | warehouses
  const [summary, setSummary] = useState(null)
  const [lowStock, setLowStock] = useState([])
  const [parts, setParts] = useState([])
  const [movements, setMovements] = useState([])
  const [moveMeta, setMoveMeta] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  // Filters
  const [moveType, setMoveType] = useState('all')
  const [search, setSearch] = useState('')

  // Stock adjust modal
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustPart, setAdjustPart] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ type: 'receipt', quantity: 1, warehouse_id: '', reason: '', reference: '' })
  const [saving, setSaving] = useState(false)

  // Supplier modal
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_person: '', email: '', phone: '', city: '', lead_time_days: 7 })

  // Warehouse modal
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', city: '' })
  const [binForms, setBinForms] = useState({}) // warehouseId -> { code, zone, rack, shelf }

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [sum, low, sup, wh] = await Promise.all([
        inventoryApi.summary(),
        inventoryApi.lowStock(),
        inventoryApi.suppliers({ per_page: 100 }),
        inventoryApi.warehouses(),
      ])
      setSummary(sum)
      setLowStock(Array.isArray(low) ? low : [])
      setSuppliers(sup?.data?.data ?? sup?.data ?? [])
      setWarehouses(Array.isArray(wh) ? wh : [])
      await loadStock()
      await loadMovements()
    } catch {
      setError('Failed to load inventory. The seller endpoints require a seller/dealer/parts_seller or admin session.')
    } finally {
      setLoading(false)
    }
  }

  const loadStock = async () => {
    try {
      const res = await inventoryApi.parts()
      setParts(res?.data ?? [])
    } catch {
      setParts([])
    }
  }

  const loadMovements = async () => {
    try {
      const res = await inventoryApi.movements({
        type: moveType === 'all' ? undefined : moveType,
        per_page: 25,
      })
      const page = res?.data ?? res
      setMovements(page?.data ?? [])
      setMoveMeta(page?.meta ?? null)
    } catch {
      setMovements([])
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!loading) loadMovements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveType])

  const filteredParts = parts.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [p.title, p.part_number, p.mpn, p.barcode, p.brand]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const openAdjust = (part, type = 'receipt') => {
    setAdjustPart(part)
    setAdjustForm({ type, quantity: 1, warehouse_id: '', reason: '', reference: '' })
    setAdjustOpen(true)
  }

  const submitAdjust = async (e) => {
    e.preventDefault()
    if (!adjustPart) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        type: adjustForm.type,
        quantity: Number(adjustForm.quantity),
        warehouse_id: adjustForm.warehouse_id ? Number(adjustForm.warehouse_id) : undefined,
        reason: adjustForm.reason || undefined,
        reference: adjustForm.reference || undefined,
      }
      if (adjustForm.type === 'count') {
        payload.counted_quantity = Number(adjustForm.quantity)
        delete payload.quantity
      }
      if (adjustForm.type === 'adjustment') {
        payload.quantity_change = Number(adjustForm.quantity)
        delete payload.quantity
      }
      await inventoryApi.moveStock(adjustPart.id, payload)
      setNotice(`Stock ${MOVEMENT_LABELS[adjustForm.type].toLowerCase()} recorded for "${adjustPart.title}".`)
      setAdjustOpen(false)
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.message || Object.values(err?.response?.data?.errors || {})?.flat()?.[0] || 'Stock movement failed.')
    } finally {
      setSaving(false)
    }
  }

  const submitSupplier = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await inventoryApi.createSupplier({
        ...supplierForm,
        lead_time_days: Number(supplierForm.lead_time_days || 7),
      })
      setNotice(`Supplier "${supplierForm.name}" added.`)
      setSupplierOpen(false)
      setSupplierForm({ name: '', contact_person: '', email: '', phone: '', city: '', lead_time_days: 7 })
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save supplier.')
    } finally {
      setSaving(false)
    }
  }

  const submitWarehouse = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await inventoryApi.createWarehouse({
        ...warehouseForm,
      })
      setNotice(`Warehouse "${warehouseForm.name}" added.`)
      setWarehouseOpen(false)
      setWarehouseForm({ name: '', code: '', city: '' })
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save warehouse.')
    } finally {
      setSaving(false)
    }
  }

  const submitBin = async (warehouseId) => {
    const draft = binForms[warehouseId] || {}
    if (!draft.code?.trim()) return
    try {
      await inventoryApi.createBin(warehouseId, { ...draft, code: draft.code.trim() })
      setBinForms({ ...binForms, [warehouseId]: {} })
      await loadAll()
      setNotice('Bin location added.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add bin.')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(146, 68, 36, 0.1)', color: 'var(--color-rust)' }}>
              <Boxes size={20} />
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              Parts Inventory & Stock Control
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            GAP Valenzuela Main house catalog — stock levels, movement ledger, reorder alerts, suppliers, and warehouse bins.
          </p>
        </div>
        <button type="button" onClick={() => loadAll()} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {notice && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--color-emerald)', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}
      {error && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-danger)', background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'stock', label: 'Stock Levels', icon: Boxes },
          { id: 'movements', label: 'Movements Ledger', icon: ArrowDownToLine },
          { id: 'suppliers', label: `Suppliers (${suppliers.length})`, icon: Truck },
          { id: 'warehouses', label: `Warehouses (${warehouses.length})`, icon: WarehouseIcon },
        ].map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 700 }}
            >
              <Icon size={16} /> {t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="admin-card" style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div>Loading inventory…</div>
        </div>
      ) : (
        <>
          {tab === 'stock' && (
            <>
              {/* KPI cards */}
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                {[
                  { label: 'Parts Tracked', value: summary?.parts_tracked ?? 0 },
                  { label: 'On-Hand Units', value: summary?.on_hand_units ?? 0 },
                  { label: 'Stock Valuation', value: money(summary?.stock_valuation) },
                  { label: 'Reserved Units', value: summary?.reserved_units ?? 0 },
                  { label: 'Low Stock Lines', value: summary?.low_stock_lines ?? 0 },
                  { label: 'Out of Stock', value: summary?.out_of_stock_lines ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="stat-box">
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reorder alerts */}
              {lowStock.length > 0 && (
                <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20, borderColor: '#eab308' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, marginBottom: 10, color: '#b45309' }}>
                    <AlertTriangle size={16} /> Reorder Alerts ({lowStock.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lowStock.map((l) => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13, flexWrap: 'wrap' }}>
                        <span>
                          <strong>{l.title}</strong>{' '}
                          <span style={{ color: 'var(--admin-text-muted)' }}>
                            {l.severity === 'out_of_stock' ? 'OUT OF STOCK' : `${l.quantity} left · reorder at ${l.reorder_point}`}
                          </span>
                        </span>
                        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>Suggest order: {l.suggested_order}</span>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => openAdjust({ id: l.id, title: l.title }, 'receipt')}>
                            Receive
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock search + table */}
              <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 8, maxWidth: 420 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
                  <input
                    className="admin-input"
                    style={{ paddingLeft: 34 }}
                    placeholder="Search part #, MPN, barcode, title…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Part (SKU / MPN)</th>
                      <th style={{ textAlign: 'right' }}>On Hand</th>
                      <th style={{ textAlign: 'right' }}>Reserved</th>
                      <th style={{ textAlign: 'right' }}>Available</th>
                      <th>Reorder At</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Adjust</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.map((p) => {
                      const avail = Math.max(0, Number(p.quantity || 0) - Number(p.reserved_quantity || 0))
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                              {p.part_number || `#${p.id}`}{p.mpn ? ` · MPN ${p.mpn}` : ''}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.quantity ?? 0}</td>
                          <td style={{ textAlign: 'right' }}>{p.reserved_quantity ?? 0}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: avail <= 0 ? '#b91c1c' : undefined }}>{avail}</td>
                          <td>{p.reorder_point ?? 0}</td>
                          <td>
                            <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                              {p.stock_status || (avail <= 0 ? 'out_of_stock' : 'in_stock')}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button type="button" className="btn btn-secondary btn-sm" title="Receive stock" onClick={() => openAdjust(p, 'receipt')}>
                                <ArrowDownToLine size={13} />
                              </button>
                              <button type="button" className="btn btn-secondary btn-sm" title="Issue stock" onClick={() => openAdjust(p, 'issue')}>
                                <ArrowUpFromLine size={13} />
                              </button>
                              <button type="button" className="btn btn-secondary btn-sm" title="Cycle count" onClick={() => openAdjust(p, 'count')}>
                                <Package size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'movements' && (
            <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--admin-border)' }}>
                <select className="admin-input" style={{ maxWidth: 220 }} value={moveType} onChange={(e) => setMoveType(e.target.value)}>
                  <option value="all">All movement types</option>
                  {MOVEMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {moveMeta && (
                  <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', alignSelf: 'center' }}>
                    {moveMeta.total} movements
                  </span>
                )}
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Part</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Change</th>
                    <th style={{ textAlign: 'right' }}>After</th>
                    <th>Where</th>
                    <th>By / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontSize: 12 }}>{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{m.part?.title || `#${m.part_id}`}</td>
                      <td><span className="badge badge-neutral" style={{ fontSize: 11 }}>{m.type}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: Number(m.quantity_change) < 0 ? '#b91c1c' : '#047857', fontFamily: 'monospace' }}>
                        {Number(m.quantity_change) > 0 ? `+${m.quantity_change}` : m.quantity_change}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{m.quantity_after}</td>
                      <td style={{ fontSize: 12 }}>{m.warehouse?.code || '—'}{m.bin?.code ? ` / ${m.bin.code}` : ''}</td>
                      <td style={{ fontSize: 12 }}>{m.user?.name || ''}{m.reason ? ` — ${m.reason}` : ''}{m.reference ? ` [${m.reference}]` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'suppliers' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setSupplierOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Add Supplier
                </button>
              </div>
              <div className="table-container admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Contact</th>
                      <th>Lead Time</th>
                      <th>Linked Parts</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(suppliers?.data ?? suppliers ?? []).map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{s.city || ''}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{s.contact_person || '—'}<br />{s.email || s.phone || ''}</td>
                        <td>{s.lead_time_days ?? 7} days</td>
                        <td>{s.part_links_count ?? 0}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={async () => {
                              if (!window.confirm(`Delete supplier "${s.name}"? Catalog links are removed.`)) return
                              await inventoryApi.deleteSupplier(s.id)
                              await loadAll()
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'warehouses' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setWarehouseOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Add Warehouse
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {warehouses.map((w) => (
                  <div key={w.id} className="admin-card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>
                        {w.name} <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--admin-text-muted)' }}>{w.code}</span>
                        {w.is_default && <span className="badge badge-success" style={{ fontSize: 11, marginLeft: 8 }}>Default</span>}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={async () => {
                          if (!window.confirm(`Delete warehouse "${w.name}" and its bins?`)) return
                          await inventoryApi.deleteWarehouse(w.id)
                          await loadAll()
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      {(w.bins || []).map((b) => (
                        <span key={b.id} className="badge badge-neutral" style={{ fontSize: 12, fontFamily: 'monospace' }} title={b.path}>
                          {b.code}
                          {b.zone ? ` · Z${b.zone}` : ''}{b.rack ? `/R${b.rack}` : ''}{b.shelf ? `/S${b.shelf}` : ''}
                        </span>
                      ))}
                      {(w.bins || []).length === 0 && (
                        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No bins yet</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['code', 'zone', 'rack', 'shelf'].map((f) => (
                        <input
                          key={f}
                          className="admin-input"
                          style={{ maxWidth: f === 'code' ? 120 : 90 }}
                          placeholder={f.toUpperCase()}
                          value={(binForms[w.id] || {})[f] || ''}
                          onChange={(e) => setBinForms({ ...binForms, [w.id]: { ...(binForms[w.id] || {}), [f]: e.target.value } })}
                        />
                      ))}
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => submitBin(w.id)}>
                        <Plus size={13} /> Bin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Stock adjust modal */}
      {adjustOpen && adjustPart && (
        <div className="modal-backdrop" onClick={() => setAdjustOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Stock Movement — {adjustPart.title}</h3>
              <button type="button" onClick={() => setAdjustOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitAdjust}>
              <div className="modal-body" style={{ padding: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Movement Type *</label>
                  <select
                    className="admin-input"
                    value={adjustForm.type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  >
                    {MOVEMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{MOVEMENT_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">
                    {adjustForm.type === 'count' ? 'Counted Quantity *' : adjustForm.type === 'adjustment' ? 'Signed Change (+/-) *' : 'Quantity *'}
                  </label>
                  <input
                    type="number"
                    className="admin-input"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                    required
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Warehouse (optional)</label>
                  <select
                    className="admin-input"
                    value={adjustForm.warehouse_id}
                    onChange={(e) => setAdjustForm({ ...adjustForm, warehouse_id: e.target.value })}
                  >
                    <option value="">No specific warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="admin-label">Reference (PO…)</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={adjustForm.reference}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reference: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Reason</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setAdjustOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Recording…' : 'Record Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier modal */}
      {supplierOpen && (
        <div className="modal-backdrop" onClick={() => setSupplierOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Supplier</h3>
              <button type="button" onClick={() => setSupplierOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitSupplier}>
              <div className="modal-body" style={{ padding: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Supplier Name *</label>
                  <input type="text" className="admin-input" required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Contact Person</label>
                    <input type="text" className="admin-input" value={supplierForm.contact_person} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })} />
                  </div>
                  <div>
                    <label className="admin-label">Lead Time (days)</label>
                    <input type="number" min="0" className="admin-input" value={supplierForm.lead_time_days} onChange={(e) => setSupplierForm({ ...supplierForm, lead_time_days: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Email</label>
                    <input type="email" className="admin-input" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="admin-label">Phone</label>
                    <input type="text" className="admin-input" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="admin-label">City</label>
                  <input type="text" className="admin-input" value={supplierForm.city} onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setSupplierOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving…' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse modal */}
      {warehouseOpen && (
        <div className="modal-backdrop" onClick={() => setWarehouseOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Warehouse</h3>
              <button type="button" onClick={() => setWarehouseOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitWarehouse}>
              <div className="modal-body" style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Warehouse Name *</label>
                    <input type="text" className="admin-input" required value={warehouseForm.name} onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })} placeholder="e.g. Makati Main Depot" />
                  </div>
                  <div>
                    <label className="admin-label">Code *</label>
                    <input type="text" className="admin-input" required value={warehouseForm.code} onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value.toUpperCase() })} placeholder="MAIN" />
                  </div>
                </div>
                <div>
                  <label className="admin-label">City</label>
                  <input type="text" className="admin-input" value={warehouseForm.city} onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setWarehouseOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving…' : 'Add Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
