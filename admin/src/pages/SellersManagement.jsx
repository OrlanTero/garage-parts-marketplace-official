import { useEffect, useState } from 'react'
import {
  Store,
  Search,
  DollarSign,
  Package,
  Car,
  Star,
  MapPin,
  CheckCircle2,
  Clock,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Percent,
  ExternalLink,
  RefreshCw,
  X,
  FileText,
  UserCheck,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

export default function SellersManagement() {
  const [sellers, setSellers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // all | verified | pending_kyc | active
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [kycModalOpen, setKycModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  const fetchSellers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers({
        role: 'seller',
        q: search.trim() || undefined,
      })
      setSellers(res.data || [])
      setStats(res.stats || null)
    } catch {
      setSellers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSellers()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchSellers()
  }

  const handleOpenReview = (seller) => {
    setSelectedSeller(seller)
    setRejectionReason('')
    setActionError(null)
    setKycModalOpen(true)
  }

  const handleOpenDetails = (seller) => {
    setSelectedSeller(seller)
    setViewDrawerOpen(true)
  }

  const handleApproveKyc = async () => {
    if (!selectedSeller) return
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.approveKyc(selectedSeller.id)
      setActionSuccess(`KYC approved for @${selectedSeller.username || selectedSeller.name}. Verified Seller Badge granted.`)
      setKycModalOpen(false)
      fetchSellers()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to approve KYC verification.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectKyc = async () => {
    if (!selectedSeller) return
    if (!rejectionReason.trim()) {
      setActionError('Please provide a specific compliance rejection reason for the seller.')
      return
    }
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.rejectKyc(selectedSeller.id, rejectionReason.trim())
      setActionSuccess(`KYC rejected for @${selectedSeller.username || selectedSeller.name}.`)
      setKycModalOpen(false)
      fetchSellers()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to reject KYC verification.')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredSellers = sellers.filter((seller) => {
    if (activeFilter === 'verified') return seller.is_kyc_verified
    if (activeFilter === 'pending_kyc') return seller.kyc_status === 'pending'
    if (activeFilter === 'active') return (seller.active_cars_count || 0) > 0
    return true
  })

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(234, 88, 12, 0.1)', color: 'var(--color-rust)' }}>
              <Store size={20} />
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              Seller & Builder Management
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Review custom vehicle builders, evaluate government KYC credentials, grant Verified Badges, and monitor build inventory.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchSellers} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh Sellers</span>
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
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Total Registered Sellers</span>
            <Store size={18} style={{ color: 'var(--color-rust)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats?.total_count ?? sellers.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Custom car builders & tuners
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>KYC Verified Sellers</span>
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
            {sellers.filter((s) => s.is_kyc_verified).length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Official Trust Badge active
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Pending KYC Submissions</span>
            <Clock size={18} style={{ color: 'var(--color-orange)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-orange)' }}>
            {sellers.filter((s) => s.kyc_status === 'pending').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Awaiting ID review
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-info)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Inventory Valuation</span>
            <DollarSign size={18} style={{ color: 'var(--admin-info)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-info)' }}>
            ₱{(stats?.total_valuation ?? sellers.reduce((acc, s) => acc + (s.cars_valuation || 0), 0)).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Active vehicle build GMV
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px', minWidth: 0, maxWidth: 420 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              type="text"
              placeholder="Search by username, real name, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input"
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({sellers.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'verified' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('verified')}
          >
            Verified ({sellers.filter((s) => s.is_kyc_verified).length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'pending_kyc' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('pending_kyc')}
          >
            Pending KYC ({sellers.filter((s) => s.kyc_status === 'pending').length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('active')}
          >
            With Active Builds
          </button>
        </div>
      </div>

      {/* Sellers Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Seller & Identity</th>
                <th>KYC Verification & Trust Badge</th>
                <th>Build Inventory</th>
                <th>Portfolio Valuation</th>
                <th>Rating</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-muted)' }}>
                    Loading registered sellers & KYC statuses...
                  </td>
                </tr>
              ) : filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-muted)' }}>
                    No sellers found matching the current search criteria.
                  </td>
                </tr>
              ) : (
                filteredSellers.map((seller) => {
                  const isVerified = seller.is_kyc_verified && seller.kyc_status === 'approved'
                  const isPending = seller.kyc_status === 'pending'
                  const isRejected = seller.kyc_status === 'rejected'

                  return (
                    <tr key={seller.id}>
                      {/* Identity */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: 'var(--admin-bg-hover)',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              color: 'var(--color-rust)',
                              fontSize: 14,
                            }}
                          >
                            {seller.avatar_url ? (
                              <img src={seller.avatar_url} alt={seller.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              seller.name?.charAt(0).toUpperCase() || 'S'
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{seller.name}</span>
                              <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 500 }}>
                                (@{seller.username || 'seller'})
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                              {seller.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* KYC Verification */}
                      <td>
                        {isVerified ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: 12, fontWeight: 700 }}>
                            <ShieldCheck size={14} />
                            <span>Verified Badge Active</span>
                          </div>
                        ) : isPending ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', fontSize: 12, fontWeight: 700 }}>
                            <Clock size={14} />
                            <span>Pending Review</span>
                          </div>
                        ) : isRejected ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: 12, fontWeight: 700 }}>
                            <ShieldAlert size={14} />
                            <span>Rejected</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Not Submitted</span>
                        )}
                      </td>

                      {/* Inventory */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                          {seller.cars_count || 0} Builds
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                          {seller.active_cars_count || 0} active · {seller.pending_cars_count || 0} under inspection
                        </div>
                      </td>

                      {/* Valuation */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-rust)' }}>
                          ₱{(seller.cars_valuation || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          Total listed value
                        </div>
                      </td>

                      {/* Rating */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                          <Star size={14} style={{ fill: 'var(--color-gold)', color: 'var(--color-gold)' }} />
                          <span>{(seller.average_rating || 5.0).toFixed(1)}</span>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        {seller.created_at ? new Date(seller.created_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenReview(seller)}
                            className="btn btn-sm btn-primary"
                            title="Review KYC credentials and manage Verified badge"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <ShieldCheck size={14} />
                            <span>Review KYC</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(seller)}
                            className="btn btn-sm btn-secondary"
                            title="View full seller portfolio"
                          >
                            <Eye size={14} />
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

      {/* KYC Review & Badge Approval Modal */}
      {kycModalOpen && selectedSeller && (
        <div className="auth-modal-overlay" onClick={() => setKycModalOpen(false)}>
          <div
            className="auth-modal-container"
            style={{ maxWidth: 580, padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #18191c 0%, #22242a 100%)',
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={22} style={{ color: selectedSeller.is_kyc_verified ? '#10b981' : '#ea580c' }} />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    KYC Verification Review: @{selectedSeller.username || selectedSeller.name}
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    Full Name: {selectedSeller.name} · {selectedSeller.email}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKycModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
              {actionError && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
                  {actionError}
                </div>
              )}

              {/* Status Pill */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>Current Status:</span>
                  {selectedSeller.is_kyc_verified ? (
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700, fontSize: 12 }}>
                      ✓ Verified Seller Badge Active
                    </span>
                  ) : selectedSeller.kyc_status === 'pending' ? (
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', fontWeight: 700, fontSize: 12 }}>
                      Pending Compliance Review
                    </span>
                  ) : (
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)', color: 'var(--admin-text-muted)', fontSize: 12 }}>
                      {selectedSeller.kyc_status?.replace('_', ' ').toUpperCase() || 'NOT SUBMITTED'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Document Type</span>
                    <strong style={{ color: '#fff', textTransform: 'capitalize' }}>
                      {selectedSeller.kyc_document_type?.replace('_', ' ') || 'Government ID / Permit'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>ID Number</span>
                    <strong style={{ color: '#fff' }}>
                      {selectedSeller.kyc_document_number || '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Submission Date</span>
                    <span style={{ color: 'var(--admin-text-secondary)' }}>
                      {selectedSeller.kyc_submitted_at ? new Date(selectedSeller.kyc_submitted_at).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Verified Timestamp</span>
                    <span style={{ color: 'var(--admin-text-secondary)' }}>
                      {selectedSeller.kyc_verified_at ? new Date(selectedSeller.kyc_verified_at).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>

                {selectedSeller.kyc_notes && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                    <strong>Seller Note:</strong> {selectedSeller.kyc_notes}
                  </div>
                )}
              </div>

              {/* Document Previews */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: 8 }}>
                  Uploaded Identity Scans & Documents
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', display: 'block', marginBottom: 6 }}>
                      Government ID / Permit Document
                    </span>
                    {selectedSeller.kyc_document_url ? (
                      <div>
                        <a href={selectedSeller.kyc_document_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--admin-info)', fontSize: 12 }}>
                          <ExternalLink size={14} />
                          <span>Open Full Scan</span>
                        </a>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No document uploaded</span>
                    )}
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', display: 'block', marginBottom: 6 }}>
                      Selfie with ID / Showroom Photo
                    </span>
                    {selectedSeller.kyc_selfie_url ? (
                      <div>
                        <a href={selectedSeller.kyc_selfie_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--admin-info)', fontSize: 12 }}>
                          <ExternalLink size={14} />
                          <span>Open Full Photo</span>
                        </a>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No selfie uploaded</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rejection Reason Form */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                  Compliance Rejection Feedback (Required if rejecting)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Blurry photo, expired ID, or mismatching registration details."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="admin-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRejectKyc}
                  className="btn btn-secondary"
                  style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}
                >
                  <ThumbsDown size={14} />
                  <span>Reject Submission</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleApproveKyc}
                  className="btn btn-primary"
                  style={{ flex: 1.4, background: '#10b981', borderColor: '#10b981' }}
                >
                  <ThumbsUp size={14} />
                  <span>{actionLoading ? 'Processing...' : 'Approve & Grant Verified Badge'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seller Details Drawer */}
      {viewDrawerOpen && selectedSeller && (
        <div className="admin-drawer-backdrop" onClick={() => setViewDrawerOpen(false)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="admin-drawer-header">
              <div>
                <h3 className="admin-drawer-title">Seller Overview: @{selectedSeller.username || selectedSeller.name}</h3>
                <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>ID: #{selectedSeller.id}</span>
              </div>
              <button type="button" onClick={() => setViewDrawerOpen(false)} className="admin-btn-icon">
                <X size={18} />
              </button>
            </div>

            <div className="admin-drawer-body">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--admin-bg-hover)', margin: '0 auto 10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--color-rust)' }}>
                  {selectedSeller.avatar_url ? (
                    <img src={selectedSeller.avatar_url} alt={selectedSeller.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    selectedSeller.name?.charAt(0).toUpperCase() || 'S'
                  )}
                </div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{selectedSeller.name}</h4>
                <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>@{selectedSeller.username} · {selectedSeller.email}</span>
              </div>

              <div className="admin-card" style={{ padding: 16, marginBottom: 16 }}>
                <h5 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>Vehicle Builds Portfolio</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Active Builds</span>
                    <strong>{selectedSeller.active_cars_count || 0} Listed</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Under Inspection</span>
                    <strong>{selectedSeller.pending_cars_count || 0} Pending</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Total Portfolio Value</span>
                    <strong style={{ color: 'var(--color-rust)' }}>₱{(selectedSeller.cars_valuation || 0).toLocaleString('en-PH')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Seller Rating</span>
                    <strong>★ {(selectedSeller.average_rating || 5.0).toFixed(1)}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  setViewDrawerOpen(false)
                  handleOpenReview(selectedSeller)
                }}
              >
                <ShieldCheck size={16} />
                <span>Review KYC & Manage Badge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
