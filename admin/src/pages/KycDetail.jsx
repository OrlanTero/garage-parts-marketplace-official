import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Car,
  Clock,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ThumbsDown,
  ThumbsUp,
  Wallet,
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

function kycBadge(user) {
  const verified = user.is_kyc_verified && user.kyc_status === 'approved'
  if (verified) return { label: 'Verified Badge Active', cls: 'badge-success', Icon: ShieldCheck }
  if (user.kyc_status === 'pending') return { label: 'Pending Review', cls: 'badge-warning', Icon: Clock }
  if (user.kyc_status === 'rejected') return { label: 'Rejected', cls: 'badge-danger', Icon: ShieldAlert }
  return { label: 'Not Submitted', cls: 'badge-neutral', Icon: Clock }
}

function Fact({ label, value, mono = false }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--admin-text-muted)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)', fontFamily: mono ? 'monospace' : undefined }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

/**
 * Full seller / workshop review: identity, KYC documents, listings,
 * requests (seller applications + orders), payouts — with working
 * approve / reject moderation actions.
 */
export default function KycDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [preview, setPreview] = useState(null) // { url, title }

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const data = await adminApi.getUser(id)
      setUser(data)
    } catch (err) {
      setFetchError(err?.response?.data?.message || 'Could not load this applicant.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const runAction = async (fn, okMsg) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      setNotice(okMsg)
      setRejectOpen(false)
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ marginBottom: 12 }} />
        <div>Loading applicant review…</div>
      </div>
    )
  }

  if (fetchError || !user) {
    return (
      <div>
        <button type="button" onClick={() => navigate('/kyc')} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to KYC queue
        </button>
        <div className="admin-card" style={{ padding: 32, textAlign: 'center', color: 'var(--admin-danger)' }}>
          {fetchError || 'Applicant not found.'}
        </div>
      </div>
    )
  }

  const badge = kycBadge(user)
  const BadgeIcon = badge.Icon
  const isPending = user.kyc_status === 'pending'
  const counts = user.counts || {}
  const wallet = user.wallet || {}
  const apps = Array.isArray(user.seller_applications) ? user.seller_applications : []
  const cars = Array.isArray(user.cars) ? user.cars : []
  const parts = Array.isArray(user.parts) ? user.parts : []
  const orders = Array.isArray(user.orders) ? user.orders : []
  const withdrawals = Array.isArray(user.payout_withdrawals) ? user.payout_withdrawals : []
  const accounts = Array.isArray(user.payout_accounts) ? user.payout_accounts : []

  return (
    <div className="kyc-detail">
      <button type="button" onClick={() => navigate('/kyc')} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to KYC queue
      </button>

      {notice && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-success)', background: 'var(--admin-success-bg)', color: 'var(--admin-success)', fontWeight: 600, fontSize: 14 }}>
          {notice}
        </div>
      )}
      {error && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-danger)', background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)', fontWeight: 600, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Identity header + verdict actions */}
      <div className="admin-card kyc-id-head">
        <div className="kyc-id-who">
          <div className="kyc-id-avatar">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} />
            ) : (
              (user.name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className="kyc-id-copy">
            <h1>@{user.username || user.name}</h1>
            <p>{user.name} · {user.email}{user.phone ? ` · ${user.phone}` : ''}</p>
            <div className="kyc-id-badges">
              <span className="badge badge-seller" style={{ textTransform: 'capitalize' }}>{(user.role || '').replace('_', ' ')}</span>
              <span className={`badge ${badge.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <BadgeIcon size={12} /> {badge.label}
              </span>
              {user.is_agent && <span className="badge badge-info">Agent · {user.commission_rate ?? 5}%</span>}
            </div>
          </div>
        </div>
        <div className="mod-actions">
          {isPending && (
            <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => runAction(
              () => adminApi.approveKyc(user.id),
              `KYC approved for @${user.username || user.name}. Verified Seller Trust Badge granted.`,
            )}>
              <ThumbsUp size={13} /> <span>Approve & badge</span>
            </button>
          )}
          {user.kyc_status !== 'rejected' && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setRejectOpen((v) => !v)}>
              <ThumbsDown size={13} /> <span>Reject</span>
            </button>
          )}
        </div>
      </div>

      {/* Reject panel */}
      {rejectOpen && (
        <div className="admin-card mod-panel">
          <h3 className="mod-danger-title">Reject with compliance feedback</h3>
          <div className="kyc-templates">
            {REJECTION_TEMPLATES.map((tmpl, idx) => (
              <button key={idx} type="button" className="btn btn-secondary btn-sm" onClick={() => setRejectReason(tmpl)}>
                Template #{idx + 1}
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            className="admin-input"
            style={{ width: '100%' }}
            placeholder="Select a template or type specific feedback…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="mod-panel-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setRejectOpen(false)}>Cancel</button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy || !rejectReason.trim()}
              onClick={() => runAction(
                () => adminApi.rejectKyc(user.id, rejectReason.trim()),
                `KYC rejected for @${user.username || user.name}. Feedback sent.`,
              )}
            >
              {busy ? 'Rejecting…' : 'Confirm rejection'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--admin-info)' }}><Car size={22} /></div>
          <div><div className="kyc-stat-label">Vehicle listings</div><div className="kyc-stat-val">{counts.cars ?? cars.length}</div></div>
        </div>
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(216, 98, 44, 0.12)', color: 'var(--color-orange)' }}><Layers size={22} /></div>
          <div><div className="kyc-stat-label">Part listings</div><div className="kyc-stat-val">{counts.parts ?? parts.length}</div></div>
        </div>
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--admin-success)' }}><ShoppingBag size={22} /></div>
          <div><div className="kyc-stat-label">Orders</div><div className="kyc-stat-val">{counts.orders ?? orders.length}</div></div>
        </div>
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--admin-warning)' }}><Wallet size={22} /></div>
          <div><div className="kyc-stat-label">Wallet available</div><div className="kyc-stat-val">₱ {Number(wallet.available || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div></div>
        </div>
      </div>

      {/* Identity + documents */}
      <div className="mod-cols">
        <div className="admin-card">
          <h3 className="mod-card-title">Identity & contact</h3>
          <div className="mod-grid">
            <Fact label="Legal name" value={user.name} />
            <Fact label="Username" value={user.username ? `@${user.username}` : '—'} />
            <Fact label="Email" value={user.email} />
            <Fact label="Phone" value={user.phone || '—'} />
            <Fact label="Role" value={(user.role || '').replace('_', ' ')} />
            <Fact label="Member since" value={user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'} />
            <Fact label="Last login" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '—'} />
            <Fact label="Interests" value={Array.isArray(user.interests) && user.interests.length > 0 ? user.interests.join(', ') : '—'} />
          </div>
        </div>

        <div className="admin-card">
          <h3 className="mod-card-title">KYC submission</h3>
          <div className="mod-grid">
            <Fact label="Document type" value={(user.kyc_document_type || '').replace('_', ' ') || '—'} />
            <Fact label="Document number" value={user.kyc_document_number || '—'} mono />
            <Fact label="Submitted" value={user.kyc_submitted_at ? new Date(user.kyc_submitted_at).toLocaleString() : '—'} />
            <Fact label="Verified" value={user.kyc_verified_at ? new Date(user.kyc_verified_at).toLocaleString() : '—'} />
          </div>
          {user.kyc_notes && <p className="mod-muted"><strong>Applicant notes:</strong> {user.kyc_notes}</p>}
          {user.kyc_rejection_reason && <p className="mod-muted"><strong>Last rejection:</strong> {user.kyc_rejection_reason}</p>}
          <div className="kyc-docs">
            {[
              { url: user.kyc_document_url, label: 'Government ID / permit' },
              { url: user.kyc_selfie_url, label: 'Selfie / showroom photo' },
            ].map((doc) => (
              <div key={doc.label} className="kyc-doc">
                <span className="kyc-doc-label">{doc.label}</span>
                {doc.url ? (
                  <button type="button" className="kyc-doc-thumb" onClick={() => setPreview({ url: doc.url, title: `${doc.label} — @${user.username || user.name}` })}>
                    <img src={doc.url} alt={doc.label} />
                    <span className="kyc-doc-zoom"><ZoomIn size={12} /> Enlarge</span>
                  </button>
                ) : (
                  <div className="kyc-doc-missing">Not uploaded</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Requests data */}
      <div className="admin-card kyc-req-card">
        <h3 className="mod-card-title">Seller upgrade requests ({apps.length})</h3>
        {apps.length === 0 ? (
          <p className="mod-muted" style={{ margin: 0 }}>No seller upgrade applications from this account.</p>
        ) : (
          <div className="table-container kyc-table">
            <table className="admin-table">
              <thead>
                <tr><th>Shop / business</th><th>Requested role</th><th>City</th><th>Status</th><th style={{ textAlign: 'right' }}>Submitted</th></tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id}>
                    <td><strong>{app.shop_name || '—'}</strong><div className="mod-muted">{app.contact_phone || ''}</div></td>
                    <td style={{ textTransform: 'capitalize' }}>{(app.requested_role || '').replace('_', ' ')}</td>
                    <td>{app.city || '—'}</td>
                    <td><span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{app.status}</span></td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mod-cols">
        <div className="admin-card kyc-req-card">
          <h3 className="mod-card-title">Recent listings</h3>
          {cars.length === 0 && parts.length === 0 ? (
            <p className="mod-muted" style={{ margin: 0 }}>No listings yet.</p>
          ) : (
            <div className="kyc-list">
              {cars.slice(0, 5).map((c) => (
                <Link key={`car-${c.id}`} to={`/moderation/${c.id}`} className="kyc-list-row">
                  <Car size={15} />
                  <span className="kyc-list-title">{c.title}</span>
                  <span className="badge badge-neutral">{c.status}</span>
                </Link>
              ))}
              {parts.slice(0, 5).map((p) => (
                <div key={`part-${p.id}`} className="kyc-list-row">
                  <Layers size={15} />
                  <span className="kyc-list-title">{p.title}</span>
                  <span className="badge badge-neutral">{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card kyc-req-card">
          <h3 className="mod-card-title">Recent orders & payouts</h3>
          {orders.length === 0 && withdrawals.length === 0 ? (
            <p className="mod-muted" style={{ margin: 0 }}>No orders or cash-outs yet.</p>
          ) : (
            <div className="kyc-list">
              {orders.slice(0, 5).map((o) => (
                <Link key={`order-${o.id}`} to={`/orders/${o.order_number || o.id}`} className="kyc-list-row">
                  <ShoppingBag size={15} />
                  <span className="kyc-list-title">{o.order_number || `#${o.id}`}</span>
                  <span className="badge badge-neutral">{o.status}</span>
                </Link>
              ))}
              {withdrawals.slice(0, 5).map((w) => (
                <div key={`wd-${w.id}`} className="kyc-list-row">
                  <Wallet size={15} />
                  <span className="kyc-list-title">Cash-out · ₱ {Number(w.net_amount || w.amount || 0).toLocaleString('en-PH')}</span>
                  <span className="badge badge-neutral">{w.status}</span>
                </div>
              ))}
            </div>
          )}
          {accounts.length > 0 && (
            <p className="mod-muted" style={{ marginTop: 10 }}>{accounts.length} payout account{accounts.length === 1 ? '' : 's'} on file.</p>
          )}
        </div>
      </div>

      {/* Document lightbox */}
      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(null)} style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: 14 }}>{preview.title}</h3>
              <button type="button" onClick={() => setPreview(null)} className="modal-close" aria-label="Close preview">×</button>
            </div>
            <div className="kyc-lightbox-body">
              <img src={preview.url} alt={preview.title} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
