import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  HandCoins,
  Link2,
  Tag,
  Undo2,
  X,
} from 'lucide-react'

const peso = (v) =>
  '₱ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const cardStyle = {
  background: '#161922',
  border: '1px solid #d8622c',
  borderRadius: 10,
  padding: '12px 14px',
  marginTop: 8,
  maxWidth: 340,
}

const btn = (primary) => ({
  fontSize: 12,
  fontWeight: 700,
  padding: '7px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  border: primary ? 'none' : '1px solid #2d3748',
  background: primary ? '#d8622c' : 'transparent',
  color: primary ? '#fff' : '#e2e8f0',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
})

function OfferCard({ offer, viewerId, onAction, acting }) {
  const [counterOpen, setCounterOpen] = useState(false)
  const [counterAmount, setCounterAmount] = useState('')
  const [counterError, setCounterError] = useState('')

  if (!offer) return null
  const isOriginator = Number(offer.sender_id) === Number(viewerId)
  const isSeller = Number(offer.seller?.id) === Number(viewerId)
  const status = offer.status || 'pending'

  const submitCounter = () => {
    const amount = Number(counterAmount)
    if (!amount || amount < 1) {
      setCounterError('Enter a valid counter amount.')
      return
    }
    setCounterError('')
    onAction('counter', { offer, amount })
    setCounterOpen(false)
    setCounterAmount('')
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Tag size={14} color="#d8622c" />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: '#fb923c' }}>
          {offer.parent_id ? 'COUNTER-OFFER' : 'PRICE OFFER'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
          {offer.status_label || status}
        </span>
      </div>

      <div style={{ fontSize: 20, fontWeight: 900, color: '#f8fafc', marginBottom: 2 }}>
        {offer.formatted_amount || peso(offer.amount)}
      </div>
      {offer.message && (
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 1.5 }}>
          “{offer.message}”
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {status === 'pending' && !isOriginator && (
          <>
            <button type="button" style={btn(true)} disabled={acting} onClick={() => onAction('accept', { offer })}>
              <Check size={13} /> Accept
            </button>
            <button type="button" style={btn(false)} disabled={acting} onClick={() => setCounterOpen((v) => !v)}>
              <Undo2 size={13} /> Counter
            </button>
            <button type="button" style={btn(false)} disabled={acting} onClick={() => onAction('reject', { offer })}>
              <X size={13} /> Decline
            </button>
          </>
        )}
        {status === 'pending' && isOriginator && (
          <button type="button" style={btn(false)} disabled={acting} onClick={() => onAction('withdraw', { offer })}>
            <X size={13} /> Withdraw
          </button>
        )}
        {status === 'accepted' && isOriginator && (
          <button type="button" style={btn(true)} disabled={acting} onClick={() => onAction('confirm', { offer })}>
            <BadgeCheck size={13} /> Confirm Deal
          </button>
        )}
        {status === 'accepted' && !isOriginator && (
          <span style={{ fontSize: 12, color: '#eab308' }}>Accepted — waiting for originator confirmation…</span>
        )}
        {status === 'confirmed' && isSeller && (
          <button type="button" style={btn(true)} disabled={acting} onClick={() => onAction('checkout-link', { offer })}>
            <Link2 size={13} /> Issue Checkout Link
          </button>
        )}
        {status === 'confirmed' && !isSeller && (
          <span style={{ fontSize: 12, color: '#10b981' }}>Deal locked — the seller will issue your checkout link…</span>
        )}
        {status === 'ordered' && (
          <span style={{ fontSize: 12, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <BadgeCheck size={13} /> Checked out at this price
          </span>
        )}
      </div>

      {counterOpen && status === 'pending' && !isOriginator && (
        <div style={{ marginTop: 10, borderTop: '1px solid #2d3748', paddingTop: 10 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
            YOUR COUNTER (₱)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              min="1"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              placeholder="e.g. 1185000"
              style={{ flex: 1, background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, padding: '8px 10px', color: '#f8fafc', fontSize: 13, outline: 'none' }}
            />
            <button type="button" style={btn(true)} disabled={acting} onClick={submitCounter}>
              Send
            </button>
          </div>
          {counterError && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 6 }}>{counterError}</div>}
        </div>
      )}
    </div>
  )
}

function ReservationCard({ reservation, viewerId, onAction, acting }) {
  const [ref, setRef] = useState('')
  const [refError, setRefError] = useState('')

  if (!reservation) return null
  const isBuyer = Number(reservation.buyer_id) === Number(viewerId)
  const isSeller = Number(reservation.seller_id) === Number(viewerId)
  const status = reservation.status || 'pending'

  const submitPay = () => {
    if (!ref.trim()) {
      setRefError('Enter the transaction reference.')
      return
    }
    setRefError('')
    onAction('pay-reservation', { reservation, payment_reference: ref.trim() })
  }

  return (
    <div style={{ ...cardStyle, borderColor: '#eab308' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <HandCoins size={14} color="#eab308" />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: '#eab308' }}>
          RESERVATION · {reservation.fee_percentage}% FEE
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
          {reservation.status_label || status}
        </span>
      </div>

      <div style={{ fontSize: 20, fontWeight: 900, color: '#f8fafc', marginBottom: 2 }}>
        {reservation.formatted_amount || peso(reservation.amount)}
      </div>
      {reservation.scheduled_for && (
        <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <CalendarClock size={13} />
          Scheduled: {new Date(reservation.scheduled_for).toLocaleString()}
          {status === 'paid' && ' — needs seller acceptance'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {status === 'pending' && isBuyer && (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Payment reference"
              style={{ flex: 1, background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, padding: '8px 10px', color: '#f8fafc', fontSize: 12, fontFamily: 'monospace', outline: 'none' }}
            />
            <button type="button" style={btn(true)} disabled={acting} onClick={submitPay}>
              Pay Now
            </button>
          </div>
        )}
        {status === 'paid' && isSeller && (
          <button type="button" style={btn(true)} disabled={acting} onClick={() => onAction('accept-reservation', { reservation })}>
            <Check size={13} /> Accept Payment
          </button>
        )}
        {status === 'paid' && isBuyer && (
          <span style={{ fontSize: 12, color: '#eab308' }}>Paid — awaiting seller acceptance…</span>
        )}
        {status === 'confirmed' && (
          <span style={{ fontSize: 12, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <BadgeCheck size={13} /> Reservation confirmed
          </span>
        )}
        {(status === 'pending' || status === 'paid') && (
          <button type="button" style={btn(false)} disabled={acting} onClick={() => onAction('cancel-reservation', { reservation })}>
            Cancel
          </button>
        )}
      </div>
      {refError && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 6 }}>{refError}</div>}
    </div>
  )
}

function CheckoutLinkCard({ metadata, offer }) {
  const token = metadata?.checkout_token
  const amount = offer?.amount
  const itemType = offer?.item_type
  const listingId = itemType === 'car' ? offer?.car_id : offer?.part_id
  if (!token || !listingId) return null
  const url = `/checkout?${itemType === 'car' ? 'car_id' : 'part_id'}=${listingId}&offer_token=${token}`

  return (
    <div style={{ ...cardStyle, borderColor: '#10b981' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Link2 size={14} color="#10b981" />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: '#10b981' }}>
          DEAL CHECKOUT READY
        </span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc', marginBottom: 8 }}>
        {peso(amount)} <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>agreed price</span>
      </div>
      <Link to={url} style={{ ...btn(true), textDecoration: 'none' }}>
        Proceed to Checkout <ArrowRight size={13} />
      </Link>
    </div>
  )
}

function SalesOrderCard({ metadata }) {
  const num = metadata?.sales_order_number
  if (!num) return null
  return (
    <div style={{ ...cardStyle, borderColor: '#10b981' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <BadgeCheck size={14} color="#10b981" />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: '#10b981' }}>
          PAID · SALES ORDER
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace', marginBottom: 2 }}>
        {num}
      </div>
      {metadata?.total_amount != null && (
        <div style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc', marginBottom: 8 }}>
          {peso(metadata.total_amount)} <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>held in escrow</span>
        </div>
      )}
      <Link to={`/sales-order/${num}`} style={{ ...btn(true), textDecoration: 'none' }}>
        View Receipt <ArrowRight size={13} />
      </Link>
    </div>
  )
}

export default function ChatDealCard({ message, viewerId, onAction, acting }) {
  if (!message) return null
  return (
    <>
      {message.metadata?.sales_order_number && (
        <SalesOrderCard metadata={message.metadata} />
      )}
      {message.offer && (
        <OfferCard offer={message.offer} viewerId={viewerId} onAction={onAction} acting={acting} />
      )}
      {message.reservation && (
        <ReservationCard reservation={message.reservation} viewerId={viewerId} onAction={onAction} acting={acting} />
      )}
      {message.metadata?.checkout_token && !message.offer && (
        <CheckoutLinkCard metadata={message.metadata} offer={null} />
      )}
      {message.metadata?.checkout_token && message.offer && (
        <CheckoutLinkCard metadata={message.metadata} offer={message.offer} />
      )}
    </>
  )
}
