import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, ShieldAlert, ShieldCheck, Check, X,
  Truck, FileCheck2, Undo2, Printer, MapPin, Car, Package,
  Wallet, BadgeCheck, Copy, Navigation, Phone, Mail, User,
} from 'lucide-react'
import { sellerOrdersApi } from '../../api/seller.js'
import { searchPlaces } from '../../api/geocode.js'
import { nextStatusFor, statusLabel, CLOSED_ORDER_STATUSES, mapsLinkFor, mapsLinkForCoords, copyText } from './orderFlow.js'
import { useOrderStatusListener } from '../../realtime/useOrderStatus.js'
import OrderReceiptCard from './OrderReceiptCard.jsx'
import ProofSubmitModal from './ProofSubmitModal.jsx'
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

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`
const CLOSED = CLOSED_ORDER_STATUSES

/**
 * Seller-facing full order detail — mirrors the buyer detail layout
 * (hero, facts, sections, receipt) with every managerial capability:
 * verify → advance fulfillment → submit proof → refund on dispute,
 * plus hold / settlement / payout visibility.
 */
export default function SellerOrderDetail({ orderId, orderNumber, onBack, showListing = true }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(null)
  const [proofOpen, setProofOpen] = useState(false)

  const load = useCallback(async () => {
    const id = orderId || orderNumber
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await sellerOrdersApi.incoming({ per_page: 50 })
      const rows = res?.data ?? []
      const found = rows.find((o) =>
        String(o.id) === String(id) ||
        String(o.order_number) === String(id),
      )
      if (!found) throw new Error('Order not found in your incoming requests.')
      setOrder(found)
    } catch (err) {
      setError(extractError(err, 'Could not load this order.'))
    } finally {
      setLoading(false)
    }
  }, [orderId, orderNumber])

  useEffect(() => { load() }, [load])

  // Hooks below must run on every render, before any early return
  // (Rules of Hooks) — all values are null-safe until the order loads.
  const [geoCoords, setGeoCoords] = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const orderBuyer = order?.buyer || {}
  const orderPin = order?.delivery || {}
  const buyerFullAddress = orderBuyer.full_address || order?.shipping_address || ''
  const hasPin = Boolean(orderPin.has_pin)

  useEffect(() => {
    setGeoCoords(null)
    if (hasPin || !buyerFullAddress) {
      setGeoLoading(false)
      return
    }
    let alive = true
    setGeoLoading(true)
    searchPlaces(buyerFullAddress, { limit: 1 })
      .then((rows) => { if (alive) setGeoCoords(rows?.[0] || null) })
      .catch(() => { if (alive) setGeoCoords(null) })
      .finally(() => { if (alive) setGeoLoading(false) })
    return () => { alive = false }
  }, [buyerFullAddress, hasPin])

  // Realtime: buyer / admin moves on this order refresh instantly.
  useOrderStatusListener((event) => {
    if (!event || !order) return
    if (
      String(event.order_number) === String(order.order_number) ||
      String(event.order_id) === String(order.id)
    ) {
      load()
    }
  })

  const run = async (key, fn, successMsg, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setBusy(key)
    setError('')
    setNotice('')
    try {
      const updated = await fn()
      setOrder(updated?.id ? updated : order)
      if (successMsg) setNotice(successMsg)
      await load()
    } catch (err) {
      setError(extractError(err, 'Action failed.'))
    } finally {
      setBusy(null)
    }
  }

  if (loading && !order) {
    return (
      <div className="my-listings-card my-listings-card--center">
        <RefreshCw size={22} className="spin" />
        <p className="muted">Loading order…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="my-listings-card my-listings-card--center">
        <ShieldAlert size={28} />
        <h2>Order not found</h2>
        <p className="muted">{error || 'This order is not in your incoming requests.'}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to requests
        </button>
      </div>
    )
  }

  const verification = order.verification_status || 'pending'
  const payStatus = order.financials?.payment_status || order.payment_status || 'pending'
  const status = order.status || 'processing'
  const proofStatus = order.proof?.status || 'none'
  const isCar = (order.item?.type || order.item_type) === 'car'
  const closed = CLOSED.includes(status)
  const disputed = status === 'disputed'
  const released = payStatus === 'released'
  const held = ['paid', 'confirmed'].includes(payStatus) && !released
  const item = order.item || {}
  const buyer = order.buyer || {}
  const fin = order.financials || {}
  const next = nextStatusFor(order)

  const canVerify = verification === 'pending'
  const canAdvance = verification === 'accepted' && !closed
  const canProof = verification === 'accepted' && isCar && ['shipped', 'delivered'].includes(status) && proofStatus !== 'approved'
  const canRefund = verification === 'accepted' && disputed

  const total = Number(fin.total_amount ?? order.total_amount ?? 0)
  const settle = order.settlement || {}
  const platformRate = Number(settle.platform_rate ?? 5)
  const platformFee = Number(settle.platform_fee ?? (total * platformRate) / 100)
  const agentFee = Number(settle.agent_fee ?? 0)

  const handleAccept = () => run(
    'accept',
    () => sellerOrdersApi.accept(order.id),
    'Request accepted — payment unlocked for the buyer.',
    `Accept request ${order.order_number || `#${order.id}`}? Other pending requests for this listing auto-decline.`,
  )

  const handleReject = () => {
    const note = window.prompt('Reason for declining (optional, shown to buyer):', '')
    if (note === null) return
    run('reject', () => sellerOrdersApi.reject(order.id, note || undefined), 'Request declined.')
  }

  const handleStatus = (nextStatus) => {
    if (!nextStatus || nextStatus === status) return
    // Proof-first delivery: no submitted proof → open the proof modal
    // instead of moving. Backend enforces the same rule.
    if (nextStatus === 'delivered' && isCar && !['pending', 'approved'].includes(proofStatus)) {
      setError('')
      setNotice('Submit handover proof first — Mark Delivered unlocks after submission.')
      setProofOpen(true)
      return
    }
    run(
      'status',
      () => sellerOrdersApi.updateStatus(order.id, { status: nextStatus }),
      `Order moved to ${nextStatus}.`,
      `Move order ${order.order_number || `#${order.id}`} to “${nextStatus}”?`,
    )
  }

  const handleRefund = () => {
    const note = window.prompt('Refund note for the buyer (optional):', isCar ? 'Refunded after inspection dispute.' : 'Refunded after dispute resolution.')
    if (note === null) return
    run(
      'refund',
      () => sellerOrdersApi.refund(order.id, note || undefined),
      'Payment refunded. Order closed as refunded.',
      `Refund the payment for order ${order.order_number || `#${order.id}`} back to the buyer?`,
    )
  }

  const handleCopy = async (text, label) => {
    const ok = await copyText(text)
    if (ok) setNotice(`${label} copied to clipboard.`)
    else setError(`Could not copy ${label.toLowerCase()} — copy it manually.`)
  }

  const pin = orderPin
  const exact = hasPin
    ? { latitude: pin.latitude, longitude: pin.longitude, source: 'Buyer pin' }
    : geoCoords
      ? { latitude: geoCoords.latitude, longitude: geoCoords.longitude, source: 'Located from address' }
      : null
  const mapsUrl = exact ? mapsLinkForCoords(exact.latitude, exact.longitude) : mapsLinkFor(pin)

  const fundsBanner = (() => {
    if (['refunded', 'cancelled'].includes(status)) return null
    if (released || status === 'completed') {
      return { cls: 'funds-banner--done', title: 'Funds released — payout complete', body: isCar ? 'Escrow released to your wallet.' : 'Captured payment settled to your wallet.' }
    }
    if (proofStatus === 'approved') {
      return { cls: 'funds-banner--review', title: 'Proof approved — waiting for admin fund release', body: 'No further action needed. The admin is moving escrow to your wallet.' }
    }
    if (proofStatus === 'pending') {
      return { cls: 'funds-banner--review', title: 'Proof under review — funds held in escrow', body: 'Funds stay frozen until the admin approves your handover proof.' }
    }
    if (held) {
      return { cls: 'funds-banner--held', title: `Payment held in escrow — ${fin.formatted_total || peso(total)} secured`, body: isCar ? 'Deliver the unit, then submit handover proof to unlock release.' : 'Settles to your wallet automatically on completion.' }
    }
    return null
  })()

  return (
    <div className="listing-detail">
      <div className="listing-detail-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Requests
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
      {notice && <div className="my-listings-alert my-listings-alert--success"><BadgeCheck size={14} /> {notice}</div>}

      <div className="listing-detail-hero buyer-order-hero">
        <div className="listing-detail-image">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name || 'Item'} />
          ) : (
            <div className="listing-detail-image-placeholder">{isCar ? <Car size={44} /> : <Package size={44} />}</div>
          )}
        </div>
        <div className="listing-detail-info">
          <div className="listing-detail-title-row">
            <h2>{showListing ? (item.name || order.item_name || `Order #${order.id}`) : (order.order_number || `Order #${order.id}`)}</h2>
            <span className={`order-badge order-badge--${status}`}>{status}</span>
            <span className={`listing-badge ${verification === 'accepted' ? 'listing-badge--live' : verification === 'rejected' ? 'listing-badge--rejected' : 'listing-badge--pending'}`}>
              {order.verification_label || verification}
            </span>
          </div>
          <div className="listing-detail-price">{fin.formatted_total || peso(total)}</div>
          <div className="listing-detail-specs">
            <span className="listing-detail-spec">Order {order.order_number || `#${order.id}`}</span>
            <span className="listing-detail-spec">{buyer.name || order.buyer_name || 'Buyer'}</span>
            {order.delivery?.zone && (
              <span className="listing-detail-spec"><MapPin size={13} /> {order.delivery.zone}</span>
            )}
          </div>
          <div className="buyer-order-facts">
            <div className="buyer-order-fact">
              <span>Buyer</span>
              <strong>{buyer.name || order.buyer_name || '—'}</strong>
            </div>
            <div className="buyer-order-fact">
              <span>Payment</span>
              <strong style={{ textTransform: 'capitalize' }}>
                {(fin.payment_method || '').replace(/_/g, ' ') || '—'}
                {fin.payment_reference ? ` · ${fin.payment_reference}` : ''}
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
            {!isCar && fin.formatted_shipping_fee && (
              <div className="buyer-order-fact">
                <span>Freight</span>
                <strong>{fin.formatted_shipping_fee}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {fundsBanner && (
        <div className={`funds-banner ${fundsBanner.cls}`}>
          <Wallet size={16} />
          <div>
            <strong>{fundsBanner.title}</strong>
            <p>{fundsBanner.body}</p>
          </div>
        </div>
      )}

      <div className="listing-detail-section">
        <h3 className="listing-detail-section-title"><User size={17} /> Buyer & delivery destination</h3>
        <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
          Deliver the unit here — copy any detail or open it straight in Google Maps.
        </p>
        <div className="buyer-dest-grid">
          <div className="receipt-box">
            <div className="receipt-box-title"><User size={13} /> Buyer</div>
            <div className="receipt-box-name">{buyer.name || order.buyer_name || '—'}</div>
            {(buyer.phone || buyer.email) && (
              <div className="buyer-dest-contacts">
                {buyer.phone && (
                  <span className="buyer-dest-contact">
                    <Phone size={12} /> {buyer.phone}
                    <button type="button" className="btn btn-ghost btn-sm" title="Copy phone" onClick={() => handleCopy(buyer.phone, 'Phone number')}>
                      <Copy size={12} />
                    </button>
                  </span>
                )}
                {buyer.email && (
                  <span className="buyer-dest-contact">
                    <Mail size={12} /> {buyer.email}
                    <button type="button" className="btn btn-ghost btn-sm" title="Copy email" onClick={() => handleCopy(buyer.email, 'Email')}>
                      <Copy size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="receipt-box">
            <div className="receipt-box-title"><MapPin size={13} /> Drop-off address</div>
            {buyerFullAddress ? (
              <>
                <div className="receipt-box-name" style={{ fontWeight: 600 }}>{buyerFullAddress}</div>
                {exact && !hasPin && (
                  <div className="receipt-box-muted" style={{ fontFamily: 'monospace' }}>
                    {Number(exact.latitude).toFixed(5)}, {Number(exact.longitude).toFixed(5)} · {exact.source}
                  </div>
                )}
                {geoLoading && !hasPin && (
                  <div className="receipt-box-muted">Locating exact coordinates…</div>
                )}
                <div className="listing-detail-actions" style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleCopy(buyerFullAddress, 'Address')}>
                    <Copy size={13} /> Copy address
                  </button>
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                      <Navigation size={13} /> Open in Google Maps
                    </a>
                  )}
                </div>
              </>
            ) : (
              <div className="receipt-box-muted">No address on this order yet.</div>
            )}
          </div>
          <div className="receipt-box">
            <div className="receipt-box-title"><Navigation size={13} /> Location pin</div>
            {hasPin ? (
              <>
                <div className="receipt-box-name" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {Number(pin.latitude).toFixed(5)}, {Number(pin.longitude).toFixed(5)}
                </div>
                {pin.label && <div className="receipt-box-muted">{pin.label}</div>}
                {pin.zone && <div className="receipt-box-muted">{pin.zone}{pin.distance_km != null ? ` · ${pin.distance_km} km` : ''}</div>}
                <div className="listing-detail-actions" style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleCopy(`${pin.latitude},${pin.longitude}`, 'Pin coordinates')}>
                    <Copy size={13} /> Copy pin
                  </button>
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                    <Navigation size={13} /> Track on Google Maps
                  </a>
                </div>
              </>
            ) : (
              <div className="receipt-box-muted">No pin dropped{isCar ? ' — cars hand over at the address.' : ' yet.'}</div>
            )}
          </div>
        </div>
      </div>

      {canVerify && (
        <div className="listing-detail-section">
          <h3 className="listing-detail-section-title"><ShieldCheck size={17} /> Verify this buyer</h3>          <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
            Accept exactly one buyer per listing — the rest auto-decline. Acceptance unlocks payment for them.
          </p>
          <div className="listing-detail-actions">
            <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={handleAccept}>
              <Check size={14} /> {busy === 'accept' ? 'Accepting…' : 'Accept buyer'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm btn-danger-ghost" disabled={!!busy} onClick={handleReject}>
              <X size={14} /> Decline
            </button>
          </div>
        </div>
      )}

      {canAdvance && (
        <div className="listing-detail-section">
          <h3 className="listing-detail-section-title"><Truck size={17} /> Advance fulfillment</h3>
          <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
            Currently <strong style={{ textTransform: 'capitalize' }}>{status}</strong>
            {next ? <> — one way forward: <strong style={{ textTransform: 'capitalize' }}>{next}</strong>. No going back.</> : ' — final stage.'}
          </p>
          {next ? (
            <div className="listing-detail-actions">
              <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => handleStatus(next)}>
                <Truck size={14} /> {busy === 'status' ? 'Moving…' : `Mark ${statusLabel(next)}`}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {isCar && verification === 'accepted' && (
        <div className="listing-detail-section">
          <h3 className="listing-detail-section-title"><FileCheck2 size={17} /> Handover proof</h3>
          {proofStatus === 'none' || !order.proof ? (
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
              {['shipped', 'delivered'].includes(status)
                ? 'Delivered — submit handover photos + note. Admin approval releases your held funds to your wallet.'
                : 'Available once you ship or deliver the unit. Admin approval releases your held funds.'}
            </p>
          ) : (
            <div className="receipt-box" style={{ marginBottom: 12 }}>
              <div className="receipt-box-muted">Status: <strong style={{ textTransform: 'capitalize' }}>{proofStatus}</strong></div>
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
            </div>
          )}
          {canProof && (
            <div className="listing-detail-actions">
              <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => setProofOpen(true)}>
                <FileCheck2 size={14} />
                {proofStatus === 'pending' ? 'Resubmit proof' : proofStatus === 'rejected' ? 'Fix & resubmit proof' : 'Submit handover proof'}
              </button>
            </div>
          )}
        </div>
      )}

      {canRefund && (
        <div className="listing-detail-section">
          <h3 className="listing-detail-section-title"><Undo2 size={17} /> Dispute — refund buyer</h3>
          <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
            Funds are frozen while disputed. Refunding closes the order and returns payment to the buyer.
          </p>
          <div className="listing-detail-actions">
            <button type="button" className="btn btn-secondary btn-sm" disabled={!!busy} onClick={handleRefund}>
              <Undo2 size={14} /> {busy === 'refund' ? 'Refunding…' : 'Refund buyer'}
            </button>
          </div>
        </div>
      )}

      {verification === 'accepted' && (
        <div className="listing-detail-section">
          <h3 className="listing-detail-section-title"><Wallet size={17} /> Settlement</h3>
          <div className="receipt-money">
            <div><span>Total buyer paid</span><span>{fin.formatted_total || peso(total)}</span></div>
            <div><span>Admin fee ({platformRate}%)</span><span>−{peso(platformFee)}</span></div>
            <div><span>Agent commission</span><span>−{peso(agentFee)}</span></div>
            <div className="receipt-money-total"><span>You receive</span><span>{peso(Number(order.settlement?.seller_receives ?? total - platformFee - agentFee))}</span></div>
          </div>
        </div>
      )}

      {isCar && verification === 'accepted' && (
        <div className="listing-detail-section">
          <h3 className="listing-detail-section-title">Car build transaction</h3>
          <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
            Same 5 stages as the admin desk — your managerial view of this deal, live.
          </p>
          <CarBuildTracker order={order} role="seller" />
        </div>
      )}

      <div className="listing-detail-section">
        <h3 className="listing-detail-section-title">Sales order & receipt</h3>
        <OrderReceiptCard order={order} role="seller" />
      </div>

      {proofOpen && (
        <ProofSubmitModal
          order={order}
          onClose={() => setProofOpen(false)}
          onSubmitted={() => {
            setNotice('Handover proof submitted — admin review releases your held funds to your wallet.')
            load()
          }}
        />
      )}
    </div>
  )
}
