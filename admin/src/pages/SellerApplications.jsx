import { useEffect, useState } from 'react'
import {
  Store,
  Search,
  Clock,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Building2,
  Phone,
  MapPin,
  FileText,
  UserCheck,
  ThumbsUp,
  ThumbsDown,
  X,
  AlertCircle,
  Undo2,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

const REJECTION_TEMPLATES = [
  'Business permit / DTI-SEC registration cannot be verified with official registries.',
  'Applicant KYC verification is incomplete. Please finish identity verification first.',
  'Shop contact details are unreachable or inconsistent. Please update and re-apply.',
  'Duplicate or franchised dealership already registered under this identity.',
  'Insufficient selling history or business legitimacy for merchant approval.',
]

const ROLE_LABELS = {
  seller: 'Seller',
  parts_seller: 'Parts Seller',
  dealer: 'Dealer / Merchant',
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return '—'
  }
}

export default function SellerApplications() {
  const [applications, setApplications] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending') // pending | approved | rejected | withdrawn | all
  const [roleFilter, setRoleFilter] = useState('all')

  // Review modal state
  const [selected, setSelected] = useState(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSellerApplications({
        status: statusFilter,
        requested_role: roleFilter !== 'all' ? roleFilter : undefined,
        q: search.trim() || undefined,
      })
      setApplications(res.data || [])
      setStats(res.stats || null)
    } catch {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [statusFilter, roleFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchApplications()
  }

  const handleOpenReview = (application) => {
    setSelected(application)
    setReviewNotes('')
    setRejectionReason('')
    setActionError(null)
    setReviewModalOpen(true)
  }

  const handleApprove = async (applicationToApprove = selected) => {
    if (!applicationToApprove) return
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.approveSellerApplication(applicationToApprove.id, { review_notes: reviewNotes.trim() || undefined })
      setActionSuccess(`@${applicationToApprove.applicant?.username || applicationToApprove.applicant?.name} approved and upgraded to ${ROLE_LABELS[applicationToApprove.requested_role] || applicationToApprove.requested_role}.`)
      setReviewModalOpen(false)
      fetchApplications()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to approve seller application.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selected) return
    if (!rejectionReason.trim()) {
      setActionError('Please select a rejection template or provide a formal reason for the applicant.')
      return
    }
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.rejectSellerApplication(selected.id, rejectionReason.trim(), reviewNotes.trim() || undefined)
      setActionSuccess(`Seller application for @${selected.applicant?.username || selected.applicant?.name} rejected. Feedback sent to buyer.`)
      setReviewModalOpen(false)
      fetchApplications()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to reject seller application.')
    } finally {
      setActionLoading(false)
    }
  }

  const renderStatusPill = (status) => {
    if (status === 'approved') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
          <CheckCircle2 size={13} /> Approved
        </span>
      )
    }
    if (status === 'pending') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c' }}>
          <Clock size={13} /> Pending
        </span>
      )
    }
    if (status === 'rejected') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
          <XCircle size={13} /> Rejected
        </span>
      )
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(107, 114, 128, 0.12)', color: '#6b7280' }}>
        <Undo2 size={13} /> Withdrawn
      </span>
    )
  }

  const renderKycBadge = (applicant) => {
    if (!applicant) return '—'
    if (applicant.is_kyc_verified) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
          <ShieldCheck size={13} /> Verified
        </span>
      )
    }
    if (applicant.kyc_status === 'pending') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c' }}>
          <Clock size={13} /> KYC Pending
        </span>
      )
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(107, 114, 128, 0.12)', color: '#6b7280' }}>
        <ShieldAlert size={13} /> {applicant.kyc_status === 'rejected' ? 'KYC Rejected' : 'Unverified'}
      </span>
    )
  }

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(234, 88, 12, 0.1)', color: 'var(--color-rust)' }}>
              <Store size={22} />
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              Seller Upgrade Applications
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Review buyer-to-seller upgrade requests. Approval grants selling privileges instantly — verified KYC is enforced before any upgrade.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchApplications} className="btn btn-secondary btn-sm">
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
        <div className="admin-card" onClick={() => setStatusFilter('pending')} style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-orange)', cursor: 'pointer', background: statusFilter === 'pending' ? 'rgba(234, 88, 12, 0.04)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Pending Applications</span>
            <Clock size={18} style={{ color: 'var(--color-orange)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-orange)' }}>{stats?.pending_applications ?? 0}</div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>Awaiting upgrade review</div>
        </div>

        <div className="admin-card" onClick={() => setStatusFilter('approved')} style={{ padding: '18px 20px', borderLeft: '4px solid #10b981', cursor: 'pointer', background: statusFilter === 'approved' ? 'rgba(16, 185, 129, 0.04)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Approved Upgrades</span>
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{stats?.approved_applications ?? 0}</div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>Roles granted to sellers</div>
        </div>

        <div className="admin-card" onClick={() => setStatusFilter('rejected')} style={{ padding: '18px 20px', borderLeft: '4px solid #ef4444', cursor: 'pointer', background: statusFilter === 'rejected' ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Rejected Requests</span>
            <ShieldAlert size={18} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{stats?.rejected_applications ?? 0}</div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>Buyers kept on buyer tier</div>
        </div>

        <div className="admin-card" onClick={() => setStatusFilter('withdrawn')} style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-info)', cursor: 'pointer', background: statusFilter === 'withdrawn' ? 'rgba(59, 130, 246, 0.04)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Withdrawn</span>
            <Undo2 size={18} style={{ color: 'var(--admin-info)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-info)' }}>{stats?.withdrawn_applications ?? 0}</div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>Cancelled by applicants</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { value: 'pending', label: 'Pending', icon: Clock, count: stats?.pending_applications },
              { value: 'approved', label: 'Approved', icon: ShieldCheck },
              { value: 'rejected', label: 'Rejected', icon: ShieldAlert },
              { value: 'withdrawn', label: 'Withdrawn', icon: Undo2 },
              { value: 'all', label: 'All', icon: null },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                className={`btn btn-sm ${statusFilter === t.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(t.value)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {t.icon && <t.icon size={14} />}
                <span>{t.label}</span>
                {!!t.count && (
                  <span style={{ background: '#ea580c', color: '#fff', fontSize: 11, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="admin-select" style={{ fontSize: 13 }}>
              <option value="all">All roles</option>
              <option value="seller">Seller</option>
              <option value="parts_seller">Parts Seller</option>
              <option value="dealer">Dealer / Merchant</option>
            </select>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 240px', maxWidth: 360 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
              <input
                type="text"
                placeholder="Search shop, @username, city, phone…"
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

      {/* Applications Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Buyer / Applicant</th>
                <th>Requested Role</th>
                <th>Shop & Contact</th>
                <th>KYC Badge</th>
                <th>Status</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right' }}>Moderation Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--admin-text-muted)' }}>Loading applications…</td></tr>
              ) : applications.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--admin-text-muted)' }}>No applications in this queue.</td></tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>{app.applicant?.name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        @{app.applicant?.username || '—'} · {app.applicant?.email || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Current: buyer</div>
                    </td>
                    <td>
                      <span className={`badge ${app.requested_role === 'dealer' ? 'badge-info' : app.requested_role === 'parts_seller' ? 'badge-rust' : 'badge-seller'}`}>
                        {ROLE_LABELS[app.requested_role] || app.requested_role}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Building2 size={13} /> {app.shop_name || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Phone size={12} /> {app.contact_phone || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={12} /> {app.city || '—'}
                      </div>
                    </td>
                    <td>{renderKycBadge(app.applicant)}</td>
                    <td>{renderStatusPill(app.status)}</td>
                    <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{formatDate(app.created_at)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleOpenReview(app)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 6 }}>
                        <Eye size={13} /> Review
                      </button>
                      {app.status === 'pending' && (
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => handleApprove(app)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <ThumbsUp size={13} /> Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalOpen && selected && (
        <div className="modal-backdrop" onClick={() => setReviewModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">Review Seller Application #{selected.id}</h3>
              <button type="button" className="modal-close" onClick={() => setReviewModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {actionError && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', marginBottom: 16, borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#b91c1c', fontSize: 13 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{actionError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--admin-surface-subtle, #f8fafc)', border: '1px solid var(--admin-border, #e5e7eb)' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)', marginBottom: 4 }}>Applicant</div>
                  <div style={{ fontWeight: 700 }}>{selected.applicant?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>@{selected.applicant?.username} · {selected.applicant?.email}</div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <UserCheck size={13} /> KYC: {renderKycBadge(selected.applicant)}
                  </div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--admin-surface-subtle, #f8fafc)', border: '1px solid var(--admin-border, #e5e7eb)' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)', marginBottom: 4 }}>Upgrade Request</div>
                  <div style={{ fontWeight: 700 }}>{ROLE_LABELS[selected.requested_role] || selected.requested_role}</div>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{selected.shop_name} · {selected.city}</div>
                  <div style={{ marginTop: 6 }}>{renderStatusPill(selected.status)}</div>
                </div>
              </div>

              {selected.reason && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={13} /> Applicant statement
                  </div>
                  <p style={{ fontSize: 13, margin: 0, padding: 12, borderRadius: 8, background: 'var(--admin-surface-subtle, #f8fafc)', border: '1px solid var(--admin-border, #e5e7eb)' }}>
                    {selected.reason}
                  </p>
                </div>
              )}

              {selected.status === 'pending' && !selected.applicant?.is_kyc_verified && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', marginBottom: 16, borderRadius: 8, background: 'rgba(234, 88, 12, 0.08)', border: '1px solid rgba(234, 88, 12, 0.3)', color: '#9a3412', fontSize: 13 }}>
                  <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span><strong>Security gate:</strong> this buyer has no verified KYC badge. Approval is blocked until KYC is approved — review it under KYC & Seller Verification first.</span>
                </div>
              )}

              {selected.status === 'pending' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: 6 }}>
                      Internal review notes (optional, shown to applicant on reject)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={2}
                      maxLength={1000}
                      placeholder="e.g. Called the shop hotline — legitimate garage in Makati."
                      className="admin-input"
                      style={{ width: '100%', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: 6 }}>
                      Rejection reason template (required to reject)
                    </label>
                    <select value={REJECTION_TEMPLATES.includes(rejectionReason) ? rejectionReason : ''} onChange={(e) => setRejectionReason(e.target.value)} className="admin-select" style={{ width: '100%', fontSize: 13, marginBottom: 8 }}>
                      <option value="">— Select a template —</option>
                      {REJECTION_TEMPLATES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                      maxLength={1000}
                      placeholder="Or write a custom compliance reason…"
                      className="admin-input"
                      style={{ width: '100%', fontSize: 13 }}
                    />
                  </div>
                </>
              )}

              {selected.status !== 'pending' && selected.review_notes && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Reviewer notes</div>
                  <p style={{ fontSize: 13, margin: 0, padding: 12, borderRadius: 8, background: 'var(--admin-surface-subtle, #f8fafc)', border: '1px solid var(--admin-border, #e5e7eb)' }}>
                    {selected.review_notes}
                  </p>
                  {selected.reviewer && (
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 6 }}>
                      Reviewed by {selected.reviewer.name} (@{selected.reviewer.username}) · {formatDate(selected.reviewed_at)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {selected.status === 'pending' ? (
                <>
                  <button type="button" className="btn btn-danger" disabled={actionLoading} onClick={handleReject} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ThumbsDown size={14} /> {actionLoading ? 'Working…' : 'Reject'}
                  </button>
                  <button type="button" className="btn btn-primary" disabled={actionLoading} onClick={() => handleApprove()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ThumbsUp size={14} /> {actionLoading ? 'Working…' : 'Approve & Upgrade Role'}
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={() => setReviewModalOpen(false)}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
