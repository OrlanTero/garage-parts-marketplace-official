import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Car,
  Layers,
  Users,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { carsApi } from '../api/cars.js'
import { partsApi } from '../api/parts.js'
import { healthApi } from '../api/health.js'
import { adminApi } from '../api/admin.js'

export default function Dashboard() {
  const [carsData, setCarsData] = useState({ list: [], total: 0, loading: true })
  const [partsData, setPartsData] = useState({ list: [], total: 0, loading: true })
  const [usersCount, setUsersCount] = useState(0)
  const [systemHealth, setSystemHealth] = useState({ status: 'checking', details: null })

  const loadData = async () => {
    try {
      const [carsRes, partsRes, usersRes, healthRes] = await Promise.allSettled([
        carsApi.list({ per_page: 5 }),
        partsApi.list({ per_page: 5 }),
        adminApi.getUsers({ per_page: 1 }),
        healthApi.check(),
      ])

      if (carsRes.status === 'fulfilled') {
        const data = carsRes.value
        setCarsData({
          list: data.data || [],
          total: data.meta?.total || data.data?.length || 0,
          loading: false,
        })
      } else {
        setCarsData((prev) => ({ ...prev, loading: false }))
      }

      if (partsRes.status === 'fulfilled') {
        const data = partsRes.value
        setPartsData({
          list: data.data || [],
          total: data.meta?.total || data.data?.length || 0,
          loading: false,
        })
      } else {
        setPartsData((prev) => ({ ...prev, loading: false }))
      }

      if (usersRes.status === 'fulfilled') {
        setUsersCount(usersRes.value.meta?.total || usersRes.value.data?.length || 0)
      }

      if (healthRes.status === 'fulfilled') {
        setSystemHealth({
          status: healthRes.value.status === 'ok' ? 'online' : 'degraded',
          details: healthRes.value,
        })
      } else {
        setSystemHealth({ status: 'offline', details: null })
      }
    } catch {
      // Handled
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div>
      {/* Page Header Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--admin-text-primary)',
              margin: '0 0 4px 0',
            }}
          >
            Operations & Control Overview
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Real-time management stream for verified car builds, parts marketplace, user roles, and platform health.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} />
            <span>Refresh Stream</span>
          </button>
          <Link to="/cars" className="btn btn-primary btn-sm">
            <span>Manage Showroom</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        {/* Metric 1: Cars */}
        <div className="admin-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Car Builds Catalog
            </span>
            <div
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'var(--color-orange-light)',
                color: 'var(--color-rust)',
              }}
            >
              <Car size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--admin-text-primary)', lineHeight: 1 }}>
            {carsData.loading ? '...' : carsData.total}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-success" style={{ padding: '2px 8px', fontSize: 11 }}>
              <CheckCircle2 size={12} /> Live Showroom
            </span>
            <span>JDM, Overland, Classics</span>
          </div>
        </div>

        {/* Metric 2: Parts */}
        <div className="admin-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Parts & Accessories
            </span>
            <div
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'var(--color-steel-light)',
                color: 'var(--color-steel)',
              }}
            >
              <Layers size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--admin-text-primary)', lineHeight: 1 }}>
            {partsData.loading ? '...' : partsData.total}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-buyer" style={{ padding: '2px 8px', fontSize: 11 }}>
              Verified Inventory
            </span>
            <span>OEM & Performance</span>
          </div>
        </div>

        {/* Metric 3: User Accounts */}
        <div className="admin-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Registered Network
            </span>
            <div
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: '#F3E8FF',
                color: '#7E22CE',
              }}
            >
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--admin-text-primary)', lineHeight: 1 }}>
            {usersCount || '...'}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-seller" style={{ padding: '2px 8px', fontSize: 11 }}>
              Verified Accounts
            </span>
            <span>Buyers, Staff & Admins</span>
          </div>
        </div>

        {/* Metric 4: System Health */}
        <div className="admin-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cluster Health
            </span>
            <div
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: systemHealth.status === 'online' ? 'var(--admin-success-bg)' : '#FEF2F2',
                color: systemHealth.status === 'online' ? '#047857' : '#EF4444',
              }}
            >
              <Activity size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--admin-text-primary)', lineHeight: 1.4 }}>
            {systemHealth.status === 'online' ? '100% OPERATIONAL' : 'DEGRADED / CHECKING'}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-success" style={{ padding: '2px 8px', fontSize: 11 }}>
              Redis + Reverb Active
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Recent Car Builds & Recent Parts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Recent Cars */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Car size={20} style={{ color: 'var(--color-rust)' }} />
              <h2 className="admin-card-title">Latest Car Builds in Showroom</h2>
            </div>
            <Link to="/cars" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-rust)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>View All</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Vehicle Build</th>
                  <th>Year</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {carsData.list.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: 24 }}>
                      {carsData.loading ? 'Loading showroom builds...' : 'No car builds found.'}
                    </td>
                  </tr>
                ) : (
                  carsData.list.map((car) => (
                    <tr key={car.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                          {car.make} {car.model}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                          {car.transmission} · {car.fuel_type || 'Gasoline'}
                        </div>
                      </td>
                      <td>{car.year}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-rust)' }}>
                        ₱{Number(car.price || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${car.status === 'published' ? 'badge-success' : car.status === 'sold' ? 'badge-danger' : 'badge-neutral'}`}>
                          {car.status || 'published'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Parts */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Layers size={20} style={{ color: 'var(--color-steel)' }} />
              <h2 className="admin-card-title">Latest Verified Parts</h2>
            </div>
            <Link to="/parts" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-rust)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>View All</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Part Item</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody>
                {partsData.list.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: 24 }}>
                      {partsData.loading ? 'Loading catalog parts...' : 'No parts found.'}
                    </td>
                  </tr>
                ) : (
                  partsData.list.map((part) => (
                    <tr key={part.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                          {part.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                          {part.brand || 'Garage Certified'}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                          {part.category?.name || part.category || 'General'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-rust)' }}>
                        ₱{Number(part.price || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-buyer" style={{ textTransform: 'capitalize' }}>
                          {part.condition || 'New'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
