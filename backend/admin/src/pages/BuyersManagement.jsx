import { useState } from 'react'
import {
  Users,
  Search,
  ShoppingBag,
  DollarSign,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Lock,
  Unlock,
  Filter,
} from 'lucide-react'

const INITIAL_BUYERS = [
  {
    id: 'BUY-1001',
    name: 'Anton Valenzuela',
    email: 'anton.valenzuela@garagemarket.ph',
    phone: '+63 917 555 0123',
    location: 'Quezon City, Metro Manila',
    joinedDate: '2026-04-01',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=300&auto=format&fit=crop',
    status: 'active',
    statusLabel: 'Active Account',
    statusVariant: 'success',
    totalOrders: 6,
    totalSpent: '$18,450.00',
    lastActive: '12 mins ago',
    savedVehicles: 3,
    savedParts: 14,
    shippingAddress: 'Unit 12B, Sky Tower 1, Eastwood City, Bagumbayan, QC, 1110',
    recentOrder: { id: 'ORD-8941', date: '2026-09-17', amount: '$3,850.00', status: 'Processing' },
    notes: 'Frequent buyer of JDM performance coilovers and aero kits.',
  },
  {
    id: 'BUY-1002',
    name: 'Mark Ranillo',
    email: 'mark.ranillo@garagemarket.ph',
    phone: '+63 918 555 0456',
    location: 'Bonifacio Global City, Taguig',
    joinedDate: '2026-04-10',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=300&auto=format&fit=crop',
    status: 'active',
    statusLabel: 'Active Account',
    statusVariant: 'success',
    totalOrders: 4,
    totalSpent: '$12,800.00',
    lastActive: '2 hours ago',
    savedVehicles: 1,
    savedParts: 8,
    shippingAddress: 'Tower 3, High Street South Block, 26th St, BGC, Taguig, 1634',
    recentOrder: { id: 'ORD-8940', date: '2026-09-16', amount: '$4,600.00', status: 'Delivered' },
    notes: 'Trackday enthusiast, ordered Brembo GT-R big brake kit.',
  },
  {
    id: 'BUY-1003',
    name: 'Carlo Mendoza',
    email: 'carlo.mendoza@garagemarket.ph',
    phone: '+63 920 555 0789',
    location: 'Cebu City, Cebu',
    joinedDate: '2026-04-12',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=300&auto=format&fit=crop',
    status: 'active',
    statusLabel: 'Active Account',
    statusVariant: 'success',
    totalOrders: 2,
    totalSpent: '$4,920.00',
    lastActive: '1 day ago',
    savedVehicles: 4,
    savedParts: 5,
    shippingAddress: 'Lot 4 Block 2, Maria Luisa Estate Park, Banilad, Cebu City, 6000',
    recentOrder: { id: 'ORD-8939', date: '2026-09-15', amount: '$2,440.00', status: 'Shipped' },
    notes: 'Restoring a Nissan Silvia S15 Spec-R build.',
  },
  {
    id: 'BUY-1004',
    name: 'Kenji Takahashi',
    email: 'kenji@tokyogarage.jp',
    phone: '+81 90 5555 8812',
    location: 'Yokohama, Japan',
    joinedDate: '2026-05-02',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
    status: 'active',
    statusLabel: 'Active Account',
    statusVariant: 'success',
    totalOrders: 5,
    totalSpent: '$24,100.00',
    lastActive: '3 hours ago',
    savedVehicles: 2,
    savedParts: 22,
    shippingAddress: 'Naka Ward, Honcho 2-15, Yokohama, Kanagawa, 231-0005',
    recentOrder: { id: 'ORD-8935', date: '2026-09-10', amount: '$6,200.00', status: 'Delivered' },
    notes: 'International buyer, frequent purchaser of forged engine components.',
  },
  {
    id: 'BUY-1005',
    name: 'David Sterling',
    email: 'd.sterling@flaggedmail.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA, USA',
    joinedDate: '2026-06-18',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
    status: 'suspended',
    statusLabel: 'Suspended (Chargeback Risk)',
    statusVariant: 'danger',
    totalOrders: 1,
    totalSpent: '$1,280.00',
    lastActive: '3 days ago',
    savedVehicles: 0,
    savedParts: 2,
    shippingAddress: '1048 Folsom St, San Francisco, CA 94103',
    recentOrder: { id: 'ORD-8938', date: '2026-09-14', amount: '$1,280.00', status: 'Disputed' },
    notes: 'Account under administrative hold pending dispute resolution ORD-8938.',
  },
]

export default function BuyersManagement() {
  const [buyers, setBuyers] = useState(INITIAL_BUYERS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBuyer, setSelectedBuyer] = useState(null)

  const filteredBuyers = buyers.filter((b) => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter
    const matchesSearch =
      !search.trim() ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const toggleAccountStatus = (id) => {
    setBuyers((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        const isSuspended = b.status === 'suspended'
        return {
          ...b,
          status: isSuspended ? 'active' : 'suspended',
          statusLabel: isSuspended ? 'Active Account' : 'Suspended (Manual Review)',
          statusVariant: isSuspended ? 'success' : 'danger',
        }
      })
    )
    if (selectedBuyer && selectedBuyer.id === id) {
      setSelectedBuyer((prev) => ({
        ...prev,
        status: prev.status === 'suspended' ? 'active' : 'suspended',
        statusLabel: prev.status === 'suspended' ? 'Active Account' : 'Suspended (Manual Review)',
        statusVariant: prev.status === 'suspended' ? 'success' : 'danger',
      }))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Buyer Management
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Manage registered marketplace buyers, monitor order histories, inspect saved garage garages, and govern account permissions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} /> Total Buyers: {buyers.length}
          </span>
          <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: 13 }}>
            Active: {buyers.filter((b) => b.status === 'active').length}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--color-rust)' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Buyers</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {buyers.filter((b) => b.status === 'active').length} Accounts
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total GMV Generated</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$61,470.00</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Completed Purchases</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>18 Orders</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Restricted Accounts</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {buyers.filter((b) => b.status === 'suspended').length} Flagged
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)' }}>
          {['all', 'active', 'suspended'].map((st) => (
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
              {st === 'all' ? 'All Buyers' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: 280, maxWidth: 400, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search by buyer name, email, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
      </div>

      {/* Buyers Data Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Buyer Profile</th>
                <th>Contact & Location</th>
                <th>Order Metrics</th>
                <th>Status</th>
                <th>Recent Activity</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBuyers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--admin-text-muted)' }}>
                    No buyers found matching the specified filters.
                  </td>
                </tr>
              ) : (
                filteredBuyers.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={b.avatar}
                          alt={b.name}
                          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--admin-border)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>{b.id}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{b.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MapPin size={12} /> {b.location}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-rust)' }}>{b.totalSpent}</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                        {b.totalOrders} Completed Orders ({b.savedParts} wishlist)
                      </div>
                    </td>

                    <td>
                      <span className={`badge badge-${b.statusVariant}`} style={{ fontSize: 11 }}>
                        {b.statusLabel}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{b.lastActive}</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Joined {b.joinedDate}</div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => setSelectedBuyer(b)}
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="View Details"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() => toggleAccountStatus(b.id)}
                          className={`admin-btn ${b.status === 'active' ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
                          style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title={b.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                        >
                          {b.status === 'active' ? <Lock size={13} /> : <Unlock size={13} />}
                          {b.status === 'active' ? 'Suspend' : 'Activate'}
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

      {/* Buyer Detail Drawer / Modal */}
      {selectedBuyer && (
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
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <img
                  src={selectedBuyer.avatar}
                  alt={selectedBuyer.name}
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 18 }}>{selectedBuyer.name}</h3>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>ID: {selectedBuyer.id} · Joined {selectedBuyer.joinedDate}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedBuyer(null)}
                className="admin-btn admin-btn-secondary"
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Email Address</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedBuyer.email}</div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Contact Phone</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedBuyer.phone}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Default Shipping Address
                </label>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                  <MapPin size={14} style={{ display: 'inline', marginRight: 6, color: 'var(--color-rust)' }} />
                  {selectedBuyer.shippingAddress}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ border: '1px solid var(--admin-border)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Total Spend</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-rust)' }}>{selectedBuyer.totalSpent}</div>
                </div>
                <div style={{ border: '1px solid var(--admin-border)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Orders Placed</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedBuyer.totalOrders} Orders</div>
                </div>
                <div style={{ border: '1px solid var(--admin-border)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Saved Wishlist</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedBuyer.savedParts} Items</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Internal Operator Notes
                </label>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                  {selectedBuyer.notes}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                <button
                  onClick={() => toggleAccountStatus(selectedBuyer.id)}
                  className={`admin-btn ${selectedBuyer.status === 'active' ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {selectedBuyer.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                  {selectedBuyer.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                </button>
                <button
                  onClick={() => setSelectedBuyer(null)}
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
