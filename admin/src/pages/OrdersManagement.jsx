import { useEffect, useState } from 'react'
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  AlertCircle,
  PackageCheck,
  ExternalLink,
  ChevronRight,
  User,
  MapPin,
  DollarSign,
  ArrowRight,
  Car,
  RefreshCw,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'
import { adminApi } from '../api/admin.js'

export default function OrdersManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState(null)

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getOrders()
      const data = res?.data || []
      setOrders(data)
    } catch (err) {
      console.error('Failed to load admin orders:', err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const filteredOrders = orders.filter((o) => {
    const orderId = (o.order_number || o.id || '').toString().toLowerCase()
    const buyerName = (o.buyer?.name || o.buyer_name || '').toLowerCase()
    const sellerName = (o.seller?.name || o.seller_name || o.item?.seller_name || '').toLowerCase()
    const itemName = (o.item?.name || o.item_name || '').toLowerCase()
    const search = searchQuery.toLowerCase()

    const matchesSearch =
      orderId.includes(search) ||
      buyerName.includes(search) ||
      sellerName.includes(search) ||
      itemName.includes(search)

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const markCompleted = async (orderId) => {
    setUpdatingId(orderId)
    try {
      await adminApi.updateOrderStatus(orderId, { status: 'delivered' })
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || o.order_number === orderId
            ? {
                ...o,
                status: 'delivered',
                status_label: 'Delivered & Completed',
                status_variant: 'success',
              }
            : o
        )
      )
    } catch (err) {
      console.error('Failed to update order status:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const verifyOrder = async (ord, action) => {
    const note =
      action === 'reject'
        ? window.prompt('Decline reason shown to the buyer (optional):', '')
        : null
    if (action === 'reject' && note === null) return
    if (action === 'accept' && !window.confirm(`Verify & accept order ${ord.order_number || `#${ord.id}`}? Other pending requests for this listing auto-decline.`)) return
    const key = ord.id
    setUpdatingId(key)
    try {
      const fn = action === 'accept' ? adminApi.acceptSellerOrder : adminApi.rejectSellerOrder
      const updated = await fn(ord.id, action === 'reject' && note ? note : undefined)
      setOrders((prev) =>
        prev.map((o) =>
          o.id === ord.id || o.order_number === ord.order_number ? { ...o, ...(updated || {}), verification_status: action === 'accept' ? 'accepted' : 'rejected' } : o
        )
      )
      // Refresh to pick up auto-rejected competing requests.
      loadOrders()
    } catch (err) {
      console.error('Failed to verify order:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const verificationBadge = (ord) => {
    const v = ord.verification_status || 'pending'
    if (v === 'accepted') return { label: ord.verification_label || 'Verified & Accepted', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }
    if (v === 'rejected') return { label: ord.verification_label || 'Declined', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }
    return { label: ord.verification_label || 'Awaiting Verification', bg: 'rgba(234, 179, 8, 0.12)', color: '#b45309' }
  }

  // Calculate live KPI metrics
  const totalVolume = orders.reduce((sum, o) => sum + Number(o.total_amount || o.financials?.total_amount || 0), 0)
  const activeShipmentsCount = orders.filter((o) => ['processing', 'shipped'].includes(o.status)).length
  const platformTake = totalVolume * 0.05

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Orders & Marketplace Fulfillment Lifecycle
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Audit marketplace purchases, manage order fulfillment status, track carrier waybills, and process seller payouts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={loadOrders}
            className="admin-btn admin-btn-secondary"
            style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} />
            <span>Refresh Orders</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(146, 68, 36, 0.1)', color: 'var(--color-rust)' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total Order Volume</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              ₱ {totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <Truck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Shipments</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {activeShipmentsCount} Pending
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Platform Take (5%)</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              ₱ {platformTake.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div className="orders-tab-row" style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)', overflowX: 'auto', maxWidth: '100%' }}>
          {['all', 'processing', 'shipped', 'delivered', 'disputed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`tab-btn ${statusFilter === st ? 'active' : ''}`}
            >
              {st === 'all' ? 'All Orders' : st.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: 320, flex: '1 1 220px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search order ID, buyer, seller, part..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* Orders Stream */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: 12 }} />
          <p>Loading verified orders from database...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
          <ShoppingBag size={32} style={{ color: 'var(--admin-text-muted)', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>No orders found</div>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: 13, margin: '4px 0 0 0' }}>
            No marketplace sales orders match the active filter criteria.
          </p>
        </div>
      ) : (
        <Accordion defaultOpen={[filteredOrders[0]?.order_number || String(filteredOrders[0]?.id)]}>
          {filteredOrders.map((ord) => {
            const orderKey = ord.order_number || String(ord.id)
            const buyerName = ord.buyer?.name || ord.buyer_name || 'Verified Buyer'
            const buyerEmail = ord.buyer?.email || ord.buyer_email || ''
            const sellerTitle = ord.item?.seller_name || ord.seller_name || ord.seller?.name || 'Verified Merchant'
            const totalDisplay = ord.financials?.formatted_total || `₱ ${Number(ord.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            const formattedDate = ord.placed_at || (ord.created_at ? new Date(ord.created_at).toLocaleString() : 'Recent')
            const statusLabel = ord.status_label || (ord.status ? ord.status.toUpperCase() : 'PROCESSING')
            const statusVariant = ord.status_variant || (ord.status === 'delivered' ? 'success' : ord.status === 'shipped' ? 'info' : 'rust')
            const lineItems = ord.items && ord.items.length > 0 ? ord.items : [
              {
                name: ord.item?.name || ord.item_name || 'Automotive Component',
                sku: ord.item?.sku || ord.item_sku || 'GP-ITEM',
                qty: ord.quantity || 1,
                price: ord.financials?.formatted_unit_price || `₱ ${Number(ord.unit_price || 0).toLocaleString()}`,
              }
            ]
            const verify = verificationBadge(ord)
            const isPendingVerification = (ord.verification_status || 'pending') === 'pending'

            return (
              <AccordionItem key={orderKey} id={orderKey}>
                <AccordionHeader
                  id={orderKey}
                  title={`${orderKey} · ${buyerName}`}
                  subtitle={`Placed on ${formattedDate} · Seller: ${sellerTitle}`}
                  badge={{ label: statusLabel, variant: statusVariant }}
                  icon={ShoppingBag}
                  actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 12, background: verify.bg, color: verify.color }}>
                        {verify.label}
                      </span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--color-rust)' }}>
                        {totalDisplay}
                      </span>
                    </div>
                  }
                />
                <AccordionBody id={orderKey}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* Order Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                      {/* Buyer Box */}
                      <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                          <User size={14} /> Buyer Details
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{buyerName}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{buyerEmail}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 4 }}>
                          <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {ord.buyer?.full_address || ord.shipping_address || 'Makati Metro Manila'}
                        </div>
                      </div>

                      {/* Seller & Payout Box */}
                      <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                          <DollarSign size={14} /> Payout & Financials
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{sellerTitle}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                          Total: <strong>{totalDisplay}</strong> (Payment: {ord.payment_method || 'Bank Transfer'})
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <span className={`badge badge-${ord.status === 'delivered' ? 'success' : 'warning'}`} style={{ fontSize: 11 }}>
                            {ord.status === 'delivered' ? 'Payment Settled' : 'In Escrow'}
                          </span>
                        </div>
                      </div>

                      {/* Shipping Box */}
                      <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                          <Truck size={14} /> Carrier & Tracking
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{ord.carrier || 'Freight Logistics PH'}</div>
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-rust)', marginTop: 2 }}>
                          {ord.tracking_number || ord.trackingNumber || 'PENDING-DISPATCH'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 6 }}>
                          Courier Waybill: {ord.status === 'shipped' || ord.status === 'delivered' ? 'In Transit / Validated' : 'Awaiting Carrier Scan'}
                        </div>
                      </div>

                      {/* Vehicle & Chassis Fitment Box */}
                      <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--color-rust)', marginBottom: 6 }}>
                          <Car size={14} /> Vehicle Fitment
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                          Chassis #: <strong style={{ fontFamily: 'monospace', color: 'var(--admin-text-primary)' }}>{ord.vehicle?.chassis_number || ord.chassis_number || 'N/A'}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 2 }}>
                          VIN: <strong style={{ fontFamily: 'monospace', color: 'var(--color-rust)' }}>{ord.vehicle?.vin || ord.vin || 'N/A'}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                          Vehicle: {ord.vehicle?.make_model || ord.vehicle_make_model || 'Target Vehicle Specification'}
                        </div>
                      </div>

                      {/* Sales Agent Attribution Box */}
                      {(ord.agent || ord.agent_code) && (
                        <div style={{ background: 'rgba(249, 115, 22, 0.05)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid rgba(249, 115, 22, 0.25)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#f97316', marginBottom: 6 }}>
                            <span>🤝</span> Referring Sales Agent
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--admin-text-primary)' }}>
                            {ord.agent?.name || ord.agent_name || 'Affiliate Partner'}
                          </div>
                          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#f97316', marginTop: 2 }}>
                            Code: {ord.agent?.code || ord.agent_code}
                          </div>
                          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: 600 }}>
                            Commission: {ord.agent?.formatted_commission_amount || `₱ ${Number(ord.commission_amount || 0).toLocaleString()}`}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Line Items Table */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8 }}>
                        Order Line Items ({lineItems.length}):
                      </div>
                      <div className="table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Item Description</th>
                              <th>SKU</th>
                              <th>Qty</th>
                              <th style={{ textAlign: 'right' }}>Unit Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lineItems.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600 }}>{item.name}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--admin-text-muted)' }}>{item.sku}</td>
                                <td>{item.qty}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-rust)' }}>{item.price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Administrative Order Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        Order Number: <strong>{orderKey}</strong> · Verified Marketplace Order
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {isPendingVerification && (
                          <>
                            <button
                              onClick={() => verifyOrder(ord, 'accept')}
                              disabled={updatingId === ord.id}
                              className="admin-btn admin-btn-primary"
                              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                              <CheckCircle2 size={14} />
                              <span>{updatingId === ord.id ? 'Updating...' : 'Verify & Accept'}</span>
                            </button>
                            <button
                              onClick={() => verifyOrder(ord, 'reject')}
                              disabled={updatingId === ord.id}
                              className="admin-btn admin-btn-secondary"
                              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                              <span>{updatingId === ord.id ? 'Updating...' : 'Decline Request'}</span>
                            </button>
                          </>
                        )}
                        {ord.status === 'processing' && (
                          <button
                            onClick={() => markCompleted(ord.id)}
                            disabled={updatingId === ord.id}
                            className="admin-btn admin-btn-primary"
                            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <CheckCircle2 size={14} />
                            <span>{updatingId === ord.id ? 'Updating...' : 'Mark Fulfilled & Settle Payout'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionBody>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}
