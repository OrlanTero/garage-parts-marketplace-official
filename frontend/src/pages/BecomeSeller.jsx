import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  UserCheck,
  FileText,
  Undo2,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { kycApi } from '../api/kyc.js'
import { sellerApplicationsApi, REQUESTABLE_ROLES } from '../api/sellerApplications.js'
import KycVerificationModal from '../components/KycVerificationModal.jsx'
import './BecomeSeller.css'

const SELLER_ROLES = ['seller', 'dealer', 'parts_seller', 'admin', 'super_admin']

function extractError(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat()[0]
    if (first) return data.message ? `${data.message} ${first}` : String(first)
  }
  return data.message || fallback
}

export default function BecomeSeller() {
  const { user, isAuthenticated, openLoginModal, refresh } = useAuth()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [eligibility, setEligibility] = useState(null)
  const [kyc, setKyc] = useState(null)
  const [kycModalOpen, setKycModalOpen] = useState(false)

  const [requestedRole, setRequestedRole] = useState('seller')
  const [shopName, setShopName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await sellerApplicationsApi.mine()
      setApplications(res.data || [])
      setEligibility(res.eligibility || null)
      const pending = res.eligibility?.pending_application
      if (!pending) {
        const last = (res.data || [])[0]
        if (last && (last.status === 'rejected' || last.status === 'withdrawn')) {
          setRequestedRole(last.requested_role || 'seller')
          setShopName(last.shop_name || '')
          setContactPhone(last.contact_phone || '')
          setCity(last.city || '')
          setAddress(last.address || '')
          setReason(last.reason || '')
        }
      }
    } catch (err) {
      setError(extractError(err, 'Failed to load your seller applications.'))
    } finally {
      setLoading(false)
    }
    try {
      const status = await kycApi.getStatus()
      setKyc(status.kyc || null)
      if (status.user) refresh()
    } catch {
      // KYC status is best-effort; eligibility flags remain authoritative
    }
  }, [refresh])

  useEffect(() => {
    if (isAuthenticated) load()
    else setLoading(false)
  }, [isAuthenticated, load])

  const handleKycModalClose = () => {
    setKycModalOpen(false)
    load()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await sellerApplicationsApi.apply({
        requested_role: requestedRole,
        shop_name: shopName.trim(),
        contact_phone: contactPhone.trim(),
        city: city.trim(),
        address: address.trim() || undefined,
        reason: reason.trim() || undefined,
      })
      setSuccess(res.message || 'Application submitted.')
      await load()
    } catch (err) {
      setError(extractError(err, 'Failed to submit your application.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdraw = async (id) => {
    setWithdrawing(true)
    setError(null)
    try {
      await sellerApplicationsApi.withdraw(id)
      setSuccess('Application withdrawn. You may submit a new one anytime.')
      await load()
    } catch (err) {
      setError(extractError(err, 'Failed to withdraw your application.'))
    } finally {
      setWithdrawing(false)
    }
  }

  const kycVerified = eligibility?.kyc_verified ?? kyc?.is_verified ?? user?.is_kyc_verified ?? false
  const kycStatus = eligibility?.kyc_status ?? kyc?.status ?? user?.kyc_status ?? 'not_submitted'
  const pendingApp = eligibility?.pending_application || applications.find((a) => a.status === 'pending') || null
  const approvedApp = applications.find((a) => a.status === 'approved') || null
  const rejectedApp = applications.find((a) => a.status === 'rejected') || null
  const isAlreadySeller = user && SELLER_ROLES.includes(user.role)

  return (
    <div className="become-seller-page">
      <div className="become-seller-container">
        <div className="become-seller-hero">
          <span className="become-seller-hero-icon"><Store size={26} /></span>
          <div>
            <h1>Become a Seller</h1>
            <p className="muted">Upgrade your buyer account to a verified Seller, Parts Seller, or Dealer merchant — reviewed by our admin team.</p>
          </div>
        </div>

        {loading && <div className="become-card"><p className="muted">Loading your application status…</p></div>}

        {!loading && !isAuthenticated && (
          <div className="become-card become-card--center">
            <UserCheck size={36} className="become-accent" />
            <h2>Sign in to apply</h2>
            <p className="muted">You need a buyer account before requesting a seller upgrade.</p>
            <button type="button" className="btn btn-primary" onClick={openLoginModal}>Sign In / Register</button>
          </div>
        )}

        {!loading && isAuthenticated && isAlreadySeller && (
          <div className="become-card become-card--success">
            <CheckCircle2 size={36} className="become-success-icon" />
            <h2>You already have selling privileges</h2>
            <p className="muted">Your account is registered as <strong>{user.role?.replace('_', ' ')}</strong>. Manage your inventory and track every listing status from your dashboard.</p>
            <Link to="/my-listings" className="btn btn-primary">Open My Listings Dashboard <ChevronRight size={16} /></Link>
          </div>
        )}

        {!loading && isAuthenticated && !isAlreadySeller && (
          <>
            {error && <div className="become-alert become-alert--error">{error}</div>}
            {success && <div className="become-alert become-alert--success">{success}</div>}

            {/* Step 1 — KYC security check */}
            <div className="become-card">
              <div className="become-step-head">
                <span className="become-step-num">1</span>
                <div>
                  <h2>Identity verification (KYC)</h2>
                  <p className="muted">Security requirement — admin can only approve sellers with a verified KYC badge.</p>
                </div>
                {kycVerified ? (
                  <span className="become-pill become-pill--success"><CheckCircle2 size={14} /> Verified</span>
                ) : kycStatus === 'pending' ? (
                  <span className="become-pill become-pill--warning"><Clock size={14} /> In review</span>
                ) : kycStatus === 'rejected' ? (
                  <span className="become-pill become-pill--danger"><XCircle size={14} /> Rejected</span>
                ) : (
                  <span className="become-pill"><ShieldAlert size={14} /> Unverified</span>
                )}
              </div>
              {!kycVerified && (
                <button type="button" className="btn btn-secondary" onClick={() => setKycModalOpen(true)}>
                  <ShieldCheck size={16} /> {kycStatus === 'not_submitted' ? 'Start KYC Verification' : 'Update KYC Documents'}
                </button>
              )}
            </div>

            {/* Step 2/3 — application state */}
            {approvedApp ? (
              <div className="become-card become-card--success">
                <CheckCircle2 size={36} className="become-success-icon" />
                <h2>Application approved — welcome, seller!</h2>
                <p className="muted">Your account was upgraded to <strong>{approvedApp.requested_role?.replace('_', ' ')}</strong>. You can now create listings and track their marketplace statuses.</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link to="/my-listings" className="btn btn-primary">Open My Listings Dashboard <ChevronRight size={16} /></Link>
                  <Link to="/sell" className="btn btn-secondary">Create a Listing</Link>
                </div>
              </div>
            ) : pendingApp ? (
              <div className="become-card">
                <div className="become-step-head">
                  <span className="become-step-num">2</span>
                  <div>
                    <h2>Application under review</h2>
                    <p className="muted">Submitted {pendingApp.created_at ? new Date(pendingApp.created_at).toLocaleString() : ''} — our admin team typically reviews within 24–48 hours.</p>
                  </div>
                  <span className="become-pill become-pill--warning"><Clock size={14} /> Pending</span>
                </div>
                <dl className="become-facts">
                  <div><dt>Account type</dt><dd>{pendingApp.requested_role?.replace('_', ' ')}</dd></div>
                  <div><dt>Shop / garage</dt><dd>{pendingApp.shop_name}</dd></div>
                  <div><dt>Contact</dt><dd>{pendingApp.contact_phone} · {pendingApp.city}</dd></div>
                  <div><dt>KYC badge</dt><dd>{kycVerified ? 'Verified ✓' : 'Awaiting verification — complete Step 1 to avoid delays'}</dd></div>
                </dl>
                <button type="button" className="btn btn-ghost" disabled={withdrawing} onClick={() => handleWithdraw(pendingApp.id)}>
                  <Undo2 size={15} /> {withdrawing ? 'Withdrawing…' : 'Withdraw application'}
                </button>
              </div>
            ) : (
              <form className="become-card" onSubmit={handleSubmit}>
                <div className="become-step-head">
                  <span className="become-step-num">2</span>
                  <div>
                    <h2>Seller application</h2>
                    <p className="muted">Tell us about your shop. You can apply before KYC is approved — but approval requires the verified badge.</p>
                  </div>
                </div>

                {rejectedApp && (
                  <div className="become-alert become-alert--error">
                    <FileText size={15} /> Previous application was rejected{rejectedApp.review_notes ? `: “${rejectedApp.review_notes}”` : '.'} Update your details and re-apply below.
                  </div>
                )}

                <div className="become-role-grid">
                  {REQUESTABLE_ROLES.map((role) => (
                    <label key={role.value} className={`become-role-card ${requestedRole === role.value ? 'become-role-card--active' : ''}`}>
                      <input
                        type="radio"
                        name="requested_role"
                        value={role.value}
                        checked={requestedRole === role.value}
                        onChange={() => setRequestedRole(role.value)}
                      />
                      <span className="become-role-label">{role.label}</span>
                      <span className="become-role-desc">{role.desc}</span>
                    </label>
                  ))}
                </div>

                <div className="become-form-grid">
                  <label>Shop / garage name *
                    <input value={shopName} onChange={(e) => setShopName(e.target.value)} required maxLength={120} placeholder="e.g. Calamaya Garage" />
                  </label>
                  <label>Contact phone *
                    <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required maxLength={30} placeholder="09xx xxx xxxx" />
                  </label>
                  <label>City *
                    <input value={city} onChange={(e) => setCity(e.target.value)} required maxLength={100} placeholder="e.g. Makati City" />
                  </label>
                  <label>Street address
                    <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={255} placeholder="Street, barangay (optional)" />
                  </label>
                </div>
                <label className="become-full">Why do you want to sell? (optional)
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3} placeholder="Tell the review team about your builds, parts stock, or dealership…" />
                </label>

                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Seller Application'}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      <KycVerificationModal isOpen={kycModalOpen} onClose={handleKycModalClose} />
    </div>
  )
}
