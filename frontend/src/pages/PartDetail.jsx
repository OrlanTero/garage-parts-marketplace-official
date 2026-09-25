import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { 
  Truck, 
  Star, 
  Heart, 
  MapPin, 
  ShieldCheck, 
  Award, 
  ArrowLeft, 
  Package, 
  CheckCircle2, 
  ShoppingCart,
  Sparkles,
  MessageSquare,
  Share2,
  Tag
} from 'lucide-react'
import { marketplaceParts } from '../api/parts.js'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useChat } from '../context/ChatContext.jsx'
import ShareModal from '../components/ShareModal.jsx'
import OfferModal from '../components/OfferModal.jsx'
import ReviewSection from '../components/ReviewSection.jsx'
import { getActiveReferralCode } from '../utils/referral.js'
import './Details.css'

const CATEGORY_PLACEHOLDERS = {
  engine: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1000&auto=format&fit=crop',
  wheels: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1000&auto=format&fit=crop',
  tires_wheels: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1000&auto=format&fit=crop',
  brakes: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=1000&auto=format&fit=crop',
  suspension: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=1000&auto=format&fit=crop',
  exhaust: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000&auto=format&fit=crop',
  interior: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1000&auto=format&fit=crop',
  default: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1000&auto=format&fit=crop'
}

function formatPrice(val) {
  if (val == null || val === '') return '₱ —'
  if (typeof val === 'string' && val.includes('₱')) return val
  const num = Number(val)
  if (isNaN(num)) return `₱ ${val}`
  return '₱ ' + num.toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

export default function PartDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isPartSaved, togglePartFavorite } = useFavorites()
  const { openDrawerWithListing } = useChat()
  const [part, setPart] = useState(null)
  const [error, setError] = useState('')
  const [selectedImgIdx, setSelectedImgIdx] = useState(0)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [offerModalOpen, setOfferModalOpen] = useState(false)
  const [offerNotice, setOfferNotice] = useState('')
  const activeReferralCode = getActiveReferralCode()

  const isSaved = isPartSaved(part?.id || id)

  useEffect(() => {
    marketplaceParts
      .show(id)
      .then((data) => {
        setPart(data)
        setSelectedImgIdx(0)
      })
      .catch((e) => setError(e.response?.status === 404 ? 'Part not found or no longer listed.' : e.message))
  }, [id])

  if (error) {
    return (
      <div className="detail-page">
        <div className="page-container">
          <p className="error">{error}</p>
          <Link to="/parts" className="btn btn-secondary">
            <ArrowLeft size={16} /> Back to Parts Catalog
          </Link>
        </div>
      </div>
    )
  }

  if (!part) {
    return (
      <div className="detail-page">
        <div className="page-container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <p className="muted">Loading component specifications and images…</p>
        </div>
      </div>
    )
  }

  const rawCat = part.category || part.cat || 'other'
  const catName = part.catName || rawCat.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())

  // Multi-image list resolution
  const mediaList = Array.isArray(part.media) && part.media.length > 0
    ? part.media
    : (Array.isArray(part.images) && part.images.length > 0)
      ? part.images.map((m, i) => typeof m === 'string' ? { id: i, url: m } : m)
      : (part.img || part.primary_image_url)
        ? [{ id: 1, url: part.img || part.primary_image_url }]
        : [{ id: 1, url: CATEGORY_PLACEHOLDERS[rawCat] || CATEGORY_PLACEHOLDERS.default }]

  const activeMedia = mediaList[selectedImgIdx] || mediaList[0]
  const currentImgUrl = activeMedia?.url || activeMedia

  const title = part.title || `${part.brand ? part.brand + ' ' : ''}${part.part_number || 'Performance Part'}`
  const priceDisplay = formatPrice(part.price)
  const origPriceDisplay = part.origPrice || part.original_price ? formatPrice(part.origPrice || part.original_price) : null
  const location = part.location || part.loc || part.city || 'Makati Showroom'
  const freeShip = part.free_shipping || part.freeShip || (Number(part.price) >= 8000)
  const tag = part.tag || (part.condition === 'new' ? 'Brand New OEM' : 'Surplus Mint')
  const rating = part.rating || 4.9
  const reviewsCount = part.reviews_count || part.reviews || 18

  const specs = [
    ['Category', catName],
    ['Manufacturer / Brand', part.brand || 'Genuine OEM / Aftermarket'],
    ['Manufacturer Part #', part.part_number || '—'],
    ...(part.mpn ? [['MPN', part.mpn]] : []),
    ...(part.barcode ? [['Barcode', part.barcode]] : []),
    ['Condition', part.condition ? (part.condition === 'new' ? 'Brand New in Box' : 'Japanese Surplus Mint') : '—'],
    ['Stock Quantity', part.quantity != null ? `${part.quantity} Unit(s) Available` : 'In Stock'],
    ...(part.lifecycle_status && part.lifecycle_status !== 'active' ? [['Catalog Status', String(part.lifecycle_status).toUpperCase()]] : []),
    ['Freight Delivery', freeShip ? 'Free Insured Crated Shipping' : 'Calculated at Checkout'],
    ['Hub Location', location],
  ]

  return (
    <div className="detail-page">
      <div className="page-container">
        <Link to="/parts" className="btn btn-secondary" style={{ marginBottom: 20, display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Parts Catalog
        </Link>

        <div className="detail-layout">
          {/* Left Column: Multi-Image Gallery & Compatibility */}
          <div className="detail-gallery-col">
            <div className="detail-gallery">
              <div className="detail-main-media">
                <img 
                  src={currentImgUrl} 
                  alt={title} 
                  className="detail-main-img" 
                />
                {catName && <span className="detail-media-tag">{catName}</span>}
                {freeShip && (
                  <span className="detail-media-score" style={{ background: '#15803d' }}>
                    <Truck size={14} /> Free Freight
                  </span>
                )}
                {activeMedia?.caption && (
                  <div className="detail-caption-bar">{activeMedia.caption}</div>
                )}
              </div>

              {/* Thumbnails row if multiple images exist */}
              {mediaList.length > 1 && (
                <div className="detail-thumbs-strip">
                  {mediaList.map((item, idx) => {
                    const thumbUrl = item?.url || item
                    const isSelected = idx === selectedImgIdx
                    return (
                      <button
                        key={item.id ?? idx}
                        type="button"
                        className={`detail-thumb-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedImgIdx(idx)}
                        aria-label={`View photo ${idx + 1}`}
                      >
                        <img src={thumbUrl} alt={`Thumbnail ${idx + 1}`} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Vehicle Fitment & Compatibility */}
            {part.compatibility && (
              <div className="detail-desc-card">
                <h3>Fitment & Vehicle Compatibility</h3>
                <p style={{ fontWeight: 600, color: 'var(--color-rust)' }}>{part.compatibility}</p>
                <p style={{ fontSize: 13, marginTop: 8, color: 'var(--color-text-muted)' }}>
                  Need custom brackets or fitment confirmation? Contact our master mechanics via platform chat.
                </p>
              </div>
            )}

            {/* Seller Notes */}
            <div className="detail-desc-card">
              <h3>Product Details & Condition Report</h3>
              <p>{part.description || 'Verified genuine Japanese surplus or brand new aftermarket component. Inspected, bench-tested, and serial-checked for 100% authenticity.'}</p>
            </div>
          </div>

          {/* Right Column: Pricing, Specs, Seller & Actions */}
          <div className="detail-info-col">
            <div className="detail-header-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="badge" style={{ background: 'var(--color-sand)', color: 'var(--color-rust)' }}>
                  {tag}
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  <Star size={14} fill="#e06c35" color="#e06c35" />
                  <strong>{rating}</strong>
                  <span>({reviewsCount} reviews)</span>
                </div>
              </div>

              <h1 className="detail-title">{title}</h1>

              <div className="detail-meta-row">
                <span className="detail-meta-item"><MapPin size={14} /> {location}</span>
                <span className="detail-meta-item"><Package size={14} /> {part.quantity ? `${part.quantity} available` : 'In Stock'}</span>
              </div>

              <div className="detail-price-box">
                <span className="detail-price-main">{priceDisplay}</span>
                {origPriceDisplay && (
                  <>
                    <span className="detail-price-orig">{origPriceDisplay}</span>
                    <span className="detail-price-save">Special Deal</span>
                  </>
                )}
              </div>

              <div className="detail-trust-strip">
                <div className="detail-trust-item">
                  <ShieldCheck size={16} color="var(--color-rust)" />
                  <span>Verified Genuine OEM / Serial</span>
                </div>
                <div className="detail-trust-item">
                  <Award size={16} color="var(--color-rust)" />
                  <span>Buyer Protection Guarantee</span>
                </div>
                <div className="detail-trust-item">
                  <Truck size={16} color="var(--color-rust)" />
                  <span>Tracked Courier Shipping</span>
                </div>
              </div>

              {/* Referring Agent Banner */}
              {activeReferralCode && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: '#10b981'
                }}>
                  <span>🤝</span>
                  <div>
                    Referred by Sales Agent <strong>{activeReferralCode}</strong>. Your purchase supports an accredited garage partner.
                  </div>
                </div>
              )}

              {offerNotice && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#10b981' }}>
                  {offerNotice}
                </div>
              )}

              <div className="detail-actions-row">
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => navigate(`/checkout?part_id=${part.uuid || part.id}`)}
                >
                  <ShoppingCart size={16} />
                  <span>Buy Now</span>
                </button>

                {part.seller && (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => openDrawerWithListing({ seller: part.seller, listing: part, listingType: 'part' })}
                    title="Inquire directly with the verified parts seller"
                  >
                    <MessageSquare size={16} />
                    <span>Chat</span>
                  </button>
                )}
                <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={part.quantity != null && Number(part.quantity) <= 0}
                    onClick={() => { setOfferNotice(''); setOfferModalOpen(true) }}
                    title="Propose your own price with a comment"
                >
                  <Tag size={16} />
                  <span>Make an Offer</span>
                </button>

              </div>

              <div className="detail-actions-row">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShareModalOpen(true)}
                    title="Share product link & earn 5% sales commission"
                >
                  <Share2 size={16} />
                </button>
                <button
                    type="button"
                    className={`btn btn-secondary ${isSaved ? 'active' : ''}`}
                    onClick={() => togglePartFavorite(part)}
                    title={isSaved ? 'Remove from Saved' : 'Save Part'}
                >
                  <Heart size={16} fill={isSaved ? '#d8622c' : 'none'} color={isSaved ? '#d8622c' : 'currentColor'} />
                </button>
              </div>
            </div>

            {/* Specifications Card */}
            <div className="detail-specs-card">
              <h3>Component Specifications</h3>
              <div className="detail-specs-grid">
                {specs.map(([label, val]) => (
                  <div key={label} className="detail-spec-row">
                    <span className="detail-spec-label">{label}</span>
                    <span className="detail-spec-value">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buyer Reviews — username + avatar identity only */}
            <ReviewSection itemType="part" itemId={part.id} listingTitle={title} />

            {/* Seller Contact Card */}
            {part.seller && (
              <div className="detail-seller-card">
                <div className="detail-seller-info">
                  <div className="detail-seller-avatar">
                    {part.seller.name ? part.seller.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <div className="detail-seller-name">{part.seller.name}</div>
                    <div className="detail-seller-sub">Verified Parts Supplier · {location}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 13 }}
                    onClick={() => openDrawerWithListing({ seller: part.seller, listing: part, listingType: 'part' })}
                  >
                    <MessageSquare size={14} />
                    <span>Chat</span>
                  </button>
                  <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                    ✓ Verified
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buyer Price Offer Modal */}
      <OfferModal
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        listing={part ? { id: part.id, title: title, price: part.price, type: 'part' } : null}
        onSubmitted={() => setOfferNotice('Offer sent — the seller will review it under your Offers.')}
      />

      {/* Product Share & Agent Referral Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        item={{
          id: part.id,
          uuid: part.uuid,
          type: 'part',
          title: title,
          price: part.price,
          image: currentImgUrl,
          brand: part.brand,
          path: `/parts/${part.uuid || part.id}`
        }}
      />
    </div>
  )
}
