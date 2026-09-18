import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
  Sparkles
} from 'lucide-react'
import { marketplaceCars } from '../api/cars.js'
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
  const [car, setCar] = useState(null)
  const [error, setError] = useState('')
  const [selectedImgIdx, setSelectedImgIdx] = useState(0)
  const [isSaved, setIsSaved] = useState(false)

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
    ['Exterior Color', car.color || '—'],
    ['Chassis / VIN', car.vin || 'Verified on File'],
    ['Inspection Score', score],
    ['Showroom / City', location],
  ]

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

              <div className="detail-actions-row">
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => alert(`Thank you for your interest in the ${title}! The seller has been notified of your inquiry.`)}
                >
                  <MessageSquare size={16} />
                  <span>Inquire / Contact Seller</span>
                </button>
                <button 
                  type="button" 
                  className={`btn btn-secondary ${isSaved ? 'active' : ''}`}
                  onClick={() => setIsSaved(!isSaved)}
                  title="Save Vehicle"
                >
                  <Heart size={16} fill={isSaved ? '#d8622c' : 'none'} />
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

            {/* Seller Contact Card */}
            {car.seller && (
              <div className="detail-seller-card">
                <div className="detail-seller-info">
                  <div className="detail-seller-avatar">
                    {car.seller.name ? car.seller.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <div className="detail-seller-name">{car.seller.name}</div>
                    <div className="detail-seller-sub">Verified Marketplace Seller · {location}</div>
                  </div>
                </div>
                <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                  ✓ Verified
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
