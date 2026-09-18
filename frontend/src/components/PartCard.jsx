import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Star, Heart, ArrowRight, PackageCheck, MapPin, Tag } from 'lucide-react'
import { useFavorites } from '../context/FavoritesContext.jsx'
import './Cards.css'

const CATEGORY_PLACEHOLDERS = {
  engine: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600&auto=format&fit=crop',
  wheels: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop',
  tires_wheels: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop',
  brakes: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=600&auto=format&fit=crop',
  suspension: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=600&auto=format&fit=crop',
  exhaust: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600&auto=format&fit=crop',
  interior: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=600&auto=format&fit=crop',
  body_exterior: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600&auto=format&fit=crop',
  accessories: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600&auto=format&fit=crop',
  default: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600&auto=format&fit=crop'
}

function getFallbackImage(category = '') {
  const cleanCat = category.toLowerCase().replace(/[^a-z_]/g, '')
  return CATEGORY_PLACEHOLDERS[cleanCat] || CATEGORY_PLACEHOLDERS.default
}

function formatPrice(val) {
  if (val == null || val === '') return '₱ —'
  if (typeof val === 'string' && val.includes('₱')) return val
  const num = Number(val)
  if (isNaN(num)) return `₱ ${val}`
  return '₱ ' + num.toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

export default function PartCard({ 
  part, 
  isSaved, 
  onToggleSave, 
  variant = 'grid', 
  className = '' 
}) {
  const { isPartSaved, togglePartFavorite } = useFavorites()
  const [imgLoaded, setImgLoaded] = useState(false)

  if (!part) return null

  // Normalize data across API and mockup shapes
  const id = part.id
  const title = part.title || `${part.brand ? part.brand + ' ' : ''}${part.part_number || 'Performance Part'}`
  const rawCat = part.cat || part.category || 'other'
  const catName = part.catName || (rawCat.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()))
  const priceNum = Number(part.price) || 0
  const priceDisplay = formatPrice(part.price)
  const origPriceDisplay = part.origPrice ? formatPrice(part.origPrice) : null
  
  // Condition normalization
  const condition = part.cond || (
    part.condition === 'new' 
      ? 'Brand New OEM' 
      : part.condition === 'used' 
        ? 'Used Surplus' 
        : part.condition === 'refurbished' 
          ? 'Refurbished' 
          : 'Verified Genuine'
  )

  const rating = part.rating || 4.9
  const reviews = part.reviews || 16
  const freeShip = part.freeShip != null ? part.freeShip : (priceNum >= 8000)
  const brand = part.brand || ''
  const partNumber = part.part_number || ''
  const location = part.loc || part.city || 'Verified Depot'
  const inStock = part.quantity != null ? part.quantity > 0 : true
  const stockText = part.quantity != null ? (part.quantity > 0 ? `${part.quantity} in stock` : 'Made to Order') : 'In Stock'

  // Image resolution
  const imageUrl = part.img || part.primary_image_url || part.image_url || (Array.isArray(part.images) && part.images[0]?.url) || (Array.isArray(part.images) && typeof part.images[0] === 'string' ? part.images[0] : null) || (Array.isArray(part.image_urls) && part.image_urls[0]) || getFallbackImage(rawCat)

  const saved = isSaved !== undefined ? isSaved : isPartSaved(id)

  const handleWishlist = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onToggleSave) {
      onToggleSave(id, e)
    } else {
      togglePartFavorite(part)
    }
  }

  if (variant === 'list') {
    return (
      <div className={`modern-part-card modern-part-card--list ${className}`}>
        <div className="part-card-media">
          <img 
            src={imageUrl} 
            alt={title} 
            loading="lazy" 
            onLoad={() => setImgLoaded(true)}
            className={imgLoaded ? 'loaded' : ''}
          />
          {catName && <span className="part-card-category">{catName}</span>}
          {freeShip && (
            <span className="part-card-freeship">
              <Truck size={11} /> Free Freight
            </span>
          )}
          <button 
            type="button" 
            className={`part-wishlist-btn ${saved ? 'active' : ''}`}
            onClick={handleWishlist}
            aria-label="Save Part"
            title="Save Part"
          >
            <Heart size={15} fill={saved ? '#d8622c' : 'none'} />
          </button>
        </div>

        <div className="part-card-content">
          <div className="part-card-cond">
            <span className="cond-badge">{condition}</span>
            <div className="part-card-top-right">
              {brand && <span className="part-brand-tag">{brand}</span>}
              <span className="part-rating">
                <Star size={12} fill="#e06c35" color="#e06c35" /> {rating} ({reviews})
              </span>
            </div>
          </div>

          <h3 className="part-card-title">
            <Link to={`/parts/${id}`}>{title}</Link>
          </h3>

          <div className="part-card-meta-line">
            {partNumber && <span className="part-meta-tag"><Tag size={11} /> PN: {partNumber}</span>}
            <span className="part-meta-tag"><PackageCheck size={11} /> {stockText}</span>
            <span className="part-meta-tag"><MapPin size={11} /> {location}</span>
          </div>

          {part.compatibility && (
            <div className="part-card-compat-snippet">
              <strong>Fits:</strong> {part.compatibility}
            </div>
          )}

          <div className="part-card-footer">
            <div className="part-price-block">
              <span className="part-price-main">{priceDisplay}</span>
              {origPriceDisplay && <span className="part-price-orig">{origPriceDisplay}</span>}
            </div>
            <div className="part-card-actions">
              <Link to={`/parts/${id}`} className="btn btn-secondary part-inquire-btn">
                <span>Inquire / Bag</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`modern-part-card ${className}`}>
      <div className="part-card-media">
        <img 
          src={imageUrl} 
          alt={title} 
          loading="lazy" 
          onLoad={() => setImgLoaded(true)}
          className={imgLoaded ? 'loaded' : ''}
        />
        {catName && <span className="part-card-category">{catName}</span>}
        {freeShip && (
          <span className="part-card-freeship">
            <Truck size={11} /> Free Freight
          </span>
        )}
        <button 
          type="button" 
          className={`part-wishlist-btn ${saved ? 'active' : ''}`}
          onClick={handleWishlist}
          aria-label="Save Part"
          title="Save Part"
        >
          <Heart size={15} fill={saved ? '#d8622c' : 'none'} />
        </button>
      </div>

      <div className="part-card-content">
        <div className="part-card-cond">
          <span className="cond-badge">{condition}</span>
          <span className="part-rating">
            <Star size={12} fill="#e06c35" color="#e06c35" /> {rating} ({reviews})
          </span>
        </div>

        <h3 className="part-card-title">
          <Link to={`/parts/${id}`}>{title}</Link>
        </h3>

        {brand && (
          <div className="part-card-brand-sub">
            <span>{brand}</span>
            {partNumber && <span> · #{partNumber}</span>}
          </div>
        )}

        <div className="part-card-footer">
          <div className="part-price-block">
            <span className="part-price-main">{priceDisplay}</span>
            {origPriceDisplay && <span className="part-price-orig">{origPriceDisplay}</span>}
          </div>
          <Link to={`/parts/${id}`} className="btn btn-secondary part-inquire-btn">
            <span>Inquire / Bag</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
