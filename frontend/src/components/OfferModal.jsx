import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Tag, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { offersApi } from '../api/offers.js'

function formatPrice(val) {
  const num = Number(val)
  if (Number.isNaN(num)) return '₱ —'
  return '₱ ' + num.toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

/**
 * Make-an-Offer modal — buyer proposes a price + comment on a listing.
 * Props: open, onClose, listing { id, title, price, type: 'car' | 'part' }.
 */
export default function OfferModal({ open, onClose, listing, onSubmitted }) {
  const { isAuthenticated } = useAuth()
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!open || !listing) return null

  const listingPrice = Number(listing.price || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const value = Number(amount)
    if (!value || value < 1) {
      setError('Please enter your offer amount in pesos.')
      return
    }
    setSubmitting(true)
    try {
      const payload =
        listing.type === 'car'
          ? { item_type: 'car', car_id: listing.id, amount: value, message: message.trim() || undefined }
          : { item_type: 'part', part_id: listing.id, amount: value, message: message.trim() || undefined }
      await offersApi.create(payload)
      setSuccess(true)
      onSubmitted?.()
    } catch (err) {
      if (err?.response?.status === 401) {
        setError('Please log in to make an offer.')
      } else {
        setError(err?.response?.data?.message || 'Failed to submit your offer. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setAmount('')
    setMessage('')
    setError('')
    setSuccess(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={18} /> Make an Offer
          </h3>
          <button type="button" className="modal-close-btn" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>{listing.title}</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>
            Asking: {formatPrice(listingPrice)}
          </div>

          {!isAuthenticated ? (
            <div style={{ fontSize: 14, color: '#e2e8f0', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              Please <Link to="/login" onClick={handleClose} style={{ color: '#fb923c', fontWeight: 700 }}>log in</Link> to
              submit a price offer on this listing.
            </div>
          ) : success ? (
            <div style={{ fontSize: 14, color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              Offer submitted! The seller will review it — track status under <Link to="/offers" onClick={handleClose} style={{ color: '#10b981', fontWeight: 700 }}>My Offers</Link>.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Your Offer (₱) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={listingPrice ? String(listingPrice) : 'e.g. 1150000'}
                style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, padding: '12px 14px', color: '#f8fafc', fontSize: 16, fontWeight: 700, outline: 'none', marginBottom: 14 }}
              />
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Comment for Seller <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                placeholder="e.g. Cash buyer from Cebu, can pick up this weekend. Is the service history complete?"
                style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, padding: '12px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', resize: 'vertical', marginBottom: 14 }}
              />
              {error && (
                <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>
              )}
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%' }}>
                {submitting ? 'Submitting...' : 'Submit Offer'}
              </button>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 10, textAlign: 'center' }}>
                The seller may accept one offer — other pending offers on this listing auto-decline.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
