import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  CheckCircle2,
  Eye,
  RefreshCw,
  FileText,
  UserCheck,
  ThumbsUp,
  Store,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'
import { TimeAgo } from '../utils/timeAgo.jsx'

export default function KycManagement() {
  const [submissions, setSubmissions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending') // pending | approved | rejected | all
  const [roleFilter, setRoleFilter] = useState('all')

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

  const handleApprove = async (userToApprove) => {
    if (!userToApprove) return
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.approveKyc(userToApprove.id)
      setActionSuccess(`KYC approved for @${userToApprove.username || userToApprove.name}. Verified Seller Trust Badge granted.`)
      fetchSubmissions()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to approve KYC verification.')
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
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--admin-success)' }}>
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
        <div className="admin-card" style={{ padding: '14px 18px', marginBottom: 20, borderColor: 'var(--admin-success)', background: 'var(--admin-success-bg)', color: 'var(--admin-success)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {actionError && (
        <div className="admin-card" style={{ padding: '14px 18px', marginBottom: 20, borderColor: 'var(--admin-danger)', background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}>×</button>
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
            borderLeft: '4px solid var(--admin-success)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: statusFilter === 'approved' ? 'rgba(16, 185, 129, 0.04)' : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Verified Merchants</span>
            <ShieldCheck size={18} style={{ color: 'var(--admin-success)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-success)' }}>
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
            borderLeft: '4px solid var(--admin-danger)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: statusFilter === 'rejected' ? 'rgba(239, 68, 68, 0.04)' : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Rejected Submissions</span>
            <ShieldAlert size={18} style={{ color: 'var(--admin-danger)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-danger)' }}>
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
          <form onSubmit={handleSearch} className="kyc-search-form" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 240px', maxWidth: 360 }}>
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
        <div className="kyc-queue-scroll" style={{ overflowX: 'auto' }}>
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
                                <ShieldCheck size={14} style={{ color: 'var(--admin-success)' }} title="Verified Seller Badge" />
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
                            <Link
                              to={`/kyc/${user.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                            >
                              <FileText size={12} />
                              <span>ID Scan</span>
                            </Link>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>No ID Scan</span>
                          )}

                          {user.kyc_selfie_url && (
                            <Link
                              to={`/kyc/${user.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                            >
                              <UserCheck size={12} />
                              <span>Selfie</span>
                            </Link>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {isVerified ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--admin-success)', fontSize: 12, fontWeight: 700 }}>
                            <ShieldCheck size={14} />
                            <span>Verified Badge Active</span>
                          </div>
                        ) : isPending ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', fontSize: 12, fontWeight: 700 }}>
                            <Clock size={14} />
                            <span>Pending Review</span>
                          </div>
                        ) : isRejected ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--admin-danger)', fontSize: 12, fontWeight: 700 }}>
                            <ShieldAlert size={14} />
                            <span>Rejected</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Not Submitted</span>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        {user.kyc_submitted_at ? <TimeAgo value={user.kyc_submitted_at} /> : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <Link
                            to={`/kyc/${user.id}`}
                            className="btn btn-sm btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                          >
                            <Eye size={13} />
                            <span>Review</span>
                          </Link>
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleApprove(user)}
                              className="btn btn-sm btn-success"
                              title="Quick Approve"
                              disabled={actionLoading}
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
    </div>
  )
}
