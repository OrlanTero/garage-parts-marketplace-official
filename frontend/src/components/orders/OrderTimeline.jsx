import { Check, Circle, AlertTriangle, Ban } from 'lucide-react'

export const isCarOrder = (order) => (order?.item?.type || order?.item_type) === 'car'

// Fulfillment-first progress, mirroring the admin back-office stages
// (/orders/:id: processing → preparing → shipped → delivered →
// completed). Verification + payment are shown as badges, the reference
// line below, and the action sections — the stepper tracks the unit
// itself so buyers always see Processing / Preparing movement.
//
// Car builds (buyer × seller × garage): negotiation → sold collapses
// into Preparing, handover into Deliver, escrow needs Proof & payout.
// Parts (buyer × garage, seller × garage): straight depot freight.
const CAR_STEPS = [
  { id: 'processing', label: 'Processing' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'fulfill', label: 'Deliver' },
  { id: 'payout', label: 'Proof & payout' },
  { id: 'done', label: 'Completed' },
]

const PART_STEPS = [
  { id: 'processing', label: 'Processing' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'fulfill', label: 'Shipped' },
  { id: 'payout', label: 'Delivered' },
  { id: 'done', label: 'Completed' },
]

// Backend fulfillment order per type. The API only moves forward and
// only after verification, so the status alone positions the stepper.
const CAR_PHASE = ['processing', 'negotiating', 'reserved', 'preparing', 'sold', 'shipped', 'delivered', 'completed']
const PART_PHASE = ['processing', 'preparing', 'shipped', 'delivered', 'completed']

function stepState(order, stepId, car) {
  const verification = order?.verification_status || 'pending'
  const status = order?.status || 'processing'
  const proofStatus = order?.proof?.status || 'none'
  const phase = car ? CAR_PHASE : PART_PHASE
  const idx = phase.indexOf(status)

  if (['cancelled', 'refunded'].includes(status) || verification === 'rejected') {
    return 'blocked'
  }
  if (status === 'disputed' && (stepId === 'fulfill' || stepId === 'payout' || stepId === 'done')) {
    return stepId === 'fulfill' ? 'failed' : 'blocked'
  }
  // Unknown status string — never break the stepper.
  if (idx < 0) return 'todo'

  switch (stepId) {
    case 'processing':
      if (idx > 0) return 'done'
      return 'current'
    case 'preparing': {
      const doneAt = car ? phase.indexOf('sold') : phase.indexOf('shipped')
      if (idx >= doneAt) return 'done'
      if (idx > 0) return 'current'
      return verification === 'accepted' ? 'current' : 'todo'
    }
    case 'fulfill': {
      if (car) {
        if (['delivered', 'completed'].includes(status)) return 'done'
        if (status === 'shipped') return 'current'
        return 'todo'
      }
      if (['shipped', 'delivered', 'completed'].includes(status)) return 'done'
      if (status === 'preparing') return 'current'
      return 'todo'
    }
    case 'payout': {
      if (car) {
        if (proofStatus === 'approved' || status === 'completed') return 'done'
        if (proofStatus === 'pending') return 'current'
        if (proofStatus === 'rejected') return 'failed'
        if (['shipped', 'delivered'].includes(status)) return 'current'
        return 'todo'
      }
      if (['delivered', 'completed'].includes(status)) return 'done'
      if (status === 'shipped') return 'current'
      return 'todo'
    }
    case 'done':
      if (status === 'completed') return 'done'
      return 'todo'
    default:
      return 'todo'
  }
}

/**
 * Lifecycle stepper shared by buyer + seller views. Step states derive
 * from the SAME fields the admin order page acts on
 * (verification_status, payment_status, status, proof.status), so both
 * sides always read the same progress.
 */
export default function OrderTimeline({ order }) {
  if (!order) return null
  const car = isCarOrder(order)
  const steps = car ? CAR_STEPS : PART_STEPS
  const verification = order?.verification_status || 'pending'
  const payStatus = order?.financials?.payment_status || order?.payment_status || 'pending'
  const status = order?.status || 'processing'

  return (
    <div>
      <div className="order-timeline" aria-label="Order progress">
        {steps.map((s, i) => {
          const st = stepState(order, s.id, car)
          return (
            <div key={s.id} className={`order-timeline-step order-timeline-step--${st}`}>
              <div className="order-timeline-dot">
                {st === 'done' ? <Check size={13} /> : st === 'failed' ? <AlertTriangle size={13} /> : st === 'blocked' ? <Ban size={13} /> : <Circle size={11} />}
              </div>
              <div className="order-timeline-label">
                <span className="order-timeline-index">Step {i + 1}</span>
                <span className="order-timeline-name">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className="order-timeline-line" />}
            </div>
          )
        })}
      </div>
      <div className="order-timeline-ref muted">
        Verification: <strong>{order.verification_label || verification}</strong>
        {' · '}Payment: <strong>{order.financials?.payment_label || payStatus}</strong>
        {' · '}Fulfillment: <strong style={{ textTransform: 'capitalize' }}>{order.status_label || status}</strong>
      </div>
    </div>
  )
}
