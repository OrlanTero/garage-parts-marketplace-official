import { useState } from 'react'
import {
  Building2,
  Search,
  Car,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Eye,
  Award,
  Calendar,
  FileText,
  Lock,
  Unlock,
} from 'lucide-react'

const INITIAL_DEALERS = [
  {
    id: 'DLR-3001',
    dealershipName: 'Apex Motor Gallery & Showroom',
    businessReg: 'SEC-CS2024-99812',
    taxId: 'TIN-442-198-001',
    leadRepresentative: 'Rafael De Leon',
    email: 'rafael@apexmotorgallery.ph',
    phone: '+63 2 8888 1200',
    showroomAddress: '32nd St. corner 5th Ave, Bonifacio Global City, Taguig',
    tier: 'Platinum Certified Showroom',
    verified: true,
    activeCars: 6,
    soldCarsLifetime: 42,
    totalSalesVolume: '$1,850,000.00',
    status: 'active',
    statusLabel: 'Accredited Dealer',
    statusVariant: 'success',
    joinedDate: '2026-01-10',
    featuredVehicles: [
      { name: '1999 Nissan Skyline GT-R V-Spec (R34)', price: '$220,000', status: 'In Showroom' },
      { name: '1997 Toyota Supra RZ Twin-Turbo', price: '$145,000', status: 'Reserved' },
      { name: '2023 Porsche 911 GT3 (992)', price: '$265,000', status: 'In Showroom' },
    ],
    notes: 'Premier flagship showroom for JDM legends and European sports exotics.',
  },
  {
    id: 'DLR-3002',
    dealershipName: 'Cebu Motorsport Exchange',
    businessReg: 'SEC-CS2025-11204',
    taxId: 'TIN-310-884-000',
    leadRepresentative: 'Enrique Gonzaga',
    email: 'enrique@cebumotorsport.ph',
    phone: '+63 32 411 9000',
    showroomAddress: 'Cebu IT Park, Salinas Drive, Lahug, Cebu City',
    tier: 'Gold Partner Dealership',
    verified: true,
    activeCars: 4,
    soldCarsLifetime: 28,
    totalSalesVolume: '$940,000.00',
    status: 'active',
    statusLabel: 'Accredited Dealer',
    statusVariant: 'success',
    joinedDate: '2026-02-15',
    featuredVehicles: [
      { name: '2022 BMW M3 Competition xDrive (G80)', price: '$115,000', status: 'In Showroom' },
      { name: '2000 Honda S2000 AP1 Mugen', price: '$58,000', status: 'In Showroom' },
    ],
    notes: 'Specializing in track-prepped road cars and certified modern performance.',
  },
  {
    id: 'DLR-3003',
    dealershipName: 'Manila Heritage Restorations & Classics',
    businessReg: 'SEC-CS2025-44910',
    taxId: 'TIN-501-332-002',
    leadRepresentative: 'Alberto Soriano',
    email: 'alberto@manilaheritage.ph',
    phone: '+63 2 8722 4500',
    showroomAddress: 'Don Chino Roces Ave Ext, Makati City',
    tier: 'Gold Partner Dealership',
    verified: true,
    activeCars: 3,
    soldCarsLifetime: 19,
    totalSalesVolume: '$680,000.00',
    status: 'active',
    statusLabel: 'Accredited Dealer',
    statusVariant: 'success',
    joinedDate: '2026-03-01',
    featuredVehicles: [
      { name: '1972 Datsun 240Z Safari Fairlady', price: '$82,000', status: 'In Showroom' },
      { name: '1989 BMW M3 Evolution II (E30)', price: '$128,000', status: 'In Showroom' },
    ],
    notes: 'Period-correct vintage sports cars and complete nut-and-bolt builds.',
  },
  {
    id: 'DLR-3004',
    dealershipName: 'Highline Exotics & Supercars Davao',
    businessReg: 'SEC-CS2026-00418',
    taxId: 'TIN-892-104-000',
    leadRepresentative: 'Carlos Dizon',
    email: 'carlos@highlinedavao.ph',
    phone: '+63 82 299 8811',
    showroomAddress: 'JP Laurel Ave, Bajada, Davao City',
    tier: 'Pending Review Tier',
    verified: false,
    activeCars: 1,
    soldCarsLifetime: 3,
    totalSalesVolume: '$140,000.00',
    status: 'pending_verification',
    statusLabel: 'Documentation Review',
    statusVariant: 'warning',
    joinedDate: '2026-08-20',
    featuredVehicles: [
      { name: '2021 Audi RS6 Avant (C8)', price: '$138,000', status: 'Pending Review' },
    ],
    notes: 'Awaiting updated municipal mayor permit and fire safety certification.',
  },
]

export default function DealersManagement() {
  const [dealers, setDealers] = useState(INITIAL_DEALERS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDealer, setSelectedDealer] = useState(null)

  const filteredDealers = dealers.filter((d) => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter
    const matchesSearch =
      !search.trim() ||
      d.dealershipName.toLowerCase().includes(search.toLowerCase()) ||
      d.leadRepresentative.toLowerCase().includes(search.toLowerCase()) ||
      d.showroomAddress.toLowerCase().includes(search.toLowerCase()) ||
      d.businessReg.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const toggleDealerStatus = (id) => {
    setDealers((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d
        const isActive = d.status === 'active'
        return {
          ...d,
          status: isActive ? 'suspended' : 'active',
          statusLabel: isActive ? 'Suspended Dealership' : 'Accredited Dealer',
          statusVariant: isActive ? 'danger' : 'success',
        }
      })
    )
    if (selectedDealer && selectedDealer.id === id) {
      setSelectedDealer((prev) => ({
        ...prev,
        status: prev.status === 'active' ? 'suspended' : 'active',
        statusLabel: prev.status === 'active' ? 'Suspended Dealership' : 'Accredited Dealer',
        statusVariant: prev.status === 'active' ? 'danger' : 'success',
      }))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Dealer Management
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Oversee accredited automotive dealerships, verify commercial business licenses, inspect physical showroom inventory, and assign tier partnerships.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={14} /> Total Dealerships: {dealers.length}
          </span>
          <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: 13 }}>
            Accredited: {dealers.filter((d) => d.status === 'active').length}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--color-rust)' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Dealerships</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {dealers.filter((d) => d.status === 'active').length} Showrooms
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <Car size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Showroom Inventory</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>14 Vehicles</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <Award size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total Dealer Volume</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$3,610,000.00</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Platinum Partners</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>1 Showroom</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)' }}>
          {['all', 'active', 'pending_verification', 'suspended'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="admin-btn"
              style={{
                fontSize: 12,
                padding: '6px 14px',
                background: statusFilter === st ? '#ffffff' : 'transparent',
                fontWeight: statusFilter === st ? 700 : 500,
                boxShadow: statusFilter === st ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {st === 'all'
                ? 'All Dealerships'
                : st === 'pending_verification'
                ? 'Under Review'
                : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: 280, maxWidth: 400, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search by dealership, SEC registration, or lead contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
      </div>

      {/* Dealers Data Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Dealership & Accreditation</th>
                <th>Showroom Location</th>
                <th>Lead Contact</th>
                <th>Active Vehicles</th>
                <th>Sales Volume</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDealers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--admin-text-muted)' }}>
                    No dealerships found matching the specified filters.
                  </td>
                </tr>
              ) : (
                filteredDealers.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{d.dealershipName}</div>
                        {d.verified && <ShieldCheck size={14} style={{ color: 'var(--color-rust)' }} title="Accredited Partner" />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                        {d.id} · {d.businessReg}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} style={{ color: 'var(--admin-text-muted)' }} /> {d.showroomAddress}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.leadRepresentative}</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{d.email}</div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{d.activeCars} In Showroom</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{d.soldCarsLifetime} Lifetime Delivered</div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-rust)' }}>{d.totalSalesVolume}</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{d.tier}</div>
                    </td>

                    <td>
                      <span className={`badge badge-${d.statusVariant}`} style={{ fontSize: 11 }}>
                        {d.statusLabel}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => setSelectedDealer(d)}
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="View Showroom"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() => toggleDealerStatus(d.id)}
                          className={`admin-btn ${d.status === 'active' ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
                          style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title={d.status === 'active' ? 'Suspend Dealership' : 'Reactivate Dealership'}
                        >
                          {d.status === 'active' ? <Lock size={13} /> : <Unlock size={13} />}
                          {d.status === 'active' ? 'Suspend' : 'Accredit'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dealer Detail Drawer / Modal */}
      {selectedDealer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div className="admin-card" style={{ maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--admin-border)', paddingBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{selectedDealer.dealershipName}</h3>
                  <span className={`badge badge-${selectedDealer.statusVariant}`} style={{ fontSize: 11 }}>
                    {selectedDealer.statusLabel}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                  Dealer ID: {selectedDealer.id} · {selectedDealer.tier}
                </div>
              </div>
              <button
                onClick={() => setSelectedDealer(null)}
                className="admin-btn admin-btn-secondary"
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Commercial Registration</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedDealer.businessReg}</div>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{selectedDealer.taxId}</div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Sales Director & Contact</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedDealer.leadRepresentative}</div>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{selectedDealer.phone}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Physical Showroom Address
                </label>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                  <MapPin size={14} style={{ display: 'inline', marginRight: 6, color: 'var(--color-rust)' }} />
                  {selectedDealer.showroomAddress}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: 6 }}>
                  Current Showroom Vehicles Inventory ({selectedDealer.featuredVehicles.length} Listed)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedDealer.featuredVehicles.map((v, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--admin-bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--admin-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Car size={16} style={{ color: 'var(--color-rust)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-rust)' }}>{v.price}</span>
                        <span className="badge badge-info" style={{ fontSize: 11 }}>{v.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Accreditation & Compliance Notes
                </label>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                  {selectedDealer.notes}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                <button
                  onClick={() => toggleDealerStatus(selectedDealer.id)}
                  className={`admin-btn ${selectedDealer.status === 'active' ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {selectedDealer.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                  {selectedDealer.status === 'active' ? 'Suspend Dealership' : 'Accredit Dealership'}
                </button>
                <button
                  onClick={() => setSelectedDealer(null)}
                  className="admin-btn admin-btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
