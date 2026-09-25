import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Tag, Check, X, RefreshCw, Store, User } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { offersApi, OFFER_STATUS_LABELS } from '../api/offers.js'

const SELLER_ROLES = ['seller', 'dealer', 'parts_seller', 'admin', 'super_admin']

function formatPrice(val) {
  const num = Number(val)
  if (Number.isNaN(num)) return '₱ —'
  return '₱ ' + num.toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

const STATUS_COLORS = {
  pending: '#eab308',
  accepted: '#10b981',
  rejected: '#ef4444',
  withdrawn: '#64748b',
}

function OfferCard({ offer, mode, onAction, acting }) {
  const listingPath =
    offer.item_type === 'car' ? `/marketplace/${offer.car_id}` : `/parts/${offer.part_id}`
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(null) // 'accept' | 'reject' | null

  return (
    <div style={{ background: '#161922', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <div>
          <Link to={listingPath} style={{ fontWeight: 700, color: '#f8fafc', textDecoration: 'none', fontSize: 15 }}>
            {offer.item_title || (offer.item_type === 'car' ? 'Vehicle listing' : 'Parts listing')}
          </Link>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {mode === 'received'
              ? <>From <strong style={{ color: '#cbd5e1' }}>{offer.buyer?.name || 'Buyer'}</strong></>
              : <>To <strong style={{ color: '#cbd5e1' }}>{offer.seller?.name || 'Seller'}</strong></>}
            {' · '}{new Date(offer.created_at).toLocaleString()}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: STATUS_COLORS[offer.status] || '#94a3b8',
          border: `1px solid ${STATUS_COLORS[offer.status] || '#334155'}`,
          borderRadius: 12, padding: '4px 10px', height: 'fit-content',
        }}>
          {OFFER_STATUS_LABELS[offer.status] || offer.status}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fb923c' }}>{formatPrice(offer.amount)}</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>Asking: {formatPrice(offer.item_price)}</span>
      </div>

      {offer.message && (
        <div style={{ fontSize: 13, color: '#cbd5e1', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
          “{offer.message}”
        </div>
      )}
      {offer.seller_note && (
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
          Seller note: <em>{offer.seller_note}</em>
        </div>
      )}

      {mode === 'mine' && offer.status === 'pending' && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={acting}
          onClick={() => onAction('withdraw', offer)}
        >
          <X size={13} /> Withdraw Offer
        </button>
      )}

      {mode === 'received' && offer.status === 'pending' && confirming === null && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-primary btn-sm" disabled={acting} onClick={() => setConfirming('accept')}>
            <Check size={13} /> Accept
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={acting} onClick={() => setConfirming('reject')}>
            <X size={13} /> Decline
          </button>
        </div>
      )}

      {mode === 'received' && offer.status === 'pending' && confirming !== null && (
        <div style={{ marginTop: 4 }}>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={confirming === 'accept' ? 'Note for buyer (optional)' : 'Reason for declining (optional)'}
            style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13, outline: 'none', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={acting} onClick={() => onAction(confirming, offer, note.trim() || undefined)}>
              <Check size={13} /> Confirm {confirming === 'accept' ? 'Accept' : 'Decline'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setConfirming(null); setNote('') }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Offers() {
  const { user, isAuthenticated } = useAuth()
  const isSeller = isAuthenticated && user && SELLER_ROLES.includes(user.role)
  const [tab, setTab] = useState('mine') // mine | received
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = tab === 'received' ? await offersApi.incoming({ per_page: 50 }) : await offersApi.mine({ per_page: 50 })
      setOffers(res?.data ?? [])
    } catch {
      setError('Failed to load offers.')
      setOffers([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, tab])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (action, offer, note) => {
    setActing(true)
    setError('')
    setNotice('')
    try {
      if (action === 'withdraw') {
        await offersApi.withdraw(offer.id)
        setNotice('Offer withdrawn.')
      } else if (action === 'accept') {
        await offersApi.accept(offer.id, note)
        setNotice('Offer accepted. Other pending offers on this listing were auto-declined.')
      } else {
        await offersApi.reject(offer.id, note)
        setNotice('Offer declined.')
      }
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Action failed. Please try again.')
    } finally {
      setActing(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <Tag size={36} style={{ color: '#64748b', marginBottom: 12 }} />
        <h2>Price Offers</h2>
        <p style={{ color: '#94a3b8' }}>
          Please <Link to="/login" style={{ color: '#fb923c', fontWeight: 700 }}>log in</Link> to
          make and manage price offers.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Tag size={24} /> Price Offers
      </h1>
      <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 24px 0' }}>
        Propose your price with a comment — sellers accept exactly one offer per listing.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`btn ${tab === 'mine' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <User size={15} /> My Offers
        </button>
        {isSeller && (
          <button
            type="button"
            onClick={() => setTab('received')}
            className={`btn ${tab === 'received' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Store size={15} /> Received
          </button>
        )}
      </div>

      {notice && (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', color: '#10b981', borderRadius: 8, padding: '12px 16px', fontSize: 13, marginBottom: 16 }}>
          {notice}
        </div>
      )}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', color: '#f87171', borderRadius: 8, padding: '12px 16px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div>Loading offers...</div>
        </div>
      ) : offers.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48, background: '#161922', border: '1px solid #1e293b', borderRadius: 12 }}>
          <Tag size={32} style={{ marginBottom: 12 }} />
          <h3 style={{ color: '#f8fafc', margin: '0 0 6px 0' }}>No offers yet</h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            {tab === 'mine'
              ? 'Browse the marketplace and tap “Make an Offer” on any listing.'
              : 'Incoming buyer offers on your listings will appear here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} mode={tab} onAction={handleAction} acting={acting} />
          ))}
        </div>
      )}
    </div>
  )
}
