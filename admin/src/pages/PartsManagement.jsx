import { useEffect, useState, useRef } from 'react'
import {
  Layers,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Package,
  Tag,
  AlertCircle,
  X,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Boxes,
  MapPin,
  Wrench,
  CheckCircle2,
} from 'lucide-react'
import { partsApi } from '../api/parts.js'
import { taxonomyApi, specOptions, specLabel } from '../api/taxonomy.js'

export default function PartsManagement() {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [liveCategories, setLiveCategories] = useState([])
  const [liveSpecs, setLiveSpecs] = useState({})

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedPart, setSelectedPart] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const fileInputRef = useRef(null)

  // Form State for Add / Edit Part
  const [formData, setFormData] = useState({
    title: '',
    category: 'engine',
    brand: '',
    part_number: '',
    compatibility: '',
    condition: 'new',
    price: '',
    original_price: '',
    quantity: 1,
    free_shipping: true,
    description: '',
    city: 'Makati',
    location: 'Makati Parts Depot',
    image_url: '',
  })

  const fetchParts = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.q = search.trim()
      if (categoryFilter !== 'all') params.category = categoryFilter

      const res = await partsApi.list(params)
      setParts(res.data || [])
    } catch {
      setParts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParts()
  }, [categoryFilter])

  // Live category catalog from backend taxonomy (replaces hardcoded pills).
  useEffect(() => {
    taxonomyApi.getCategories().then(setLiveCategories).catch(() => setLiveCategories([]))
    taxonomyApi.getSpecs().then(setLiveSpecs).catch(() => setLiveSpecs({}))
  }, [])

  const partConditions = specOptions(liveSpecs, 'part_conditions')

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchParts()
  }

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      category: 'engine',
      brand: 'HKS',
      part_number: '',
      compatibility: 'Universal / Toyota / Nissan / Honda',
      condition: 'new',
      price: '',
      original_price: '',
      quantity: 5,
      free_shipping: true,
      description: '',
      city: 'Makati',
      location: 'Makati Parts Depot',
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop',
    })
    setActionError(null)
    setCreateModalOpen(true)
  }

  const handleOpenView = (part) => {
    setSelectedPart(part)
    setViewModalOpen(true)
  }

  const handleOpenEdit = (part) => {
    setSelectedPart(part)
    setFormData({
      title: part.title || '',
      category: part.category || 'engine',
      brand: part.brand || '',
      part_number: part.part_number || '',
      compatibility: part.compatibility || '',
      condition: part.condition || 'new',
      price: part.price || '',
      original_price: part.original_price || '',
      quantity: part.quantity || part.stock_quantity || 1,
      free_shipping: Boolean(part.free_shipping),
      description: part.description || '',
      city: part.city || 'Makati',
      location: part.location || 'Showroom Depot',
      image_url: part.primary_image_url || (part.media && part.media[0]?.url) || '',
    })
    setActionError(null)
    setEditModalOpen(true)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setActionError(null)
    try {
      const res = await partsApi.uploadMedia(file)
      if (res?.data?.url || res?.url) {
        setFormData((prev) => ({
          ...prev,
          image_url: res.data?.url || res.url,
        }))
        setActionSuccess('Image uploaded successfully.')
      }
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setActionError(null)
    try {
      const payload = {
        title: formData.title,
        category: formData.category,
        brand: formData.brand,
        part_number: formData.part_number || undefined,
        compatibility: formData.compatibility || undefined,
        condition: formData.condition,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : undefined,
        quantity: parseInt(formData.quantity) || 1,
        free_shipping: formData.free_shipping,
        description: formData.description,
        city: formData.city,
        location: formData.location,
        media: formData.image_url ? [{ url: formData.image_url, is_primary: true }] : undefined,
      }

      await partsApi.create(payload)
      setActionSuccess(`Part "${formData.title}" added to inventory.`)
      setCreateModalOpen(false)
      fetchParts()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to create part.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPart) return
    setActionLoading(true)
    setActionError(null)
    try {
      const payload = {
        title: formData.title,
        category: formData.category,
        brand: formData.brand,
        part_number: formData.part_number,
        compatibility: formData.compatibility,
        condition: formData.condition,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : undefined,
        quantity: parseInt(formData.quantity) || 1,
        free_shipping: formData.free_shipping,
        description: formData.description,
        city: formData.city,
        location: formData.location,
      }

      await partsApi.update(selectedPart.id, payload)
      setActionSuccess(`Part #${selectedPart.id} updated successfully.`)
      setEditModalOpen(false)
      fetchParts()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to update part.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (partId) => {
    if (!window.confirm('Are you sure you want to remove this part from inventory?')) return
    try {
      await partsApi.delete(partId)
      setActionSuccess('Part deleted from catalog.')
      fetchParts()
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete part.')
    }
  }

  // Derived KPI Stats
  const totalValuation = parts.reduce(
    (acc, p) => acc + (parseFloat(p.price) || 0) * (parseInt(p.quantity || p.stock_quantity) || 1),
    0
  )
  const totalStock = parts.reduce((acc, p) => acc + (parseInt(p.quantity || p.stock_quantity) || 1), 0)

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(216, 98, 44, 0.1)', color: 'var(--color-rust)' }}>
              <Layers size={20} />
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'var(--admin-text-primary)',
                margin: 0,
              }}
            >
              Parts & Catalog Inventory
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Inspect, create, update, and manage automotive parts, stock counts, pricing, and media uploads.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" onClick={fetchParts} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn btn-primary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, var(--color-rust) 0%, #7b371b 100%)',
              color: '#ffffff',
              fontWeight: 700,
              padding: '8px 16px',
              boxShadow: '0 2px 8px rgba(146, 68, 36, 0.25)',
            }}
          >
            <Plus size={16} />
            <span>Add New Part / Product</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--color-emerald)', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-rust)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Catalog SKUs</span>
            <Layers size={18} style={{ color: 'var(--color-rust)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {parts.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Unique catalog products
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Units In Stock</span>
            <Boxes size={18} style={{ color: 'var(--admin-success)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {totalStock}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Combined warehouse quantity
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Categories Covered</span>
            <Tag size={18} style={{ color: 'var(--color-orange)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {new Set(parts.map((p) => p.category)).size || 7}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Engine, exhaust, brakes, etc.
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-info)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Total Parts Valuation</span>
            <DollarSign size={18} style={{ color: 'var(--admin-info)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            ₱{totalValuation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Total inventory retail value
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div
        className="admin-card"
        style={{
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 400 }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--admin-text-muted)',
              }}
            />
            <input
              type="text"
              className="admin-input"
              style={{ paddingLeft: 36, height: 38 }}
              placeholder="Search by part title, brand, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" style={{ height: 38 }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Parts (${parts.length})` },
            ...liveCategories.map((c) => ({ id: c.slug, label: c.name })),
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`btn btn-sm ${categoryFilter === cat.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13 }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Parts Table */}
      <div className="table-container admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Part & Brand</th>
              <th>Category</th>
              <th>Condition</th>
              <th>Stock</th>
              <th>Price (PHP)</th>
              <th>Seller / Depot</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 48, color: 'var(--admin-text-muted)' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                  <div>Loading parts catalog...</div>
                </td>
              </tr>
            ) : parts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 48, color: 'var(--admin-text-muted)' }}>
                  <Package size={36} style={{ color: 'var(--admin-text-muted)', marginBottom: 12 }} />
                  <h3 style={{ margin: '0 0 6px 0', color: 'var(--admin-text-primary)' }}>No Parts Found</h3>
                  <p style={{ margin: 0, fontSize: 14 }}>No components match your search criteria.</p>
                </td>
              </tr>
            ) : (
              parts.map((part) => {
                const imageUrl = part.primary_image_url || (part.media && part.media[0]?.url)
                const qty = part.quantity || part.stock_quantity || 1

                return (
                  <tr key={part.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={part.title}
                            style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--admin-border)' }}
                          />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: 'var(--admin-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)' }}>
                            <Package size={20} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: 14 }}>
                            {part.title}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>Brand: {part.brand || 'OEM'}</span>
                            {part.part_number && <span>· PN: {part.part_number}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                        {part.category ? part.category.replace('_', ' ') : 'General'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${part.condition === 'new' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 11, textTransform: 'capitalize' }}>
                        {part.condition || 'New'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: qty > 0 ? 'var(--admin-text-primary)' : 'var(--admin-danger)', fontSize: 13 }}>
                        {qty} in stock
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--color-rust)', fontSize: 15 }}>
                        ₱{Number(part.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                        {part.seller?.name || 'Apex Performance Depot'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                        {part.city || 'Makati'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenView(part)}
                          className="btn btn-secondary btn-sm"
                          title="View Part Specs"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(part)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Part & Stock"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(part.id)}
                          className="btn btn-danger btn-sm"
                          title="Delete Part"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View Part Modal */}
      {viewModalOpen && selectedPart && (
        <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'rgba(216, 98, 44, 0.1)', color: 'var(--color-rust)' }}>
                  <Package size={22} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>{selectedPart.title}</h3>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    SKU: {selectedPart.part_number || 'N/A'} · Brand: {selectedPart.brand}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setViewModalOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: 24 }}>
              {(selectedPart.primary_image_url || (selectedPart.media && selectedPart.media[0]?.url)) && (
                <div style={{ marginBottom: 20, borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 200, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={selectedPart.primary_image_url || (selectedPart.media && selectedPart.media[0]?.url)}
                    alt={selectedPart.title}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Price</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-rust)', marginTop: 2 }}>
                    ₱{Number(selectedPart.price || 0).toLocaleString('en-PH')}
                  </div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Stock Available</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-text-primary)', marginTop: 2 }}>
                    {selectedPart.quantity || selectedPart.stock_quantity || 1} units
                  </div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Condition</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                    {selectedPart.condition || 'New'}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                  Vehicle Compatibility & Fitment
                </h4>
                <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  {selectedPart.compatibility || 'Universal fitment or multi-vehicle chassis compatible.'}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                  Technical Description
                </h4>
                <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.6, background: '#ffffff', border: '1px solid var(--admin-border)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  {selectedPart.description || 'No detailed technical description provided.'}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setViewModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewModalOpen(false)
                  handleOpenEdit(selectedPart)
                }}
                className="btn btn-primary"
              >
                Edit Part Specs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 660 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Plus size={20} style={{ color: 'var(--color-rust)' }} />
                <h3 className="modal-title">Add New Auto Part / Product</h3>
              </div>
              <button type="button" onClick={() => setCreateModalOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body" style={{ padding: 24 }}>
                {actionError && (
                  <div style={{ padding: 12, background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)', borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 16 }}>
                    {actionError}
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Product Title *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Brembo GT 6-Piston Monobloc Big Brake Kit"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Category *</label>
                    <select
                      className="admin-input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      {liveCategories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="admin-label">Brand / Manufacturer *</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. Brembo, HKS, Ohlins, Recaro"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Price (PHP) *</label>
                    <input
                      type="number"
                      className="admin-input"
                      placeholder="45000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="admin-label">Stock Quantity *</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="admin-label">Condition</label>
                    <select
                      className="admin-input"
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    >
                      {partConditions.map((c) => (
                        <option key={c} value={c}>
                          {specLabel(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Part Number / SKU</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. 1M1.8024A-RED"
                      value={formData.part_number}
                      onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">City / Location</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                {/* Media Image Upload & URL */}
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Product Image (Upload File or Paste URL)</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="url"
                      className="admin-input"
                      placeholder="https://..."
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      accept="image/*"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                    >
                      <Upload size={14} />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Vehicle Compatibility / Fitment</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Toyota Supra JZA80 / Nissan Skyline BNR32"
                    value={formData.compatibility}
                    onChange={(e) => setFormData({ ...formData, compatibility: e.target.value })}
                  />
                </div>

                <div>
                  <label className="admin-label">Description & Technical Specifications</label>
                  <textarea
                    rows={3}
                    className="admin-input"
                    placeholder="Details about construction, specs, included hardware..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Part Modal */}
      {editModalOpen && selectedPart && (
        <div className="modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 660 }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Part #{selectedPart.id}</h3>
              <button type="button" onClick={() => setEditModalOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ padding: 24 }}>
                {actionError && (
                  <div style={{ padding: 12, background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)', borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 16 }}>
                    {actionError}
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Product Title</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Price (PHP)</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="admin-label">Stock Quantity</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="admin-label">Condition</label>
                    <select
                      className="admin-input"
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    >
                      {partConditions.map((c) => (
                        <option key={c} value={c}>
                          {specLabel(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Vehicle Compatibility</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={formData.compatibility}
                    onChange={(e) => setFormData({ ...formData, compatibility: e.target.value })}
                  />
                </div>

                <div>
                  <label className="admin-label">Description & Specs</label>
                  <textarea
                    rows={3}
                    className="admin-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Saving...' : 'Update Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
