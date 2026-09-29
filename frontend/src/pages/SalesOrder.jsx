import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  CheckCircle2, 
  Printer, 
  ArrowLeft, 
  Car, 
  Wrench, 
  ShieldCheck, 
  MapPin, 
  User, 
  CreditCard, 
  Calendar, 
  FileText,
  AlertCircle,
  Package,
  Download
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { ordersApi } from '../api/orders.js'
import { useOrderStatusListener } from '../realtime/useOrderStatus.js'
import { marketplaceCars } from '../api/cars.js'
import { marketplaceParts } from '../api/parts.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import DeliveryMapPicker from '../components/DeliveryMapPicker.jsx'

export default function SalesOrder() {
  const { orderNumber } = useParams()
  const isNarrow = useMediaQuery('(max-width: 700px)')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  // Live: the other party moving this order refreshes the receipt.
  useOrderStatusListener((event) => {
    if (!event || !orderNumber) return
    if (
      String(event.order_number) === String(orderNumber) ||
      String(event.order_id) === String(orderNumber)
    ) {
      setRefreshTick((t) => t + 1)
    }
  })

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    async function fetchOrder() {
      try {
        const data = await ordersApi.show(orderNumber)
        if (isMounted) {
          setOrder(data)
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching sales order:', err)
        if (isMounted) {
          setError(err?.response?.data?.message || 'Sales order could not be retrieved.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (orderNumber) {
      fetchOrder()
    }

    return () => { isMounted = false }
  }, [orderNumber, refreshTick])

  const handlePrint = () => {
    window.print()
  }

  const [payMethod, setPayMethod] = useState('bank_transfer')
  const [paySaving, setPaySaving] = useState(false)
  const [payRef, setPayRef] = useState('')
  const [payConfirming, setPayConfirming] = useState(false)
  const [payError, setPayError] = useState('')
  const [pinEditing, setPinEditing] = useState(false)
  const [pinSaving, setPinSaving] = useState(false)
  const [pinError, setPinError] = useState('')
  const [inspectActing, setInspectActing] = useState(false)
  const [inspectError, setInspectError] = useState('')
  const [rejectBoxOpen, setRejectBoxOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [liveListing, setLiveListing] = useState(null)

  useEffect(() => {
    const current = order?.financials?.payment_method || order?.payment_method
    if (current) setPayMethod(current)
  }, [order?.order_number])

  // Live listing snapshot for the receipt's Listing Information section.
  // Falls back to the frozen order snapshot when the listing is gone
  // or the viewer has no access — the receipt never breaks.
  useEffect(() => {
    const type = order?.item?.type || order?.item_type
    const id = type === 'car'
      ? order?.item?.car_id || order?.car_id
      : order?.item?.part_id || order?.part_id
    if (!type || !id) {
      setLiveListing(null)
      return
    }
    let alive = true
    const api = type === 'car' ? marketplaceCars : marketplaceParts
    api
      .show(id)
      .then((data) => {
        if (alive) setLiveListing(data)
      })
      .catch(() => {
        if (alive) setLiveListing(null)
      })
    return () => {
      alive = false
    }
  }, [order?.order_number])

  const handlePayMethodChange = async (method) => {
    if (!order) return
    setPayMethod(method)
    try {
      setPaySaving(true)
      const updated = await ordersApi.updatePaymentMethod(order.order_number || order.id || orderNumber, method)
      setOrder(updated)
    } catch {
      // keep local selection; server state unchanged
    } finally {
      setPaySaving(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!order || !payRef.trim()) {
      setPayError('Enter the bank / e-wallet transaction reference first.')
      return
    }
    try {
      setPayConfirming(true)
      setPayError('')
      const updated = await ordersApi.confirmPayment(orderNum, {
        payment_method: payMethod,
        payment_reference: payRef.trim(),
      })
      setOrder(updated)
      setPayRef('')
    } catch (err) {
      setPayError(err?.response?.data?.message || 'Failed to confirm payment.')
    } finally {
      setPayConfirming(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: 'var(--color-text-muted)', marginBottom: 12 }}>Loading Official Sales Order...</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Retrieving serialized vehicle chassis fitment and order data...</div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid var(--color-error)', 
          borderRadius: 12, 
          padding: 32,
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <AlertCircle size={40} color="var(--color-error)" />
          <h2 style={{ fontSize: 20, margin: 0, color: 'var(--color-heading)' }}>Sales Order Not Found</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: 450, margin: 0 }}>
            {error || `Unable to find sales order with reference #${orderNumber}.`}
          </p>
          <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: 12 }}>
            Return to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  // Safe accessor fallbacks
  const buyer = order.buyer || {}
  const vehicle = order.vehicle || {}
  const financials = order.financials || {}
  const items = order.items || []
  const orderNum = order.order_number || order.id || orderNumber

  const chassisNum = vehicle.chassis_number || order.chassis_number || 'N/A'
  const vinNum = vehicle.vin || order.vin || 'N/A'
  const vehicleModel = vehicle.make_model || order.vehicle_make_model || 'Target Vehicle Specification'

  // Fitment identity (chassis/VIN of the buyer's vehicle) applies to PART
  // orders only. Car orders certify the purchased vehicle's own VIN instead.
  const isCarOrder = (order.item?.type || order.item_type) === 'car'
  const hasChassis = chassisNum !== 'N/A'

  // Seller verification gate — payment unlocks only after acceptance.
  const verification = order.verification_status || 'pending'
  const isAccepted = verification === 'accepted'
  const isRejected = verification === 'rejected'
  const isCompleted = order.status === 'completed'

  // Precise delivery pinpoint (parts freight, pinned after acceptance).
  const delivery = order.delivery || {}
  const hasPin = Boolean(delivery.has_pin)
  const canEditPin = isAccepted && !['delivered', 'completed', 'cancelled'].includes(order.status)

  const handlePinSave = async (pin) => {
    try {
      setPinSaving(true)
      setPinError('')
      const updated = await ordersApi.updateDeliveryLocation(orderNum, pin)
      setOrder(updated)
      setPinEditing(false)
    } catch (err) {
      setPinError(err?.response?.data?.message || 'Failed to save delivery pin.')
    } finally {
      setPinSaving(false)
    }
  }

  // Money lifecycle splits by item type. CARS use escrow: settled funds
  // are HELD (paid) → confirmed (house verifies) → released to seller on
  // buyer inspection acceptance, or refunded when a dispute resolves. The
  // car order is NOT complete until inspection acceptance. PARTS use
  // direct capture: paid / confirmed means captured (no hold); the order
  // completes on delivery and payout settles on completion.
  const paymentStatus = financials.payment_status || order.payment_status || 'pending'
  const paymentReference = financials.payment_reference || order.payment_reference || ''
  const paymentLabel = financials.payment_label
    || (paymentStatus === 'released' ? 'Released to Seller — payout complete'
      : paymentStatus === 'refunded' ? 'Refunded to Buyer'
      : paymentStatus === 'confirmed' ? (isCarOrder ? 'Funds Confirmed — held in escrow' : 'Payment Confirmed')
      : paymentStatus === 'paid' ? (isCarOrder ? 'Payment Held in Escrow — secured' : 'Payment Received — order confirmed')
      : 'Pending')
  const isDelivered = order.status === 'delivered'
  const isDisputed = order.status === 'disputed'
  const isRefunded = order.status === 'refunded'
  const isNegotiating = order.status === 'negotiating'
  const isSold = order.status === 'sold'
  const fundsActive = ['paid', 'confirmed'].includes(paymentStatus) && !isCompleted && !isRefunded
  const isCancelled = order.status === 'cancelled'

  // Single contextual status banner (priority order) — one banner only,
  // never a stack of contradictory states.
  const heroBanner = (() => {
    const ref = paymentReference
      ? <> (ref: <strong style={{ fontFamily: 'monospace' }}>{paymentReference}</strong>)</>
      : null
    if (isRejected) return { color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.08)', border: 'var(--color-error)', icon: 'alert', title: 'Request Declined by Seller.', body: <>{order.verification_note || 'Another buyer request was accepted for this listing.'}</> }
    if (isCancelled) return { color: 'var(--color-text-muted)', bg: 'rgba(148, 163, 184, 0.08)', border: 'var(--color-text-muted)', icon: 'alert', title: 'Order Cancelled.', body: <>This order was cancelled and is closed.</> }
    if (isRefunded) return { color: 'var(--color-text-muted)', bg: 'rgba(148, 163, 184, 0.08)', border: 'var(--color-text-muted)', icon: 'alert', title: 'Refunded.', body: <>The payment was returned to the buyer and this order is closed.</> }
    if (isDisputed) return { color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.08)', border: 'var(--color-error)', icon: 'alert', title: 'Disputed — payment frozen.', body: <>The delivery was disputed. Funds stay frozen until the dispute resolves: the seller issues a refund, or support rules on release.</> }
    if (isCompleted) return { color: 'var(--color-success)', bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.25) 100%)', border: 'var(--color-success)', icon: 'check', title: 'Order Complete — Official Transaction Receipt.', body: <>Funds confirmed{ref} and delivery fulfilled. Print / save this page as your proof of transaction.</> }
    if (isDelivered) return { color: 'var(--color-info-text)', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.4)', icon: 'shield', title: isCarOrder ? 'Delivered — inspect the car below.' : 'Delivered.', body: <>{isCarOrder ? 'Review the delivery, then accept to release payment or reject to open a dispute.' : 'Delivery is complete — the seller will finalize your order.'}</> }
    if (isSold) return { color: 'var(--color-accent)', bg: 'rgba(216, 98, 44, 0.08)', border: '#d8622c', icon: 'check', title: 'Sold — reserved for your order.', body: <>{isCarOrder ? <>The seller will arrange delivery next — your payment stays held until you accept the car.</> : <>The seller is preparing dispatch — delivery completes the order.</>}</> }
    if (isNegotiating) return { color: 'var(--color-violet-text)', bg: 'rgba(139, 92, 246, 0.08)', border: 'var(--color-violet-text)', icon: 'alert', title: 'Negotiation in progress.', body: <>The seller received your order and marked it as negotiating. Keep the conversation in chat while terms are finalized.</> }
    if (fundsActive && isCarOrder) return { color: 'var(--color-info-text)', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.4)', icon: 'shield', title: 'Payment Held & Secured — order not complete.', body: <>Your payment{ref} is frozen in platform escrow. It goes to the seller only after delivery + your inspection acceptance — never before.</> }
    if (fundsActive && !isCarOrder) return { color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.4)', icon: 'shield', title: 'Payment Received — order confirmed.', body: <>Your payment{ref} is captured (parts are not held in escrow). The seller is preparing dispatch — delivery completes the order.</> }
    if (isAccepted) return { color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.08)', border: 'var(--color-success)', icon: 'check', title: 'Verified & Accepted.', body: <>The seller confirmed your request. Settlement details below are now active — please proceed with payment.</> }
    return { color: 'var(--color-warning)', bg: 'rgba(234, 179, 8, 0.08)', border: 'var(--color-warning)', icon: 'alert', title: 'Awaiting Seller Verification.', body: <>Your request is queued with the seller, who may receive multiple requests for this listing and will accept one buyer. Payment instructions unlock here automatically once your request is verified & accepted.</> }
  })()

  // Listing Information for the receipt: live listing when reachable,
  // otherwise the frozen order snapshot. Receipt never breaks.
  const listingType = order.item?.type || order.item_type
  const listingTitle = liveListing?.title || order.item?.name || order.item_name || 'Listing'
  const listingImage =
    liveListing?.primary_image_url || liveListing?.img || liveListing?.image_urls?.[0]?.url ||
    liveListing?.image_urls?.[0] || order.item?.image_url || order.item_image_url
  const listingPrice = liveListing?.price ?? financials.unit_price
  const listingStatus = liveListing?.status
  const listingSeller = liveListing?.seller?.username || order.item?.seller_name || order.seller_name
  const listingSpecs =
    listingType === 'car'
      ? [
          ['Make / Brand', liveListing?.brand],
          ['Model', liveListing?.model],
          ['Year', liveListing?.year],
          ['Mileage', liveListing?.mileage_km != null ? `${Number(liveListing.mileage_km).toLocaleString()} km` : null],
          ['Transmission', liveListing?.transmission],
          ['VIN', vinNum !== 'N/A' ? vinNum : null],
        ].filter(([, v]) => v != null && v !== '')
      : [
          ['Brand', liveListing?.brand],
          ['Category', liveListing?.category],
          ['Part Number', liveListing?.part_number],
          ['Condition', liveListing?.condition],
        ].filter(([, v]) => v != null && v !== '')

  const verifyUrl =
    order.security_hash && typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${order.security_hash}`
      : null

  const handleAcceptInspection = async () => {
    if (!window.confirm('Accept this delivery? The held payment will be released to the seller and the order completes.')) return
    try {
      setInspectActing(true)
      setInspectError('')
      const updated = await ordersApi.acceptInspection(orderNum)
      setOrder(updated)
    } catch (err) {
      setInspectError(err?.response?.data?.message || 'Failed to accept inspection.')
    } finally {
      setInspectActing(false)
    }
  }

  const handleRejectInspection = async () => {
    try {
      setInspectActing(true)
      setInspectError('')
      const updated = await ordersApi.rejectInspection(orderNum, rejectReason.trim() || undefined)
      setOrder(updated)
      setRejectBoxOpen(false)
      setRejectReason('')
    } catch (err) {
      setInspectError(err?.response?.data?.message || 'Failed to open dispute.')
    } finally {
      setInspectActing(false)
    }
  }

  return (
    <div className="sales-order-wrapper" style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      
      {/* Top Controls Bar (Hidden during Print) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <Link 
          to="/marketplace" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 14, textDecoration: 'none' }}
        >
          <ArrowLeft size={16} /> Continue Shopping
        </Link>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: 'var(--card-border)',
              color: 'var(--color-heading)',
              border: '1px solid var(--input-border)',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Printer size={16} /> Print / Save PDF
          </button>
          
          <Link
            to="/parts"
            style={{
              background: '#d8622c',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Package size={16} /> Browse More Parts
          </Link>
        </div>
      </div>

      {/* Confirmation Banner */}
      <div className="no-print" style={{ 
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.2) 100%)', 
        border: '1px solid rgba(16, 185, 129, 0.3)', 
        borderRadius: 12, 
        padding: '20px 24px', 
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{ 
          background: 'var(--color-success)', 
          color: '#ffffff', 
          width: 44, 
          height: 44, 
          borderRadius: 50, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0', color: 'var(--color-success)' }}>
            Sales Order Successfully Generated & Serialized!
          </h2>
          <div style={{ fontSize: 13, color: 'var(--color-text)' }}>
            Thank you, <strong>{buyer.name || 'Customer'}</strong>. Your sales order reference is <strong>{orderNum}</strong>.{' '}
            {isCarOrder
              ? <>Ownership transfer documentation has been recorded for VIN <strong>{vinNum}</strong>.</>
              : <>Vehicle fitment validation has been recorded for chassis <strong>{chassisNum}</strong>.</>}
          </div>
        </div>
      </div>

      {/* Single contextual status banner — one state, one banner, never a stack */}
      {heroBanner && (
        <div className="no-print" style={{ background: heroBanner.bg, border: `1px solid ${heroBanner.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {heroBanner.icon === 'check' ? <CheckCircle2 size={20} color={heroBanner.color} style={{ flexShrink: 0, marginTop: 2 }} />
            : heroBanner.icon === 'shield' ? <ShieldCheck size={20} color={heroBanner.color} style={{ flexShrink: 0, marginTop: 2 }} />
            : <AlertCircle size={20} color={heroBanner.color} style={{ flexShrink: 0, marginTop: 2 }} />}
          <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
            <strong style={{ color: heroBanner.color }}>{heroBanner.title}</strong>{' '}
            {heroBanner.body}
          </div>
        </div>
      )}


      {/* BUYER INSPECTION — delivered, accept releases payout, reject opens dispute */}
      {isCarOrder && isAccepted && isDelivered && !isCompleted && !isDisputed && (
        <div className="no-print" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--color-success)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Car size={20} color="var(--color-success)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--color-success)' }}>Delivered — inspect the car now.</strong>{' '}
              Accept to release the held payment to the seller and complete the order, or reject to open a dispute / refund process.
            </div>
          </div>
          {!rejectBoxOpen ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleAcceptInspection}
                disabled={inspectActing}
                className="btn btn-primary btn-sm"
              >
                <CheckCircle2 size={14} /> Accept Car — Release Payment
              </button>
              <button
                type="button"
                onClick={() => setRejectBoxOpen(true)}
                disabled={inspectActing}
                className="btn btn-secondary btn-sm"
              >
                Reject — Open Dispute
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                Rejection reason (shown to seller & support) *
              </label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Paint mismatch vs listing photos, undeclared accident damage…"
                style={{ width: '100%', background: 'var(--color-surface-inset)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '10px 12px', color: 'var(--color-heading)', fontSize: 13, outline: 'none', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleRejectInspection}
                  disabled={inspectActing || !rejectReason.trim()}
                  className="btn btn-secondary btn-sm"
                >
                  {inspectActing ? 'Submitting…' : 'Confirm Rejection'}
                </button>
                <button
                  type="button"
                  onClick={() => { setRejectBoxOpen(false); setRejectReason('') }}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {inspectError && <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 8 }}>{inspectError}</div>}
        </div>
      )}

      {/* THE OFFICIAL SALES ORDER DOCUMENT */}
      <div 
        id="official-sales-order-doc"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 12,
          padding: isNarrow ? '24px 16px' : '40px 36px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--card-border)', paddingBottom: 24, marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 14, height: 14, background: '#d8622c', borderRadius: 3 }} />
              <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.05em', color: 'var(--color-heading)', fontFamily: 'var(--font-display, inherit)' }}>
                GARAGE PARTS MARKETPLACE
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              {isCarOrder ? 'Official Vehicle Sales Order & Transfer Documentation' : 'Official Automotive Sales Order & Fitment Certification'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Depot Logistics & Fulfillment Center · Makati Showroom Hub
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Sales Order Ref
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#d8622c', fontFamily: 'monospace', margin: '2px 0 6px 0' }}>
              {orderNum}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(216, 98, 44, 0.15)', color: 'var(--color-accent)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
              <ShieldCheck size={13} /> {order.status_label || 'Order Processing'}
            </div>
          </div>
        </div>

        {/* Date & Reference Meta Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, background: 'var(--color-surface-inset)', padding: '14px 20px', borderRadius: 8, marginBottom: 28, border: '1px solid var(--card-border)', fontSize: 12 }}>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Order Date / Time:</span>
            <strong style={{ color: 'var(--color-heading)' }}>{order.placed_at || new Date().toLocaleString()}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Payment Method:</span>
            <strong style={{ color: 'var(--color-heading)', textTransform: 'capitalize' }}>
              {financials.payment_method?.replace('_', ' ') || order.payment_method || 'Bank Transfer'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Payment Status:</span>
            <strong style={{ color: ['confirmed', 'released'].includes(paymentStatus) ? 'var(--color-success)' : paymentStatus === 'refunded' ? 'var(--color-text-muted)' : 'var(--color-warning)', textTransform: 'uppercase' }}>
              {paymentLabel}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>
              {isCarOrder ? 'Documentation:' : 'Fitment Validation:'}
            </span>
            <strong style={{ color: 'var(--color-success)' }}>
              {isCarOrder ? '✓ VIN Verified' : '✓ Chassis Certified'}
            </strong>
          </div>
          {(order.tracking_number || order.trackingNumber) && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Courier Tracking:</span>
              <strong style={{ color: 'var(--color-heading)', fontFamily: 'monospace' }}>
                {order.carrier ? `${order.carrier} · ` : ''}{order.tracking_number || order.trackingNumber}
              </strong>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block', marginTop: 6, background: '#d8622c', color: '#fff',
                    fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8, textDecoration: 'none',
                  }}
                >
                  Track My Delivery →
                </a>
              )}
            </div>
          )}
        </div>

        {/* SECTION: LISTING INFORMATION (the exact unit this order covers) */}
        <div style={{ background: 'var(--color-surface-inset)', border: '1px solid var(--card-border)', borderRadius: 10, padding: 20, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isCarOrder ? <Car size={15} /> : <Package size={15} />} Listing Information
            {listingStatus && (
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 12, background: String(listingStatus).toLowerCase() === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: String(listingStatus).toLowerCase() === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                {String(listingStatus)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {listingImage && (
              <img
                src={listingImage}
                alt={listingTitle}
                style={{ width: 180, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--input-border)', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-heading)', marginBottom: 2 }}>{listingTitle}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#d8622c', fontFamily: 'monospace', marginBottom: 4 }}>
                ₱ {Number(listingPrice || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
              </div>
              {listingSeller && (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Seller: <strong style={{ color: 'var(--color-text)' }}>@{listingSeller}</strong></div>
              )}
              {listingSpecs.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '4px 16px', fontSize: 12 }}>
                  {listingSpecs.map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>{label}:</span>
                      <strong style={{ color: 'var(--color-text)', textAlign: 'right' }}>{String(val)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Referring Sales Agent Attribution Box */}
        {(order.agent || order.agent_code) && (
          <div style={{
            background: 'rgba(249, 115, 22, 0.05)',
            border: '1px solid rgba(249, 115, 22, 0.25)',
            borderRadius: 8,
            padding: '12px 18px',
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🤝</span>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Referring Sales Agent / Affiliate Partner:</span>{' '}
                <strong style={{ color: 'var(--color-heading)' }}>
                  {order.agent?.name || order.agent_name || 'Accredited Partner'}
                </strong>{' '}
                <span style={{ color: 'var(--color-accent)', fontFamily: 'monospace', fontWeight: 700 }}>
                  ({order.agent?.code || order.agent_code})
                </span>
              </div>
            </div>
            <div style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 11, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              ✓ Accredited Referral (5%)
            </div>
          </div>
        )}

        {/* SECTION: TWO-COLUMN DETAILS GRID (CUSTOMER & VEHICLE IDENTIFICATION) */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: isNarrow ? 16 : 24, marginBottom: 32 }}>
          
          {/* Customer & Shipping Details Box */}
          <div style={{ background: 'var(--color-surface-inset)', border: '1px solid var(--card-border)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--color-info-text)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <User size={15} /> Customer & Delivery Destination
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-heading)', marginBottom: 4 }}>
              {buyer.name || 'Valued Customer'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 2 }}>
              {buyer.email || 'N/A'}
            </div>
            {buyer.phone && (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                Tel: {buyer.phone}
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 8, marginTop: 8, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.4 }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginBottom: 2 }}>Shipping Address:</div>
              <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: '#d8622c' }} />
              {buyer.full_address || order.shipping_address || 'Makati Showroom Depot Pickup'}
            </div>
          </div>

          {/* VEHICLE IDENTIFICATION & CHASSIS FITMENT BOX (CORE ISSUE REQUIREMENT) */}
          <div style={{ 
            background: 'rgba(216, 98, 44, 0.05)', 
            border: '1px solid #d8622c', 
            borderRadius: 10, 
            padding: 20,
            position: 'relative' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Car size={15} /> Vehicle Identification Details
              </div>
              <span style={{ background: 'var(--color-success)', color: '#ffffff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                Serialized
              </span>
            </div>

            {/* Chassis Number (part orders only — cars certify their own VIN) */}
            {hasChassis && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Chassis / Frame Number:
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-heading)', background: 'var(--color-surface-inset)', padding: '3px 8px', borderRadius: 4, display: 'inline-block', marginTop: 3, border: '1px solid var(--input-border)' }}>
                {chassisNum}
              </span>
            </div>
            )}

            {/* VIN */}
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vehicle Identification Number (VIN):
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-accent)', background: 'var(--color-surface-inset)', padding: '3px 8px', borderRadius: 4, display: 'inline-block', marginTop: 3, border: '1px solid var(--input-border)' }}>
                {vinNum}
              </span>
            </div>

            {/* Vehicle Model */}
            <div>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vehicle Specification:
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                {vehicleModel}
              </span>
            </div>
          </div>

        </div>

        {/* SECTION: DELIVERY LOCATION PIN (parts freight, after acceptance) */}
        {!isCarOrder && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={14} /> Delivery Location Pin
            {hasPin && (
              <span style={{ background: 'var(--color-success)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                Pinned
              </span>
            )}
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, padding: 20 }}>
            {!isAccepted && !hasPin ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                Pinpointing unlocks once the seller verifies & accepts this request — the courier delivers the part exactly where you pin it.
              </div>
            ) : hasPin && !pinEditing ? (
              <div>
                <DeliveryMapPicker
                  readonly
                  height={240}
                  value={{ latitude: delivery.latitude, longitude: delivery.longitude, label: delivery.label }}
                />
                {canEditPin && (
                  <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => { setPinError(''); setPinEditing(true) }}>
                    Update Pin
                  </button>
                )}
              </div>
            ) : canEditPin ? (
              <div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 12px 0', lineHeight: 1.6 }}>
                  Drag the pin to your exact drop-off point so the freight courier delivers precisely. Address resolves automatically.
                </p>
                <DeliveryMapPicker
                  height={320}
                  value={hasPin ? { latitude: delivery.latitude, longitude: delivery.longitude, label: delivery.label } : null}
                  confirmLabel={pinSaving ? 'Saving Pin…' : hasPin ? 'Update Delivery Pin' : 'Confirm Delivery Pin'}
                  onConfirm={handlePinSave}
                />
                {pinError && <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 8 }}>{pinError}</div>}
                {hasPin && (
                  <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setPinEditing(false)}>
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                Pinpointing unlocks once the seller verifies & accepts this request.
              </div>
            )}
          </div>
        </div>
        )}

        {/* SECTION: ITEMIZED ORDER TABLE */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Ordered Items{isCarOrder ? ' & Transfer Line Specifications' : ' & Fitment Line Specifications'}
          </div>

          <div style={{ border: '1px solid var(--card-border)', borderRadius: 8, overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-inset)', borderBottom: '1px solid var(--card-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Item Description</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Part # / SKU</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Unit Price</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
                      <td style={{ padding: '14px 16px', color: 'var(--color-heading)', fontWeight: 600 }}>
                        {it.name}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: 'var(--color-text-muted)', fontSize: 12 }}>
                        {it.sku}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--color-heading)' }}>
                        {it.qty || 1}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--color-heading)' }}>
                        {it.price}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#d8622c' }}>
                        {it.total}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--color-heading)', fontWeight: 600 }}>
                      {order.item?.name || 'Performance Auto Component'}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: 'var(--color-text-muted)', fontSize: 12 }}>
                      {order.item?.sku || 'GP-ITEM-01'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--color-heading)' }}>
                      {financials.quantity || order.quantity || 1}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--color-heading)' }}>
                      {financials.formatted_unit_price || '₱ ' + (financials.unit_price || 0)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#d8622c' }}>
                      {financials.formatted_total || '₱ ' + (financials.total_amount || 0)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION: FINANCIALS & SETTLEMENT SUMMARY */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 340px', gap: isNarrow ? 16 : 24, marginBottom: 28, alignItems: 'start' }}>
          
          {/* Payment & Wire Transfer Instructions (accepted orders only) */}
          {isAccepted ? (
          <div style={{ background: 'var(--color-surface-inset)', border: '1px solid var(--card-border)', borderRadius: 8, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-heading)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={14} color="#d8622c" /> Official Settlement & Bank Details
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[
                { id: 'bank_transfer', label: 'Bank Transfer' },
                { id: 'ewallet', label: 'GCash / Maya' },
                { id: 'credit_card', label: 'Card' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handlePayMethodChange(m.id)}
                  disabled={paySaving}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                    background: payMethod === m.id ? 'rgba(216, 98, 44, 0.15)' : 'transparent',
                    border: payMethod === m.id ? '1px solid #d8622c' : '1px solid var(--input-border)',
                    color: payMethod === m.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              <div>Bank: <strong>BDO Unibank (Banco de Oro) / BPI</strong></div>
              <div>Account Name: <strong>Garage Parts Marketplace Official Corp</strong></div>
              <div>Account Number: <strong>0084-2910-4821</strong></div>
              <div>Payment Reference: <strong>{orderNum}</strong></div>
              <div style={{ marginTop: 6, color: 'var(--color-text-muted)' }}>
                Please email payment slip to <em>orders@garageparts.ph</em> with your sales order number.
              </div>
            </div>

            {/* Fund confirmation: buyer submits transfer reference → house verifies */}
            {paymentStatus === 'confirmed' ? (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
                ✓ Funds confirmed by the house{paymentReference ? <> · Ref: <span style={{ fontFamily: 'monospace' }}>{paymentReference}</span></> : null}
              </div>
            ) : paymentStatus === 'paid' ? (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.35)', borderRadius: 8, fontSize: 12, color: 'var(--color-text)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--color-warning)' }}>Payment submitted — awaiting fund verification.</strong>
                <div style={{ marginTop: 2 }}>Ref: <span style={{ fontFamily: 'monospace' }}>{paymentReference}</span> · The house confirms receipt before dispatch.</div>
              </div>
            ) : (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--card-border)', paddingTop: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                  Bank / E-wallet Transaction Reference *
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. BDO-2026-889900"
                    style={{ flex: 1, background: 'var(--card-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '10px 12px', color: 'var(--color-heading)', fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={payConfirming}
                    style={{ background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: payConfirming ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {payConfirming ? 'Submitting…' : "I've Sent Payment"}
                  </button>
                </div>
                {payError && <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 6 }}>{payError}</div>}
              </div>
            )}
          </div>
          ) : (
          <div style={{ background: 'var(--color-surface-inset)', border: '1px dashed var(--input-border)', borderRadius: 8, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={14} color="var(--color-text-muted)" /> Settlement Details Locked
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {isRejected
                ? 'This request was declined — no payment is due.'
                : 'Bank details and payment options will appear here once the seller verifies & accepts your request.'}
            </div>
          </div>
          )}

          {/* Pricing Totals Box */}
          <div style={{ background: 'var(--color-surface-inset)', border: '1px solid var(--card-border)', borderRadius: 8, padding: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                <span>Subtotal:</span>
                <span style={{ color: 'var(--color-heading)', fontWeight: 600 }}>
                  {financials.formatted_unit_price ? (financials.unit_price * (financials.quantity || 1)).toLocaleString('en-US', { style: 'currency', currency: 'PHP' }) : financials.formatted_total}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                <span>
                  Shipping Freight
                  {delivery.zone && (
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      From {delivery.origin || 'GAP Valenzuela Main Depot'} · {delivery.zone}{delivery.distance_km != null ? ` · ${delivery.distance_km} km` : ''}
                    </span>
                  )}
                </span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                  {financials.formatted_shipping_fee || 'FREE'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                <span>{isCarOrder ? 'Ownership Documentation:' : 'Chassis Fitment Check:'}</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Included (₱0.00)</span>
              </div>
              
              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-heading)' }}>Total Amount:</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#d8622c', fontFamily: 'monospace' }}>
                  {financials.formatted_total || '₱ ' + (financials.total_amount || 0)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Order Notes (if any) */}
        {order.notes && (
          <div style={{ background: 'var(--color-surface-inset)', border: '1px solid var(--card-border)', borderRadius: 8, padding: 14, marginBottom: 28, fontSize: 12 }}>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Order {isCarOrder ? 'Transfer' : 'Fitment'} Notes:</span>
            <div style={{ color: 'var(--color-text)', fontStyle: 'italic' }}>{order.notes}</div>
          </div>
        )}

        {/* RECEIPT SECURITY — unique QR proving this transaction is valid */}
        {verifyUrl && (
          <div style={{ background: 'var(--color-surface-inset)', border: '1px solid var(--color-success)', borderRadius: 10, padding: 20, marginBottom: 28, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: '#ffffff', borderRadius: 8, padding: 8, flexShrink: 0 }}>
              <QRCodeSVG value={verifyUrl} size={120} level="M" />
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: 'var(--color-success)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <ShieldCheck size={15} /> Verified Transaction Receipt
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 6 }}>
                Scan to verify this receipt. Exactly one security code exists for order{' '}
                <strong style={{ fontFamily: 'monospace', color: 'var(--color-text)' }}>{orderNum}</strong> — any other
                code is invalid.
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {order.security_hash}
              </div>
            </div>
          </div>
        )}

        {/* Document Footer & Security Guarantee */}
        <div style={{ borderTop: '2px solid var(--card-border)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
          <div>
            Official Garage Parts Marketplace Document ·{' '}
            {isCarOrder
              ? <>Certified for VIN {vinNum}</>
              : <>Certified for Chassis {chassisNum} & VIN {vinNum}</>}
          </div>
          <div style={{ fontFamily: 'monospace', color: '#475569' }}>
            SERIAL: GP-AUTH-{orderNum}-SECURED
          </div>
        </div>

      </div>

      {/* Print Stylesheet — receipt only: the PDF contains the official
          sales order document and nothing else on the page. */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, nav, header, footer, .sidebar {
            display: none !important;
          }
          .sales-order-wrapper {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .sales-order-wrapper > div:not(#official-sales-order-doc),
          .sales-order-wrapper > a:not(#official-sales-order-doc) {
            display: none !important;
          }
          #official-sales-order-doc {
            background: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #000000 !important;
            box-shadow: none !important;
            padding: 20px !important;
            margin: 0 !important;
          }
          #official-sales-order-doc * {
            color: #000000 !important;
          }
          #official-sales-order-doc div,
          #official-sales-order-doc table,
          #official-sales-order-doc td,
          #official-sales-order-doc th {
            background: #ffffff !important;
            background-image: none !important;
            border-color: #000000 !important;
            box-shadow: none !important;
          }
          #official-sales-order-doc a {
            text-decoration: none !important;
          }
        }
      `}</style>
    </div>
  )
}
