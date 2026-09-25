import { useEffect, useState } from 'react'
import {
  Star,
  Search,
  Flag,
  RefreshCw,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'
import client from '../api/client.js'

const fetchReviews = (params = {}) =>
  client.get('/admin/reviews', { params }).then((r) => r.data)

const setVisibility = (id, isVisible) =>
  client.post(`/admin/reviews/${id}/visibility`, { is_visible: isVisible }).then((r) => r.data?.data ?? r.data)

export default function ReviewsModeration() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | visible | hidden
  const [search, setSearch] = useState('')
  const [actingId, setActingId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchReviews({
        visibility: filter === 'all' ? undefined : filter,
        search: search.trim() || undefined,
        per_page: 50,
      })
      setReviews(res?.data || [])
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const handleSearch = (e) => {
    e.preventDefault()
    load()
  }

  const handleVisibility = async (id, isVisible) => {
    if (!window.confirm(isVisible ? 'Restore this review to public view?' : 'Hide this review from the marketplace?')) return
    setActingId(id)
    try {
      const updated = await setVisibility(id, isVisible)
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_visible: updated?.is_visible ?? isVisible } : r))
      )
    } finally {
      setActingId(null)
    }
  }

  const visible = reviews.filter((r) => r.is_visible)
  const hidden = reviews.filter((r) => !r.is_visible)
  const avg = reviews.length
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(2)
    : '—'
  const verifiedRatio = reviews.length
    ? Math.round((reviews.filter((r) => r.is_verified_purchase).length / reviews.length) * 100)
    : 0

  const badgeFor = (r) =>
    r.is_visible
      ? { label: r.is_verified_purchase ? 'Published · Verified Purchase' : 'Published', variant: 'success' }
      : { label: 'Hidden from Marketplace', variant: 'neutral' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Customer Reviews & Marketplace Moderation
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Audit seller ratings, verify buyer authenticity, filter automated spam comments, and moderate feedback.
          </p>
        </div>
        <button type="button" onClick={load} className="admin-btn admin-btn-secondary" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, maxWidth: 420 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            className="admin-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search review title or body..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-secondary btn-sm">Search</button>
      </form>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <Star size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Average Platform Rating</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{avg} / 5.0</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c' }}>
            <Flag size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Hidden Reviews</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {hidden.length} Moderated
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Verified Purchase Ratio</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{verifiedRatio}%</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
        <button onClick={() => setFilter('all')} className={`tab-btn ${filter === 'all' ? 'active' : ''}`}>
          All Reviews ({reviews.length})
        </button>
        <button onClick={() => setFilter('hidden')} className={`tab-btn ${filter === 'hidden' ? 'active' : ''}`}>
          Hidden ({hidden.length})
        </button>
        <button onClick={() => setFilter('visible')} className={`tab-btn ${filter === 'visible' ? 'active' : ''}`}>
          Published ({visible.length})
        </button>
      </div>

      {/* Reviews Accordion */}
      {loading ? (
        <div className="admin-card" style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div>Loading reviews from database...</div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="admin-card" style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
          <Star size={32} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 700 }}>No reviews found</div>
          <p style={{ fontSize: 13, margin: '4px 0 0 0' }}>Buyer reviews on cars and parts will appear here.</p>
        </div>
      ) : (
        <Accordion defaultOpen={[String(reviews[0]?.id)]}>
          {reviews.map((rev) => {
            const target = rev.item_type === 'car' ? 'Car Build' : 'Part Item'
            const username = rev.reviewer?.username || 'member'
            return (
              <AccordionItem key={rev.id} id={String(rev.id)}>
                <AccordionHeader
                  id={String(rev.id)}
                  title={`@${username} · ${rev.rating}★ on ${target}`}
                  subtitle={`Submitted ${rev.created_at ? new Date(rev.created_at).toLocaleString() : ''}${rev.is_verified_purchase ? ' · Verified Purchase' : ''}`}
                  badge={badgeFor(rev)}
                  icon={Star}
                  actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontWeight: 800 }}>
                      {[...Array(Number(rev.rating) || 0)].map((_, i) => (
                        <Star key={i} size={14} fill="#f59e0b" />
                      ))}
                    </div>
                  }
                />
                <AccordionBody id={String(rev.id)}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Reviewer identity: username + avatar only */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {rev.reviewer?.avatar_url ? (
                        <img src={rev.reviewer.avatar_url} alt={`@${username}`} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--admin-bg-subtle)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                          {username.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>@{username}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Reviewer identity: username + avatar only</div>
                      </div>
                    </div>

                    {rev.title && (
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{rev.title}</div>
                    )}

                    <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)', fontSize: 14, lineHeight: 1.6 }}>
                      "{rev.body || 'Star rating only.'}"
                    </div>

                    {/* Moderation Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--admin-border)', paddingTop: 12 }}>
                      {rev.is_visible ? (
                        <button
                          onClick={() => handleVisibility(rev.id, false)}
                          disabled={actingId === rev.id}
                          className="admin-btn admin-btn-secondary"
                          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <EyeOff size={13} /> Hide from Public View
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVisibility(rev.id, true)}
                          disabled={actingId === rev.id}
                          className="admin-btn admin-btn-primary"
                          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Eye size={13} /> Approve & Publish Review
                        </button>
                      )}
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
