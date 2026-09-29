import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { SELLER_ORDER_STATUSES } from '../api/seller.js'
import { sellerOrdersApi } from '../api/seller.js'
import { useListingOrders } from '../hooks/useListingOrders.js'
import { useOrderStatusListener } from '../realtime/useOrderStatus.js'

const CLOSED = ['completed', 'refunded', 'cancelled']

/**
 * Deal pipeline control for a listing thread. Sellers pick which sale
 * order on this listing to advance, flip its fulfillment status
 * (cars: processing → negotiating → sold → shipped → delivered →
 * completed via escrow inspection, or disputed → refunded; parts:
 * processing → preparing → shipped → delivered → completed via direct
 * capture), and jump to its receipt. Buyers see their own order chips
 * with live statuses instead.
 *
 * Used in the inbox chat header and the floating drawer — same control,
 * same statuses, same endpoint everywhere.
 */
export default function SaleOrderStatusControl({ listingType, listingId, role, compact = false }) {
  const { orders, refresh } = useListingOrders(listingType, listingId, role)
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Live: another party (or admin) moving an order on this listing
  // refreshes this control instantly — no manual reload.
  useOrderStatusListener((event) => {
    if (!event || !listingType || !listingId) return
    const match =
      (listingType === 'car' && Number(event.car_id) === Number(listingId)) ||
      (listingType === 'part' && Number(event.part_id) === Number(listingId))
    if (match) refresh()
  })

  const openOrders = useMemo(() => orders.filter((o) => !CLOSED.includes(o.status)), [orders])
  const selected = orders.find((o) => String(o.id) === String(selectedId) || o.order_number === selectedId)
    || openOrders[0]
    || orders[0]
    || null

  useEffect(() => {
    if (selected && String(selectedId) !== String(selected.id)) {
      setSelectedId(selected.id)
    }
    if (!selected) {
      setSelectedId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders])

  if (role !== 'selling') {
    if (orders.length === 0) return null
    return (
      <div className="messages-hub-counterparty-strip messages-hub-orders-strip">
        <span className="messages-hub-orders-label">Your order on this listing:</span>
        {orders.map((o) => (
          <Link
            key={o.id || o.order_number}
            to={`/sales-order/${o.order_number || o.id}`}
            className="messages-hub-counterparty-chip messages-hub-order-chip"
            title={`Open sale order ${o.order_number}`}
          >
            <span>{o.order_number}</span>
            <em>{o.status}</em>
          </Link>
        ))}
      </div>
    )
  }

  const handleStatusChange = async (next) => {
    if (!selected || busy || next === selected.status) return
    if (next === 'sold' && !window.confirm(`Mark order ${selected.order_number} as sold (unit committed)?`)) return
    setBusy(true)
    setError('')
    try {
      await sellerOrdersApi.updateStatus(selected.id, { status: next })
      await refresh()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update order status.')
    } finally {
      setBusy(false)
    }
  }

  const handleRefund = async () => {
    if (!selected || busy) return
    const isCar = (selected.item?.type || selected.item_type || listingType) === 'car'
    const note = window.prompt('Refund note for the buyer (optional):', isCar ? 'Refunded after inspection dispute.' : 'Refunded after dispute resolution.')
    if (note === null) return
    if (!window.confirm(`Refund the payment for order ${selected.order_number} back to the buyer?`)) return
    setBusy(true)
    setError('')
    try {
      await sellerOrdersApi.refund(selected.id, note || undefined)
      await refresh()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to refund order.')
    } finally {
      setBusy(false)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="messages-hub-counterparty-strip messages-hub-orders-strip">
        <span className="messages-hub-orders-label">No sale orders on this listing yet</span>
      </div>
    )
  }

  return (
    <div className="messages-hub-counterparty-strip messages-hub-orders-strip">
      <span className="messages-hub-orders-label">Sale order:</span>
      {orders.length > 1 && (
        <select
          value={selected?.id ?? ''}
          disabled={busy}
          onChange={(e) => setSelectedId(e.target.value)}
          title="Choose which sale order to advance"
          style={compact ? undefined : { background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, color: '#f8fafc', fontSize: 12, fontWeight: 700, padding: '7px 10px', cursor: 'pointer', outline: 'none' }}
        >
          {orders.map((o) => (
            <option key={o.id || o.order_number} value={o.id}>
              {o.order_number} · {o.buyer?.name || o.buyer_name || 'Buyer'} · {o.status}
            </option>
          ))}
        </select>
      )}
      {selected && (
        <>
          <select
            value={selected.status || 'processing'}
            disabled={busy || CLOSED.includes(selected.status)}
            onChange={(e) => handleStatusChange(e.target.value)}
            title={CLOSED.includes(selected.status) ? 'This order is closed' : 'Advance this sale order'}
            style={compact ? undefined : { background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, color: '#f8fafc', fontSize: 12, fontWeight: 700, padding: '7px 10px', cursor: 'pointer', outline: 'none' }}
          >
            {SELLER_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
            {CLOSED.includes(selected.status) && !SELLER_ORDER_STATUSES.includes(selected.status) && (
              <option value={selected.status}>{selected.status}</option>
            )}
          </select>
          <Link
            to={`/sales-order/${selected.order_number || selected.id}`}
            className="messages-hub-counterparty-chip messages-hub-order-chip"
            title={`Open receipt ${selected.order_number}`}
          >
            <FileText size={12} />
            <span>{selected.order_number}</span>
          </Link>
          {selected.status === 'disputed' && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRefund}
              title="Resolve the dispute by refunding the payment"
              style={{ background: 'transparent', border: '1px solid #2d3748', borderRadius: 8, color: '#e2e8f0', fontSize: 12, fontWeight: 700, padding: '7px 12px', cursor: 'pointer' }}
            >
              Refund Buyer
            </button>
          )}
        </>
      )}
      {error && <span className="messages-hub-deal-error">{error}</span>}
    </div>
  )
}
