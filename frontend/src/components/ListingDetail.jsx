import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Car,
  Package,
  MapPin,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ClipboardList,
  Rocket,
  PauseCircle,
  Trash2,
  RefreshCw,
  Check,
  X,
  DollarSign,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { sellerCars } from '../api/cars.js'
import { sellerParts } from '../api/parts.js'
import { sellerOrdersApi } from '../api/seller.js'
import SellerOrderCard from './orders/SellerOrderCard.jsx'
import ListingStatusPicker, { normalizeListingStatus } from '../components/ListingStatusPicker.jsx'

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

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function extractError(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat()[0]
    if (first) return data.message ? `${data.message} ${first}` : String(first)
  }
  return data.message || fallback
}

export default function ListingDetail({ listing, type, onBack, onAction }) {
  const [detail, setDetail] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [inspectionType, setInspectionType] = useState('garage_dropoff')

  const isCar = type === 'car'
  const api = isCar ? sellerCars : sellerParts

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [detailRes, ordersRes] = await Promise.all([
        api.show(listing.id),
        sellerOrdersApi.incoming({
          per_page: 50,
          ...(isCar ? { car_id: listing.id } : { part_id: listing.id }),
        }),
      ])
      setDetail(detailRes)
      setOrders(ordersRes?.data ?? [])
    } catch (err) {
      setError(extractError(err, 'Failed to load listing details.'))
    } finally {
      setLoading(false)
    }
  }, [api, listing.id, isCar])

  useEffect(() => {
    load()
  }, [load])

  const runAction = async (action, successMsg, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setActingId(action)
    setError(null)
    setNotice(null)
    try {
      await api[action](listing.id)
      setNotice(successMsg)
      await load()
      onAction?.()
    } catch (err) {
      setError(extractError(err, `Failed to ${action} listing.`))
    } finally {
      setActingId(null)
    }
  }

  const runSubmitInspection = async () => {
    const label = inspectionType === 'onsite_visit' ? 'Mobile On-Site Visit' : 'Garage Drop-off'
    if (!window.confirm(`Submit this build for ${label} inspection? It enters the verification queue (not the marketplace) until approved.`)) return
    setActingId('inspect')
    setError(null)
    setNotice(null)
    try {
      await sellerCars.submitInspection(listing.id, { inspection_type: inspectionType })
      setNotice(`Submitted for ${label} inspection — an inspector will be assigned. You will be notified of the result.`)
      await load()
      onAction?.()
    } catch (err) {
      setError(extractError(err, 'Failed to submit for inspection.'))
    } finally {
      setActingId(null)
    }
  }

  // Order-level actions (verify → advance → proof → refund) now live inside
  // SellerOrderCard so both the Requests tab and this detail stay in sync.
  const handleOrderChanged = async () => {
    await load()
    onAction?.()
  }

  const status = detail?.status || listing.status || 'draft'
  const canSubmitInspection = isCar && ['draft', 'archived', 'rejected'].includes(status)
  const canPublish = isCar
    ? ['draft', 'archived', 'rejected', 'pending_inspection'].includes(status)
    : ['draft', 'archived'].includes(status)
  const canUnpublish = status === 'active'
  const canMarkSold = ['active', 'inspected'].includes(status)
  const detailPath = isCar
    ? `/marketplace/${detail?.uuid || listing.uuid || listing.id}`
    : `/parts/${detail?.uuid || listing.uuid || listing.id}`

  const imageUrl = detail?.primary_image_url || detail?.image_urls?.[0] || listing.primary_image_url || null
  const title = detail?.title || listing.title || `Listing #${listing.id}`

  const specs = []
  if (isCar) {
    if (detail?.year || listing.year) specs.push({ icon: Calendar, label: detail?.year || listing.year })
    if (detail?.mileage_km || listing.mileage_km) specs.push({ icon: Gauge, label: `${Number(detail?.mileage_km || listing.mileage_km).toLocaleString()} km` })
    if (detail?.fuel_type || listing.fuel_type) specs.push({ icon: Fuel, label: detail?.fuel_type || listing.fuel_type })
    if (detail?.transmission || listing.transmission) specs.push({ icon: Settings, label: detail?.transmission || listing.transmission })
  } else {
    if (detail?.category || listing.category) specs.push({ label: detail?.category || listing.category })
    if (detail?.condition || listing.condition) specs.push({ label: detail?.condition || listing.condition })
    if (detail?.quantity || listing.quantity) specs.push({ label: `Stock: ${detail?.quantity || listing.quantity}` })
  }

  const inspection = detail ? {
    status: detail.inspection_status,
    score: detail.inspection_score,
    date: detail.inspection_date,
    location: detail.inspection_location,
    type: detail.inspection_type,
    notes: detail.inspector_notes,
    inspector: detail.inspector?.name || detail.inspector_name,
  } : null

  return (
    <div className="listing-detail">
      <div className="listing-detail-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={15} /> Back to My Listings
        </button>
        <div className="listing-detail-header-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link to={detailPath} className="btn btn-secondary btn-sm">
            <ExternalLink size={14} /> View on Marketplace
          </Link>
        </div>
      </div>

      {error && <div className="my-listings-alert my-listings-alert--error"><ShieldAlert size={15} /> {error}</div>}
      {notice && <div className="my-listings-alert my-listings-alert--success"><ShieldCheck size={15} /> {notice}</div>}

      {loading && !detail ? (
        <div className="my-listings-card my-listings-card--center">
          <RefreshCw size={24} className="spin" />
          <p className="muted">Loading listing details…</p>
        </div>
      ) : detail ? (
        <>
          <div className="listing-detail-hero">
            <div className="listing-detail-image">
              {imageUrl ? (
                <img src={imageUrl} alt={title} />
              ) : (
                <div className="listing-detail-image-placeholder">
                  {isCar ? <Car size={48} /> : <Package size={48} />}
                </div>
              )}
            </div>
            <div className="listing-detail-info">
              <div className="listing-detail-title-row">
                <h2>{title}</h2>
                <span className={`listing-badge ${STATUS_CLASS[status] || ''}`}>
                  {STATUS_LABELS[status] || status}
                </span>
              </div>
              <div className="listing-detail-price">{formatPrice(detail.price || listing.price)}</div>
              {specs.length > 0 && (
                <div className="listing-detail-specs">
                  {specs.map((s, i) => (
                    <span key={i} className="listing-detail-spec">
                      {s.icon && <s.icon size={14} />} {s.label}
                    </span>
                  ))}
                </div>
              )}
              {(detail.city || listing.city) && (
                <div className="listing-detail-location">
                  <MapPin size={14} /> {detail.city || listing.city}
                </div>
              )}
              {detail.description && (
                <p className="listing-detail-description">{detail.description}</p>
              )}
            </div>
          </div>

          {isCar && (
            <div className="listing-detail-section">
              <h3 className="listing-detail-section-title">
                <ShieldCheck size={18} /> Inspection Status
              </h3>
              {inspection && inspection.status ? (
                <div className="inspection-card">
                  <div className="inspection-card-header">
                    <span className={`inspection-badge inspection-badge--${inspection.status}`}>
                      {inspection.status === 'passed' && <Check size={14} />}
                      {inspection.status === 'failed' && <X size={14} />}
                      {inspection.status === 'scheduled' && <Calendar size={14} />}
                      {inspection.status === 'requested' && <AlertCircle size={14} />}
                      {inspection.status === 'passed' ? 'Passed' : inspection.status === 'failed' ? 'Failed' : inspection.status === 'scheduled' ? 'Scheduled' : inspection.status === 'requested' ? 'Requested' : inspection.status}
                    </span>
                    {inspection.score != null && (
                      <span className="inspection-score">Score: {inspection.score}/100</span>
                    )}
                  </div>
                  <div className="inspection-card-body">
                    {inspection.type && (
                      <div className="inspection-row">
                        <span className="inspection-label">Type:</span>
                        <span>{inspection.type === 'garage_dropoff' ? 'Garage Drop-off' : inspection.type === 'onsite_visit' ? 'Mobile On-Site Visit' : inspection.type}</span>
                      </div>
                    )}
                    {inspection.date && (
                      <div className="inspection-row">
                        <span className="inspection-label">Date:</span>
                        <span>{formatDate(inspection.date)}</span>
                      </div>
                    )}
                    {inspection.location && (
                      <div className="inspection-row">
                        <span className="inspection-label">Location:</span>
                        <span>{inspection.location}</span>
                      </div>
                    )}
                    {inspection.inspector && (
                      <div className="inspection-row">
                        <span className="inspection-label">Inspector:</span>
                        <span>{inspection.inspector}</span>
                      </div>
                    )}
                    {inspection.notes && (
                      <div className="inspection-row">
                        <span className="inspection-label">Notes:</span>
                        <span>{inspection.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="inspection-card inspection-card--empty">
                  <AlertCircle size={20} />
                  <p>No inspection submitted yet.</p>
                  {canSubmitInspection && (
                    <div className="inspection-submit">
                      <select
                        value={inspectionType}
                        onChange={(e) => setInspectionType(e.target.value)}
                        className="inspection-select"
                      >
                        <option value="garage_dropoff">Garage Drop-off</option>
                        <option value="onsite_visit">Mobile On-Site Visit</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={actingId === 'inspect'}
                        onClick={runSubmitInspection}
                      >
                        <ShieldCheck size={14} /> {actingId === 'inspect' ? 'Submitting…' : 'Submit for Inspection'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="listing-detail-section">
            <h3 className="listing-detail-section-title">
              <ClipboardList size={18} /> Sales Orders ({orders.length})
            </h3>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
              Every buyer request on this listing, end-to-end: verify → advance delivery →
              submit handover proof → wait for admin fund release. Click a card to expand its receipt.
            </p>
            {orders.length === 0 ? (
              <div className="orders-empty">
                <ClipboardList size={24} />
                <p>No sales orders yet for this listing.</p>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <SellerOrderCard key={order.id} order={order} onChanged={handleOrderChanged} showListing={false} />
                ))}
              </div>
            )}
          </div>

          <div className="listing-detail-section">
            <h3 className="listing-detail-section-title">
              <Settings size={18} /> Manage Listing
            </h3>
            <div className="listing-detail-actions">
              {canPublish && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={actingId === 'publish'}
                  onClick={() => runAction('publish', 'Listing published to the marketplace.', 'Publish this listing to the marketplace?')}
                >
                  <Rocket size={14} /> Publish
                </button>
              )}
              {canUnpublish && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={actingId === 'unpublish'}
                  onClick={() => runAction('unpublish', 'Listing unpublished from the marketplace.', 'Unpublish this listing?')}
                >
                  <PauseCircle size={14} /> Unpublish
                </button>
              )}
              {canMarkSold && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={actingId === 'markSold'}
                  onClick={() => runAction('markSold', 'Listing marked as sold.', 'Mark this listing as sold?')}
                >
                  <DollarSign size={14} /> Mark as Sold
                </button>
              )}
              <ListingStatusPicker
                listingType={isCar ? 'car' : 'part'}
                listingId={listing.id}
                value={normalizeListingStatus(status)}
                onChanged={() => { load(); onAction?.() }}
                onError={(err) => setError(extractError(err, 'Failed to update listing status.'))}
                className="btn btn-secondary btn-sm"
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-danger-ghost"
                disabled={actingId === 'destroy'}
                onClick={() => runAction('destroy', 'Listing deleted.', 'Delete this listing permanently?')}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
