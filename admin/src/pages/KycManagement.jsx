import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  RefreshCw,
  X,
  FileText,
  UserCheck,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Building2,
  Store,
  Layers,
  Calendar,
  Sparkles,
  Maximize2,
  ZoomIn,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

const REJECTION_TEMPLATES = [
  'Blurry or unreadable document scan. Please provide a clear, well-lit photo of your government-issued ID.',
  'The submitted government ID is expired. Please upload a currently valid ID document.',
  'Name mismatch between uploaded ID and registered seller identity. Please clarify and re-submit.',
  'Business Permit / SEC registration document cannot be verified with official registries.',
  'Selfie photo holding ID is missing or faces do not clearly match.',
]

export default function KycManagement() {
  const [submissions, setSubmissions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending') // pending | approved | rejected | all
  const [roleFilter, setRoleFilter] = useState('all')

  // Review modal state
  const [selectedUser, setSelectedUser] = useState(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [imagePreviewTitle, setImagePreviewTitle] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getKycVerifications({
        status: statusFilter,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        q: search.trim() || undefined,
      })
      setSubmissions(res.data || [])
      setStats(res.stats || null)
    } catch {
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [statusFilter, roleFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchSubmissions()
  }

  const handleOpenReview = (user) => {
    setSelectedUser(user)
    setRejectionReason('')
    setActionError(null)
    setReviewModalOpen(true)
  }

  const handleApprove = async (userToApprove = selectedUser) => {
    if (!userToApprove) return
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.approveKyc(userToApprove.id)
      setActionSuccess(`KYC approved for @${userToApprove.username || userToApprove.name}. Verified Seller Trust Badge granted.`)
      setReviewModalOpen(false)
      fetchSubmissions()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to approve KYC verification.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedUser) return
    if (!rejectionReason.trim()) {
      setActionError('Please select a rejection reason template or provide custom compliance feedback.')
      return
    }
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.rejectKyc(selectedUser.id, rejectionReason.trim())
      setActionSuccess(`KYC rejected for @${selectedUser.username || selectedUser.name}. Feedback sent to seller.`)
      setReviewModalOpen(false)
      fetchSubmissions()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to reject KYC verification.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <ShieldCheck size={22} />
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              Seller KYC & Identity Moderation
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Review government-issued IDs, verify business documentation, grant the official Verified Seller Badge, and protect marketplace buyers against fraud.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchSubmissions} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="admin-card" style={{ padding: '14px 18px', marginBottom: 20, borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div
          className="admin-card"
          onClick={() => setStatusFilter('pending')}
          style={{
            padding: '18px 20px',
            borderLeft: '4px solid var(--color-orange)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: statusFilter === 'pending' ? 'rgba(234, 88, 12, 0.04)' : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Pending Reviews</span>
            <Clock size={18} style={{ color: 'var(--color-orange)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-orange)' }}>
            {stats?.pending_verifications ?? 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Awaiting compliance check
          </div>
        </div>

        <div
          className="admin-card"
          onClick={() => setStatusFilter('approved')}
          style={{
            padding: '18px 20px',
            borderLeft: '4px solid #10b981',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: statusFilter === 'approved' ? 'rgba(16, 185, 129, 0.04)' : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Verified Merchants</span>
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
            {stats?.approved_merchants ?? 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Official trust badge granted
          </div>
        </div>

        <div
          className="admin-card"
          onClick={() => setStatusFilter('rejected')}
          style={{
            padding: '18px 20px',
            borderLeft: '4px solid #ef4444',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: statusFilter === 'rejected' ? 'rgba(239, 68, 68, 0.04)' : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Rejected Submissions</span>
            <ShieldAlert size={18} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>
            {stats?.rejected_submissions ?? 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Action needed by applicant
          </div>
        </div>

        <div
          className="admin-card"
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '18px 20px',
            borderLeft: '4px solid var(--admin-info)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: statusFilter === 'all' ? 'rgba(59, 130, 246, 0.04)' : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Registered Sellers</span>
            <Store size={18} style={{ color: 'var(--admin-info)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-info)' }}>
            {stats?.total_registered_sellers ?? 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Car builders & dealerships
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('pending')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Clock size={14} />
              <span>Pending Reviews</span>
              {stats?.pending_verifications > 0 && (
                <span style={{ background: '#ea580c', color: '#fff', fontSize: 11, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                  {stats.pending_verifications}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('approved')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ShieldCheck size={14} />
              <span>Verified & Approved</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('rejected')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ShieldAlert size={14} />
              <span>Rejected</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('all')}
            >
              All Submissions
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 240px', maxWidth: 360 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
              <input
                type="text"
                placeholder="Search @username, legal name, ID#..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-input"
                style={{ paddingLeft: 36, width: '100%', fontSize: 13 }}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">Search</button>
          </form>
        </div>
      </div>

      {/* KYC Submissions Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Seller / Applicant</th>
                <th>Account Type</th>
                <th>Submitted ID Credentials</th>
                <th>Document Scans</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th style={{ textAlign: 'right' }}>Moderation Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-muted)' }}>
                    Loading KYC verification submissions...
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-muted)' }}>
                    No KYC submissions found in this status queue.
                  </td>
                </tr>
              ) : (
                submissions.map((user) => {
                  const isVerified = user.is_kyc_verified && user.kyc_status === 'approved'
                  const isPending = user.kyc_status === 'pending'
                  const isRejected = user.kyc_status === 'rejected'

                  return (
                    <tr key={user.id}>
                      {/* Identity */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              background: 'var(--admin-bg-hover)',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              color: 'var(--color-rust)',
                              fontSize: 15,
                            }}
                          >
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              user.name?.charAt(0).toUpperCase() || 'U'
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>@{user.username || 'seller'}</span>
                              {isVerified && (
                                <ShieldCheck size={14} style={{ color: '#10b981' }} title="Verified Seller Badge" />
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                              Legal Name: {user.name} · {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Account Role */}
                      <td>
                        <span className="badge badge-seller" style={{ textTransform: 'capitalize' }}>
                          {user.role?.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Submitted ID Credentials */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', textTransform: 'capitalize', fontSize: 13 }}>
                          {user.kyc_document_type?.replace('_', ' ') || 'ID Document'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                          ID: {user.kyc_document_number || '—'}
                        </div>
                      </td>

                      {/* Document Scans Previews */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {user.kyc_document_url ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onClick={() => {
                                setImagePreviewUrl(user.kyc_document_url)
                                setImagePreviewTitle(`Government ID Document: @${user.username || user.name}`)
                              }}
                            >
                              <FileText size={12} />
                              <span>ID Scan</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>No ID Scan</span>
                          )}

                          {user.kyc_selfie_url && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onClick={() => {
                                setImagePreviewUrl(user.kyc_selfie_url)
                                setImagePreviewTitle(`Selfie / Showroom Verification: @${user.username || user.name}`)
                              }}
                            >
                              <UserCheck size={12} />
                              <span>Selfie</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {isVerified ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: 12, fontWeight: 700 }}>
                            <ShieldCheck size={14} />
                            <span>Verified Badge Active</span>
                          </div>
                        ) : isPending ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', fontSize: 12, fontWeight: 700 }}>
                            <Clock size={14} />
                            <span>Pending Review</span>
                          </div>
                        ) : isRejected ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: 12, fontWeight: 700 }}>
                            <ShieldAlert size={14} />
                            <span>Rejected</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Not Submitted</span>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        {user.kyc_submitted_at ? new Date(user.kyc_submitted_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenReview(user)}
                            className="btn btn-sm btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Eye size={13} />
                            <span>Review & Moderate</span>
                          </button>
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleApprove(user)}
                              className="btn btn-sm btn-secondary"
                              title="Quick Approve"
                              style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                            >
                              <ThumbsUp size={13} />
                            </button>
                          )}
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

      {/* Comprehensive KYC Inspection Modal */}
      {reviewModalOpen && selectedUser && (
        <div className="modal-backdrop" onClick={() => setReviewModalOpen(false)}>
          <div
            className="modal-container"
            style={{ maxWidth: 780, maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #18191c 0%, #22242a 100%)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: selectedUser.is_kyc_verified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 88, 12, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: selectedUser.is_kyc_verified ? '#10b981' : '#ea580c',
                  }}
                >
                  {selectedUser.is_kyc_verified ? <ShieldCheck size={22} /> : <Clock size={22} />}
                </div>
                <div>
                  <h3 className="modal-title" style={{ color: '#fff', fontSize: '1.25rem' }}>
                    KYC Compliance Audit: @{selectedUser.username || selectedUser.name}
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Legal Name: {selectedUser.name} · {selectedUser.email}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setReviewModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ padding: 24 }}>
              {actionError && (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: 13, marginBottom: 18 }}>
                  {actionError}
                </div>
              )}

              {/* Applicant Overview Card */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: 11, fontWeight: 600 }}>Username (Public)</span>
                    <strong style={{ color: '#fff' }}>@{selectedUser.username || 'seller'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: 11, fontWeight: 600 }}>Government ID Type</span>
                    <strong style={{ color: '#fff', textTransform: 'capitalize' }}>
                      {selectedUser.kyc_document_type?.replace('_', ' ') || 'ID Document'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: 11, fontWeight: 600 }}>Document ID Number</span>
                    <strong style={{ color: '#fff', fontFamily: 'monospace' }}>
                      {selectedUser.kyc_document_number || '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: 11, fontWeight: 600 }}>Submission Date</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {selectedUser.kyc_submitted_at ? new Date(selectedUser.kyc_submitted_at).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>

                {selectedUser.kyc_notes && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    <strong style={{ color: '#fff' }}>Applicant Notes:</strong> {selectedUser.kyc_notes}
                  </div>
                )}
              </div>

              {/* Document Scans Viewer */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={16} />
                  <span>Submitted Identity Proof & Physical Showroom Photos</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Government ID Scan */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 10 }}>
                      Government ID / Business Permit
                    </span>
                    {selectedUser.kyc_document_url ? (
                      <div>
                        <div
                          style={{
                            height: 180,
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#111',
                            cursor: 'pointer',
                            position: 'relative',
                            marginBottom: 10,
                          }}
                          onClick={() => {
                            setImagePreviewUrl(selectedUser.kyc_document_url)
                            setImagePreviewTitle(`Government ID Document: @${selectedUser.username || selectedUser.name}`)
                          }}
                        >
                          <img
                            src={selectedUser.kyc_document_url}
                            alt="Government ID"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                          <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '3px 6px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ZoomIn size={12} />
                            <span>Enlarge</span>
                          </div>
                        </div>
                        <a
                          href={selectedUser.kyc_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--admin-info)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <ExternalLink size={13} />
                          <span>Open in Full Browser Tab</span>
                        </a>
                      </div>
                    ) : (
                      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                        No document uploaded
                      </div>
                    )}
                  </div>

                  {/* Selfie with ID */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 10 }}>
                      Selfie Holding ID / Showroom Photo
                    </span>
                    {selectedUser.kyc_selfie_url ? (
                      <div>
                        <div
                          style={{
                            height: 180,
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#111',
                            cursor: 'pointer',
                            position: 'relative',
                            marginBottom: 10,
                          }}
                          onClick={() => {
                            setImagePreviewUrl(selectedUser.kyc_selfie_url)
                            setImagePreviewTitle(`Selfie with ID: @${selectedUser.username || selectedUser.name}`)
                          }}
                        >
                          <img
                            src={selectedUser.kyc_selfie_url}
                            alt="Selfie verification"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                          <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '3px 6px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ZoomIn size={12} />
                            <span>Enlarge</span>
                          </div>
                        </div>
                        <a
                          href={selectedUser.kyc_selfie_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--admin-info)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <ExternalLink size={13} />
                          <span>Open in Full Browser Tab</span>
                        </a>
                      </div>
                    ) : (
                      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                        No selfie uploaded (Optional)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compliance Rejection Section */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: 6 }}>
                  Rejection Reason & Compliance Feedback (Required for Rejection)
                </label>

                {/* Predefined Templates */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {REJECTION_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: '4px 8px' }}
                      onClick={() => setRejectionReason(tmpl)}
                    >
                      Template #{idx + 1}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  placeholder="Select a template above or type specific compliance feedback explaining why the document could not be approved."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="admin-input"
                  style={{ width: '100%', fontSize: 13 }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ background: '#1c1d22', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReviewModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleReject}
                disabled={actionLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ThumbsDown size={14} />
                <span>Reject Submission</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleApprove()}
                disabled={actionLoading}
                style={{ background: '#10b981', borderColor: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ThumbsUp size={14} />
                <span>{actionLoading ? 'Processing...' : 'Approve & Grant Verified Trust Badge'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Lightbox Popup */}
      {imagePreviewUrl && (
        <div className="modal-backdrop" onClick={() => setImagePreviewUrl(null)} style={{ zIndex: 1100 }}>
          <div
            className="modal-container"
            style={{ maxWidth: 900, maxHeight: '95vh', background: '#0f1117' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ background: '#181920', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="modal-title" style={{ color: '#fff', fontSize: 14 }}>{imagePreviewTitle}</h3>
              <button type="button" onClick={() => setImagePreviewUrl(null)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, background: '#000' }}>
              <img
                src={imagePreviewUrl}
                alt={imagePreviewTitle}
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
