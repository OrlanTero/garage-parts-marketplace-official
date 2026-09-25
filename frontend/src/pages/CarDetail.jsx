import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { 
  ShieldCheck, 
  MapPin, 
  Heart, 
  Calendar, 
  Gauge, 
  Cog, 
  Fuel, 
  CheckCircle2, 
  Award, 
  Coffee, 
  ArrowLeft, 
  Share2, 
  MessageSquare,
  Sparkles,
  FileText,
  Tag
} from 'lucide-react'
import { marketplaceCars } from '../api/cars.js'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useChat } from '../context/ChatContext.jsx'
import ShareModal from '../components/ShareModal.jsx'
import OfferModal from '../components/OfferModal.jsx'
import { getActiveReferralCode } from '../utils/referral.js'
import './Details.css'

const DEFAULT_CAR_IMAGES = [
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1200&auto=format&fit=crop',
]

function formatPrice(val) {
  if (val == null || val === '') return '₱ —'
  if (typeof val === 'string' && val.includes('₱')) return val
  const num = Number(val)
  if (isNaN(num)) return `₱ ${val}`
  return '₱ ' + num.toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

export default function CarDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isCarSaved, toggleCarFavorite } = useFavorites()
  const { openDrawerWithListing } = useChat()
  const [car, setCar] = useState(null)
  const [error, setError] = useState('')
  const [selectedImgIdx, setSelectedImgIdx] = useState(0)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [offerModalOpen, setOfferModalOpen] = useState(false)
  const [offerNotice, setOfferNotice] = useState('')
  const activeReferralCode = getActiveReferralCode()

  const isSaved = isCarSaved(car?.id || id)

  useEffect(() => {
    marketplaceCars
      .show(id)
      .then((data) => {
        setCar(data)
        setSelectedImgIdx(0)
      })
      .catch((e) => setError(e.response?.status === 404 ? 'Car not found or no longer listed.' : e.message))
  }, [id])

  if (error) {
    return (
      <div className="detail-page">
        <div className="page-container">
          <p className="error">{error}</p>
          <Link to="/marketplace" className="btn btn-secondary">
            <ArrowLeft size={16} /> Back to marketplace
          </Link>
        </div>
      </div>
    )
  }

  if (!car) {
    return (
      <div className="detail-page">
        <div className="page-container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <p className="muted">Loading vehicle specifications and gallery…</p>
        </div>
      </div>
    )
  }

  // Multi-image list resolution
  const mediaList = Array.isArray(car.media) && car.media.length > 0
    ? car.media
    : (Array.isArray(car.images) && car.images.length > 0)
      ? car.images.map((m, i) => typeof m === 'string' ? { id: i, url: m } : m)
      : (car.img || car.primary_image_url)
        ? [{ id: 1, url: car.img || car.primary_image_url }]
        : DEFAULT_CAR_IMAGES.map((url, i) => ({ id: i, url }))

  const activeMedia = mediaList[selectedImgIdx] || mediaList[0]
  const currentImgUrl = activeMedia?.url || activeMedia

  const title = car.title || `${car.year || ''} ${car.brand || ''} ${car.model || ''}`.trim()
  const priceDisplay = formatPrice(car.price)
  const origPriceDisplay = car.origPrice || car.original_price ? formatPrice(car.origPrice || car.original_price) : null
  const location = car.location || car.loc || car.city || 'Makati Showroom'
  const tag = car.tag || (car.condition === 'new' ? 'Brand New' : 'Restored Classic')
  const score = car.score || car.inspection_score || '98/100'

  const specs = [
    ['Make / Brand', car.brand || '—'],
    ['Model / Trim', car.model || '—'],
    ['Model Year', car.year || '—'],
    ['Mileage', car.mileage_km != null ? `${Number(car.mileage_km).toLocaleString()} km` : '—'],
    ['Body Style', car.body_style ? car.body_style.replace('_', ' ').toUpperCase() : '—'],
    ['Fuel Type', car.fuel_type ? car.fuel_type.replace('_', ' ').toUpperCase() : '—'],
    ['Transmission', car.transmission ? car.transmission.replace('_', ' ').toUpperCase() : '—'],
    ['Condition', car.condition ? (car.condition === 'new' ? 'Brand New' : 'Certified Used') : '—'],
    ['Stock Available', car.quantity != null ? `${car.quantity} unit${Number(car.quantity) === 1 ? '' : 's'}` : '—'],
    ['Exterior Color', car.color || '—'],
    ['Chassis / VIN', car.vin || 'Verified on File'],
    ['Inspection Score', score],
    ['Showroom / City', location],
  ]
  const stockCount = car.quantity == null ? 1 : Number(car.quantity)
  const isSoldOut = stockCount <= 0

  return (
    <div className="detail-page">
      <div className="page-container">
        <Link to="/marketplace" className="btn btn-secondary" style={{ marginBottom: 20, display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Marketplace
        </Link>

        <div className="detail-layout">
          {/* Left Column: Multi-Image Gallery & Description */}
          <div className="detail-gallery-col">
            <div className="detail-gallery">
              <div className="detail-main-media">
                <img 
                  src={currentImgUrl} 
                  alt={title} 
                  className="detail-main-img" 
                />
                {tag && <span className="detail-media-tag">{tag}</span>}
                {score && (
                  <span className="detail-media-score">
                    <ShieldCheck size={14} /> 100-Pt: {score}
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

            {/* Seller Story / Description */}
            <div className="detail-desc-card">
              <h3>Vehicle Overview & Build Story</h3>
              <p>{car.description || 'Verified enthusiast vehicle with documented specifications, build history, and authenticated seller details.'}</p>
            </div>
          </div>

          {/* Right Column: Pricing, Specs, Seller & Actions */}
          <div className="detail-info-col">
            <div className="detail-header-card">
              <h1 className="detail-title">{title}</h1>

              <div className="detail-meta-row">
                <span className="detail-meta-item"><MapPin size={14} /> {location}</span>
                <span className="detail-meta-item"><Calendar size={14} /> {car.year}</span>
                <span className="detail-meta-item"><Gauge size={14} /> {car.mileage_km ? `${Number(car.mileage_km).toLocaleString()} km` : 'Documented'}</span>
              </div>

              <div className="detail-price-box">
                <span className="detail-price-main">{priceDisplay}</span>
                {origPriceDisplay && (
                  <>
                    <span className="detail-price-orig">{origPriceDisplay}</span>
                    <span className="detail-price-save">Special Deal</span>
                  </>
                )}
                <span
                  className="detail-meta-item"
                  style={{
                    marginLeft: 12, fontSize: 13, fontWeight: 700,
                    color: isSoldOut ? '#ef4444' : '#10b981',
                  }}
                >
                  {isSoldOut ? 'Sold Out' : stockCount === 1 ? 'Only 1 unit left' : `${stockCount} units in stock`}
                </span>
              </div>

              <div className="detail-trust-strip">
                <div className="detail-trust-item">
                  <ShieldCheck size={16} color="var(--color-rust)" />
                  <span>Verified Listing Details</span>
                </div>
                <div className="detail-trust-item">
                  <Award size={16} color="var(--color-rust)" />
                  <span>Buyer Protection Guarantee</span>
                </div>
                <div className="detail-trust-item">
                  <Coffee size={16} color="var(--color-rust)" />
                  <span>Direct Seller Inquiries</span>
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
                    Referred by Sales Agent <strong>{activeReferralCode}</strong>. Your reservation is accredited to a verified partner.
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
                  disabled={isSoldOut}
                  onClick={() => navigate(`/checkout?car_id=${car.uuid || car.id}`)}
                  title={isSoldOut ? 'This build is sold out' : 'Reserve this vehicle'}
                >
                  <FileText size={16} />
                  <span>{isSoldOut ? 'Sold Out' : 'Reserve'}</span>
                </button>
                {car.seller && (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => openDrawerWithListing({ seller: car.seller, listing: car, listingType: 'car' })}
                    title="Inquire directly with the verified seller"
                  >
                    <MessageSquare size={16} />
                    <span>Chat with Seller</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isSoldOut}
                  onClick={() => { setOfferNotice(''); setOfferModalOpen(true) }}
                  title={isSoldOut ? 'This build is sold out' : 'Propose your own price with a comment'}
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
                    title="Share vehicle listing on Facebook or earn sales commission"
                >
                  <Share2 size={16} />
                </button>
                <button
                    type="button"
                    className={`btn btn-secondary ${isSaved ? 'active' : ''}`}
                    onClick={() => toggleCarFavorite(car)}
                    title={isSaved ? 'Remove from Saved' : 'Save Vehicle'}
                >
                  <Heart size={16} fill={isSaved ? '#d8622c' : 'none'} color={isSaved ? '#d8622c' : 'currentColor'} />
                </button>
              </div>
            </div>

            {/* Comprehensive Specifications */}
            <div className="detail-specs-card">
              <h3>Technical Specifications</h3>
              <div className="detail-specs-grid">
                {specs.map(([label, val]) => (
                  <div key={label} className="detail-spec-row">
                    <span className="detail-spec-label">{label}</span>
                    <span className="detail-spec-value">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Seller Contact Card (Username Only & KYC Badge for Privacy) */}
            {car.seller && (
              <div className="detail-seller-card">
                <div className="detail-seller-info">
                  <div className="detail-seller-avatar">
                    {car.seller.avatar_url ? (
                      <img src={car.seller.avatar_url} alt={car.seller.username || 'Seller'} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span>{car.seller.username ? car.seller.username.charAt(0).toUpperCase() : 'S'}</span>
                    )}
                  </div>
                  <div>
                    <div className="detail-seller-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>@{car.seller.username || 'seller'}</span>
                      {car.seller.is_kyc_verified && (
                        <ShieldCheck size={16} style={{ color: '#10b981' }} title="KYC Verified Seller" />
                      )}
                    </div>
                    <div className="detail-seller-sub">Marketplace Builder · {location}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 13 }}
                    onClick={() => openDrawerWithListing({ seller: car.seller, listing: car, listingType: 'car' })}
                  >
                    <MessageSquare size={14} />
                    <span>Chat</span>
                  </button>
                  {car.seller.is_kyc_verified ? (
                    <span className="badge" style={{ background: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={13} />
                      <span>KYC Verified</span>
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--color-text-muted)' }}>
                      Registered Builder
                    </span>
                  )}
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
        listing={car ? { id: car.id, title: title, price: car.price, type: 'car' } : null}
        onSubmitted={() => setOfferNotice('Offer sent — the seller will review it under your Offers.')}
      />

      {/* Car Share & Agent Referral Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        item={{
          id: car.id,
          uuid: car.uuid,
          type: 'car',
          title: title,
          price: car.price,
          image: currentImgUrl,
          brand: car.brand,
          path: `/marketplace/${car.uuid || car.id}`
        }}
      />
    </div>
  )
}
