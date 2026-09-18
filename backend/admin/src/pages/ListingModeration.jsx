import { useState } from 'react'
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Car,
  Layers,
  Clock,
  Filter,
  DollarSign,
  Tag,
  User,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react'

const INITIAL_QUEUE = [
  {
    id: 'MOD-7701',
    itemType: 'car',
    title: '1998 Mitsubishi Lancer Evolution V GSR (CP9A)',
    subtitle: 'Forged 4G63 · Tomei M7960 Turbo · HKS Hi-Power',
    seller: { name: 'Manila Classic Restorations', email: 'manila.classic@garagemarket.ph', verified: true },
    submittedDate: '2026-09-17 10:45 AM',
    askingPrice: '$48,500.00',
    category: 'JDM Legend / AWD Turbo',
    status: 'pending',
    statusLabel: 'Awaiting Admin Approval',
    statusVariant: 'warning',
    imagesCount: 16,
    primaryImage: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=600&auto=format&fit=crop',
    specs: [
      { label: 'Engine', value: '2.0L 4G63T DOHC 16V' },
      { label: 'Transmission', value: '5-Speed Manual Close Ratio' },
      { label: 'Mileage', value: '68,200 km' },
      { label: 'Chassis Code', value: 'CP9A-0004912' },
    ],
    moderationFlags: [],
  },
  {
    id: 'MOD-7702',
    itemType: 'part',
    title: 'Garrett G35-1050 Super Core Turbocharger',
    subtitle: 'Dual Ceramic Ball Bearing · 0.83 A/R V-Band · 1050HP Rated',
    seller: { name: 'HKS Powerhouse Tokyo', email: 'hks.tokyo@garagemarket.ph', verified: true },
    submittedDate: '2026-09-17 09:15 AM',
    askingPrice: '$2,850.00',
    category: 'Forced Induction / Turbochargers',
    status: 'pending',
    statusLabel: 'Awaiting Admin Approval',
    statusVariant: 'warning',
    imagesCount: 6,
    primaryImage: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=600&auto=format&fit=crop',
    specs: [
      { label: 'Brand', value: 'Garrett Motion' },
      { label: 'Part Number', value: 'GAR-880694-5002S' },
      { label: 'Compatibility', value: 'Universal 2JZ-GTE / RB26 / VR38' },
      { label: 'Condition', value: 'Brand New In Box (Factory Sealed)' },
    ],
    moderationFlags: [],
  },
  {
    id: 'MOD-7703',
    itemType: 'car',
    title: '2020 Toyota GR Supra A90 3.0 Premium (620WHP)',
    subtitle: 'Pure800 Turbo · CSF Heat Exchanger · EcuTek Custom Map',
    seller: { name: 'Apex Carbon Works', email: 'apex.carbon@garagemarket.ph', verified: false },
    submittedDate: '2026-09-16 04:30 PM',
    askingPrice: '$54,000.00',
    category: 'Modern Sports Coupe',
    status: 'flagged',
    statusLabel: 'Flagged for Pricing & Documentation',
    statusVariant: 'danger',
    imagesCount: 8,
    primaryImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop',
    specs: [
      { label: 'Engine', value: '3.0L B58 Turbo Inline-6' },
      { label: 'Transmission', value: 'ZF 8-Speed Sport Auto' },
      { label: 'Mileage', value: '18,500 km' },
      { label: 'Chassis Code', value: 'DB42-001289' },
    ],
    moderationFlags: [
      'Asking price is 24% below market average for 600+ HP modified build',
      'Seller is unverified without business license',
    ],
  },
  {
    id: 'MOD-7704',
    itemType: 'part',
    title: 'Brembo GT-R 6-Piston Billet Nickel Caliper Kit',
    subtitle: '380x34mm Type-3 2-Piece Floating Rotors · Front Axle',
    seller: { name: 'Brembo Racing North America', email: 'brembo.na@garagemarket.ph', verified: true },
    submittedDate: '2026-09-16 01:10 PM',
    askingPrice: '$7,800.00',
    category: 'Braking Systems / Big Brake Kits',
    status: 'approved',
    statusLabel: 'Approved & Live on Marketplace',
    statusVariant: 'success',
    imagesCount: 10,
    primaryImage: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=600&auto=format&fit=crop',
    specs: [
      { label: 'Brand', value: 'Brembo High Performance' },
      { label: 'Part Number', value: '1N1.9022A' },
      { label: 'Fitment', value: 'Porsche 911 (991/992) / BMW M4 G82' },
      { label: 'Condition', value: 'Factory New' },
    ],
    moderationFlags: [],
  },
]

export default function ListingModeration() {
  const [queue, setQueue] = useState(INITIAL_QUEUE)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectModalOpen, setRejectModalOpen] = useState(false)

  const filteredQueue = queue.filter((item) => {
    const matchesType = typeFilter === 'all' || item.itemType === typeFilter
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesSearch =
      !search.trim() ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.seller.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesStatus && matchesSearch
  })

  const handleApprove = (id) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'approved',
              statusLabel: 'Approved & Live on Marketplace',
              statusVariant: 'success',
            }
          : item
      )
    )
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem((prev) => ({
        ...prev,
        status: 'approved',
        statusLabel: 'Approved & Live on Marketplace',
        statusVariant: 'success',
      }))
    }
  }

  const handleRejectSubmit = () => {
    if (!selectedItem) return
    setQueue((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              status: 'rejected',
              statusLabel: `Rejected: ${rejectReason || 'Technical Spec Incomplete'}`,
              statusVariant: 'danger',
            }
          : item
      )
    )
    setSelectedItem((prev) => ({
      ...prev,
      status: 'rejected',
      statusLabel: `Rejected: ${rejectReason || 'Technical Spec Incomplete'}`,
      statusVariant: 'danger',
    }))
    setRejectModalOpen(false)
    setRejectReason('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Listing Approval & Moderation
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Inspect seller vehicle and parts submissions, verify chassis fitment integrity, evaluate pricing anomalies, and publish to the live catalog.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <span className="badge badge-warning" style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} /> Pending Review: {queue.filter((q) => q.status === 'pending').length}
          </span>
          <span className="badge badge-danger" style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> Flagged: {queue.filter((q) => q.status === 'flagged').length}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Queue Pending Action</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {queue.filter((q) => q.status === 'pending' || q.status === 'flagged').length} Listings
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--color-rust)' }}>
            <Car size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Vehicle Submissions</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {queue.filter((q) => q.itemType === 'car').length} Builds
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Parts & Tuning SKUs</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {queue.filter((q) => q.itemType === 'part').length} Components
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Anomaly Flags</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {queue.filter((q) => q.moderationFlags.length > 0).length} Discrepancies
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {['all', 'car', 'part'].map((tp) => (
              <button
                key={tp}
                onClick={() => setTypeFilter(tp)}
                className="admin-btn"
                style={{
                  fontSize: 12,
                  padding: '6px 14px',
                  background: typeFilter === tp ? '#ffffff' : 'transparent',
                  fontWeight: typeFilter === tp ? 700 : 500,
                  boxShadow: typeFilter === tp ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {tp === 'all' ? 'All Types' : tp === 'car' ? 'Vehicles' : 'Parts'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {['all', 'pending', 'flagged', 'approved'].map((st) => (
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
                {st === 'all' ? 'All Statuses' : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', minWidth: 280, maxWidth: 400, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search by listing title, seller, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
      </div>

      {/* Moderation Queue Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredQueue.length === 0 ? (
          <div className="admin-card" style={{ textAlign: 'center', padding: 48, color: 'var(--admin-text-muted)' }}>
            No listing approval requests found matching the specified filters.
          </div>
        ) : (
          filteredQueue.map((item) => (
            <div
              key={item.id}
              className="admin-card"
              style={{
                display: 'flex',
                gap: 20,
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                borderLeft: item.status === 'flagged' ? '4px solid #ef4444' : item.status === 'pending' ? '4px solid #f59e0b' : '4px solid #10b981',
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, minWidth: 280 }}>
                <img
                  src={item.primaryImage}
                  alt={item.title}
                  style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="badge badge-secondary" style={{ fontSize: 10, textTransform: 'uppercase' }}>
                      {item.itemType === 'car' ? 'Vehicle' : 'Part'}
                    </span>
                    <span className={`badge badge-${item.statusVariant}`} style={{ fontSize: 11 }}>
                      {item.statusLabel}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>{item.id}</span>
                  </div>

                  <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700 }}>{item.title}</h3>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{item.subtitle}</div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 12, marginTop: 6, color: 'var(--admin-text-secondary)' }}>
                    <span>Seller: <strong>{item.seller.name}</strong></span>
                    <span>Submitted: {item.submittedDate}</span>
                    <span>Photos: {item.imagesCount} images</span>
                  </div>

                  {item.moderationFlags.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {item.moderationFlags.map((flag, fIdx) => (
                        <span key={fIdx} className="badge badge-danger" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={11} /> {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Listed Asking Price</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-rust)' }}>{item.askingPrice}</div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="admin-btn admin-btn-secondary"
                    style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Eye size={14} /> Review Spec
                  </button>

                  {item.status !== 'approved' && (
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="admin-btn admin-btn-primary"
                      style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Item Detail Review Modal */}
      {selectedItem && (
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
          <div className="admin-card" style={{ maxWidth: 720, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--admin-border)', paddingBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-secondary" style={{ fontSize: 10, textTransform: 'uppercase' }}>
                    {selectedItem.itemType === 'car' ? 'Vehicle Build' : 'Performance Part'}
                  </span>
                  <span className={`badge badge-${selectedItem.statusVariant}`} style={{ fontSize: 11 }}>
                    {selectedItem.statusLabel}
                  </span>
                </div>
                <h3 style={{ margin: '6px 0 2px 0', fontSize: 18 }}>{selectedItem.title}</h3>
                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{selectedItem.subtitle}</div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="admin-btn admin-btn-secondary"
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 240, border: '1px solid var(--admin-border)' }}>
                <img
                  src={selectedItem.primaryImage}
                  alt={selectedItem.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ImageIcon size={14} /> {selectedItem.imagesCount} High-Res Photos
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Merchant / Seller</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedItem.seller.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{selectedItem.seller.email}</div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Asking Price</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-rust)' }}>{selectedItem.askingPrice}</div>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Category: {selectedItem.category}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: 6 }}>
                  Technical Specifications & Compliance
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {selectedItem.specs.map((sp, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--admin-bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--admin-border)',
                      }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{sp.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{sp.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedItem.moderationFlags.length > 0 && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #f87171', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} /> Algorithmic Quality Warnings
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#991b1b' }}>
                    {selectedItem.moderationFlags.map((fl, idx) => (
                      <li key={idx}>{fl}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                <button
                  onClick={() => setRejectModalOpen(true)}
                  className="admin-btn"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: '1px solid #f87171', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <XCircle size={14} /> Reject with Reason
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="admin-btn admin-btn-secondary"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleApprove(selectedItem.id)}
                    className="admin-btn admin-btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <CheckCircle2 size={14} /> Approve & Publish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 20,
          }}
        >
          <div className="admin-card" style={{ maxWidth: 480, width: '100%' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>Specify Rejection Reason</h3>
            <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', margin: '0 0 14px 0' }}>
              Select or write the reason for rejecting this listing submission. An email will be dispatched to the seller.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Incomplete or blurry photographic evidence',
                'Chassis fitment compatibility data is inaccurate',
                'Vehicle provenance / title documentation missing',
                'Asking price violates fair marketplace threshold',
                'Prohibited item / duplicate listing detected',
              ].map((quickReason) => (
                <button
                  key={quickReason}
                  onClick={() => setRejectReason(quickReason)}
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  style={{ textAlign: 'left', fontSize: 12, padding: '8px 12px' }}
                >
                  {quickReason}
                </button>
              ))}

              <textarea
                className="admin-input"
                rows="3"
                placeholder="Or type custom rejection instructions..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: '100%', marginTop: 6 }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  className="admin-btn admin-btn-primary"
                  style={{ background: '#b91c1c' }}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
