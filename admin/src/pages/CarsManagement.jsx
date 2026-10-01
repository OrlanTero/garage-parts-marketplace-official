import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  LayoutGrid,
  List,
} from 'lucide-react'
import { carsApi } from '../api/cars.js'
import MediaUploadField from '../components/MediaUploadField.jsx'

export default function CarsManagement() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | pending_inspection | sold | draft
  // Client-side dimensions (instant, over the fetched queue).
  const [brandFilter, setBrandFilter] = useState('all')
  const [bodyFilter, setBodyFilter] = useState('all')
  const [transFilter, setTransFilter] = useState('all')
  const [fuelFilter, setFuelFilter] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'table'
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
    images: [],
  })

  const fetchCars = async (overrides = {}) => {
    setLoading(true)
    try {
      const params = {}
      const q = overrides.search !== undefined ? overrides.search : search
      const st = overrides.status !== undefined ? overrides.status : statusFilter
      if (String(q || '').trim()) params.q = String(q).trim()
      if (st !== 'all') params.status = st

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

  // Distinct option values from the fetched queue.
  const brandOptions = useMemo(() => {
    const set = new Set()
    cars.forEach((c) => {
      const b = (c.brand || c.make || '').trim()
      if (b) set.add(b)
    })
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [cars])
  const bodyOptions = useMemo(() => {
    const set = new Set()
    cars.forEach((c) => {
      const b = String(c.body_style || '').trim()
      if (b) set.add(b)
    })
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [cars])

  const filteredCars = useMemo(() => {
    const lo = minPrice !== '' ? Number(minPrice) : null
    const hi = maxPrice !== '' ? Number(maxPrice) : null
    const out = cars.filter((c) => {
      if (brandFilter !== 'all' && (c.brand || c.make || '') !== brandFilter) return false
      if (bodyFilter !== 'all' && String(c.body_style || '') !== bodyFilter) return false
      if (transFilter !== 'all' && String(c.transmission || '') !== transFilter) return false
      if (fuelFilter !== 'all' && String(c.fuel_type || c.fuel || '') !== fuelFilter) return false
      const price = Number(c.price || 0)
      if (lo !== null && !Number.isNaN(lo) && price < lo) return false
      if (hi !== null && !Number.isNaN(hi) && price > hi) return false
      return true
    })
    const byPrice = (a, b) => Number(a.price || 0) - Number(b.price || 0)
    const byMileage = (a, b) => Number(a.mileage_km ?? a.mileage ?? 0) - Number(b.mileage_km ?? b.mileage ?? 0)
    const byYear = (a, b) => Number(b.year || 0) - Number(a.year || 0)
    switch (sortBy) {
      case 'price-asc': return [...out].sort(byPrice)
      case 'price-desc': return [...out].sort((a, b) => byPrice(b, a))
      case 'mileage-asc': return [...out].sort(byMileage)
      case 'year-desc': return [...out].sort(byYear)
      default: return out
    }
  }, [cars, brandFilter, bodyFilter, transFilter, fuelFilter, minPrice, maxPrice, sortBy])

  const hasClientFilters =
    brandFilter !== 'all' || bodyFilter !== 'all' || transFilter !== 'all' ||
    fuelFilter !== 'all' || minPrice !== '' || maxPrice !== '' || sortBy !== 'newest'

  const resetAllFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setBrandFilter('all')
    setBodyFilter('all')
    setTransFilter('all')
    setFuelFilter('all')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('newest')
    fetchCars({ search: '', status: 'all' })
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
      images: [],
    })
    setActionError(null)
    setCreateModalOpen(true)
  }

  const handleOpenEdit = (car) => {
    setSelectedCar(car)
    setFormData({      title: car.title || `${car.brand || car.make || ''} ${car.model || ''}`,
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
      images: (car.media || []).map((m) => m.url).filter(Boolean),
    })
    setActionError(null)
    setEditModalOpen(true)
  }

  const uploadCarFiles = async (files) => {
    if (files.length === 1) {
      const res = await carsApi.uploadMedia(files[0])
      const url = res?.data?.url || res?.url
      return url ? [url] : []
    }
    const res = await carsApi.uploadMultiple(files)
    return ((res?.data ?? [])).map((m) => m.url).filter(Boolean)
  }

  const mediaPayload = (images) =>
    (images || []).map((url, i) => ({ url, is_primary: i === 0, order: i }))

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
        media: mediaPayload(formData.images),
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
        media: mediaPayload(formData.images),
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
          <div className="view-mode-toggle" role="tablist" aria-label="Layout view">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'cards'}
              className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Cards view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'table'}
              className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <List size={15} />
            </button>
          </div>
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
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-success)', background: 'var(--admin-success-bg)', color: 'var(--admin-success)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

        <div className="admin-filters" style={{ width: '100%', paddingTop: 12, borderTop: '1px solid var(--admin-border-subtle)' }}>
          <label className="admin-filter-field">
            <span>Brand</span>
            <select className="admin-select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
              <option value="all">All brands</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="admin-filter-field">
            <span>Body style</span>
            <select className="admin-select" value={bodyFilter} onChange={(e) => setBodyFilter(e.target.value)}>
              <option value="all">All bodies</option>
              {bodyOptions.map((b) => (
                <option key={b} value={b} style={{ textTransform: 'capitalize' }}>{b.replace('_', ' ')}</option>
              ))}
            </select>
          </label>
          <label className="admin-filter-field">
            <span>Transmission</span>
            <select className="admin-select" value={transFilter} onChange={(e) => setTransFilter(e.target.value)}>
              <option value="all">Any</option>
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
            </select>
          </label>
          <label className="admin-filter-field">
            <span>Fuel</span>
            <select className="admin-select" value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
              <option value="all">Any</option>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </select>
          </label>
          <label className="admin-filter-field">
            <span>Min price ₱</span>
            <input type="number" min="0" className="admin-input" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" />
          </label>
          <label className="admin-filter-field">
            <span>Max price ₱</span>
            <input type="number" min="0" className="admin-input" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="No cap" />
          </label>
          <label className="admin-filter-field">
            <span>Sort</span>
            <select className="admin-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="year-desc">Year · newest</option>
              <option value="price-asc">Price · low to high</option>
              <option value="price-desc">Price · high to low</option>
              <option value="mileage-asc">Mileage · lowest</option>
            </select>
          </label>
          <div className="admin-filter-actions">
            <span className="admin-result-count">{filteredCars.length} of {cars.length} builds</span>
            {(hasClientFilters || search.trim() || statusFilter !== 'all') && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={resetAllFilters}>
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      {viewMode === 'table' ? (
      <div className="table-container admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
        <table className="admin-table admin-cars-table">
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
            ) : filteredCars.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 48, color: 'var(--admin-text-muted)' }}>
                  <Car size={36} style={{ color: 'var(--admin-text-muted)', marginBottom: 12 }} />
                  <h3 style={{ margin: '0 0 6px 0', color: 'var(--admin-text-primary)' }}>No Vehicle Builds Found</h3>
                  <p style={{ margin: 0, fontSize: 14 }}>No builds match the selected search or filter.</p>
                </td>
              </tr>
            ) : (
              filteredCars.map((car) => {
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
                        <Link
                          to={`/cars/${car.id}`}
                          className="btn btn-secondary btn-sm"
                          title="Open full vehicle page"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </Link>
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
      </div>
      ) : (
      <div className="admin-car-grid">
        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="admin-card admin-car-card" aria-hidden="true">
              <div className="admin-car-media" style={{ background: 'var(--admin-bg-subtle)' }} />
              <div style={{ padding: 14 }}>
                <div style={{ height: 14, borderRadius: 6, background: 'var(--admin-bg-subtle)', marginBottom: 8 }} />
                <div style={{ height: 12, borderRadius: 6, background: 'var(--admin-bg-subtle)', width: '60%' }} />
              </div>
            </div>
          ))
        ) : filteredCars.length === 0 ? (
          <div className="admin-card" style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <Car size={36} style={{ marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--admin-text-primary)' }}>No Vehicle Builds Found</h3>
            <p style={{ margin: '0 0 14px', fontSize: 14 }}>No builds match the selected search or filter.</p>
            {(hasClientFilters || search.trim() || statusFilter !== 'all') && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={resetAllFilters}>
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          filteredCars.map((car) => {
            const title = car.title || `${car.brand || car.make || ''} ${car.model || ''}`
            const imageUrl = car.primary_image_url || (car.media && car.media[0]?.url)
            const isPublished = car.status === 'active' || car.status === 'published'
            const isPending = car.status === 'pending_inspection'
            return (
              <div key={car.id} className="admin-card admin-car-card">
                <Link to={`/cars/${car.id}`} className="admin-car-media" title={title}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={title} loading="lazy" />
                  ) : (
                    <span className="admin-car-nomedia"><Car size={28} /></span>
                  )}
                  <span
                    className={`badge ${
                      isPublished
                        ? 'badge-success'
                        : isPending
                        ? 'badge-warning'
                        : car.status === 'sold'
                        ? 'badge-danger'
                        : 'badge-neutral'
                    } admin-car-badge`}
                  >
                    {isPending ? 'Pending Inspection' : car.status || 'Draft'}
                  </span>
                </Link>
                <div className="admin-car-body">
                  <Link to={`/cars/${car.id}`} className="admin-car-title">{title}</Link>
                  <div className="admin-car-sub">
                    {[car.year, car.brand || car.make, car.model].filter(Boolean).join(' · ')}
                    {car.vin ? ` · VIN ${car.vin}` : ''}
                  </div>
                  <div className="admin-car-meta">
                    <span>{car.mileage_km ? `${Number(car.mileage_km).toLocaleString()} km` : '—'}</span>
                    <span className="admin-car-dot">•</span>
                    <span style={{ textTransform: 'capitalize' }}>{car.transmission || '—'}</span>
                  </div>
                  <div className="admin-car-foot">
                    <span className="admin-car-price">
                      ₱{Number(car.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="admin-car-seller">{car.seller?.name || car.city || 'Showroom'}</span>
                  </div>
                  <div className="admin-car-actions">
                    <Link to={`/cars/${car.id}`} className="btn btn-secondary btn-sm">
                      <Eye size={14} /> <span>View</span>
                    </Link>
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
                </div>
              </div>
            )
          })
        )}
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

                <MediaUploadField
                  label="Build Photos"
                  images={formData.images || []}
                  onChange={(images) => setFormData((prev) => ({ ...prev, images }))}
                  uploadFiles={uploadCarFiles}
                />

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

                <MediaUploadField
                  label="Build Photos"
                  images={formData.images || []}
                  onChange={(images) => setFormData((prev) => ({ ...prev, images }))}
                  uploadFiles={uploadCarFiles}
                />
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
