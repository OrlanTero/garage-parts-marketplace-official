import { Link } from 'react-router-dom'
import { ExternalLink, ShieldCheck, Tag } from 'lucide-react'

export default function ListingContextCard({ listing, compact = false }) {
  if (!listing) return null

  const isCar = listing.type === 'car'
  const fallbackImg = isCar
    ? 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=600&q=80'
    : 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80'

  const imgSrc = listing.primary_image_url || fallbackImg
  const formattedPrice = Number(listing.price || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  })

  return (
    <div className={`listing-context-card ${compact ? 'listing-context-card--compact' : ''}`}>
      <div className="listing-context-card__media">
        <img src={imgSrc} alt={listing.title} loading="lazy" />
        <span className="listing-context-card__badge">
          {isCar ? 'Vehicle Listing' : 'Part Listing'}
        </span>
      </div>

      <div className="listing-context-card__content">
        <div className="listing-context-card__header">
          <h4 className="listing-context-card__title" title={listing.title}>
            {listing.title}
          </h4>
          <span className="listing-context-card__price">{formattedPrice}</span>
        </div>

        <div className="listing-context-card__meta">
          {listing.inspection_score && (
            <span className="listing-context-card__tag listing-context-card__tag--score">
              <ShieldCheck size={12} />
              {listing.inspection_score} Inspected
            </span>
          )}
          {listing.condition && (
            <span className="listing-context-card__tag">
              <Tag size={12} />
              {listing.condition}
            </span>
          )}
        </div>

        {listing.url && (
          <Link
            to={listing.url}
            className="listing-context-card__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>View Details</span>
            <ExternalLink size={12} />
          </Link>
        )}
      </div>
    </div>
  )
}
