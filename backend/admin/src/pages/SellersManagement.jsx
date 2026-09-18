import { useState } from 'react'
import {
  Store,
  Search,
  DollarSign,
  Package,
  Star,
  MapPin,
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  Unlock,
  ShieldCheck,
  Percent,
  ExternalLink,
} from 'lucide-react'

const INITIAL_SELLERS = [
  {
    id: 'SEL-2001',
    storeName: 'HKS Powerhouse Tokyo',
    ownerName: 'Kenichi Takahashi',
    email: 'hks.tokyo@garagemarket.ph',
    phone: '+81 3 5555 0192',
    location: 'Tokyo, Japan',
    tier: 'Platinum Specialist',
    verified: true,
    rating: 4.96,
    reviewsCount: 142,
    activeParts: 38,
    activeCars: 2,
    lifetimeGmv: '$184,200.00',
    commissionRate: 5.0,
    status: 'active',
    statusLabel: 'Active Merchant',
    statusVariant: 'success',
    joinedDate: '2026-01-20',
    payoutMethod: 'Direct Wire / Stripe Connect',
    bankMask: 'JP-***-9921',
    notes: 'Primary Japanese authorized distributor for forged turbo systems.',
  },
  {
    id: 'SEL-2002',
    storeName: 'Brembo Racing North America',
    ownerName: 'Marcus Vance',
    email: 'brembo.na@garagemarket.ph',
    phone: '+1 (512) 555-0144',
    location: 'Austin, TX, USA',
    tier: 'Gold Partner',
    verified: true,
    rating: 4.92,
    reviewsCount: 98,
    activeParts: 24,
    activeCars: 0,
    lifetimeGmv: '$96,500.00',
    commissionRate: 5.0,
    status: 'active',
    statusLabel: 'Active Merchant',
    statusVariant: 'success',
    joinedDate: '2026-02-14',
    payoutMethod: 'Automated ACH / Stripe',
    bankMask: 'US-***-4481',
    notes: 'Specialist in carbon ceramic calipers and GT-R big brake upgrades.',
  },
  {
    id: 'SEL-2003',
    storeName: 'KW Automotive GmbH Direct',
    ownerName: 'Sebastian Becker',
    email: 'kw.direct@garagemarket.ph',
    phone: '+49 89 5555 889',
    location: 'Munich, Germany',
    tier: 'Gold Partner',
    verified: true,
    rating: 4.88,
    reviewsCount: 76,
    activeParts: 19,
    activeCars: 1,
    lifetimeGmv: '$72,800.00',
    commissionRate: 5.0,
    status: 'active',
    statusLabel: 'Active Merchant',
    statusVariant: 'success',
    joinedDate: '2026-02-28',
    payoutMethod: 'SEPA Direct Wire',
    bankMask: 'DE-***-1192',
    notes: 'Manufacturer partner for Variant 3/ClubSport suspension assemblies.',
  },
  {
    id: 'SEL-2004',
    storeName: 'Tomei Motorsport UK',
    ownerName: 'Liam Davies',
    email: 'tomei.uk@garagemarket.ph',
    phone: '+44 20 7946 0912',
    location: 'Northampton, UK',
    tier: 'Silver Specialist',
    verified: true,
    rating: 4.75,
    reviewsCount: 34,
    activeParts: 12,
    activeCars: 0,
    lifetimeGmv: '$34,100.00',
    commissionRate: 5.0,
    status: 'active',
    statusLabel: 'Active Merchant',
    statusVariant: 'success',
    joinedDate: '2026-03-10',
    payoutMethod: 'BACS Automated Direct',
    bankMask: 'GB-***-7730',
    notes: 'Titanium exhaust components and camshaft packages for RB/SR engines.',
  },
  {
    id: 'SEL-2005',
    storeName: 'Apex Carbon Works',
    ownerName: 'Rodrigo Perez',
    email: 'apex.carbon@garagemarket.ph',
    phone: '+1 (415) 555-8733',
    location: 'San Jose, CA, USA',
    tier: 'Standard Seller',
    verified: false,
    rating: 4.10,
    reviewsCount: 8,
    activeParts: 5,
    activeCars: 0,
    lifetimeGmv: '$9,200.00',
    commissionRate: 6.5,
    status: 'review',
    statusLabel: 'Under Quality Review',
    statusVariant: 'warning',
    joinedDate: '2026-05-19',
    payoutMethod: 'Stripe Express',
    bankMask: 'US-***-8821',
    notes: 'Fitment discrepancy report filed under dispute ORD-8938.',
  },
]

export default function SellersManagement() {
  const [sellers, setSellers] = useState(INITIAL_SELLERS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedSeller, setSelectedSeller] = useState(null)

  const filteredSellers = sellers.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    const matchesSearch =
      !search.trim() ||
      s.storeName.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const toggleSellerStatus = (id) => {
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const isActive = s.status === 'active'
        return {
          ...s,
          status: isActive ? 'suspended' : 'active',
          statusLabel: isActive ? 'Suspended Store' : 'Active Merchant',
          statusVariant: isActive ? 'danger' : 'success',
        }
      })
    )
    if (selectedSeller && selectedSeller.id === id) {
      setSelectedSeller((prev) => ({
        ...prev,
        status: prev.status === 'active' ? 'suspended' : 'active',
        statusLabel: prev.status === 'active' ? 'Suspended Store' : 'Active Merchant',
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
            Seller Management
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Audit marketplace merchant stores, manage custom commission rates, monitor seller ratings, and govern payout ledgers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Store size={14} /> Total Sellers: {sellers.length}
          </span>
          <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: 13 }}>
            Active: {sellers.filter((s) => s.status === 'active').length}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--color-rust)' }}>
            <Store size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Merchant Stores</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {sellers.filter((s) => s.status === 'active').length} Stores
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total Seller GMV</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$396,800.00</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Listed Products</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>98 Live SKUs</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#a16207' }}>
            <Star size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Average Merchant Rating</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>4.92 / 5.0</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)' }}>
          {['all', 'active', 'review', 'suspended'].map((st) => (
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
              {st === 'all' ? 'All Sellers' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: 280, maxWidth: 400, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search by store name, owner, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
      </div>

      {/* Sellers Data Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Merchant Store</th>
                <th>Owner & Location</th>
                <th>Catalog Volume</th>
                <th>Lifetime GMV</th>
                <th>Rating & Tier</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--admin-text-muted)' }}>
                    No sellers found matching the specified filters.
                  </td>
                </tr>
              ) : (
                filteredSellers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.storeName}</div>
                        {s.verified && <ShieldCheck size={14} style={{ color: 'var(--color-rust)' }} title="Verified Merchant" />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>{s.id}</div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.ownerName}</div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MapPin size={12} /> {s.location}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{s.activeParts} Parts</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{s.activeCars} Vehicle Listings</div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-rust)' }}>{s.lifetimeGmv}</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{s.commissionRate}% Commission Rate</div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}>
                        <Star size={13} style={{ fill: '#eab308', color: '#eab308' }} /> {s.rating}
                        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 400 }}>({s.reviewsCount})</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>{s.tier}</div>
                    </td>

                    <td>
                      <span className={`badge badge-${s.statusVariant}`} style={{ fontSize: 11 }}>
                        {s.statusLabel}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => setSelectedSeller(s)}
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="View Details"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() => toggleSellerStatus(s.id)}
                          className={`admin-btn ${s.status === 'active' ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
                          style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title={s.status === 'active' ? 'Suspend Store' : 'Reactivate Store'}
                        >
                          {s.status === 'active' ? <Lock size={13} /> : <Unlock size={13} />}
                          {s.status === 'active' ? 'Suspend' : 'Activate'}
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

      {/* Seller Detail Drawer / Modal */}
      {selectedSeller && (
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
          <div className="admin-card" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--admin-border)', paddingBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{selectedSeller.storeName}</h3>
                  <span className={`badge badge-${selectedSeller.statusVariant}`} style={{ fontSize: 11 }}>
                    {selectedSeller.statusLabel}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                  Seller ID: {selectedSeller.id} · Member Since {selectedSeller.joinedDate}
                </div>
              </div>
              <button
                onClick={() => setSelectedSeller(null)}
                className="admin-btn admin-btn-secondary"
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Store Owner</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedSeller.ownerName}</div>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{selectedSeller.email}</div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Location & Contact</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedSeller.location}</div>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{selectedSeller.phone}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ border: '1px solid var(--admin-border)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Lifetime Sales</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-rust)' }}>{selectedSeller.lifetimeGmv}</div>
                </div>
                <div style={{ border: '1px solid var(--admin-border)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Active Catalog</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedSeller.activeParts} SKUs</div>
                </div>
                <div style={{ border: '1px solid var(--admin-border)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Commission Cut</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedSeller.commissionRate}% Take</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Banking & Disbursement Configuration
                </label>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Disbursement Method: <strong>{selectedSeller.payoutMethod}</strong></span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--admin-text-muted)' }}>{selectedSeller.bankMask}</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Admin Notes & Specialty
                </label>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                  {selectedSeller.notes}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                <button
                  onClick={() => toggleSellerStatus(selectedSeller.id)}
                  className={`admin-btn ${selectedSeller.status === 'active' ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {selectedSeller.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                  {selectedSeller.status === 'active' ? 'Suspend Merchant Store' : 'Reactivate Merchant Store'}
                </button>
                <button
                  onClick={() => setSelectedSeller(null)}
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
