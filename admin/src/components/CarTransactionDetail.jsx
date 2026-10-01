import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Store,
  DollarSign,
  Truck,
  ShieldCheck,
  PackageCheck,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ReceiptText,
  Handshake,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'
import { TimeAgo } from '../utils/timeAgo.jsx'

const peso = (val) =>
  `₱ ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const PROOF_STYLE = {
  none: { label: 'No Proof', bg: 'rgba(148, 163, 184, 0.15)', color: 'var(--admin-text-secondary)' },
  pending: { label: 'Proof Pending Review', bg: 'rgba(234, 179, 8, 0.15)', color: '#b45309' },
  approved: { label: 'Proof Approved', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' },
  rejected: { label: 'Proof Rejected', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
}

function payBadgeOf(pay) {
  if (pay === 'released') return { label: 'Released to Wallet', cls: 'badge-success' }
  if (pay === 'confirmed') return { label: 'Held — Confirmed', cls: 'badge-warning' }
  if (pay === 'paid') return { label: 'Held in Escrow', cls: 'badge-warning' }
  if (pay === 'refunded') return { label: 'Refunded', cls: 'badge-danger' }
  return { label: 'Payment Pending', cls: 'badge-neutral' }
}

const cardStyle = {
  background: 'var(--admin-bg-subtle)',
  padding: 14,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--admin-border)',
}

const cardTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--admin-text-secondary)',
  marginBottom: 6,
}

/**
 * Full car-build transaction view — the same block on the Car
 * Transactions desk and inside the Order Detail page: buyer + seller,
 * escrow hold, settlement (platform/agent/payout), fulfillment,
 * handover proof with approve/reject, and receipt links.
 */
export default function CarTransactionDetail({ order: ord, onChanged, showDeskLink = false, extraActions = null }) {
  const [busy, setBusy] = useState(false)
  if (!ord) return null

  const key = ord.order_number || `#${ord.id}`
  const proof = ord.proof || { status: 'none', images: [] }
  const proofStyle = PROOF_STYLE[proof.status] || PROOF_STYLE.none
  const pay = ord.financials?.payment_status || ord.payment_status || 'pending'
  const payBadge = payBadgeOf(pay)
  const canReview = proof.status === 'pending'
  const buyer = ord.buyer || {}
  const seller = ord.seller || {}
  const sellerName = seller.name || seller.username || ord.item?.seller_name || ord.seller_name || '—'
  const storefrontBase = (import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5173').replace(/\/$/, '')

  const total = Number(ord.financials?.total_amount ?? ord.total_amount ?? 0)
  const settle = ord.settlement || {}
  const platformRate = Number(settle.platform_rate ?? 5)
  const platformFee = Number(settle.platform_fee ?? (total * platformRate) / 100)
  const agentFee = Number(settle.agent_fee ?? ord.agent?.commission_amount ?? 0)
  const sellerReceives = Number(settle.seller_receives ?? total - platformFee - agentFee)

  const run = async (fn, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setBusy(true)
    try {
      await fn()
      await onChanged?.()
    } catch (err) {
      window.alert(err?.response?.data?.message || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  const approveProof = () =>
    run(
      () => adminApi.approveCarProof(ord.id),
      `Approve handover proof and RELEASE ${peso(ord.financials?.total_amount)} to the seller wallet?`,
    )

  const rejectProof = () => {
    const reason = window.prompt('Rejection reason shown to the seller:', '')
    if (reason === null) return
    if (!reason.trim()) {
      window.alert('A reason is required so the seller knows what to fix.')
      return
    }
    run(() => adminApi.rejectCarProof(ord.id, reason.trim()))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Parties: buyer + seller */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div style={cardStyle}>
          <div style={cardTitleStyle}><User size={14} /> Buyer</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{buyer.name || ord.buyer_name || '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
            {buyer.email || ord.buyer_email || ''}{buyer.phone || ord.buyer_phone ? ` · ${buyer.phone || ord.buyer_phone}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 4 }}>
            {buyer.full_address || ord.shipping_address || '—'}
          </div>
          {(buyer.user_id || ord.user_id) && (
            <Link to={`/kyc/${buyer.user_id || ord.user_id}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-rust)' }}>
              Open buyer profile →
            </Link>
          )}
        </div>
        <div style={cardStyle}>
          <div style={cardTitleStyle}><Store size={14} /> Seller</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{sellerName}</div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
            {seller.email || ''}{seller.phone ? ` · ${seller.phone}` : ''}
            {seller.username && seller.username !== seller.name ? ` · @${seller.username}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>
            Verification: <strong>{ord.verification_label || ord.verification_status || 'pending'}</strong>
          </div>
          {(seller.user_id || ord.seller_id) && (
            <Link to={`/kyc/${seller.user_id || ord.seller_id}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-rust)' }}>
              Open seller profile →
            </Link>
          )}
        </div>
        <div style={cardStyle}>
          <div style={cardTitleStyle}><DollarSign size={14} /> Escrow Hold</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{ord.financials?.formatted_total || peso(total)}</span>
            <span className={`badge ${payBadge.cls}`} style={{ fontSize: 11 }}>{payBadge.label}</span>
            {ord.payout_released && <span className="badge badge-success" style={{ fontSize: 11 }}>Wallet Paid</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Method: {ord.financials?.payment_method || ord.payment_method || '—'}
            {(ord.financials?.payment_reference || ord.payment_reference) && (
              <> · Ref: <strong style={{ fontFamily: 'monospace' }}>{ord.financials?.payment_reference || ord.payment_reference}</strong></>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>
            VIN: <strong style={{ fontFamily: 'monospace' }}>{ord.vehicle?.vin || ord.vin || 'N/A'}</strong>
          </div>
        </div>
      </div>

      {/* Settlement: platform + agent + payout */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}><Handshake size={14} /> Settlement — Commissions & Payout</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, fontSize: 13 }}>
          <div>Total paid: <strong>{ord.financials?.formatted_total || peso(total)}</strong></div>
          <div>Admin fee ({platformRate}%): <strong>−{peso(platformFee)}</strong></div>
          <div>
            Agent commission{(settle.agent_status || ord.agent?.commission_status) ? ` (${settle.agent_status || ord.agent?.commission_status})` : ''}: <strong>−{peso(agentFee)}</strong>
            {(ord.agent || ord.agent_code) && (
              <span style={{ color: 'var(--admin-text-muted)' }}> · {ord.agent?.name || ord.agent_name} ({ord.agent?.code || ord.agent_code})</span>
            )}
          </div>
          <div>Seller receives: <strong style={{ color: '#10b981' }}>{peso(sellerReceives)}</strong></div>
        </div>
      </div>

      {/* Fulfillment */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}><Truck size={14} /> Fulfillment</div>
        <div style={{ fontSize: 12 }}>
          Status: <strong style={{ textTransform: 'capitalize' }}>{ord.status_label || ord.status}</strong>
          {ord.carrier ? <> · Carrier: <strong>{ord.carrier}</strong></> : null}
        </div>
        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-rust)', marginTop: 2 }}>
          {ord.tracking_number || 'PENDING-DISPATCH'}
        </div>
        {ord.tracking_url && (
          <a href={ord.tracking_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-rust)' }}>
            Open buyer tracking link →
          </a>
        )}
      </div>

      {/* Handover proof */}
      <div style={{ border: '1px solid var(--admin-border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>
            Seller Handover Proof{' '}
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 12, background: proofStyle.bg, color: proofStyle.color, marginLeft: 6 }}>
              {proofStyle.label}
            </span>
          </div>
          {proof.submitted_at && (
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
              Submitted <TimeAgo value={proof.submitted_at} />
            </span>
          )}
        </div>

        {(!proof.images || proof.images.length === 0) && !proof.note ? (
          <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
            No proof submitted yet. The seller submits delivery photos + note once the vehicle is handed over.
          </div>
        ) : (
          <>
            {proof.images?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {proof.images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`Proof ${i + 1}`} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--admin-border)' }} />
                  </a>
                ))}
              </div>
            )}
            {proof.note && (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--admin-text-secondary)', marginBottom: 4 }}>
                “{proof.note}”
              </div>
            )}
            {proof.status === 'rejected' && proof.rejection_reason && (
              <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
                Returned: {proof.rejection_reason}
              </div>
            )}
          </>
        )}

        {canReview && (
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busy}
              onClick={approveProof}
              className="admin-btn admin-btn-primary"
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle2 size={14} />
              <span>{busy ? 'Releasing…' : 'Approve Proof — Release Funds to Wallet'}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={rejectProof}
              className="admin-btn admin-btn-secondary"
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <XCircle size={14} />
              <span>{busy ? 'Working…' : 'Return Proof with Reason'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer: receipt + links + caller actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--admin-border)', paddingTop: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ReceiptText size={13} /> Order Number: <strong>{key}</strong>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href={`${storefrontBase}/sales-order/${ord.order_number || ord.id}`}
            target="_blank"
            rel="noreferrer"
            className="admin-btn admin-btn-secondary"
            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <ExternalLink size={14} /> Buyer Receipt
          </a>
          {showDeskLink && (
            <Link
              to={`/orders/${ord.order_number || ord.id}`}
              className="admin-btn admin-btn-secondary"
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <PackageCheck size={14} /> Open Full Order View
            </Link>
          )}
          {extraActions}
        </div>
      </div>
    </div>
  )
}
