import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Pencil, ShieldCheck, Trash2, User } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { reviewsApi } from '../api/reviews.js'
import Stars from './Stars.jsx'

function ReviewerBadge({ reviewer }) {
  const username = reviewer?.username || 'member'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {reviewer?.avatar_url ? (
        <img
          src={reviewer.avatar_url}
          alt={`@${username}`}
          style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid #334155' }}
        />
      ) : (
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#1e293b', color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={16} />
        </span>
      )}
      <span style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>@{username}</span>
    </span>
  )
}

/**
 * Listing review section — summary, star list, write/edit form.
 * Reviewers appear as username + avatar only (backend never sends names).
 * Props: itemType 'car' | 'part', itemId, listingTitle.
 */
export default function ReviewSection({ itemType, itemId, listingTitle }) {
  const { user, isAuthenticated } = useAuth()
  const [summary, setSummary] = useState({ average: 0, count: 0, distribution: {} })
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [myReview, setMyReview] = useState(null)
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const params = { item_type: itemType, ...(itemType === 'car' ? { car_id: itemId } : { part_id: itemId }) }

  const load = useCallback(async () => {
    if (!itemId) return
    setLoading(true)
    try {
      const [sum, list] = await Promise.all([
        reviewsApi.summary(params),
        reviewsApi.list({ ...params, per_page: 10 }),
      ])
      setSummary(sum || { average: 0, count: 0, distribution: {} })
      setReviews(list?.data ?? [])
      if (isAuthenticated) {
        try {
          const mine = await reviewsApi.mine(params)
          setMyReview(mine)
        } catch {
          setMyReview(null)
        }
      }
    } catch {
      // listings stay usable even if reviews are unreachable
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemType, itemId, isAuthenticated])

  useEffect(() => {
    load()
  }, [load])

  const startEdit = () => {
    setRating(myReview?.rating || 5)
    setTitle(myReview?.title || '')
    setBody(myReview?.body || '')
    setEditing(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!rating || rating < 1) {
      setError('Please pick a star rating.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...params, rating, title: title.trim() || undefined, body: body.trim() || undefined }
      if (myReview) {
        await reviewsApi.update(myReview.id, { rating, title: title.trim() || null, body: body.trim() || null })
        setNotice('Review updated.')
      } else {
        await reviewsApi.create(payload)
        setNotice('Review published. Thanks for the feedback!')
      }
      setEditing(false)
      setTitle('')
      setBody('')
      await load()
    } catch (err) {
      if (err?.response?.status === 409) {
        setError('You already reviewed this listing — edit your existing review below.')
        try {
          setMyReview(await reviewsApi.mine(params))
        } catch { /* ignore */ }
      } else {
        setError(err?.response?.data?.message || 'Failed to save review.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!myReview || !window.confirm('Delete your review?')) return
    try {
      await reviewsApi.remove(myReview.id)
      setMyReview(null)
      setEditing(false)
      setNotice('Review deleted.')
      await load()
    } catch {
      setError('Failed to delete review.')
    }
  }

  const dist = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: Number(summary.distribution?.[s] || 0),
  }))
  const maxDist = Math.max(1, ...dist.map((d) => d.count))

  return (
    <div className="detail-specs-card" style={{ marginTop: 20 }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageSquare size={18} /> Buyer Reviews
        {summary.count > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
            {summary.count} review{summary.count === 1 ? '' : 's'}
          </span>
        )}
      </h3>

      {loading ? (
        <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>Loading reviews…</div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 900 }}>{Number(summary.average || 0).toFixed(1)}</div>
              <Stars value={Number(summary.average || 0)} size={16} />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {summary.count} verified review{summary.count === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              {dist.map((d) => (
                <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', width: 28 }}>{d.stars} ★</span>
                  <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(d.count / maxDist) * 100}%`, height: '100%', background: '#e06c35' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8', width: 20, textAlign: 'right' }}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review list — username + avatar only */}
          {reviews.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
              {reviews.map((r) => (
                <div key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <ReviewerBadge reviewer={r.reviewer} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {r.is_verified_purchase && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981', fontWeight: 700 }}>
                          <ShieldCheck size={12} /> Verified Purchase
                        </span>
                      )}
                      <Stars value={r.rating} size={13} />
                    </span>
                  </div>
                  {r.title && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{r.title}</div>}
                  {r.body && <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{r.body}</div>}
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    {myReview?.id === r.id && ' · Your review'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Write / edit form */}
          {isAuthenticated ? (
            myReview && !editing ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={startEdit}>
                  <Pencil size={13} /> Edit Your Review
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleDelete}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ background: '#0f1117', border: '1px solid #1e293b', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  {myReview ? 'Update your review' : `Rate this ${itemType === 'car' ? 'vehicle' : 'part'}`}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Stars value={rating} onRate={setRating} size={26} />
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={150}
                  placeholder="Headline (optional)"
                  style={{ width: '100%', background: '#161922', border: '1px solid #2d3748', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13, outline: 'none', marginBottom: 10 }}
                />
                <textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={2000}
                  placeholder={`How was the ${itemType === 'car' ? 'build quality, papers and handover' : 'fitment, authenticity and packaging'}?`}
                  style={{ width: '100%', background: '#161922', border: '1px solid #2d3748', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 10 }}
                />
                {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</div>}
                {notice && <div style={{ color: '#10b981', fontSize: 12, marginBottom: 8 }}>{notice}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                    {saving ? 'Saving…' : myReview ? 'Update Review' : 'Publish Review'}
                  </button>
                  {editing && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                  Posted publicly as <strong>@{user?.username || 'member'}</strong> — your real name is never shown.
                </div>
              </form>
            )
          ) : (
            <div style={{ fontSize: 13, color: '#94a3b8', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, padding: 14, textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#fb923c', fontWeight: 700 }}>Log in</Link> to write a review
              {listingTitle ? <> for <strong>{listingTitle}</strong></> : null}.
            </div>
          )}
        </>
      )}
    </div>
  )
}
