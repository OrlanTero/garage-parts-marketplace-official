import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  RefreshCw,
  Wrench,
  XCircle,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

function statusBadge(car) {
  const isPublished = car.status === 'active' || car.status === 'published'
  const isPending = car.status === 'pending_inspection'
  if (isPublished) return { label: 'Published', cls: 'badge-success', Icon: CheckCircle2 }
  if (isPending) return { label: 'Pending Inspection', cls: 'badge-warning', Icon: Clock }
  if (car.status === 'sold') return { label: 'Sold', cls: 'badge-danger', Icon: XCircle }
  return { label: car.status || 'Draft', cls: 'badge-neutral', Icon: Car }
}

function Fact({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--admin-text-muted)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)', overflowWrap: 'break-word' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

/**
 * Full vehicle build page: every image, the complete spec sheet, seller,
 * inspection state and timestamps — one screen for audit and review.
 */
export default function CarDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [activeImg, setActiveImg] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const data = await adminApi.getModerationCar(id)
      setCar(data)
      setActiveImg(0)
    } catch (err) {
      setFetchError(err?.response?.data?.message || 'Could not load this vehicle.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ marginBottom: 12 }} />
        <div>Loading vehicle build…</div>
      </div>
    )
  }

  if (fetchError || !car) {
    return (
      <div>
        <button type="button" onClick={() => navigate('/cars')} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to vehicles
        </button>
        <div className="admin-card" style={{ padding: 32, textAlign: 'center', color: 'var(--admin-danger)' }}>
          {fetchError || 'Vehicle not found.'}
        </div>
      </div>
    )
  }

  const badge = statusBadge(car)
  const BadgeIcon = badge.Icon
  const images = Array.isArray(car.media) && car.media.length > 0 ? car.media : []
  if (car.primary_image_url && !images.some((m) => m.url === car.primary_image_url)) {
    images.unshift({ id: 'primary', url: car.primary_image_url })
  }
  const title = car.title || `${car.brand || car.make || ''} ${car.model || ''}`.trim() || 'Vehicle Build'

  return (
    <div className="mod-detail">
      <button type="button" onClick={() => navigate('/cars')} className="btn btn-secondary btn-sm" style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
        <ArrowLeft size={14} /> Back to vehicles
      </button>

      {/* Title + status + cross-links */}
      <div className="admin-card mod-detail-head">
        <div className="mod-detail-title">
          <h1>{title}</h1>
          <p>
            {[car.year, car.brand || car.make, car.model].filter(Boolean).join(' · ')}
            {car.vin ? ` · VIN ${car.vin}` : ''} · Build #{car.id}
          </p>
          <div className="mod-detail-price">
            ₱{Number(car.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            {car.original_price ? (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted)', textDecoration: 'line-through', marginLeft: 10 }}>
                ₱{Number(car.original_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mod-detail-side">
          <span className={`badge ${badge.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <BadgeIcon size={12} /> {badge.label}
          </span>
          <div className="mod-actions">
            <Link to="/moderation" className="btn btn-secondary btn-sm">
              <Wrench size={13} /> <span>Inspection queue</span>
            </Link>
            <a
              href={`http://localhost:5173/marketplace/${car.uuid || car.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <ExternalLink size={13} /> <span>Storefront</span>
            </a>
          </div>
        </div>
      </div>

      {/* Gallery (every image) + build sheet */}
      <div className="mod-cols">
        <div className="admin-card mod-gallery-card">
          {images.length > 0 ? (
            <>
              <img src={images[Math.min(activeImg, images.length - 1)].url} alt={title} className="mod-main-img" />
              <div className="mod-thumbs" style={{ marginTop: 10 }}>
                <span className="mod-muted" style={{ alignSelf: 'center' }}>
                  {images.length} photo{images.length === 1 ? '' : 's'}
                </span>
                {images.map((m, i) => (
                  <button key={m.id ?? i} type="button" className={`mod-thumb ${i === activeImg ? 'is-active' : ''}`} onClick={() => setActiveImg(i)} aria-label={`Photo ${i + 1}`}>
                    <img src={m.url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mod-noimg"><Car size={40} /></div>
          )}
        </div>

        <div className="admin-card">
          <h3 className="mod-card-title">Build sheet</h3>
          <div className="mod-grid">
            <Fact label="Year" value={car.year} />
            <Fact label="Brand" value={car.brand || car.make} />
            <Fact label="Model" value={car.model} />
            <Fact label="VIN" value={car.vin || 'Not set'} />
            <Fact label="Body style" value={car.body_style} />
            <Fact label="Transmission" value={car.transmission} />
            <Fact label="Fuel" value={car.fuel_type} />
            <Fact label="Mileage" value={car.mileage_km != null ? `${Number(car.mileage_km).toLocaleString()} km` : '—'} />
            <Fact label="Condition" value={car.condition} />
            <Fact label="Color" value={car.color} />
            <Fact label="City" value={car.city} />
            <Fact label="Location" value={car.location} />
            <Fact label="Quantity" value={car.quantity} />
            <Fact label="Score" value={car.score || car.inspection_score || 'Pending'} />
          </div>
          {car.description && <p className="mod-desc">{car.description}</p>}
        </div>
      </div>

      {/* Seller + inspection + record meta */}
      <div className="mod-cols">
        <div className="admin-card">
          <h3 className="mod-card-title">Seller</h3>
          <div className="mod-seller">
            <div className="mod-seller-avatar">{(car.seller?.name || 'S').charAt(0).toUpperCase()}</div>
            <div>
              <div className="mod-seller-name">{car.seller?.name || 'Makati Showroom & HQ'}</div>
              <div className="mod-muted">{car.seller?.email || ''}</div>
              {car.seller?.role && <span className="badge badge-neutral" style={{ marginTop: 6, textTransform: 'capitalize' }}>{String(car.seller.role).replace('_', ' ')}</span>}
            </div>
          </div>
        </div>

        <div className="admin-card">
          <h3 className="mod-card-title">Inspection & record</h3>
          <div className="mod-grid">
            <Fact label="Inspection status" value={car.inspection_status ? String(car.inspection_status).replace('_', ' ') : 'pending'} />
            <Fact label="Inspection type" value={car.inspection_type === 'garage_dropoff' ? 'Garage drop-off' : car.inspection_type === 'onsite_visit' ? 'On-site visit' : 'Unscheduled'} />
            <Fact label="Inspection date" value={car.inspection_date ? new Date(car.inspection_date).toLocaleString() : 'No date set'} />
            <Fact label="Location" value={car.inspection_location || '—'} />
            <Fact label="Inspector" value={car.inspector ? (car.inspector.name || car.inspector.username) : 'Unassigned'} />
            <Fact label="Approved by" value={car.approver ? (car.approver.name || car.approver.username) : '—'} />
            <Fact label="Published" value={car.published_at ? new Date(car.published_at).toLocaleString() : '—'} />
            <Fact label="Last updated" value={car.updated_at ? new Date(car.updated_at).toLocaleString() : '—'} />
          </div>
          {car.inspector_notes && (
            <div className="mod-notes"><strong>Inspector notes:</strong><p>{car.inspector_notes}</p></div>
          )}
        </div>
      </div>

      <div className="mod-footnote">
        <MapPin size={13} /> Full build record — schedule or record inspections from the moderation queue.
      </div>
    </div>
  )
}
