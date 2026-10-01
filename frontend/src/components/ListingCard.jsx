import { Car, Package, MapPin, ClipboardList, ShieldCheck, Eye, ChevronRight } from 'lucide-react'

const STATUS_CLASS = {
  active: 'listing-badge--live',
  draft: 'listing-badge--draft',
  pending_inspection: 'listing-badge--pending',
  inspected: 'listing-badge--pending',
  rejected: 'listing-badge--rejected',
  sold: 'listing-badge--sold',
  archived: 'listing-badge--archived',
}

const STATUS_LABELS = {
  draft: 'Draft',
  pending_inspection: 'Pending Inspection',
  inspected: 'Inspected',
  active: 'Live',
  rejected: 'Rejected',
  sold: 'Sold',
  archived: 'Archived',
}

function formatPrice(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return value
  return `₱${num.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`
}

export default function ListingCard({ item, type, orderCount = 0, onClick }) {
  const status = item.status || 'draft'
  const isCar = type === 'car'
  const imageUrl = item.primary_image_url || item.image_urls?.[0] || null
  const title = item.title || `Listing #${item.id}`

  const specs = []
  if (isCar) {
    if (item.year) specs.push(item.year)
    if (item.mileage_km) specs.push(`${Number(item.mileage_km).toLocaleString()} km`)
    if (item.transmission) specs.push(item.transmission)
    if (item.fuel_type) specs.push(item.fuel_type)
  } else {
    if (item.category) specs.push(item.category)
    if (item.condition) specs.push(item.condition)
    if (item.quantity) specs.push(`Stock: ${item.quantity}`)
  }

  const inspection = item.inspection_status || item.inspection?.status || null
  const pendingOrders = Number(item.pending_orders_count || 0)
  const views = item.views_count ?? item.views ?? null

  return (
    <div className="listing-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}>
      <div className="listing-card-image">
        {imageUrl ? (
          <img src={imageUrl} alt={title} loading="lazy" />
        ) : (
          <div className="listing-card-image-placeholder">
            {isCar ? <Car size={40} /> : <Package size={40} />}
          </div>
        )}
        <span className={`listing-badge ${STATUS_CLASS[status] || ''}`}>
          {STATUS_LABELS[status] || status}
        </span>
        {isCar && inspection && (
          <span className={`listing-badge listing-card-inspection inspection-badge--${inspection}`}>
            <ShieldCheck size={11} /> {inspection}
          </span>
        )}
        {pendingOrders > 0 && (
          <span className="listing-badge listing-card-orders-flag">
            {pendingOrders} new request{pendingOrders === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div className="listing-card-body">
        <h3 className="listing-card-title">{title}</h3>
        <div className="listing-card-price">{formatPrice(item.price)}</div>
        {specs.length > 0 && (
          <div className="listing-card-specs">{specs.join(' · ')}</div>
        )}
        {item.city && (
          <div className="listing-card-location">
            <MapPin size={13} /> {item.city}
          </div>
        )}
      </div>
      <div className="listing-card-footer">
        <div className="listing-card-stats">
          <span className="listing-card-stat" title="Sales orders on this listing">
            <ClipboardList size={13} /> {orderCount} {orderCount === 1 ? 'order' : 'orders'}
          </span>
          {views != null && (
            <span className="listing-card-stat" title="Marketplace views">
              <Eye size={13} /> {views}
            </span>
          )}
          {item.rating != null && (
            <span className="listing-card-stat">
              ★ {item.rating}
            </span>
          )}
        </div>
        <span className="listing-card-cta">
          Manage & view sales <ChevronRight size={14} />
        </span>
      </div>
    </div>
  )
}
