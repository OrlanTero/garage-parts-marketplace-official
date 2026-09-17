import { useEffect, useState } from 'react'
import {
  Car,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle,
  Tag,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import { carsApi } from '../api/cars.js'

export default function CarsManagement() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | published | sold | draft

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
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--admin-text-primary)',
              margin: '0 0 4px 0',
            }}
          >
            Car Builds & Showroom Management
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Audit, moderate, and manage vehicle listings across verified sellers and showrooms.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchCars} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
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
                transform: 'translateY(-50%)',
                color: 'var(--admin-text-muted)',
              }}
            />
            <input
              type="text"
              className="admin-input"
              style={{ paddingLeft: 36, height: 38 }}
              placeholder="Search make, model, year, or transmission..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ height: 38 }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>
            Status:
          </span>
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: 38, padding: '6px 12px' }}
          >
            <option value="all">All Statuses</option>
            <option value="published">Published / Live</option>
            <option value="sold">Sold</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehicle Specification</th>
              <th>Year</th>
              <th>Mileage</th>
              <th>Transmission</th>
              <th>Price (PHP)</th>
              <th>Status</th>
              <th>Seller</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--admin-text-muted)' }}>
                  Loading vehicle listings...
                </td>
              </tr>
            ) : cars.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--admin-text-muted)' }}>
                  No vehicle builds matching the current filters.
                </td>
              </tr>
            ) : (
              cars.map((car) => (
                <tr key={car.id}>
                  <td style={{ fontWeight: 700, color: 'var(--admin-text-muted)', fontSize: 13 }}>
                    #{car.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                      {car.make} {car.model}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      {car.fuel_type || 'Gasoline'} · {car.color || 'Standard'}
                    </div>
                  </td>
                  <td>{car.year}</td>
                  <td>{car.mileage ? `${Number(car.mileage).toLocaleString()} km` : '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{car.transmission}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-rust)' }}>
                    ₱{Number(car.price || 0).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        car.status === 'published'
                          ? 'badge-success'
                          : car.status === 'sold'
                          ? 'badge-danger'
                          : 'badge-neutral'
                      }`}
                    >
                      {car.status || 'published'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {car.seller?.name || 'Makati Showroom & HQ'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                      {car.seller?.email || 'seller@garagemarket.ph'}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
