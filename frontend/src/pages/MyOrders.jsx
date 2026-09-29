import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  ArrowRight,
  Package,
  AlertCircle,
  MapPin,
} from 'lucide-react'
import { ordersApi } from '../api/orders.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useOrderStatusListener } from '../realtime/useOrderStatus.js'

const peso = (val) =>
  '₱ ' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const stageOf = (o) => {
  const v = o.verification_status || 'pending'
  const pay = o.financials?.payment_status || o.payment_status || 'pending'
  const st = o.status || 'processing'
  if (v === 'rejected') return { key: 'declined', group: 'cancelled', label: 'Declined by Seller', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }
  if (st === 'cancelled') return { key: 'cancelled', group: 'cancelled', label: 'Cancelled', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' }
  if (st === 'refunded') return { key: 'refunded', group: 'cancelled', label: 'Refunded', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' }
  if (st === 'disputed') return { key: 'disputed', group: 'transit', label: 'Disputed — Under Review', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }
  if (st === 'completed') return { key: 'completed', group: 'completed', label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
  if (v === 'pending') return { key: 'awaiting', group: 'awaiting', label: 'Awaiting Verification', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' }
  if (pay === 'pending') return { key: 'topay', group: 'topay', label: 'To Pay', color: '#fb923c', bg: 'rgba(216, 98, 44, 0.15)' }
  if (st === 'negotiating') return { key: 'negotiating', group: 'transit', label: 'Negotiating with Seller', color: '#a78bfa', bg: 'rgba(139, 92, 246, 0.12)' }
  if (st === 'sold') return { key: 'sold', group: 'transit', label: 'Sold — Awaiting Delivery', color: '#fb923c', bg: 'rgba(216, 98, 44, 0.15)' }
  const isCar = (o.item?.type || o.item_type || 'part') === 'car'
  if (pay === 'paid') return isCar
    ? { key: 'funds', group: 'transit', label: 'Payment Held in Escrow', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' }
    : { key: 'funds', group: 'transit', label: 'Payment Received', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' }
  if (st === 'delivered') return isCar
    ? { key: 'delivered', group: 'transit', label: 'Delivered — Inspect Now', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
    : { key: 'delivered', group: 'transit', label: 'Delivered', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
  if (st === 'shipped') return { key: 'shipped', group: 'transit', label: 'In Transit', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.12)' }
  return { key: 'preparing', group: 'transit', label: 'Preparing Dispatch', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.12)' }
}

const TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'awaiting', label: 'Awaiting Verification' },
  { id: 'topay', label: 'To Pay' },
  { id: 'transit', label: 'In Transit' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

export default function MyOrders() {
  const { user, isAuthenticated } = useAuth()
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [refreshTick, setRefreshTick] = useState(0)

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

  const filtered = tab === 'all' ? orders : orders.filter((o) => stageOf(o).group === tab)

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <ShoppingBag size={40} color="#d8622c" style={{ marginBottom: 12 }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0' }}>Sign in to view your orders</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 20px 0' }}>
          Your parts checkouts, payments, deliveries, and receipts live here.
        </p>
        <Link to="/login" className="btn btn-primary">Sign In</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, fontFamily: 'var(--font-display, inherit)' }}>
          My Orders
        </h1>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>
          {total} order{total === 1 ? '' : 's'} · {user?.username || user?.email || ''}
        </span>
      </div>
      <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 20px 0' }}>
        Track verification, payments, delivery, and grab your transaction receipts.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
              background: tab === t.id ? '#d8622c' : '#161922',
              border: tab === t.id ? '1px solid #d8622c' : '1px solid #2d3748',
              color: tab === t.id ? '#fff' : '#94a3b8',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>Loading your orders…</div>
      ) : error ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '14px 18px', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#161922', border: '1px solid #1e293b', borderRadius: 12 }}>
          <Package size={36} color="#475569" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 17, margin: '0 0 6px 0' }}>
            {tab === 'all' ? 'No orders yet' : `No ${TABS.find((t) => t.id === tab)?.label.toLowerCase()} orders`}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 16px 0' }}>
            Genuine parts ship from the GAP Valenzuela Main Depot with tracked freight.
          </p>
          <Link to="/parts" className="btn btn-primary btn-sm">Browse Parts Catalog</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((o) => {
            const stage = stageOf(o)
            const item = o.item || {}
            const fin = o.financials || {}
            const key = o.order_number || o.id
            const receiptTo = `/sales-order/${o.order_number || o.id}`
            return (
              <Link
                key={key}
                to={receiptTo}
                style={{
                  display: 'flex', gap: 16, background: '#161922', border: '1px solid #1e293b',
                  borderRadius: 12, padding: 16, textDecoration: 'none', color: 'inherit', alignItems: 'center', flexWrap: 'wrap',
                }}
              >
                <div style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', background: '#0f1117', border: '1px solid #2d3748', flexShrink: 0 }}>
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=400&q=80'}
                    alt={item.name || 'Item'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>
                    {item.name || o.item_name || 'Automotive Component'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', marginBottom: 6 }}>
                    {key} · {item.sku || o.item_sku || 'GP-ITEM'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 12, background: stage.bg, color: stage.color }}>
                      {stage.label}
                    </span>
                    {o.delivery?.zone && (
                      <span style={{ fontSize: 11, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> {o.delivery.zone}{o.delivery.distance_km != null ? ` · ${o.delivery.distance_km} km` : ''}
                      </span>
                    )}
                    {o.tracking_url && (
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.open(o.tracking_url, '_blank', 'noopener')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') window.open(o.tracking_url, '_blank', 'noopener')
                        }}
                        style={{ fontSize: 11, fontWeight: 800, color: '#fb923c', cursor: 'pointer' }}
                      >
                        Track Delivery →
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#d8622c', marginBottom: 6 }}>
                    {fin.formatted_total || peso(o.total_amount)}
                  </div>
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
                      background: stage.key === 'topay' ? '#d8622c' : '#1e293b',
                      color: '#fff', borderRadius: 8, padding: '8px 14px',
                    }}
                  >
                    <span>{stage.key === 'topay' ? 'Pay Now' : stage.key === 'delivered' ? 'Inspect Now' : 'View Order'}</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
