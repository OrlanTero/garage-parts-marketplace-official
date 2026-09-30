import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, HandCoins, MapPin, MessageSquare, Phone, RefreshCw, Send, Trash2, XCircle } from 'lucide-react'
import { wantedApi } from '../api/wanted.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useChat } from '../context/ChatContext.jsx'

function budgetLabel(ad) {
  const lo = ad.budget_min != null ? Number(ad.budget_min) : null
  const hi = ad.budget_max != null ? Number(ad.budget_max) : null
  const fmt = (v) => '₱' + Number(v).toLocaleString('en-PH', { maximumFractionDigits: 0 })
  if (lo != null && hi != null) return `${fmt(lo)} – ${fmt(hi)}`
  if (hi != null) return `Up to ${fmt(hi)}`
  if (lo != null) return `From ${fmt(lo)}`
  return 'Budget open'
}

/**
 * One wanted ad: full specs, quote thread, owner controls.
 * Sellers quote a price; the requester accepts one to fulfil.
 */
export default function WantedDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { openDrawerWithListing } = useChat()

  const [ad, setAd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [offerMsg, setOfferMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await wantedApi.show(id)
      setAd(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Wanted request not found.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const isOwner = isAuthenticated && ad && Number(user?.id) === Number(ad.user_id)
  const offers = Array.isArray(ad?.offers) ? ad.offers : []
  const openForQuotes = ad && ['open', 'quoted'].includes(ad.status)

  const submitOffer = async (e) => {
    e.preventDefault()
    if (!offerPrice || Number(offerPrice) <= 0) return
    setBusy(true)
    setNotice('')
    try {
      await wantedApi.offer(ad.id, { price: Number(offerPrice), message: offerMsg.trim() || undefined })
      setOfferPrice('')
      setOfferMsg('')
      setNotice('Quote sent — the buyer was notified.')
      await load()
    } catch (err) {
      setNotice('')
      setError(err?.response?.data?.message || 'Could not send quote.')
    } finally {
      setBusy(false)
    }
  }

  const acceptOffer = async (offerId) => {
    if (!window.confirm('Accept this quote and mark the request fulfilled?')) return
    setBusy(true)
    try {
      await wantedApi.accept(ad.id, offerId)
      setNotice('Quote accepted — request fulfilled. Coordinate in Messages.')
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not accept quote.')
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (status, msg) => {
    setBusy(true)
    try {
      await wantedApi.setStatus(ad.id, status)
      setNotice(msg)
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update request.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Delete this wanted request and all its quotes?')) return
    setBusy(true)
    try {
      await wantedApi.destroy(ad.id)
      navigate('/wanted?tab=mine', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not delete request.')
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <p className="muted">Loading wanted request…</p>
      </div>
    )
  }

  if (error && !ad) {
    return (
      <div className="page-container" style={{ paddingBottom: 80 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/wanted')} style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to board
        </button>
        <div className="home-empty-state">
          <p className="home-empty-title">Request unavailable</p>
          <p className="home-empty-sub">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container wanted-page" style={{ paddingBottom: 80 }}>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/wanted')} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={14} /> Back to board
      </button>

      {notice && <div className="card" style={{ padding: '12px 16px', borderColor: 'var(--color-success)', color: 'var(--color-success)', fontSize: 13, fontWeight: 600 }}>{notice}</div>}
      {error && <div className="card" style={{ padding: '12px 16px', borderColor: 'var(--color-error)', color: 'var(--color-error)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

      <div className="wanted-detail-head">
        <div className="wanted-detail-meta">
          {ad.status === 'fulfilled'
            ? <span className="wanted-pill wanted-pill--ok">Fulfilled</span>
            : <span className="wanted-pill">{ad.status}</span>}
          {ad.category && <span className="wanted-cat">{ad.category}</span>}
          {ad.city && <span><MapPin size={12} style={{ verticalAlign: -1 }} /> {ad.city}</span>}
        </div>
        <h1 className="wanted-title">{ad.title}</h1>
        <p className="wanted-lead">
          Wanted by @{ad.user?.username || ad.user?.name || 'member'} · Budget <strong>{budgetLabel(ad)}</strong>
        </p>
      </div>

      <div className="wanted-cols">
        <div className="card" style={{ padding: 20 }}>
          <div className="wanted-facts">
            <div><div className="muted" style={{ fontSize: 11 }}>ENGINE CODE</div><strong>{ad.engine_code || '—'}</strong></div>
            <div><div className="muted" style={{ fontSize: 11 }}>PART NUMBER</div><strong>{ad.part_number || '—'}</strong></div>
            <div><div className="muted" style={{ fontSize: 11 }}>CONDITION</div><strong style={{ textTransform: 'capitalize' }}>{ad.condition || 'any'}</strong></div>
            <div><div className="muted" style={{ fontSize: 11 }}>LOCATION</div><strong>{ad.city || 'Nationwide'}</strong></div>
          </div>
          {ad.specs && <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.65, color: 'var(--color-text)' }}>{ad.specs}</p>}
          {ad.contact_phone && isOwner && (
            <p className="muted" style={{ marginTop: 10, fontSize: 13 }}><Phone size={12} /> {ad.contact_phone} (visible to you only)</p>
          )}
          {isOwner && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              {ad.status !== 'closed' && ad.status !== 'fulfilled' && (
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setStatus('closed', 'Request closed.')}>
                  <XCircle size={14} /> Close request
                </button>
              )}
              {(ad.status === 'closed' || ad.status === 'cancelled') && (
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setStatus('open', 'Request reopened.')}>
                  Reopen
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={remove}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', color: 'var(--color-heading)' }}>
            Quotes ({offers.length})
          </h3>
          {offers.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No quotes yet — sellers and surplus shops reply here.</p>
          ) : (
            offers.map((o) => (
              <div key={o.id} className="wanted-offer">
                <div className="wanted-offer-who">
                  <span className="wanted-offer-ava">
                    {o.seller?.avatar_url
                      ? <img src={o.seller.avatar_url} alt={o.seller?.username || 'seller'} />
                      : (o.seller?.username || 'S').charAt(0).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>@{o.seller?.username || o.seller?.name || 'seller'}</span>
                  {o.status === 'accepted' && <span className="wanted-pill wanted-pill--ok">Accepted</span>}
                  {o.status === 'declined' && <span className="wanted-pill">Out</span>}
                </div>
                <span className="wanted-offer-price">₱{Number(o.price).toLocaleString('en-PH')}</span>
                {o.message && <p className="wanted-offer-msg">{o.message}</p>}
                <div style={{ display: 'flex', gap: 8, flexBasis: '100%' }}>
                  {isOwner && o.status === 'pending' && (
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => acceptOffer(o.id)}>
                      <Check size={14} /> Accept quote
                    </button>
                  )}
                  {isAuthenticated && !isOwner && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => openDrawerWithListing({
                        seller: { id: o.seller?.id, username: o.seller?.username, avatar_url: o.seller?.avatar_url },
                        listing: { id: ad.id, title: `Re: wanted — ${ad.title}`, price: o.price },
                        listingType: 'part',
                      })}
                    >
                      <MessageSquare size={14} /> Chat
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {isAuthenticated && !isOwner && openForQuotes && (
            <form onSubmit={submitOffer} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <strong style={{ fontSize: 13.5, color: 'var(--color-heading)' }}><HandCoins size={14} /> Quote this request</strong>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  min="1"
                  required
                  className="field-input"
                  placeholder="Your price (₱)"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !offerPrice}>
                  <Send size={14} /> {busy ? 'Sending…' : 'Send'}
                </button>
              </div>
              <input
                type="text"
                className="field-input"
                placeholder="Note — condition, ETA, shop location (optional)"
                value={offerMsg}
                onChange={(e) => setOfferMsg(e.target.value)}
                maxLength={500}
              />
            </form>
          )}
          {!isAuthenticated && openForQuotes && (
            <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
              <Link to="/login">Log in</Link> as a seller to quote this request.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
