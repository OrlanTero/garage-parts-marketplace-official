import { useEffect, useState } from 'react'
import {
  Car,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Tag,
  AlertCircle,
  ShieldCheck,
  X,
  MapPin,
  Calendar,
  Gauge,
  Fuel,
  Wrench,
  DollarSign,
  Upload,
} from 'lucide-react'
import { carsApi } from '../api/cars.js'

export default function CarsManagement() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | pending_inspection | sold | draft

  // Modal States
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedCar, setSelectedCar] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  // Form State for Create & Edit
  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    price: '',
    original_price: '',
    mileage_km: '',
    quantity: 1,
    body_style: 'coupe',
    fuel_type: 'petrol',
    transmission: 'manual',
    condition: 'used',
    vin: '',
    color: '',
    description: '',
    city: 'Makati',
    location: 'Showroom Bay #1',
    status: 'active',
    image_url: '',
  })

  const fetchCars = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.q = search.trim()
      if (statusFilter !== 'all') params.status = statusFilter

      const res = await carsApi.list(params)
      setCars(res.data || [])
    } catch {
      setCars([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCars()
  }, [statusFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchCars()
  }

  const handleOpenView = (car) => {
    setSelectedCar(car)
    setViewModalOpen(true)
  }

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      brand: 'Toyota',
      model: '',
      year: 2022,
      price: '',
      original_price: '',
      mileage_km: '',
      quantity: 1,
      body_style: 'coupe',
      fuel_type: 'petrol',
      transmission: 'manual',
      condition: 'used',
      vin: '',
      color: 'Solid White',
      description: '',
      city: 'Makati',
      location: 'Makati Central Showroom',
      status: 'active',
      image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop',
    })
    setActionError(null)
    setCreateModalOpen(true)
  }

  const handleOpenEdit = (car) => {
    setSelectedCar(car)
    setFormData({
      title: car.title || `${car.brand || car.make || ''} ${car.model || ''}`,
      brand: car.brand || car.make || '',
      model: car.model || '',
      year: car.year || 2020,
      price: car.price || '',
      original_price: car.original_price || '',
      mileage_km: car.mileage_km || car.mileage || '',
      quantity: car.quantity ?? 1,
      body_style: car.body_style || 'coupe',
      fuel_type: car.fuel_type || 'petrol',
      transmission: car.transmission || 'manual',
      condition: car.condition || 'used',
      vin: car.vin || '',
      color: car.color || '',
      description: car.description || '',
      city: car.city || 'Makati',
      location: car.location || 'Showroom Bay #1',
      status: car.status || 'active',
      image_url: car.primary_image_url || (car.media && car.media[0]?.url) || '',
    })
    setActionError(null)
    setEditModalOpen(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setActionError(null)
    try {
      const payload = {
        title: formData.title || `${formData.brand} ${formData.model}`,
        brand: formData.brand,
        model: formData.model,
        year: parseInt(formData.year),
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : undefined,
        mileage_km: formData.mileage_km ? parseInt(formData.mileage_km) : 0,
        quantity: Math.max(1, parseInt(formData.quantity) || 1),
        body_style: formData.body_style,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission,
        condition: formData.condition,
        vin: formData.vin || undefined,
        color: formData.color,
        description: formData.description,
        city: formData.city,
        location: formData.location,
        media: formData.image_url ? [{ url: formData.image_url, is_primary: true }] : undefined,
      }

      await carsApi.create(payload)
      setActionSuccess(`Vehicle build "${payload.title}" created successfully.`)
      setCreateModalOpen(false)
      fetchCars()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to create vehicle build platform.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedCar) return
    setActionLoading(true)
    setActionError(null)
    try {
      const payload = {
        title: formData.title,
        brand: formData.brand,
        model: formData.model,
        year: parseInt(formData.year),
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : undefined,
        mileage_km: formData.mileage_km ? parseInt(formData.mileage_km) : 0,
        quantity: Math.max(0, parseInt(formData.quantity) || 0),
        body_style: formData.body_style,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission,
        condition: formData.condition,
        vin: formData.vin,
        color: formData.color,
        description: formData.description,
        city: formData.city,
        location: formData.location,
      }

      await carsApi.update(selectedCar.id, payload)
      setActionSuccess(`Vehicle build #${selectedCar.id} updated successfully.`)
      setEditModalOpen(false)
      fetchCars()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to update vehicle build.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (carId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle listing?')) return
    try {
      await carsApi.delete(carId)
      setActionSuccess('Vehicle listing deleted.')
      fetchCars()
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete listing.')
    }
  }

  // Derived KPI Stats
  const totalValuation = cars.reduce((acc, c) => acc + (parseFloat(c.price) || 0), 0)
  const activeCount = cars.filter((c) => c.status === 'active' || c.status === 'published').length
  const pendingCount = cars.filter((c) => c.status === 'pending_inspection' || c.status === 'draft').length

  return (
    <div>
      {/* Page Header */}
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
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(146, 68, 36, 0.1)', color: 'var(--color-rust)' }}>
              <Car size={20} />
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
              Vehicle Management & Build Platforms
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Audit, register, and configure vehicle platforms, custom builds, and showroom listings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" onClick={fetchCars} className="btn btn-secondary btn-sm">
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
            <span>Add Vehicle Platform / Build</span>
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
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Total Vehicle Builds</span>
            <Car size={18} style={{ color: 'var(--color-rust)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {cars.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Active & draft catalog builds
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Published Live</span>
            <CheckCircle size={18} style={{ color: 'var(--admin-success)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Available for buyer inquiry
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Pending Inspection</span>
            <Wrench size={18} style={{ color: 'var(--admin-warning)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Scheduled or awaiting check
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-info)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Showroom Valuation</span>
            <Tag size={18} style={{ color: 'var(--admin-info)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            ₱{totalValuation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Combined fleet value
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
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
                transform: 'translateY(-50)',
                color: 'var(--admin-text-muted)',
              }}
            />
            <input
              type="text"
              className="admin-input"
              style={{ paddingLeft: 36, height: 38 }}
              placeholder="Search make, model, year, VIN, or seller..."
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
            { id: 'all', label: `All Builds (${cars.length})` },
            { id: 'active', label: 'Published / Live' },
            { id: 'pending_inspection', label: 'Pending Inspection' },
            { id: 'sold', label: 'Sold' },
            { id: 'draft', label: 'Draft' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13 }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="table-container admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Vehicle Specification</th>
              <th>Year & Body</th>
              <th>Mileage & Drivetrain</th>
              <th>Price (PHP)</th>
              <th>Inspection & Status</th>
              <th>Showroom / Seller</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 48, color: 'var(--admin-text-muted)' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                  <div>Loading vehicle listings...</div>
                </td>
              </tr>
            ) : cars.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 48, color: 'var(--admin-text-muted)' }}>
                  <Car size={36} style={{ color: 'var(--admin-text-muted)', marginBottom: 12 }} />
                  <h3 style={{ margin: '0 0 6px 0', color: 'var(--admin-text-primary)' }}>No Vehicle Builds Found</h3>
                  <p style={{ margin: 0, fontSize: 14 }}>No builds match the selected search or filter.</p>
                </td>
              </tr>
            ) : (
              cars.map((car) => {
                const title = car.title || `${car.brand || car.make || ''} ${car.model || ''}`
                const imageUrl = car.primary_image_url || (car.media && car.media[0]?.url)
                const isPublished = car.status === 'active' || car.status === 'published'
                const isPending = car.status === 'pending_inspection'

                return (
                  <tr key={car.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={title}
                            style={{ width: 52, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--admin-border)' }}
                          />
                        ) : (
                          <div style={{ width: 52, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--admin-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)' }}>
                            <Car size={20} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: 14 }}>
                            {title}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>VIN: {car.vin || '—'}</span>
                            {car.color && <span>· {car.color}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{car.year}</div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', textTransform: 'capitalize' }}>{car.body_style || 'Coupe'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: 'var(--admin-text-primary)' }}>
                        {car.mileage_km ? `${Number(car.mileage_km).toLocaleString()} km` : car.mileage ? `${Number(car.mileage).toLocaleString()} km` : '—'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', textTransform: 'capitalize' }}>
                        {car.transmission} · {car.fuel_type || 'Petrol'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--color-rust)', fontSize: 15 }}>
                        ₱{Number(car.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          isPublished
                            ? 'badge-success'
                            : isPending
                            ? 'badge-warning'
                            : car.status === 'sold'
                            ? 'badge-danger'
                            : 'badge-neutral'
                        }`}
                      >
                        {isPending ? 'Pending Inspection' : car.status || 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                        {car.seller?.name || 'Makati Showroom & HQ'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                        {car.city || 'Metro Manila'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenView(car)}
                          className="btn btn-secondary btn-sm"
                          title="View Complete Build Details"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(car)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Build Platform Specs"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(car.id)}
                          className="btn btn-danger btn-sm"
                          title="Delete Vehicle"
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

      {/* View Vehicle Build Modal */}
      {viewModalOpen && selectedCar && (
        <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'rgba(146, 68, 36, 0.1)', color: 'var(--color-rust)' }}>
                  <Car size={22} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    {selectedCar.title || `${selectedCar.brand || selectedCar.make} ${selectedCar.model}`}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    VIN: {selectedCar.vin || 'Not Set'} · Build #{selectedCar.id}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setViewModalOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: 24 }}>
              {/* Image Banner if available */}
              {(selectedCar.primary_image_url || (selectedCar.media && selectedCar.media[0]?.url)) && (
                <div style={{ marginBottom: 20, borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 220, background: '#000' }}>
                  <img
                    src={selectedCar.primary_image_url || (selectedCar.media && selectedCar.media[0]?.url)}
                    alt="Build preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* Specs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Price</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-rust)', marginTop: 2 }}>
                    ₱{Number(selectedCar.price || 0).toLocaleString('en-PH')}
                  </div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Mileage</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)', marginTop: 2 }}>
                    {selectedCar.mileage_km ? `${Number(selectedCar.mileage_km).toLocaleString()} km` : '—'}
                  </div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Drivetrain</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                    {selectedCar.transmission} · {selectedCar.fuel_type || 'Petrol'}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                  Build Platform Description
                </h4>
                <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.6, background: '#ffffff', border: '1px solid var(--admin-border)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  {selectedCar.description || 'No detailed modifications or build description provided.'}
                </div>
              </div>

              {/* Inspection & Location Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Inspection Status</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                    {selectedCar.inspection_status || 'Pending Verification'} ({selectedCar.inspection_score || 'Score: N/A'})
                  </div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Showroom Location</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)', marginTop: 2 }}>
                    {selectedCar.city || 'Makati'} · {selectedCar.location || 'Showroom Bay'}
                  </div>
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
                  handleOpenEdit(selectedCar)
                }}
                className="btn btn-primary"
              >
                Edit Build Specs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Add Vehicle Platform Modal */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Plus size={20} style={{ color: 'var(--color-rust)' }} />
                <h3 className="modal-title">Add Vehicle Build Platform</h3>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Make / Brand *</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. Toyota, Nissan, Porsche"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="admin-label">Model Name *</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. Supra RZ, Skyline GT-R"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Listing Title *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. 1998 Toyota Supra RZ Twin Turbo (JZA80)"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Year *</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="admin-label">Price (PHP) *</label>
                    <input
                      type="number"
                      className="admin-input"
                      placeholder="3500000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="admin-label">Mileage (km)</label>
                    <input
                      type="number"
                      className="admin-input"
                      placeholder="45000"
                      value={formData.mileage_km}
                      onChange={(e) => setFormData({ ...formData, mileage_km: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      className="admin-input"
                      placeholder="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Transmission</label>
                    <select
                      className="admin-input"
                      value={formData.transmission}
                      onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    >
                      <option value="manual">Manual</option>
                      <option value="automatic">Automatic</option>
                      <option value="dual-clutch">Dual Clutch (DCT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="admin-label">Fuel Type</label>
                    <select
                      className="admin-input"
                      value={formData.fuel_type}
                      onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    >
                      <option value="petrol">Petrol / Gasoline</option>
                      <option value="diesel">Diesel</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="electric">Electric</option>
                    </select>
                  </div>
                  <div>
                    <label className="admin-label">Body Style</label>
                    <select
                      className="admin-input"
                      value={formData.body_style}
                      onChange={(e) => setFormData({ ...formData, body_style: e.target.value })}
                    >
                      <option value="coupe">Coupe</option>
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                      <option value="hatchback">Hatchback</option>
                      <option value="wagon">Wagon</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">VIN / Chassis Number</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. JZA80-0012948"
                      value={formData.vin}
                      onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Color / Finish</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. Super White II"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Primary Image URL</label>
                  <input
                    type="url"
                    className="admin-input"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Build Description & Modifications</label>
                  <textarea
                    rows={3}
                    className="admin-input"
                    placeholder="Describe engine mods, suspension, tuning, and condition..."
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
                  {actionLoading ? 'Creating...' : 'Register Vehicle Build'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Build Modal */}
      {editModalOpen && selectedCar && (
        <div className="modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Vehicle Build #{selectedCar.id}</h3>
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
                  <label className="admin-label">Listing Title</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
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
                    <label className="admin-label">Mileage (km)</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={formData.mileage_km}
                      onChange={(e) => setFormData({ ...formData, mileage_km: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      className="admin-input"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">VIN / Chassis Number</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={formData.vin}
                      onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">City / Region</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Description & Build Specs</label>
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
                  {actionLoading ? 'Saving...' : 'Update Build'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
