import { useEffect, useState } from 'react'
import {
  Layers,
  Search,
  RefreshCw,
  Tag,
  CheckCircle,
  Package,
} from 'lucide-react'
import { partsApi } from '../api/parts.js'

export default function PartsManagement() {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

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

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchParts()
  }

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
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--admin-text-primary)',
              margin: '0 0 4px 0',
            }}
          >
            Parts & Catalog Inventory
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Inspect marketplace catalog parts, stock levels, categories, and condition ratings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchParts} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
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
              placeholder="Search part name, brand, or OEM number..."
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
            Category:
          </span>
          <select
            className="admin-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ height: 38, padding: '6px 12px' }}
          >
            <option value="all">All Categories</option>
            <option value="Engine & Drivetrain">Engine & Drivetrain</option>
            <option value="Suspension & Brakes">Suspension & Brakes</option>
            <option value="Wheels & Tires">Wheels & Tires</option>
            <option value="Interior & Electronics">Interior & Electronics</option>
            <option value="Body & Aerodynamics">Body & Aerodynamics</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Part Name & Brand</th>
              <th>Category</th>
              <th>Condition</th>
              <th>Price (PHP)</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Seller</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--admin-text-muted)' }}>
                  Loading parts catalog...
                </td>
              </tr>
            ) : parts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--admin-text-muted)' }}>
                  No parts found matching filters.
                </td>
              </tr>
            ) : (
              parts.map((part) => (
                <tr key={part.id}>
                  <td style={{ fontWeight: 700, color: 'var(--admin-text-muted)', fontSize: 13 }}>
                    #{part.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                      {part.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      {part.brand || 'Garage Certified'} · SKU: GP-{part.id.toString().padStart(4, '0')}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">
                      {part.category?.name || part.category || 'General'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-buyer" style={{ textTransform: 'capitalize' }}>
                      {part.condition || 'New'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--color-rust)' }}>
                    ₱{Number(part.price || 0).toLocaleString()}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: part.stock > 0 ? '#047857' : '#B91C1C' }}>
                      {part.stock ?? 1} in stock
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        part.status === 'published'
                          ? 'badge-success'
                          : part.status === 'sold'
                          ? 'badge-danger'
                          : 'badge-neutral'
                      }`}
                    >
                      {part.status || 'published'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {part.seller?.name || 'Verified Showroom'}
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
