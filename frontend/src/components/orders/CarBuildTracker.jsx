import { Handshake } from 'lucide-react'

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`

/**
 * Car-build deal pipeline for the buyer — wired step-for-step to the
 * same states the admin Car Transactions page settles:
 * deal → billing → payment (sold) → fund confirm → escrow hold →
 * delivery → documents → seller proof → proof approval → commissions →
 * seller payout. Pure read of the order payload; realtime refresh comes
 * from the parent detail view.
 */
export default function CarBuildTracker({ order, role = 'buyer' }) {
  if (!order) return null
  const sellerView = role === 'seller'
  const verification = order.verification_status || 'pending'
  const pay = order.financials?.payment_status || order.payment_status || 'pending'
  const status = order.status || 'processing'
  const proof = order.proof?.status || 'none'
  const paid = ['paid', 'confirmed', 'released'].includes(pay)
  const released = pay === 'released'
  const closed = ['cancelled', 'refunded'].includes(status)
  const billing = order.buyer?.full_address || order.shipping_address || ''
  const total = Number(order.financials?.total_amount ?? order.total_amount ?? 0)
  const settle = order.settlement || {}
  const platformRate = Number(settle.platform_rate ?? 5)
  const platformFee = Number(settle.platform_fee ?? (total * platformRate) / 100)
  const agentFee = Number(settle.agent_fee ?? 0)
  const agent = order.agent || (order.agent_code ? { name: order.agent_name, code: order.agent_code } : null)

  const steps = [
    {
      stage: 'Stage 1 · Processing',
      items: [
        {
          label: 'Deal confirmed — sale order created',
          state: 'done',
          hint: `${order.order_number || `#${order.id}`} · placed ${order.placed_at || ''}`.trim(),
        },
        {
          label: 'Billing address & personal details submitted',
          state: billing ? 'done' : verification === 'accepted' ? 'current' : 'todo',
          hint: billing || 'Checkout details go to the admin with your order.',
        },
        {
          label: 'Payment — unit marked Sold',
          state: paid ? 'done' : verification === 'accepted' ? 'current' : 'todo',
          hint: paid ? `${order.financials?.payment_label || pay}${order.financials?.payment_reference ? ` · ${order.financials.payment_reference}` : ''}` : 'Pay in the section above to close the deal.',
        },
      ],
    },
    {
      stage: 'Stage 2 · Preparing',
      items: [
        {
          label: 'Admin confirms funds',
          state: ['confirmed', 'released'].includes(pay) ? 'done' : pay === 'paid' ? 'current' : 'todo',
          hint: pay === 'paid' ? 'House is verifying your transfer.' : ['confirmed', 'released'].includes(pay) ? 'Verified by the house.' : 'Happens right after you pay.',
        },
        {
          label: 'Admin holds funds in escrow',
          state: released || status === 'completed' ? 'done' : closed ? 'blocked' : status === 'disputed' ? 'current' : paid ? 'done' : 'todo',
          hint: released || status === 'completed'
            ? `Held ${peso(total)}, then released.`
            : status === 'disputed'
              ? 'Frozen — dispute under review.'
              : paid ? `Held automatically — ${peso(total)} locked, neither side can touch it.` : 'Locks automatically once funds are confirmed.',
        },
      ],
    },
    {
      // Same stage as the stepper's Deliver and the admin's shipped → delivered.
      stage: 'Stage 3 · Deliver (admin: shipped → delivered)',
      items: [
        {
          label: 'Car delivered to your billing address',
          state: ['delivered', 'completed'].includes(status) ? 'done' : closed ? 'blocked' : paid ? 'current' : 'todo',
          hint: ['delivered', 'completed'].includes(status)
            ? (billing || 'Delivered.')
            : paid
              ? sellerView
                ? `Funds secured — deliver${billing ? ` to ${billing}` : ''}, then hand over the documents.`
                : `Funds secured — waiting on the seller to deliver${billing ? ` to ${billing}` : ''}.`
              : 'Seller delivers to the address on this order.',
        },
        {
          label: 'Documents handed over (OR/CR, keys)',
          state: proof !== 'none' || ['delivered', 'completed'].includes(status) ? 'done' : status === 'shipped' ? 'current' : closed ? 'blocked' : 'todo',
          hint: proof !== 'none' ? 'Turnover recorded with the proof below.' : 'Happens at delivery, before the seller submits proof.',
        },
      ],
    },
    {
      stage: 'Stage 4 · Proof & payout',
      items: [
        {
          label: 'Seller proof taken',
          state: ['pending', 'approved'].includes(proof) ? 'done' : proof === 'rejected' ? 'failed' : status === 'delivered' ? 'current' : 'todo',
          hint: proof === 'rejected'
            ? `Returned: ${order.proof?.rejection_reason || 'needs rework'}`
            : ['pending', 'approved'].includes(proof)
              ? 'Handover photos + note with the admin reviewer.'
              : sellerView ? 'You submit handover evidence after delivery.' : 'Seller submits handover evidence after delivery.',
        },
        {
          label: 'Admin confirms proof',
          state: proof === 'approved' ? 'done' : proof === 'rejected' ? 'failed' : proof === 'pending' ? 'current' : 'todo',
          hint: proof === 'approved' ? 'Approved — payout unlocked.' : proof === 'pending' ? 'Reviewer is checking the handover.' : 'Gates the commissions and payout.',
        },
        {
          label: 'Commissions taken — agent & admin',
          state: released ? 'done' : proof === 'approved' ? 'current' : 'todo',
          hint: `Admin ${platformRate}% (${peso(platformFee)})${agent ? ` · Agent ${agent.name || agent.code || ''} (${peso(agentFee)})` : ' · No agent on this deal'}`,
        },
      ],
    },
    {
      stage: 'Stage 5 · Completed',
      items: [
        {
          label: 'Funds released to seller wallet',
          state: released ? 'done' : proof === 'approved' ? 'current' : closed ? 'blocked' : 'todo',
          hint: released
            ? `${peso(Number(settle.seller_receives ?? total - platformFee - agentFee))} to ${sellerView ? 'your wallet.' : 'seller.'}`
            : 'Last step — only after proof approval.',
        },
      ],
    },
  ]

  const groupState = (items) => {
    if (items.some((s) => s.state === 'failed')) return 'failed'
    if (items.every((s) => s.state === 'done')) return 'done'
    if (items.some((s) => s.state === 'current')) return 'current'
    if (items.every((s) => s.state === 'blocked')) return 'blocked'
    return 'todo'
  }

  return (
    <div className="car-pipeline">
      {steps.map((g) => (
        <div key={g.stage} className={`car-pipeline-group car-pipeline-group--${groupState(g.items)}`}>
          <div className="car-pipeline-group-title">{g.stage}</div>
          <div className="car-pipeline-steps">
            {g.items.map((s, i) => (
              <div key={s.label} className={`car-pipeline-step car-pipeline-step--${s.state}`}>
                <div className="car-pipeline-rail">
                  <span className={`order-timeline-dot order-timeline-dot--${s.state}`}>
                    <span className="car-pipeline-num">{i + 1}</span>
                  </span>
                  {i < g.items.length - 1 && <span className="car-pipeline-line" />}
                </div>
                <div className="car-pipeline-text">
                  <strong>{s.label}</strong>
                  {s.hint && <p>{s.hint}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="receipt-box car-settlement">
        <div className="receipt-box-title"><Handshake size={13} /> Settlement breakdown</div>
        <div className="receipt-money">
          <div><span>Total you paid</span><span>{order.financials?.formatted_total || peso(total)}</span></div>
          <div><span>Admin fee ({platformRate}%)</span><span>−{peso(platformFee)}</span></div>
          <div><span>Agent commission{settle.agent_status ? ` (${settle.agent_status})` : ''}</span><span>−{peso(agentFee)}</span></div>
          <div className="receipt-money-total"><span>Seller receives</span><span>{peso(Number(settle.seller_receives ?? total - platformFee - agentFee))}</span></div>
        </div>
      </div>
    </div>
  )
}
