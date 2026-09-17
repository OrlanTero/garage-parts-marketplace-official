import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, MapPin, Heart, ArrowRight, Gauge, Cog, Fuel } from 'lucide-react'
import './Cards.css'

// High-quality automotive placeholder images based on category or body style
const DEFAULT_CAR_IMAGES = [
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop'
]

function getFallbackImage(id) {
  const index = Math.abs(Number(id) || 0) % DEFAULT_CAR_IMAGES.length
  return DEFAULT_CAR_IMAGES[index]
}

function formatPrice(val) {
  if (val == null || val === '') return '₱ —'
  if (typeof val === 'string' && val.includes('₱')) return val
  const num = Number(val)
  if (isNaN(num)) return `₱ ${val}`
  return '₱ ' + num.toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

export default function CarCard({ 
  car, 
  isSaved, 
  onToggleSave, 
  variant = 'grid', 
  className = '' 
}) {
  const [internalSaved, setInternalSaved] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  if (!car) return null

  // Normalize data across API responses and featured mockup objects
  const id = car.id
  const title = car.title || `${car.year ? car.year + ' ' : ''}${car.brand || car.make || ''} ${car.model || ''}`.trim() || 'Verified Vehicle'
  const brand = car.brand || car.make || ''
  const model = car.model || ''
  const year = car.year || ''
  const priceDisplay = formatPrice(car.price)
  const origPriceDisplay = car.origPrice ? formatPrice(car.origPrice) : null
  const location = car.loc || car.city || 'Verified Hub'
  const tag = car.tag || (car.condition ? (car.condition === 'new' ? 'Brand New' : 'Verified Used') : (year ? `${year} Model` : 'Certified'))
  const score = car.score || '100-Pt Checked'
  const rating = car.rating || 4.9

  // Specs normalization
  const mileage = car.mileage || (car.mileage_km != null ? `${Number(car.mileage_km).toLocaleString()} km` : 'Inspected')
  const transmission = car.trans || (car.transmission ? car.transmission.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Manual')
  const fuel = car.fuel || (car.fuel_type ? car.fuel_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Petrol')
  const bodyStyle = car.body_style ? car.body_style.replace('_', ' ') : ''

  // Image resolution
  const imageUrl = car.img || car.primary_image_url || car.image_url || (Array.isArray(car.images) && car.images[0]?.url) || (Array.isArray(car.images) && typeof car.images[0] === 'string' ? car.images[0] : null) || getFallbackImage(id)

  const saved = isSaved !== undefined ? isSaved : internalSaved

  const handleWishlist = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onToggleSave) {
      onToggleSave(id, e)
    } else {
      setInternalSaved(!internalSaved)
    }
  }

  if (variant === 'list') {
    return (
      <div className={`modern-car-card modern-car-card--list ${className}`}>
        <div className="car-card-media">
          <img 
            src={imageUrl} 
            alt={title} 
            loading="lazy" 
            onLoad={() => setImgLoaded(true)}
            className={imgLoaded ? 'loaded' : ''}
          />
          {tag && <span className="car-card-tag">{tag}</span>}
          {score && (
            <span className="car-card-score">
              <ShieldCheck size={12} /> {score}
            </span>
          )}
          <button 
            type="button" 
            className={`car-wishlist-btn ${saved ? 'active' : ''}`}
            onClick={handleWishlist}
            aria-label="Save to Wishlist"
            title="Save Vehicle"
          >
            <Heart size={16} fill={saved ? '#d8622c' : 'none'} />
          </button>
        </div>

        <div className="car-card-content">
          <div className="car-card-top-meta">
            <div className="car-card-location">
              <MapPin size={12} /> {location}
            </div>
            {bodyStyle && <span className="car-body-badge">{bodyStyle}</span>}
          </div>

          <h3 className="car-card-title">
            <Link to={`/marketplace/${id}`}>{title}</Link>
          </h3>

          <div className="car-card-specs">
            <span className="spec-item"><Gauge size={12} /> {mileage}</span>
            <span className="spec-dot">•</span>
            <span className="spec-item"><Cog size={12} /> {transmission}</span>
            <span className="spec-dot">•</span>
            <span className="spec-item"><Fuel size={12} /> {fuel}</span>
          </div>

          {car.description && (
            <p className="car-card-desc-snippet">
              {car.description.slice(0, 110)}...
            </p>
          )}

          <div className="car-card-footer">
            <div className="car-price-block">
              <span className="car-price-main">{priceDisplay}</span>
              {origPriceDisplay && <span className="car-price-orig">{origPriceDisplay}</span>}
            </div>
            <div className="car-card-actions">
              <Link to={`/marketplace/${id}`} className="btn btn-primary car-view-btn">
                <span>View Specs</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`modern-car-card ${className}`}>
      <div className="car-card-media">
        <img 
          src={imageUrl} 
          alt={title} 
          loading="lazy" 
          onLoad={() => setImgLoaded(true)}
          className={imgLoaded ? 'loaded' : ''}
        />
        {tag && <span className="car-card-tag">{tag}</span>}
        {score && (
          <span className="car-card-score">
            <ShieldCheck size={12} /> {score}
          </span>
        )}
        <button 
          type="button" 
          className={`car-wishlist-btn ${saved ? 'active' : ''}`}
          onClick={handleWishlist}
          aria-label="Save to Wishlist"
          title="Save Vehicle"
        >
          <Heart size={16} fill={saved ? '#d8622c' : 'none'} />
        </button>
      </div>

      <div className="car-card-content">
        <div className="car-card-top-meta">
          <div className="car-card-location">
            <MapPin size={12} /> {location}
          </div>
          {bodyStyle && <span className="car-body-badge">{bodyStyle}</span>}
        </div>

        <h3 className="car-card-title">
          <Link to={`/marketplace/${id}`}>{title}</Link>
        </h3>

        <div className="car-card-specs">
          <span>{mileage}</span>
          <span className="spec-dot">•</span>
          <span>{transmission}</span>
          <span className="spec-dot">•</span>
          <span>{fuel}</span>
        </div>

        <div className="car-card-footer">
          <div className="car-price-block">
            <span className="car-price-main">{priceDisplay}</span>
            {origPriceDisplay && <span className="car-price-orig">{origPriceDisplay}</span>}
          </div>
          <Link to={`/marketplace/${id}`} className="btn btn-primary car-view-btn">
            <span>View Specs</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
