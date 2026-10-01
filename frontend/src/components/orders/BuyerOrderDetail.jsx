import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, ShieldAlert, ShieldCheck, CreditCard,
  CheckCircle2, Car, Printer, MapPin, Truck,
} from 'lucide-react'
import { ordersApi } from '../../api/orders.js'
import { useOrderStatusListener } from '../../realtime/useOrderStatus.js'
import OrderReceiptCard from './OrderReceiptCard.jsx'
import CarBuildTracker from './CarBuildTracker.jsx'

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
 * Buyer-facing full order detail: listing info, statuses incl. inspection,
 * sales-order receipt, and every buyer button end-to-end
 * (pay → confirm payment → inspect accept/reject → print receipt).
 */
export default function BuyerOrderDetail({ orderNumber, onBack }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [payMethod, setPayMethod] = useState('bank_transfer')
  const [payRef, setPayRef] = useState('')
  const [payBusy, setPayBusy] = useState(false)
  const [inspectBusy, setInspectBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    if (!orderNumber) return
    setLoading(true)
    setError('')
    try {
      const data = await ordersApi.show(orderNumber)
      setOrder(data)
      const current = data?.financials?.payment_method || data?.payment_method
      if (current) setPayMethod(current)
    } catch (err) {
      setError(extractError(err, 'Could not load this order.'))
    } finally {
      setLoading(false)
    }
  }, [orderNumber])

  useEffect(() => { load() }, [load])

  // Realtime: seller / garage / admin moves on this order (verify, funds
  // confirm, shipped, delivered, completed) refresh the detail instantly.
  useOrderStatusListener((event) => {
    if (!event || !orderNumber) return
    if (
      String(event.order_number) === String(orderNumber) ||
      String(event.order_id) === String(orderNumber)
    ) {
      load()
    }
  })

  const handlePayMethod = async (method) => {
    setPayMethod(method)
    try {
      const updated = await ordersApi.updatePaymentMethod(orderNumber, method)
      setOrder(updated)
    } catch { /* keep local selection */ }
  }

  const handleConfirmPayment = async () => {
    if (!payRef.trim()) {
      setError('Enter the bank / e-wallet transaction reference first.')
      return
    }
    setPayBusy(true)
    setError('')
    try {
      const updated = await ordersApi.confirmPayment(orderNumber, {
        payment_method: payMethod,
        payment_reference: payRef.trim(),
      })
      setOrder(updated)
      setPayRef('')
      setNotice('Payment submitted — the house confirms receipt before dispatch.')
    } catch (err) {
      setError(extractError(err, 'Failed to confirm payment.'))
    } finally {
      setPayBusy(false)
    }
  }

  const handleAccept = async () => {
    if (!window.confirm('Accept this delivery? The held payment releases to the seller and the order completes.')) return
    setInspectBusy(true)
    setError('')
    try {
      const updated = await ordersApi.acceptInspection(orderNumber)
      setOrder(updated)
      setNotice('Car accepted — payment released. Receipt below is your proof of transaction.')
    } catch (err) {
      setError(extractError(err, 'Failed to accept inspection.'))
    } finally {
      setInspectBusy(false)
    }
  }

  const handleReject = async () => {
    setInspectBusy(true)
    setError('')
    try {
      const updated = await ordersApi.rejectInspection(orderNumber, rejectReason.trim() || undefined)
      setOrder(updated)
      setRejectOpen(false)
      setRejectReason('')
      setNotice('Dispute opened — funds stay frozen until it resolves.')
    } catch (err) {
      setError(extractError(err, 'Failed to open dispute.'))
    } finally {
      setInspectBusy(false)
    }
  }

  if (loading && !order) {
    return (
      <div className="my-listings-card my-listings-card--center">
        <RefreshCw size={22} className="spin" />
        <p className="muted">Loading order {orderNumber}…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="my-listings-card my-listings-card--center">
        <ShieldAlert size={28} />
        <h2>Order not found</h2>
        <p className="muted">{error || `Could not find order ${orderNumber}.`}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to orders
        </button>
      </div>
    )
  }

  const verification = order.verification_status || 'pending'
  const payStatus = order.financials?.payment_status || order.payment_status || 'pending'
  const isCar = (order.item?.type || order.item_type) === 'car'
  const isDelivered = order.status === 'delivered'
  const isDisputed = order.status === 'disputed'
  const isCompleted = order.status === 'completed'
  const canPay = verification === 'accepted' && payStatus === 'pending'
  const canInspect = isCar && verification === 'accepted' && isDelivered && !isCompleted && !isDisputed
  const item = order.item || {}

  // Delivery Information mirrors the admin back-office workspace
  // (courier, tracking, ETA) — shown only when the garage/admin has
  // attached delivery info, i.e. only if necessary.
  const deliveryCarrier = order.carrier || ''
  const deliveryTracking = order.tracking_number || order.trackingNumber || ''
  const deliveryUrl = order.tracking_url || ''
  const deliveryEta = order.estimated_arrival_display || order.estimated_arrival || ''
  const hasDeliveryInfo = Boolean(deliveryCarrier || deliveryTracking || deliveryUrl || deliveryEta)

  return (
    <div className="listing-detail">
      <div className="listing-detail-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to My Orders
        </button>
        <div className="listing-detail-header-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <Link to={`/sales-order/${order.order_number || order.id}`} className="btn btn-secondary btn-sm">
            <Printer size={13} /> Full receipt page
          </Link>
        </div>
      </div>

      {error && <div className="my-listings-alert my-listings-alert--error"><ShieldAlert size={14} /> {error}</div>}
      {notice && <div className="my-listings-alert my-listings-alert--success"><ShieldCheck size={14} /> {notice}</div>}

      <div className="listing-detail-hero buyer-order-hero">
        <div className="listing-detail-image">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name || 'Item'} />
          ) : (
            <div className="listing-detail-image-placeholder"><Car size={44} /></div>
          )}
        </div>
        <div className="listing-detail-info">
          <div className="listing-detail-title-row">
            <h2>{item.name || order.item_name || 'Automotive Component'}</h2>
            <span className="order-badge order-badge--processing">{order.verification_label || verification}</span>
          </div>
          <div className="listing-detail-price">{order.financials?.formatted_total || ''}</div>
          <div className="listing-detail-specs">
            <span className="listing-detail-spec">Order {order.order_number || `#${order.id}`}</span>
            {order.delivery?.zone && (
              <span className="listing-detail-spec"><MapPin size={13} /> {order.delivery.zone}</span>
            )}
          </div>
          <div className="buyer-order-facts">
            <div className="buyer-order-fact">
              <span>Seller</span>
              <strong>{order.seller?.name || order.seller_name || item.seller_name || '—'}</strong>
            </div>
            <div className="buyer-order-fact">
              <span>Payment</span>
              <strong style={{ textTransform: 'capitalize' }}>
                {(order.financials?.payment_method || '').replace(/_/g, ' ') || '—'}
                {order.financials?.payment_reference ? ` · ${order.financials.payment_reference}` : ''}
              </strong>
            </div>
            <div className="buyer-order-fact">
              <span>Placed</span>
              <strong>{order.placed_at || (order.created_at ? new Date(order.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—')}</strong>
            </div>
            {isCar ? (
              order.vehicle?.vin && (
                <div className="buyer-order-fact">
                  <span>VIN</span>
                  <strong style={{ fontFamily: 'monospace' }}>{order.vehicle.vin}</strong>
                </div>
              )
            ) : (
              order.vehicle?.chassis_number && (
                <div className="buyer-order-fact">
                  <span>Chassis</span>
                  <strong style={{ fontFamily: 'monospace' }}>{order.vehicle.chassis_number}</strong>
                </div>
              )
            )}
            {order.financials?.formatted_shipping_fee && (
              <div className="buyer-order-fact">
                <span>Freight</span>
                <strong>{order.financials.formatted_shipping_fee}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {verification === 'pending' && (
        <div className="funds-banner funds-banner--review">
          <ShieldCheck size={16} />
          <div>
            <strong>Awaiting seller verification</strong>
            <p>Payment unlocks automatically once the seller accepts your request. Nothing to pay yet.</p>
          </div>
        </div>
      )}

      {canPay && (
        <div className="listing-detail-section">
          <h3 className="listing-detail-section-title"><CreditCard size={17} /> Pay for this order</h3>
          <div className="buyer-pay-methods">
            {[
              { id: 'bank_transfer', label: 'Bank Transfer' },
              { id: 'ewallet', label: 'GCash / Maya' },
              { id: 'credit_card', label: 'Card' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={payMethod === m.id ? 'my-listings-chip my-listings-chip--active' : 'my-listings-chip'}
                onClick={() => handlePayMethod(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="buyer-pay-row">
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="Bank / e-wallet transaction reference *"
              className="buyer-pay-input"
            />
            <button type="button" className="btn btn-primary btn-sm" disabled={payBusy} onClick={handleConfirmPayment}>
              {payBusy ? 'Submitting…' : "I've Sent Payment"}
            </button>
          </div>
        </div>
      )}

      {canInspect && (
        <div className="listing-detail-section buyer-inspect-box">
          <h3 className="listing-detail-section-title"><CheckCircle2 size={17} /> Delivered — inspect the car now</h3>
          <p className="muted">Accept to release the held payment and complete the order, or reject to open a dispute.</p>
          {!rejectOpen ? (
            <div className="listing-detail-actions">
              <button type="button" className="btn btn-primary btn-sm" disabled={inspectBusy} onClick={handleAccept}>
                <CheckCircle2 size={14} /> Accept car — release payment
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={inspectBusy} onClick={() => setRejectOpen(true)}>
                Reject — open dispute
              </button>
            </div>
          ) : (
            <div>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason (shown to seller & support) *"
                className="buyer-pay-input"
                style={{ width: '100%', marginBottom: 8 }}
              />
              <div className="listing-detail-actions">
                <button type="button" className="btn btn-secondary btn-sm" disabled={inspectBusy || !rejectReason.trim()} onClick={handleReject}>
                  {inspectBusy ? 'Submitting…' : 'Confirm rejection'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRejectOpen(false); setRejectReason('') }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="listing-detail-section">
        <h3 className="listing-detail-section-title">Sales order & receipt</h3>
        <OrderReceiptCard order={order} role="buyer" />
      </div>

      {isCar && (
        <div className="listing-detail-section">
          <h3 className="listing-detail-section-title">Car build transaction</h3>
          <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
            Same 5 stages as the stepper above and the admin desk — escrow hold →
            handover proof → commissions → seller payout. Updates live.
          </p>
          <CarBuildTracker order={order} />
        </div>
      )}

      {hasDeliveryInfo && (
        <div className="listing-detail-section">
          <h3 className="listing-detail-section-title"><Truck size={17} /> Delivery Information</h3>
          <div className="receipt-grid">
            {deliveryCarrier && (
              <div className="receipt-box">
                <div className="receipt-box-title">Courier</div>
                <div className="receipt-box-name">{deliveryCarrier}</div>
              </div>
            )}
            {(deliveryTracking || deliveryUrl) && (
              <div className="receipt-box">
                <div className="receipt-box-title">Tracking</div>
                {deliveryTracking && <div className="receipt-box-name" style={{ fontFamily: 'monospace' }}>{deliveryTracking}</div>}
                {deliveryUrl && (
                  <a href={deliveryUrl} target="_blank" rel="noreferrer" className="buyer-track-link">
                    Track my delivery →
                  </a>
                )}
              </div>
            )}
            {deliveryEta && (
              <div className="receipt-box">
                <div className="receipt-box-title">Estimated arrival</div>
                <div className="receipt-box-name">{deliveryEta}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
