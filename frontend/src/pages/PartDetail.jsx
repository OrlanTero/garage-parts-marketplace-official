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
  Tag,
  Building2,
  Store,
  FileText,
  BadgePercent
} from 'lucide-react'
import { marketplaceParts } from '../api/parts.js'
import { ordersApi } from '../api/orders.js'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useChat } from '../context/ChatContext.jsx'
import ListingStatusPicker from '../components/ListingStatusPicker.jsx'
import ShareModal from '../components/ShareModal.jsx'
import ReviewSection from '../components/ReviewSection.jsx'
import NotifyMeButton from '../components/NotifyMeButton.jsx'
import { getActiveReferralCode } from '../utils/referral.js'
import { canManagePart, isHouseAccount } from '../utils/listingAccess.js'
import { partShipsFree, peso as freightPeso, useFreightPolicy } from '../utils/freight.js'
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
  const { user } = useAuth()
  const { openDrawerWithListing } = useChat()
  const [part, setPart] = useState(null)
  const [error, setError] = useState('')
  const [selectedImgIdx, setSelectedImgIdx] = useState(0)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [freightQuote, setFreightQuote] = useState(null)
  const freightPolicy = useFreightPolicy()
  const activeReferralCode = getActiveReferralCode()

  // Managers (owner, house staff, future partner-garage staff) get manage
  // controls — never buy/inquire buttons. See utils/listingAccess.js.
  const isOwner = canManagePart(user, part)
  const isHouse = isHouseAccount(user)
  const reloadPart = () => {
    marketplaceParts
      .show(id)
      .then((data) => setPart(data))
      .catch(() => {})
  }

  const isSaved = isPartSaved(part?.id || id)

  useEffect(() => {
    marketplaceParts
      .show(id)
      .then((data) => {
        setPart(data)
        setSelectedImgIdx(0)
      })
      .catch((e) => setError(
        e.response?.status === 404 || e.response?.status === 403
          ? 'This listing is no longer available on the marketplace.'
          : e.message,
      ))
  }, [id])

  // Live freight quote (no destination yet → threshold rule or standard
  // flat fee), so the badge matches what checkout will actually charge.
  useEffect(() => {
    if (!part?.id) return
    let alive = true
    ordersApi.getDeliveryQuote({ part_id: part.id, item_type: 'part', quantity: 1 })
      .then((q) => { if (alive) setFreightQuote(q) })
      .catch(() => { if (alive) setFreightQuote(null) })
    return () => { alive = false }
  }, [part?.id])

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
  // Freight verdict: live backend quote wins (it carries the effective
  // policy); synchronous rule only as fallback.
  const quotePolicy = freightQuote?.policy || freightPolicy
  const quoteFree = freightQuote ? Boolean(freightQuote.free) : null
  const freeShip = quoteFree ?? partShipsFree(part, Number(part.price || 0), quotePolicy)
  const freightFeeText = !freeShip && freightQuote?.fee != null
    ? `${freightPeso(freightQuote.fee, 0)} standard freight`
    : null
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
    ['Freight Delivery', freeShip ? 'Free Insured Crated Shipping' : (freightFeeText ? `${freightFeeText} · exact rate at checkout` : 'Calculated at Checkout')],
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
                {freeShip ? (
                  <span className="detail-media-score" style={{ background: '#15803d' }}>
                    <Truck size={14} /> Free Freight
                  </span>
                ) : freightFeeText ? (
                  <span className="detail-media-score" style={{ background: 'rgba(20, 23, 26, 0.85)' }}>
                    <Truck size={14} /> {freightFeeText}
                  </span>
                ) : null}
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
              {Number(part.perks_discount_pct || 0) > 0 && (
                <div style={{ marginTop: 8 }}>
                  {user?.is_perks_member ? (
                    <span className="badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <BadgePercent size={13} />
                      <span>Member price: {part.perks_discount_pct}% off at checkout</span>
                    </span>
                  ) : (
                    <Link to="/perks" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-accent)' }}>
                      Members save {part.perks_discount_pct}% on this part — join perks
                    </Link>
                  )}
                </div>
              )}

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

              {/* Referring Agent Banner (buyers only) */}
              {activeReferralCode && !isOwner && (
                <div style={{
                  background: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: 'var(--color-success)'
                }}>
                  <span>🤝</span>
                  <div>
                    Referred by Sales Agent <strong>{activeReferralCode}</strong>. Your purchase supports an accredited garage partner.
                  </div>
                </div>
              )}

              {isOwner ? (
                <>
                  <div style={{
                    background: 'var(--color-warning-bg)',
                    border: '1px solid var(--color-warning)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    color: 'var(--color-warning)',
                  }}>
                    <Store size={16} />
                    <div>
                      <strong>{isHouse ? 'Garage catalog listing.' : 'This is your listing.'}</strong>{' '}
                      Buyers see the public view — you get manage controls.
                    </div>
                  </div>
                  <div className="detail-actions-row">
                    <ListingStatusPicker
                      listingType="part"
                      listingId={part.id}
                      value={part.status}
                      onChanged={reloadPart}
                      onError={(err) => alert(err?.response?.data?.message || 'Failed to update listing status.')}
                      className="btn btn-primary"
                      style={{ cursor: 'pointer' }}
                    />
                    <Link
                      to={`/messages?listing=part:${part.id}`}
                      className="btn btn-secondary"
                      title="Open every buyer inquiry on this listing"
                    >
                      <MessageSquare size={16} />
                      <span>Inquiries</span>
                    </Link>
                    <Link
                      to="/my-listings?tab=requests"
                      className="btn btn-secondary"
                      title="Paid orders and buyer requests on your listings"
                    >
                      <FileText size={16} />
                      <span>Orders</span>
                    </Link>
                    <Link
                      to="/my-listings"
                      className="btn btn-secondary"
                      title="Manage all your listings"
                    >
                      <Store size={16} />
                      <span>Manage</span>
                    </Link>
                  </div>
                </>
              ) : (
              <div className="detail-actions-row">
                {(() => {
                  const st = String(part.status?.value || part.status || '').toLowerCase()
                  return (st === 'sold' || (part.quantity != null && Number(part.quantity) <= 0))
                    ? <NotifyMeButton listingType="part" listingId={part.id} />
                    : null
                })()}
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={String(part.status?.value || part.status || '').toLowerCase() === 'sold' || (part.quantity != null && Number(part.quantity) <= 0)}
                  onClick={() => navigate(`/checkout?part_id=${part.uuid || part.id}`)}
                  title={String(part.status?.value || part.status || '').toLowerCase() === 'sold' || (part.quantity != null && Number(part.quantity) <= 0) ? 'This part is currently unavailable' : 'Buy at list price'}
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
                    <span>Inquire</span>
                  </button>
                )}
                {part.seller && (
                  <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={part.quantity != null && Number(part.quantity) <= 0}
                      onClick={() => openDrawerWithListing({ seller: part.seller, listing: part, listingType: 'part', openOffer: true })}
                      title="Open chat and propose your price on this part"
                  >
                    <Tag size={16} />
                    <span>Make an Offer</span>
                  </button>
                )}

              </div>
              )}

              <div className="detail-actions-row">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShareModalOpen(true)}
                    title="Share product link & earn agent commission (3% cars · 10% parts)"
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
                    {part.seller.avatar_url ? (
                      <img src={part.seller.avatar_url} alt={part.seller.username || 'Seller'} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span>{part.seller.username ? part.seller.username.charAt(0).toUpperCase() : 'S'}</span>
                    )}
                  </div>
                  <div>
                    <div className="detail-seller-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>@{part.seller.username || 'seller'}</span>
                      {part.seller.is_kyc_verified && (
                        <ShieldCheck size={16} style={{ color: 'var(--color-success)' }} title="KYC Verified Seller" />
                      )}
                    </div>
                    <div className="detail-seller-sub">Verified Parts Supplier · {location}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    to={`/showroom?seller=${part.seller.username || part.seller.id}`}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 13 }}
                    title="Visit Builder's Garage Showroom"
                  >
                    <Building2 size={14} />
                    <span>Showroom</span>
                  </Link>
                  {!isOwner && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 13 }}
                      onClick={() => openDrawerWithListing({ seller: part.seller, listing: part, listingType: 'part' })}
                    >
                      <MessageSquare size={14} />
                      <span>Chat</span>
                    </button>
                  )}
                  {part.seller.is_kyc_verified ? (
                    <span className="badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={13} />
                      <span>KYC Verified</span>
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--color-text-muted)' }}>
                      Verified Supplier
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
