import { useState } from 'react'
import { X, Camera, FileCheck2 } from 'lucide-react'
import { sellerOrdersApi } from '../../api/seller.js'

export default function ProofSubmitModal({ order, onClose, onSubmitted }) {
  const [note, setNote] = useState('')
  const [urls, setUrls] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!order) return null
  const orderNum = order.order_number || `#${order.id}`
  const isResubmit = order?.proof?.status === 'pending' || order?.proof?.status === 'rejected'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const images = urls.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean)
      const updated = await sellerOrdersApi.submitProof(order.id, {
        images,
        note: note.trim() || undefined,
      })
      onSubmitted?.(updated)
      onClose?.()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit handover proof.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="proof-modal-overlay" onClick={onClose}>
      <div className="proof-modal" onClick={(e) => e.stopPropagation()}>
        <div className="proof-modal-head">
          <div>
            <h3><FileCheck2 size={18} /> {isResubmit ? 'Resubmit handover proof' : 'Submit handover proof'}</h3>
            <p className="muted">Order {orderNum} · Admin review releases your held funds to your wallet.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {order?.proof?.status === 'rejected' && order?.proof?.rejection_reason && (
          <div className="my-listings-alert my-listings-alert--error">
            Rejected: {order.proof.rejection_reason}
          </div>
        )}

        <form onSubmit={handleSubmit} className="proof-modal-form">
          <label>
            Handover note for the admin reviewer
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Turnover location, odometer reading, keys / OR-CR handed over…"
            />
          </label>
          <label>
            <span><Camera size={13} /> Photo proof URLs (one per line or comma-separated)</span>
            <textarea
              rows={3}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={'https://…/handover-1.jpg\nhttps://…/odometer.jpg\nhttps://…/or-cr.jpg'}
            />
          </label>
          <p className="muted" style={{ fontSize: 12 }}>
            Tip: handover photo + odometer + OR/CR gets approved fastest. After approval the
            escrowed funds move to your wallet balance.
          </p>
          {error && <div className="my-listings-alert my-listings-alert--error">{error}</div>}
          <div className="proof-modal-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Submitting…' : isResubmit ? 'Resubmit for review' : 'Submit for admin review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
