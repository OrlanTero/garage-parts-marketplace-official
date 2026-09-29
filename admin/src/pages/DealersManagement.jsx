import { useEffect, useState } from 'react'
import {
  Building2,
  Search,
  Car,
  Package,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Eye,
  Award,
  Calendar,
  FileText,
  RefreshCw,
  X,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

export default function DealersManagement() {
  const [dealers, setDealers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // all | verified | pending_kyc
  const [selectedDealer, setSelectedDealer] = useState(null)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [kycModalOpen, setKycModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  const fetchDealers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers({
        role: 'dealer',
        q: search.trim() || undefined,
      })
      setDealers(res.data || [])
      setStats(res.stats || null)
    } catch {
      setDealers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDealers()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchDealers()
  }

  const handleOpenReview = (dealer) => {
    setSelectedDealer(dealer)
    setRejectionReason('')
    setActionError(null)
    setKycModalOpen(true)
  }

  const handleOpenDetails = (dealer) => {
    setSelectedDealer(dealer)
    setViewDrawerOpen(true)
  }

  const handleApproveKyc = async () => {
    if (!selectedDealer) return
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.approveKyc(selectedDealer.id)
      setActionSuccess(`KYC approved for commercial dealership @${selectedDealer.username || selectedDealer.name}. Verified Badge active.`)
      setKycModalOpen(false)
      fetchDealers()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to approve KYC verification.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectKyc = async () => {
    if (!selectedDealer) return
    if (!rejectionReason.trim()) {
      setActionError('Please provide a specific compliance reason for the rejection.')
      return
    }
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.rejectKyc(selectedDealer.id, rejectionReason.trim())
      setActionSuccess(`KYC rejected for @${selectedDealer.username || selectedDealer.name}.`)
      setKycModalOpen(false)
      fetchDealers()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to reject KYC verification.')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredDealers = dealers.filter((dealer) => {
    if (activeFilter === 'verified') return dealer.is_kyc_verified
    if (activeFilter === 'pending_kyc') return dealer.kyc_status === 'pending'
    return true
  })

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-emerald)' }}>
              <Building2 size={20} />
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              Commercial Dealer Management
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Oversee certified auto dealerships, corporate showrooms, SEC registration credentials, fleet allocations, and KYC trust badges.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchDealers} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh Dealerships</span>
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
        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-emerald)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Accredited Dealers</span>
            <Building2 size={18} style={{ color: 'var(--color-emerald)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats?.total_count ?? dealers.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Partner showrooms & auto malls
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>KYC Verified Dealers</span>
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
            {dealers.filter((d) => d.is_kyc_verified).length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            SEC & DTI verified merchants
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Fleet Allocation</span>
            <Car size={18} style={{ color: 'var(--color-orange)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats?.fleet_size ?? dealers.reduce((acc, d) => acc + (d.cars_count || 0), 0)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Active showroom vehicles
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-info)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Total Fleet Valuation</span>
            <DollarSign size={18} style={{ color: 'var(--admin-info)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-info)' }}>
            ₱{(stats?.portfolio_valuation ?? dealers.reduce((acc, d) => acc + (d.portfolio_valuation || d.cars_valuation || 0), 0)).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Combined vehicles & inventory
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 420 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              type="text"
              placeholder="Search dealership name, username, email, or SEC reg..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input"
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('all')}
          >
            All Dealers ({dealers.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'verified' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('verified')}
          >
            Verified ({dealers.filter((d) => d.is_kyc_verified).length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'pending_kyc' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('pending_kyc')}
          >
            Pending KYC ({dealers.filter((d) => d.kyc_status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Dealers Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Dealership & Identity</th>
                <th>KYC Verification & Trust Badge</th>
                <th>Showroom Fleet</th>
                <th>Parts Inventory</th>
                <th>Portfolio Valuation</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-muted)' }}>
                    Loading registered commercial dealerships...
                  </td>
                </tr>
              ) : filteredDealers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-muted)' }}>
                    No dealerships found matching the current search criteria.
                  </td>
                </tr>
              ) : (
                filteredDealers.map((dealer) => {
                  const isVerified = dealer.is_kyc_verified && dealer.kyc_status === 'approved'
                  const isPending = dealer.kyc_status === 'pending'
                  const isRejected = dealer.kyc_status === 'rejected'

                  return (
                    <tr key={dealer.id}>
                      {/* Identity */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--color-emerald)',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {dealer.avatar_url ? (
                              <img src={dealer.avatar_url} alt={dealer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              dealer.name?.charAt(0).toUpperCase() || 'D'
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{dealer.name}</span>
                              <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 500 }}>
                                (@{dealer.username || 'dealer'})
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                              {dealer.email}
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

                      {/* Fleet */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                          {dealer.cars_count || 0} Showroom Cars
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          {dealer.active_cars_count || 0} active
                        </div>
                      </td>

                      {/* Parts */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                          {dealer.parts_count || 0} SKUs
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          OEM & Performance
                        </div>
                      </td>

                      {/* Valuation */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-emerald)' }}>
                          ₱{(dealer.portfolio_valuation || dealer.cars_valuation || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          Total listed inventory
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        {dealer.created_at ? new Date(dealer.created_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenReview(dealer)}
                            className="btn btn-sm btn-primary"
                            title="Review corporate KYC credentials and manage Verified badge"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <ShieldCheck size={14} />
                            <span>Review KYC</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(dealer)}
                            className="btn btn-sm btn-secondary"
                            title="View dealership overview"
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
      {kycModalOpen && selectedDealer && (
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
                <ShieldCheck size={22} style={{ color: selectedDealer.is_kyc_verified ? '#10b981' : '#ea580c' }} />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Dealership KYC Verification: @{selectedDealer.username || selectedDealer.name}
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    Corporate Name: {selectedDealer.name} · {selectedDealer.email}
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
                  <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>Verification Status:</span>
                  {selectedDealer.is_kyc_verified ? (
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700, fontSize: 12 }}>
                      ✓ Verified Dealership Badge Active
                    </span>
                  ) : selectedDealer.kyc_status === 'pending' ? (
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', fontWeight: 700, fontSize: 12 }}>
                      Pending Compliance Review
                    </span>
                  ) : (
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)', color: 'var(--admin-text-muted)', fontSize: 12 }}>
                      {selectedDealer.kyc_status?.replace('_', ' ').toUpperCase() || 'NOT SUBMITTED'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Registration Type</span>
                    <strong style={{ color: '#fff', textTransform: 'capitalize' }}>
                      {selectedDealer.kyc_document_type?.replace('_', ' ') || 'SEC / DTI Permit'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Permit / Reg Number</span>
                    <strong style={{ color: '#fff' }}>
                      {selectedDealer.kyc_document_number || '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Submission Date</span>
                    <span style={{ color: 'var(--admin-text-secondary)' }}>
                      {selectedDealer.kyc_submitted_at ? new Date(selectedDealer.kyc_submitted_at).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Verified Date</span>
                    <span style={{ color: 'var(--admin-text-secondary)' }}>
                      {selectedDealer.kyc_verified_at ? new Date(selectedDealer.kyc_verified_at).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>

                {selectedDealer.kyc_notes && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                    <strong>Dealership Note:</strong> {selectedDealer.kyc_notes}
                  </div>
                )}
              </div>

              {/* Document Previews */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: 8 }}>
                  Corporate Documentation & Showroom Permits
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', display: 'block', marginBottom: 6 }}>
                      SEC / DTI Registration Document
                    </span>
                    {selectedDealer.kyc_document_url ? (
                      <div>
                        <a href={selectedDealer.kyc_document_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--admin-info)', fontSize: 12 }}>
                          <ExternalLink size={14} />
                          <span>Open Document</span>
                        </a>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No document uploaded</span>
                    )}
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', display: 'block', marginBottom: 6 }}>
                      Physical Showroom Photo
                    </span>
                    {selectedDealer.kyc_selfie_url ? (
                      <div>
                        <a href={selectedDealer.kyc_selfie_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--admin-info)', fontSize: 12 }}>
                          <ExternalLink size={14} />
                          <span>Open Showroom Image</span>
                        </a>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No showroom photo uploaded</span>
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
                  placeholder="e.g. SEC registration certificate is unverified or business permit expired."
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

      {/* Dealership Details Drawer */}
      {viewDrawerOpen && selectedDealer && (
        <div className="admin-drawer-backdrop" onClick={() => setViewDrawerOpen(false)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="admin-drawer-header">
              <div>
                <h3 className="admin-drawer-title">Dealership Overview: @{selectedDealer.username || selectedDealer.name}</h3>
                <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>ID: #{selectedDealer.id}</span>
              </div>
              <button type="button" onClick={() => setViewDrawerOpen(false)} className="admin-btn-icon">
                <X size={18} />
              </button>
            </div>

            <div className="admin-drawer-body">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-emerald)', margin: '0 auto 10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>
                  {selectedDealer.avatar_url ? (
                    <img src={selectedDealer.avatar_url} alt={selectedDealer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    selectedDealer.name?.charAt(0).toUpperCase() || 'D'
                  )}
                </div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{selectedDealer.name}</h4>
                <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>@{selectedDealer.username} · {selectedDealer.email}</span>
              </div>

              <div className="admin-card" style={{ padding: 16, marginBottom: 16 }}>
                <h5 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>Commercial Fleet Portfolio</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Showroom Fleet</span>
                    <strong>{selectedDealer.cars_count || 0} Vehicles</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Parts Inventory</span>
                    <strong>{selectedDealer.parts_count || 0} Products</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Total Portfolio Value</span>
                    <strong style={{ color: 'var(--color-emerald)' }}>₱{(selectedDealer.portfolio_valuation || 0).toLocaleString('en-PH')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Commission Agreement</span>
                    <strong>{(selectedDealer.commission_rate || 5.0).toFixed(2)}%</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  setViewDrawerOpen(false)
                  handleOpenReview(selectedDealer)
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
