import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ShoppingBag,
  User,
  MapPin,
  DollarSign,
  Truck,
  Car,
  CheckCircle2,
  PackageCheck,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CalendarClock,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

const STAGES = ['processing', 'preparing', 'shipped', 'delivered', 'completed']

const peso = (val) =>
  `₱ ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Delivery form (courier service, tracking name/number, ETA)
  const [carrier, setCarrier] = useState('')
  const [tracking, setTracking] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [eta, setEta] = useState('')
  const [services, setServices] = useState([])

  const matchService = (name) => {
    const hay = (name || '').toLowerCase().trim()
    if (!hay) return null
    return (
      services.find((s) => {
        const code = (s.code || '').toLowerCase()
        const nm = (s.name || '').toLowerCase()
        return (code && hay.includes(code)) || (nm && (hay.includes(nm) || nm.includes(hay)))
      }) || null
    )
  }

  const previewTrackingUrl = (() => {
    if (trackingUrl.trim()) return trackingUrl.trim()
    const svc = matchService(carrier)
    const tpl = (svc?.tracking_url_template || '').trim()
    const num = tracking.trim()
    if (!tpl || !num || !tpl.includes('{tracking}')) return ''
    return tpl.replace('{tracking}', encodeURIComponent(num))
  })()

  const storefrontBase = (import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5173').replace(/\/$/, '')

  const load = async () => {
    setLoading(true)
    try {
      const [data, config] = await Promise.all([
        adminApi.getOrder(orderId),
        adminApi.getConfig({ group: 'variables' }).catch(() => null),
      ])
      setOrder(data)
      setCarrier(data?.carrier || '')
      setTracking(data?.tracking_number || data?.trackingNumber || '')
      setTrackingUrl(data?.tracking_url || '')
      setEta(data?.estimated_arrival || '')
      const list = config?.delivery_services?.value
      if (Array.isArray(list)) setServices(list.filter((s) => s && s.active !== false))
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Order not found.')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const refresh = async (fn) => {
    setBusy(true)
    try {
      await fn()
      await load()
    } catch (err) {
      window.alert(err?.response?.data?.message || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: 12 }} />
        <p>Loading order {orderId}…</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <AlertCircle size={32} style={{ color: 'var(--admin-danger)', marginBottom: 8 }} />
        <div style={{ fontWeight: 700, fontSize: 16 }}>{error || 'Order not found'}</div>
        <button type="button" onClick={() => navigate('/orders')} className="admin-btn admin-btn-secondary" style={{ marginTop: 16 }}>
          <ArrowLeft size={14} /> Back to Orders
        </button>
      </div>
    )
  }

  const key = order.order_number || order.id
  const verification = order.verification_status || 'pending'
  const payStatus = order.financials?.payment_status || order.payment_status || 'pending'
  const status = order.status || 'processing'
  const isPendingVerification = verification === 'pending'
  const stageIdx = STAGES.indexOf(status)
  const totalDisplay = order.financials?.formatted_total || peso(order.total_amount)
  const delivery = order.delivery || {}

  const verifyBadge = verification === 'accepted'
    ? { label: 'Verified & Accepted', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }
    : verification === 'rejected'
      ? { label: 'Declined', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }
      : { label: 'Awaiting Verification', bg: 'rgba(234, 179, 8, 0.12)', color: '#b45309' }

  const payBadge = payStatus === 'confirmed'
    ? { label: 'Funds Confirmed', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }
    : payStatus === 'paid'
      ? { label: 'Paid — Verify Funds', bg: 'rgba(234, 179, 8, 0.12)', color: '#b45309' }
      : { label: 'Payment Pending', bg: 'rgba(148, 163, 184, 0.15)', color: 'var(--admin-text-secondary)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="admin-btn admin-btn-secondary"
            style={{ fontSize: 12, marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} /> All Orders
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={22} style={{ color: 'var(--color-rust)' }} />
            {key}
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 12, background: verifyBadge.bg, color: verifyBadge.color }}>
              {verifyBadge.label}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 12, background: payBadge.bg, color: payBadge.color }}>
              {payBadge.label}
            </span>
            <span className={`badge badge-${order.status_variant || 'secondary'}`} style={{ fontSize: 11 }}>
              {(order.status_label || status).toUpperCase()}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--color-rust)' }}>
              {totalDisplay}
            </span>
          </div>
        </div>
        <a
          href={`${storefrontBase}/sales-order/${order.order_number || order.id}`}
          target="_blank"
          rel="noreferrer"
          className="admin-btn admin-btn-secondary"
          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <ExternalLink size={14} /> Buyer Receipt
        </a>
      </div>

      {/* Fulfillment timeline */}
      <div className="admin-card" style={{ padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 12 }}>
          FULFILLMENT PROGRESS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
          {STAGES.map((s, i) => {
            const done = stageIdx >= 0 && i <= stageIdx
            const current = i === stageIdx
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: '1 1 0', minWidth: 110 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? '#10b981' : 'var(--admin-bg-subtle)',
                      color: done ? '#fff' : 'var(--admin-text-muted)',
                      border: current ? '2px solid var(--color-rust)' : '2px solid transparent',
                      fontSize: 12, fontWeight: 800,
                    }}
                  >
                    {done ? <CheckCircle2 size={15} /> : i + 1}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: current ? 800 : 600, color: done ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)', textTransform: 'capitalize' }}>
                    {s}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: i < stageIdx ? '#10b981' : 'var(--admin-border)', margin: '0 6px 18px 6px', minWidth: 12 }} />
                )}
              </div>
            )
          })}
        </div>
        {['cancelled', 'disputed'].includes(status) && (
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-danger)' }}>
            This order is {status.toUpperCase()} — fulfillment closed.
          </div>
        )}
      </div>

      {/* Detail grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        <div className="admin-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8 }}>
            <User size={14} /> Buyer & Destination
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{order.buyer?.name || order.buyer_name || '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{order.buyer?.email || order.buyer_email || ''}</div>
          {(order.buyer?.phone || order.buyer_phone) && (
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{order.buyer?.phone || order.buyer_phone}</div>
          )}
          <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 8 }}>
            <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
            {order.buyer?.full_address || order.shipping_address || '—'}
          </div>
          {delivery.has_pin && (
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--admin-text-muted)', marginTop: 4 }}>
              Pin: {Number(delivery.latitude).toFixed(5)}, {Number(delivery.longitude).toFixed(5)}
              {delivery.zone ? ` · ${delivery.zone}${delivery.distance_km != null ? ` (${delivery.distance_km} km)` : ''}` : ''}
            </div>
          )}
        </div>

        <div className="admin-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8 }}>
            <DollarSign size={14} /> Payment
          </div>
          <div style={{ fontSize: 13 }}>Method: <strong style={{ textTransform: 'capitalize' }}>{(order.financials?.payment_method || order.payment_method || '—').replace('_', ' ')}</strong></div>
          <div style={{ fontSize: 13, marginTop: 2 }}>
            Reference: <strong style={{ fontFamily: 'monospace' }}>{order.financials?.payment_reference || order.payment_reference || '—'}</strong>
          </div>
          <div style={{ fontSize: 13, marginTop: 2 }}>
            Freight: <strong>{order.financials?.formatted_shipping_fee || 'FREE'}</strong>
            {delivery.zone ? <span style={{ color: 'var(--admin-text-muted)' }}> · {delivery.zone}</span> : null}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6 }}>Total: {totalDisplay}</div>
          {verification === 'accepted' && payStatus === 'paid' && (
            <button
              type="button"
              onClick={() => refresh(() => adminApi.confirmOrderFunds(order.id))}
              disabled={busy}
              className="admin-btn admin-btn-primary"
              style={{ fontSize: 12, marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <DollarSign size={14} /> {busy ? 'Confirming…' : 'Confirm Funds Received'}
            </button>
          )}
        </div>

        <div className="admin-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8 }}>
            <Car size={14} /> Item & Fitment
          </div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{order.item?.name || order.item_name || '—'}</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--admin-text-muted)' }}>
            {order.item?.sku || order.item_sku || ''} · Qty {order.financials?.quantity || order.quantity || 1}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 6 }}>
            Chassis: <strong style={{ fontFamily: 'monospace' }}>{order.vehicle?.chassis_number || order.chassis_number || 'N/A'}</strong>
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
            VIN: <strong style={{ fontFamily: 'monospace' }}>{order.vehicle?.vin || order.vin || 'N/A'}</strong>
          </div>
        </div>
      </div>

      {/* Delivery workspace */}
      <div className="admin-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, marginBottom: 12 }}>
          <Truck size={16} style={{ color: 'var(--color-rust)' }} /> Delivery Information
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="admin-label">Courier Service</label>
            <input
              className="admin-input"
              list="order-courier-services"
              placeholder="Pick a service or type custom"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
            <datalist id="order-courier-services">
              {services.map((s) => (
                <option key={s.code || s.name} value={s.name} />
              ))}
            </datalist>
            {services.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                No services configured — add couriers in Configurations → Variables.
              </div>
            )}
          </div>
          <div>
            <label className="admin-label">Tracking Name / Number</label>
            <input
              className="admin-input"
              placeholder="e.g. LBC-VAL-0099"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              style={{ fontFamily: 'monospace' }}
            />
            {previewTrackingUrl ? (
              <div style={{ fontSize: 11, marginTop: 4 }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>Buyer link: </span>
                <a href={previewTrackingUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: 'var(--color-rust)', wordBreak: 'break-all' }}>
                  {previewTrackingUrl}
                </a>
              </div>
            ) : tracking.trim() ? (
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                No template for this courier — paste the URL below or add one in Configurations → Variables.
              </div>
            ) : null}
          </div>
          <div>
            <label className="admin-label">Tracking URL (buyer link)</label>
            <input
              className="admin-input"
              placeholder="Paste courier link, or leave blank to auto-build from Variables"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
          <div>
            <label className="admin-label">Estimated Arrival</label>
            <input
              type="date"
              className="admin-input"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
            />
          </div>
        </div>
        {order.tracking_url && (
          <div style={{ fontSize: 12, marginBottom: 12 }}>
            <a href={order.tracking_url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: 'var(--color-rust)' }}>
              Open buyer tracking link →
            </a>
          </div>
        )}
        {(order.estimated_arrival_display || order.estimated_arrival) && (
          <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarClock size={14} /> Current ETA: <strong>{order.estimated_arrival_display || order.estimated_arrival}</strong>
          </div>
        )}

        {/* Status actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
          {isPendingVerification && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => refresh(() => adminApi.acceptSellerOrder(order.id))}
                className="admin-btn admin-btn-primary"
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle2 size={14} /> Verify & Accept
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const note = window.prompt('Decline reason shown to the buyer (optional):', '')
                  if (note === null) return
                  refresh(() => adminApi.rejectSellerOrder(order.id, note || undefined))
                }}
                className="admin-btn admin-btn-secondary"
                style={{ fontSize: 12 }}
              >
                Decline Request
              </button>
            </>
          )}
          {!isPendingVerification && verification === 'accepted' && status === 'processing' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => refresh(() => adminApi.updateOrderStatus(order.id, { status: 'preparing' }))}
              className="admin-btn admin-btn-primary"
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <PackageCheck size={14} /> {busy ? 'Updating…' : 'Start Preparing'}
            </button>
          )}
          {!isPendingVerification && ['processing', 'preparing'].includes(status) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => refresh(() => adminApi.updateOrderStatus(order.id, {
                status: 'shipped',
                carrier: carrier.trim() || undefined,
                tracking_number: tracking.trim() || undefined,
                tracking_url: trackingUrl.trim() || undefined,
                estimated_arrival: eta || undefined,
              }))}
              className="admin-btn admin-btn-primary"
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Truck size={14} /> {busy ? 'Updating…' : 'Mark Shipped'}
            </button>
          )}
          {status === 'shipped' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => refresh(() => adminApi.updateOrderStatus(order.id, { status: 'delivered' }))}
              className="admin-btn admin-btn-primary"
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <PackageCheck size={14} /> {busy ? 'Updating…' : 'Mark Delivered'}
            </button>
          )}
          {status === 'delivered' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => refresh(() => adminApi.updateOrderStatus(order.id, { status: 'completed' }))}
              className="admin-btn admin-btn-primary"
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle2 size={14} /> {busy ? 'Updating…' : 'Complete Order'}
            </button>
          )}
          {status === 'completed' && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} /> Order complete — receipt final.
            </span>
          )}
        </div>
      </div>

      {order.notes && (
        <div className="admin-card" style={{ padding: 16, fontSize: 13 }}>
          <span style={{ color: 'var(--admin-text-muted)', fontWeight: 600 }}>Buyer notes: </span>
          <span style={{ fontStyle: 'italic' }}>{order.notes}</span>
        </div>
      )}
    </div>
  )
}
