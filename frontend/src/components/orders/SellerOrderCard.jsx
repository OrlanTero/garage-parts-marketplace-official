import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Eye, Check, X, Truck, FileCheck2, Undo2, ChevronRight, Store, BadgeCheck,
} from 'lucide-react'
import { sellerOrdersApi } from '../../api/seller.js'
import { nextStatusFor, statusLabel, CLOSED_ORDER_STATUSES } from './orderFlow.js'
import OrderReceiptCard from './OrderReceiptCard.jsx'
import ProofSubmitModal from './ProofSubmitModal.jsx'

const CLOSED = CLOSED_ORDER_STATUSES

function extractError(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat()[0]
    if (first) return data.message ? `${data.message} ${first}` : String(first)
  }
  return data.message || fallback
}

/**
 * End-to-end seller control for ONE sales order:
 * verify → advance fulfillment → submit proof → wait for admin funds → refund on dispute.
 * Used in My Listings > Requests tab and in Listing detail > Sales orders.
 */
export default function SellerOrderCard({ order, onChanged, showListing = true, onOpen }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [proofOpen, setProofOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const verification = order?.verification_status || 'pending'
  const status = order?.status || 'processing'
  const isCar = (order?.item?.type || order?.item_type) === 'car'
  const proofStatus = order?.proof?.status || 'none'
  const closed = CLOSED.includes(status)
  const next = nextStatusFor(order)

  const actionHint = useMemo(() => {
    if (verification === 'pending') return 'New request — verify the buyer to unlock payment.'
    if (verification === 'rejected') return 'Declined. No further action.'
    if (closed) return 'Closed order.'
    if (status === 'disputed') return 'Disputed — refund the buyer or wait for support ruling.'
    if (isCar && ['shipped', 'delivered'].includes(status) && proofStatus !== 'approved') {
      return proofStatus === 'pending'
        ? 'Handover proof is with the admin — funds release on approval.'
        : proofStatus === 'rejected'
          ? 'Proof rejected — fix and resubmit to unlock escrowed funds.'
          : 'Delivered — submit handover proof so admin can release your funds.'
    }
    if (next) return `Next: move to “${statusLabel(next)}”.`
    return 'All seller steps done.'
  }, [verification, closed, status, isCar, proofStatus, next])

  if (!order) return null

  const run = async (key, fn, successMsg) => {
    setBusy(key)
    setError('')
    setOk('')
    try {
      const updated = await fn()
      setOk(successMsg)
      onChanged?.(updated)
    } catch (err) {
      setError(extractError(err, 'Action failed.'))
    } finally {
      setBusy(null)
    }
  }

  const handleAccept = () => {
    if (!window.confirm(`Accept request ${order.order_number || `#${order.id}`}? Other pending requests for this listing auto-decline.`)) return
    run(`accept-${order.id}`, () => sellerOrdersApi.accept(order.id), 'Request accepted — payment unlocked for the buyer.')
  }

  const handleReject = () => {
    const note = window.prompt('Reason for declining (optional, shown to buyer):', '')
    if (note === null) return
    run(`reject-${order.id}`, () => sellerOrdersApi.reject(order.id, note || undefined), 'Request declined.')
  }

  const handleStatus = (nextStatus) => {
    if (!nextStatus || nextStatus === status) return
    if (!window.confirm(`Move order ${order.order_number || `#${order.id}`} to “${nextStatus}”?`)) return
    run(`status-${order.id}`, () => sellerOrdersApi.updateStatus(order.id, { status: nextStatus }), `Order moved to ${nextStatus}.`)
  }

  const handleRefund = () => {
    const note = window.prompt('Refund note for the buyer (optional):', isCar ? 'Refunded after inspection dispute.' : 'Refunded after dispute resolution.')
    if (note === null) return
    if (!window.confirm(`Refund the payment for order ${order.order_number || `#${order.id}`} back to the buyer?`)) return
    run(`refund-${order.id}`, () => sellerOrdersApi.refund(order.id, note || undefined), 'Payment refunded. Order closed as refunded.')
  }

  const canAdvance = verification === 'accepted' && !closed
  const canProof = verification === 'accepted' && isCar && ['shipped', 'delivered'].includes(status) && proofStatus !== 'approved'

  return (
    <div className="seller-order-card">
      <div className="seller-order-top" onClick={() => setExpanded((v) => !v)} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v) } }}>
        <div className="seller-order-lead">
          <span className="seller-order-thumb">
            {order.item?.image_url ? (
              <img src={order.item.image_url} alt="" loading="lazy" />
            ) : (
              <Store size={18} />
            )}
          </span>
          <div className="seller-order-id">
            <span className="order-number">{order.order_number || `Order #${order.id}`}</span>
            <span className="seller-order-badges">
              <span className={`order-badge order-badge--${status}`}>{status}</span>
              <span className={`listing-badge ${verification === 'accepted' ? 'listing-badge--live' : verification === 'rejected' ? 'listing-badge--rejected' : 'listing-badge--pending'}`}>
                {order.verification_label || verification}
              </span>
              {proofStatus !== 'none' && (
                <span className="listing-badge listing-badge--draft">Proof: {proofStatus}</span>
              )}
            </span>
          </div>
          <span className="seller-order-amount">{order.financials?.formatted_total || ''}</span>
        </div>
        <div className="seller-order-meta">
          {showListing && <span className="muted"><Store size={12} /> {order.item?.name || order.item_name || 'Listing'}</span>}
          <span className="muted">{order.buyer?.name || order.buyer_name || ''}</span>
          {order.financials?.payment_reference && (
            <span className="muted" style={{ fontFamily: 'monospace' }}>Ref: {order.financials.payment_reference}</span>
          )}
          <ChevronRight size={15} className={expanded ? 'seller-order-chevron seller-order-chevron--open' : 'seller-order-chevron'} />
        </div>
        <div className="seller-order-hint">{actionHint}</div>
      </div>

      {error && <div className="my-listings-alert my-listings-alert--error">{error}</div>}
      {ok && <div className="my-listings-alert my-listings-alert--success"><BadgeCheck size={14} /> {ok}</div>}

      <div className="seller-order-actions">
        {onOpen && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={(e) => { e.stopPropagation(); onOpen(order) }}
          >
            Manage <ChevronRight size={13} />
          </button>
        )}
        <Link to={`/sales-order/${order.order_number || order.id}`} className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()}>
          <Eye size={13} /> Receipt
        </Link>

        {verification === 'pending' && (
          <>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={handleAccept}>
              <Check size={13} /> {busy === `accept-${order.id}` ? 'Accepting…' : 'Accept buyer'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm btn-danger-ghost" disabled={busy} onClick={handleReject}>
              <X size={13} /> Decline
            </button>
          </>
        )}

        {canAdvance && next && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!!busy}
            onClick={() => handleStatus(next)}
            title={`One way forward: ${status} → ${next}. No going back.`}
          >
            <Truck size={13} /> {busy === `status-${order.id}` ? 'Moving…' : `Mark ${statusLabel(next)}`}
          </button>
        )}

        {verification === 'accepted' && status === 'disputed' && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={!!busy} onClick={handleRefund}>
            <Undo2 size={13} /> {busy === `refund-${order.id}` ? 'Refunding…' : 'Refund buyer'}
          </button>
        )}

        {canProof && (
          <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => setProofOpen(true)}>
            <FileCheck2 size={13} />
            {proofStatus === 'pending' ? 'Resubmit proof' : proofStatus === 'rejected' ? 'Fix & resubmit proof' : 'Submit handover proof'}
          </button>
        )}
      </div>

      {expanded && (
        <div className="seller-order-receipt">
          <OrderReceiptCard order={order} role="seller" />
        </div>
      )}

      {proofOpen && (
        <ProofSubmitModal
          order={order}
          onClose={() => setProofOpen(false)}
          onSubmitted={(updated) => {
            setOk('Handover proof submitted — admin review releases your held funds to your wallet.')
            onChanged?.(updated)
          }}
        />
      )}
    </div>
  )
}
