import { useState } from 'react'
import { CheckCircle2, MessageSquareText, Send, Truck } from 'lucide-react'

const BUYER_TEMPLATES = [
  'When can I get my order?',
  'Any update on my order?',
  'Can I have the tracking number please?',
]

const SELLER_TEMPLATES = [
  'Your order is ready!',
  'Your order is being prepared.',
  'Thank you for your purchase!',
]

// Next fulfillment step per order status (seller buttons that move the
// order AND notify the buyer in-thread via the backend).
function nextSteps(order) {
  const st = order?.status
  if (st === 'sold' || st === 'processing' || st === 'negotiating' || st === 'preparing') return ['shipped']
  if (st === 'shipped') return ['delivered']
  return []
}

/**
 * Replaces Make Offer / Reservation once a sale order is sold: quick
 * update-message templates for both sides, plus seller buttons wired to
 * the sale-order status (each move auto-messages the buyer).
 */
export default function ThreadQuickBar({
  isSeller,
  activeOrder,
  onSendText,
  onAdvanceStatus,
  sending = false,
}) {
  const [busy, setBusy] = useState(null)

  const sendTemplate = async (text) => {
    if (sending || busy) return
    setBusy(`msg:${text}`)
    try {
      await onSendText(text)
    } finally {
      setBusy(null)
    }
  }

  const advance = async (status) => {
    if (sending || busy || !activeOrder) return
    setBusy(`status:${status}`)
    try {
      await onAdvanceStatus(activeOrder, status)
    } finally {
      setBusy(null)
    }
  }

  const templates = isSeller ? SELLER_TEMPLATES : BUYER_TEMPLATES
  const steps = isSeller ? nextSteps(activeOrder) : []

  return (
    <div className="messages-hub-deal-bar messages-hub-quickbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
        <MessageSquareText size={13} />
        <span>
          {activeOrder
            ? `Order ${activeOrder.order_number || `#${activeOrder.id}`} · ${activeOrder.status} — quick updates`
            : 'Sold — quick updates'}
        </span>
      </div>

      <div className="messages-hub-quick-scroll">
        {templates.map((t) => (
          <button
            key={t}
            type="button"
            disabled={sending || busy !== null}
            onClick={() => sendTemplate(t)}
            className="messages-hub-deal-btn"
            title="Send this update instantly"
          >
            <Send size={12} /> {busy === `msg:${t}` ? 'Sending…' : t}
          </button>
        ))}
      </div>

      {steps.length > 0 && (
      <div className="messages-hub-quick-scroll">
          {steps.map((st) => (
            <button
              key={st}
              type="button"
              disabled={sending || busy !== null}
              onClick={() => advance(st)}
              className="messages-hub-deal-btn messages-hub-deal-btn--reserve"
              title={`Move the sale order to ${st} — the buyer is messaged automatically`}
            >
              {st === 'shipped' ? <Truck size={13} /> : <CheckCircle2 size={13} />}
              {busy === `status:${st}` ? 'Updating…' : `Mark ${st} + notify buyer`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
