import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ShoppingBag,
  ArrowRight,
  Package,
  AlertCircle,
  MapPin,
  ChevronRight,
  ReceiptText,
  Car,
} from 'lucide-react'
import { ordersApi } from '../api/orders.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useOrderStatusListener } from '../realtime/useOrderStatus.js'
import BuyerOrderDetail from '../components/orders/BuyerOrderDetail.jsx'
import './MyOrders.css'

const peso = (val) =>
  '₱ ' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const stageOf = (o) => {
  const v = o.verification_status || 'pending'
  const pay = o.financials?.payment_status || o.payment_status || 'pending'
  const st = o.status || 'processing'
  if (v === 'rejected') return { key: 'declined', group: 'cancelled', label: 'Declined by Seller', color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.12)' }
  if (st === 'cancelled') return { key: 'cancelled', group: 'cancelled', label: 'Cancelled', color: 'var(--color-text-muted)', bg: 'rgba(148, 163, 184, 0.12)' }
  if (st === 'refunded') return { key: 'refunded', group: 'cancelled', label: 'Refunded', color: 'var(--color-text-muted)', bg: 'rgba(148, 163, 184, 0.12)' }
  if (st === 'disputed') return { key: 'disputed', group: 'transit', label: 'Disputed — Under Review', color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.12)' }
  if (st === 'completed') return { key: 'completed', group: 'completed', label: 'Completed', color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.12)' }
  if (v === 'pending') return { key: 'awaiting', group: 'awaiting', label: 'Awaiting Verification', color: 'var(--color-warning)', bg: 'rgba(234, 179, 8, 0.12)' }
  if (pay === 'pending') return { key: 'topay', group: 'topay', label: 'To Pay', color: 'var(--color-accent)', bg: 'rgba(216, 98, 44, 0.15)' }
  if (st === 'negotiating') return { key: 'negotiating', group: 'transit', label: 'Negotiating with Seller', color: 'var(--color-violet-text)', bg: 'rgba(139, 92, 246, 0.12)' }
  if (st === 'sold') return { key: 'sold', group: 'transit', label: 'Sold — Awaiting Delivery', color: 'var(--color-accent)', bg: 'rgba(216, 98, 44, 0.15)' }
  const isCar = (o.item?.type || o.item_type || 'part') === 'car'
  if (pay === 'paid' || pay === 'confirmed') return isCar
    ? { key: 'funds', group: 'transit', label: 'Payment Held in Escrow', color: 'var(--color-warning)', bg: 'rgba(234, 179, 8, 0.12)' }
    : { key: 'funds', group: 'transit', label: 'Payment Received', color: 'var(--color-warning)', bg: 'rgba(234, 179, 8, 0.12)' }
  if (st === 'delivered') return isCar
    ? { key: 'delivered', group: 'transit', label: 'Delivered — Inspect Now', color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.12)' }
    : { key: 'delivered', group: 'transit', label: 'Delivered', color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.12)' }
  if (st === 'shipped') return { key: 'shipped', group: 'transit', label: 'In Transit', color: 'var(--color-info-text)', bg: 'rgba(59, 130, 246, 0.12)' }
  return { key: 'preparing', group: 'transit', label: 'Preparing Dispatch', color: 'var(--color-info-text)', bg: 'rgba(59, 130, 246, 0.12)' }
}

const TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'awaiting', label: 'Awaiting Verification' },
  { id: 'topay', label: 'To Pay' },
  { id: 'transit', label: 'In Transit' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

// Two order kinds, two different flows: car builds run the escrow deal
// pipeline (verify → pay → hold → deliver → proof → commissions →
// payout); parts run garage direct-capture freight.
const KINDS = [
  { id: 'all', label: 'All', icon: ShoppingBag },
  { id: 'car', label: 'Car Builds', icon: Car },
  { id: 'part', label: 'Parts & Accessories', icon: Package },
]

const kindOf = (o) => ((o.item?.type || o.item_type || 'part') === 'car' ? 'car' : 'part')

function ctaFor(stageKey) {
  if (stageKey === 'topay') return 'Pay Now'
  if (stageKey === 'delivered') return 'Inspect Now'
  if (stageKey === 'awaiting') return 'Track Request'
  return 'View Details'
}

export default function MyOrders() {
  const { user, isAuthenticated } = useAuth()
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [kind, setKind] = useState('all') // all | car | part
  const [refreshTick, setRefreshTick] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // URL-managed detail: /my-orders?order=SO-… is shareable, survives
  // refresh, and works with the browser back button.
  const paramOrder = searchParams.get('order')
  const activeOrderNumber = selectedOrder
    ? (selectedOrder.order_number || selectedOrder.id)
    : paramOrder

  const openOrder = (o) => {
    setSelectedOrder(o)
    setSearchParams({ order: String(o.order_number || o.id) })
  }

  const closeOrder = () => {
    setSelectedOrder(null)
    setSearchParams({})
    setRefreshTick((t) => t + 1)
  }

  // Live: seller moves (negotiating → sold → delivered…) refresh the list.
  useOrderStatusListener(() => {
    setRefreshTick((t) => t + 1)
  })

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    ordersApi.list({ per_page: 50 })
      .then((res) => {
        if (!alive) return
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
        setOrders(rows)
        setTotal(res?.meta?.total ?? rows.length)
        setError('')
      })
      .catch((err) => {
        if (!alive) return
        setOrders([])
        setError(err?.response?.data?.message || 'Could not load your orders.')
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [isAuthenticated, user?.id, refreshTick])

  const kindCounts = {
    car: orders.filter((o) => kindOf(o) === 'car').length,
    part: orders.filter((o) => kindOf(o) === 'part').length,
  }
  const kindFiltered = kind === 'all' ? orders : orders.filter((o) => kindOf(o) === kind)
  const filtered = tab === 'all' ? kindFiltered : kindFiltered.filter((o) => stageOf(o).group === tab)

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <ShoppingBag size={40} color="#d8622c" style={{ marginBottom: 12 }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0' }}>Sign in to view your orders</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 20px 0' }}>
          Your parts checkouts, payments, deliveries, and receipts live here.
        </p>
        <Link to="/login" className="btn btn-primary">Sign In</Link>
      </div>
    )
  }

  // Clicked card → full detail: listing info, statuses incl. inspection,
  // sales-order receipt, and every buyer button end-to-end.
  if (activeOrderNumber) {
    return (
      <div className="my-orders-page">
        <div className="my-orders-container">
          <BuyerOrderDetail
            orderNumber={activeOrderNumber}
            onBack={closeOrder}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="my-orders-page">
      <div className="my-orders-container">
        <div className="my-orders-head">
          <div>
            <h1><ShoppingBag size={22} /> My Orders</h1>
            <p className="muted">
              {total} order{total === 1 ? '' : 's'} · {user?.username || user?.email || ''} —
              car builds run the escrow deal pipeline, parts run depot freight.
              Click a card for the full sales order, receipt & actions.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className="my-orders-kind">
          {KINDS.map((k) => {
            const Icon = k.icon
            const count = k.id === 'all' ? total : (kindCounts[k.id] || 0)
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={kind === k.id ? 'my-orders-kind-btn my-orders-kind-btn--active' : 'my-orders-kind-btn'}
              >
                <Icon size={15} /> {k.label}
                <span className="my-listings-count">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="my-orders-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={tab === t.id ? 'my-listings-chip my-listings-chip--active' : 'my-listings-chip'}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="my-listings-card"><p className="muted">Loading your orders…</p></div>
        ) : error ? (
          <div className="my-listings-alert my-listings-alert--error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="my-listings-card my-listings-card--center">
            <Package size={36} color="#475569" style={{ marginBottom: 12 }} />
            <h2>{tab === 'all' ? `No ${kind === 'all' ? '' : kind === 'car' ? 'car build' : 'parts'} orders yet` : `No ${TABS.find((t) => t.id === tab)?.label.toLowerCase()} orders`}</h2>
            <p className="muted">
              {kind === 'car'
                ? 'Inquire on a car build, agree a deal in chat, and your sale order lands here.'
                : 'Genuine parts ship from the GAP Valenzuela Main Depot with tracked freight.'}
            </p>
            <Link to={kind === 'car' ? '/marketplace' : '/parts'} className="btn btn-primary btn-sm">
              {kind === 'car' ? 'Browse Car Builds' : 'Browse Parts Catalog'}
            </Link>
          </div>
        ) : (
          <div className="buyer-orders-grid">
            {filtered.map((o) => {
              const stage = stageOf(o)
              const item = o.item || {}
              const fin = o.financials || {}
              const key = o.order_number || o.id
              const isCar = (o.item?.type || o.item_type || 'part') === 'car'
              const needsAction = ['topay', 'delivered', 'awaiting'].includes(stage.key)
              return (
                <div
                  key={key}
                  className={`buyer-order-card${needsAction ? ' buyer-order-card--action' : ''}`}
                  onClick={() => openOrder(o)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openOrder(o) } }}
                >
                  <div className="buyer-order-media">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name || 'Item'} loading="lazy" />
                    ) : (
                      <div className="buyer-order-media-fallback">
                        {isCar ? <Car size={30} /> : <Package size={30} />}
                      </div>
                    )}
                    <span className="buyer-order-stage" style={{ background: stage.bg, color: stage.color }}>
                      {stage.label}
                    </span>
                  </div>
                  <div className="buyer-order-body">
                    <h3 className="buyer-order-title">{item.name || o.item_name || 'Automotive Component'}</h3>
                    <div className="buyer-order-ref">
                      <ReceiptText size={11} /> {key} · {item.sku || o.item_sku || 'GP-ITEM'}
                    </div>
                    <div className="buyer-order-sub">
                      {(o.financials?.payment_label || o.financials?.payment_status || o.payment_status) && (
                        <span>Payment: {o.financials?.payment_label || o.financials?.payment_status || o.payment_status}</span>
                      )}
                      {o.delivery?.zone && (
                        <span><MapPin size={11} /> {o.delivery.zone}</span>
                      )}
                      {o.proof?.status && o.proof.status !== 'none' && (
                        <span>Proof: {o.proof.status}</span>
                      )}
                    </div>
                  </div>
                  <div className="buyer-order-foot">
                    <span className="buyer-order-amount">{fin.formatted_total || peso(o.total_amount)}</span>
                    <span className={`buyer-order-cta${stage.key === 'topay' ? ' buyer-order-cta--pay' : ''}`}>
                      {ctaFor(stage.key)} <ChevronRight size={13} />
                    </span>
                  </div>
                  {stage.key === 'topay' && (
                    <Link
                      to={`/sales-order/${o.order_number || o.id}`}
                      className="buyer-order-quickpay"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Pay now <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
