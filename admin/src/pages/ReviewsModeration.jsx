import { useState } from 'react'
import {
  Star,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Flag,
  MessageSquare,
  ThumbsUp,
  ShieldCheck,
  AlertCircle,
  User,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const INITIAL_REVIEWS = [
  {
    id: 'REV-551',
    targetType: 'Part Item',
    targetTitle: 'Garrett G30-770 Dual Ball Bearing Turbocharger',
    author: 'Tatsuya Shima',
    rating: 5,
    date: '2026-09-16',
    status: 'published',
    statusLabel: 'Published · Verified Buyer',
    statusVariant: 'success',
    content: 'Spools almost 400 RPM faster than my previous GTX3076R Gen II on a built RB26. Genuine Garrett serial number verified on box.',
    verifiedPurchase: true,
    sellerResponse: 'Thank you Tatsuya! Enjoy the boost on the circuit.',
    flagReason: null,
  },
  {
    id: 'REV-550',
    targetType: 'Car Build',
    targetTitle: '1999 Nissan Skyline GT-R BNR34 V-Spec (Bayside Blue)',
    author: 'Keisuke Takahashi',
    rating: 5,
    date: '2026-09-15',
    status: 'published',
    statusLabel: 'Published · Verified Order',
    statusVariant: 'success',
    content: 'The cylinder head and gasket kit match the listing description 100%. Fast dispatch and secure packaging.',
    verifiedPurchase: true,
    sellerResponse: null,
    flagReason: null,
  },
  {
    id: 'REV-549',
    targetType: 'Part Item',
    targetTitle: 'Titanium Valvetronic Catback Exhaust',
    author: 'SpamBot_Discount99',
    rating: 1,
    date: '2026-09-14',
    status: 'flagged',
    statusLabel: 'Flagged for Moderation (Spam / Scam link)',
    statusVariant: 'danger',
    content: 'Do not buy here go to bestcheapcarparts-fake.com for 90% off coupons and fast free shipping!!!',
    verifiedPurchase: false,
    sellerResponse: null,
    flagReason: 'Automated keyword detection triggered: external scam domain promotion.',
  },
]

export default function ReviewsModeration() {
  const [reviews, setReviews] = useState(INITIAL_REVIEWS)
  const [filter, setFilter] = useState('all')

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'flagged') return r.status === 'flagged'
    if (filter === 'published') return r.status === 'published'
    return true
  })

  const handleModerate = (id, action) => {
    setReviews(
      reviews.map((r) =>
        r.id === id
          ? {
              ...r,
              status: action === 'approve' ? 'published' : 'hidden',
              statusLabel: action === 'approve' ? 'Published · Approved by Admin' : 'Hidden from Marketplace',
              statusVariant: action === 'approve' ? 'success' : 'neutral',
              flagReason: action === 'approve' ? null : r.flagReason || 'Hidden by admin moderation.',
            }
          : r
      )
    )
  }

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
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <Star size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Average Platform Rating</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>4.92 / 5.0</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c' }}>
            <Flag size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Flagged Reviews</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {reviews.filter((r) => r.status === 'flagged').length} Pending Action
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Verified Purchase Ratio</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>96.8%</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
        <button
          onClick={() => setFilter('all')}
          className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
        >
          All Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setFilter('flagged')}
          className={`tab-btn ${filter === 'flagged' ? 'active' : ''}`}
        >
          Flagged / Spam ({reviews.filter((r) => r.status === 'flagged').length})
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`tab-btn ${filter === 'published' ? 'active' : ''}`}
        >
          Published ({reviews.filter((r) => r.status === 'published').length})
        </button>
      </div>

      {/* Reviews Accordion */}
      <Accordion defaultOpen={['REV-549']}>
        {filteredReviews.map((rev) => (
          <AccordionItem key={rev.id} id={rev.id}>
            <AccordionHeader
              id={rev.id}
              title={`${rev.author} on "${rev.targetTitle}"`}
              subtitle={`Submitted on ${rev.date} · Type: ${rev.targetType}`}
              badge={{ label: rev.statusLabel, variant: rev.statusVariant }}
              icon={Star}
              actions={
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontWeight: 800 }}>
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="#f59e0b" />
                  ))}
                </div>
              }
            />
            <AccordionBody id={rev.id}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {rev.flagReason && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>
                    ⚠️ {rev.flagReason}
                  </div>
                )}

                <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)', fontSize: 14, lineHeight: 1.6 }}>
                  "{rev.content}"
                </div>

                {rev.sellerResponse && (
                  <div style={{ background: '#f8fafc', borderLeft: '3px solid var(--color-rust)', padding: '10px 14px', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-rust)', marginBottom: 2 }}>
                      Seller Response:
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>{rev.sellerResponse}</div>
                  </div>
                )}

                {/* Moderation Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--admin-border)', paddingTop: 12 }}>
                  {rev.status === 'flagged' ? (
                    <>
                      <button
                        onClick={() => handleModerate(rev.id, 'hide')}
                        className="admin-btn admin-btn-secondary"
                        style={{ fontSize: 12, color: '#b91c1c' }}
                      >
                        Purge & Ban Author
                      </button>
                      <button
                        onClick={() => handleModerate(rev.id, 'approve')}
                        className="admin-btn admin-btn-primary"
                        style={{ fontSize: 12 }}
                      >
                        Approve & Publish Review
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleModerate(rev.id, 'hide')}
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: 12 }}
                    >
                      Hide from Public View
                    </button>
                  )}
                </div>
              </div>
            </AccordionBody>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
