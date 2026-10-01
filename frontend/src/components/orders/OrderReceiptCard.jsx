import { Link } from 'react-router-dom'
import {
  ReceiptText, User, CreditCard, ShieldCheck, Truck, PackageCheck,
  QrCode, Printer, ExternalLink,
} from 'lucide-react'
import OrderTimeline from './OrderTimeline.jsx'

function formatPrice(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return value ?? '—'
  return `₱${num.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function fundsBanner(order, role = 'seller') {
  // Payout language is ONLY for the seller of a car build — he is the one
  // who gets paid out of escrow. Buyers pay, they never receive funds,
  // and parts settle without an escrow proof flow. Anyone else sees
  // no funds banner at all.
  if (role !== 'seller') return null
  const isCar = (order?.item?.type || order?.item_type) === 'car'
  if (!isCar) return null
  const status = order?.status
  const pay = order?.financials?.payment_status || order?.payment_status || 'pending'
  const proof = order?.proof?.status || 'none'
  if (['refunded', 'cancelled'].includes(status)) return null
  if (status === 'completed') {
    return {
      cls: 'funds-banner--done',
      title: 'Funds released — payout complete',
      body: 'Buyer inspection passed. Escrow released to your wallet.',
    }
  }
  // car escrow path
  if (!['paid', 'confirmed'].includes(pay)) return null
  if (proof === 'approved') {
    return {
      cls: 'funds-banner--review',
      title: 'Proof approved — waiting for admin fund release',
      body: 'Handover proof passed review. The admin is releasing escrow to your wallet. No further action needed.',
    }
  }
  if (proof === 'pending') {
    return {
      cls: 'funds-banner--review',
      title: 'Proof under review — funds held in escrow',
      body: 'Your handover proof is with the admin reviewer. Funds stay frozen until approval, then move to your wallet.',
    }
  }
  if (proof === 'rejected') {
    return {
      cls: 'funds-banner--action',
      title: 'Proof rejected — fix and resubmit to unlock funds',
      body: order?.proof?.rejection_reason || 'The reviewer needs clearer handover evidence.',
    }
  }
  return {
    cls: 'funds-banner--held',
    title: 'Payment held in escrow — secured',
    body: 'Deliver the unit, then submit handover proof. Funds release only after admin approval.',
  }
}

/**
 * Full sales-order receipt card shared by seller + buyer detail views.
 * Shows money breakdown, payment, proof (cars) / delivery (parts), QR.
 * The stepper is optional — detail pages that already show a timeline
 * pass showTimeline={false} so statuses never render twice.
 */
export default function OrderReceiptCard({ order, role = 'seller', showTimeline = true }) {
  if (!order) return null
  const fin = order.financials || {}
  const buyer = order.buyer || {}
  const verification = order.verification_status || 'pending'
  const payStatus = fin.payment_status || order.payment_status || 'pending'
  const orderNum = order.order_number || `#${order.id}`
  const funds = fundsBanner(order, role)
  const verifyPath = order.security_hash ? `/verify/${order.security_hash}` : null
  const isCar = (order?.item?.type || order?.item_type) === 'car'
  // Same fields the admin delivery workspace writes — one source of truth.
  const trackingNumber = order.tracking_number || order.trackingNumber || ''
  const hasTracking = Boolean(trackingNumber || order.tracking_url || order.carrier)
  const eta = order.estimated_arrival_display || order.estimated_arrival || ''

  return (
    <div className="receipt-card">
      <div className="receipt-card-head">
        <div>
          <div className="receipt-card-title"><ReceiptText size={15} /> {orderNum}</div>
          <div className="receipt-card-sub">
            Placed {formatDate(order.created_at || order.placed_at)}
            {order.item?.name || order.item_name ? ` · ${order.item.name || order.item_name}` : ''}
          </div>
        </div>
        <div className="receipt-card-amount">{fin.formatted_total || formatPrice(fin.total_amount ?? order.total_amount)}</div>
      </div>

      {showTimeline && <OrderTimeline order={order} />}

      <div className="receipt-grid">
        <div className="receipt-box">
          <div className="receipt-box-title"><User size={13} /> {role === 'seller' ? 'Buyer' : 'Seller'}</div>
          <div className="receipt-box-name">{role === 'seller' ? (buyer.name || order.buyer_name || '—') : (order.seller?.name || order.seller_name || order.item?.seller_name || '—')}</div>
          {(role === 'seller' ? (buyer.email || buyer.phone) : (order.seller?.email || '')) && (
            <div className="receipt-box-muted">{role === 'seller' ? [buyer.email, buyer.phone].filter(Boolean).join(' · ') : (order.seller?.email || '')}</div>
          )}
          <div className="receipt-box-muted">Verification: <strong>{order.verification_label || verification}</strong></div>
          <div className="receipt-box-muted">Fulfillment: <strong style={{ textTransform: 'capitalize' }}>{order.status}</strong></div>
          {order.vehicle?.chassis_number && <div className="receipt-box-muted">Chassis: <strong>{order.vehicle.chassis_number}</strong></div>}
        </div>

        <div className="receipt-box">
          <div className="receipt-box-title"><CreditCard size={13} /> Payment</div>
          <div className="receipt-box-muted">Method: <strong style={{ textTransform: 'capitalize' }}>{(fin.payment_method || '').replace(/_/g, ' ') || '—'}</strong></div>
          <div className="receipt-box-muted">Status: <strong>{fin.payment_label || payStatus}</strong></div>
          {fin.payment_reference && <div className="receipt-box-muted">Ref: <code>{fin.payment_reference}</code></div>}
          <div className="receipt-money">
            <div><span>Unit</span><span>{fin.formatted_unit_price || formatPrice(fin.unit_price)}</span></div>
            {(fin.shipping_fee ?? order.shipping_fee) != null && (
              <div><span>Freight</span><span>{fin.formatted_shipping_fee || formatPrice(fin.shipping_fee ?? 0)}</span></div>
            )}
            {Number(fin.discount_amount || 0) > 0 && (
              <div><span>Discount</span><span>{fin.formatted_discount || formatPrice(fin.discount_amount)}</span></div>
            )}
            <div className="receipt-money-total"><span>Total</span><span>{fin.formatted_total || formatPrice(fin.total_amount)}</span></div>
          </div>
        </div>

        {isCar ? (
        <div className="receipt-box">
          <div className="receipt-box-title"><PackageCheck size={13} /> Handover proof</div>
          <div className="receipt-box-muted">Proof: <strong style={{ textTransform: 'capitalize' }}>{order.proof?.status || 'not submitted'}</strong></div>
          {order.proof?.rejection_reason && <div className="receipt-box-muted">Reviewer note: {order.proof.rejection_reason}</div>}
          {Array.isArray(order.proof?.images) && order.proof.images.length > 0 && (
            <div className="receipt-proof-thumbs">
              {order.proof.images.slice(0, 4).map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noreferrer">
                  <img src={src} alt={`Proof ${i + 1}`} loading="lazy" />
                </a>
              ))}
            </div>
          )}
          {hasTracking && (
            <div className="receipt-box-muted">
              <Truck size={12} /> {order.carrier ? `${order.carrier} · ` : ''}{trackingNumber}
              {order.tracking_url && <> · <a href={order.tracking_url} target="_blank" rel="noreferrer">Track</a></>}
            </div>
          )}
          {eta && (
            <div className="receipt-box-muted">ETA: <strong>{eta}</strong></div>
          )}
        </div>
        ) : (
        <div className="receipt-box">
          <div className="receipt-box-title"><Truck size={13} /> Delivery</div>
          {hasTracking ? (
            <>
              {order.carrier && <div className="receipt-box-muted">Courier: <strong>{order.carrier}</strong></div>}
              {trackingNumber && <div className="receipt-box-muted">Tracking: <strong style={{ fontFamily: 'monospace' }}>{trackingNumber}</strong></div>}
              {order.tracking_url && <div className="receipt-box-muted"><a href={order.tracking_url} target="_blank" rel="noreferrer">Track my delivery →</a></div>}
              {eta && <div className="receipt-box-muted">ETA: <strong>{eta}</strong></div>}
            </>
          ) : (
            <div className="receipt-box-muted">Tracking will appear here once the garage ships your order.</div>
          )}
        </div>
        )}
      </div>

      {funds && (
        <div className={`funds-banner ${funds.cls}`}>
          <ShieldCheck size={16} />
          <div>
            <strong>{funds.title}</strong>
            <p>{funds.body}</p>
          </div>
        </div>
      )}

      <div className="receipt-card-foot">
        <div className="receipt-verify">
          <QrCode size={13} />
          {verifyPath ? (
            <Link to={verifyPath}><code>{order.security_hash}</code> · Verify receipt <ExternalLink size={11} /></Link>
          ) : (
            <span className="muted">No verification hash on this order yet.</span>
          )}
        </div>
        <div className="receipt-foot-actions">
          <Link to={`/sales-order/${order.order_number || order.id}`} className="btn btn-ghost btn-sm">
            <Printer size={13} /> Full receipt
          </Link>
        </div>
      </div>
    </div>
  )
}
