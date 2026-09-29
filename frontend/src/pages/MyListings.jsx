import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  Package,
  Eye,
  Rocket,
  PauseCircle,
  BadgeCheck,
  Trash2,
  Store,
  ShieldAlert,
  RefreshCw,
  Inbox,
  Check,
  X,
  Building2,
  DollarSign,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { sellerCars } from '../api/cars.js'
import { sellerParts } from '../api/parts.js'
import { sellerApi, sellerOrdersApi, SELLER_ORDER_STATUSES, CAR_STATUSES, PART_STATUSES, STATUS_LABELS } from '../api/seller.js'
import ListingStatusPicker, { normalizeListingStatus } from '../components/ListingStatusPicker.jsx'
import { useOrderStatusListener } from '../realtime/useOrderStatus.js'
import { showroomApi } from '../api/showroom.js'
import './MyListings.css'

const SELLER_ROLES = ['seller', 'dealer', 'parts_seller', 'admin', 'super_admin']

const STATUS_CLASS = {
  active: 'listing-badge--live',
  draft: 'listing-badge--draft',
  pending_inspection: 'listing-badge--pending',
  inspected: 'listing-badge--pending',
  rejected: 'listing-badge--rejected',
  sold: 'listing-badge--sold',
  archived: 'listing-badge--archived',
}

function formatPrice(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return value
  return `₱${num.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`
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

export default function MyListings() {
  const { user, isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = ['cars', 'parts', 'requests', 'showroom'].includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'cars'
  const [tab, setTab] = useState(initialTab) // cars | parts | requests | showroom
  const [statusFilter, setStatusFilter] = useState('all')
  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [requests, setRequests] = useState([])
  const [pendingRequests, setPendingRequests] = useState(0)
  // Paid (auto-accepted) orders must be visible here too — not just pending.
  const [requestFilter, setRequestFilter] = useState('all')

  const switchTab = (next) => {
    setTab(next)
    setSearchParams(next === 'cars' ? {} : { tab: next })
  }
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  // Showroom & Parking States
  const [showroomData, setShowroomData] = useState(null)
  const [slotModalOpen, setSlotModalOpen] = useState(false)
  const [selectedCarId, setSelectedCarId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('gcash')
  const [paymentReference, setPaymentReference] = useState('')
  const [sellerNotes, setSellerNotes] = useState('')
  const [slotSubmitting, setSlotSubmitting] = useState(false)

  const isSeller = isAuthenticated && user && SELLER_ROLES.includes(user.role)
  // Parts catalog is house-only (GAP Valenzuela Main). Everyone else
  // manages vehicles here; admins use Parts & Product Management.
  const canSellParts = Boolean(user?.is_house || user?.role === 'admin' || user?.role === 'super_admin')
  const statuses = tab === 'cars' ? CAR_STATUSES : PART_STATUSES
  const api = tab === 'cars' ? sellerCars : sellerParts

  const load = useCallback(async () => {
    if (!isSeller) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (tab === 'showroom') {
        const data = await showroomApi.getSellerStatus()
        setShowroomData(data)
      } else if (tab === 'requests') {
        const res = await sellerOrdersApi.incoming({
          verification_status: requestFilter === 'all' ? undefined : requestFilter,
          per_page: 50,
        })
        setRequests(res?.data ?? [])
        const pending = await sellerOrdersApi.incoming({ verification_status: 'pending', per_page: 1 })
        setPendingRequests(pending?.meta?.total ?? 0)
      } else {
        const [sum, list] = await Promise.all([
          sellerApi.summary(),
          (tab === 'cars' ? sellerCars : sellerParts).list({
            status: statusFilter === 'all' ? undefined : statusFilter,
            per_page: 50,
          }),
        ])
        setSummary(sum)
        setItems(Array.isArray(list.data) ? list.data : [])
        const pending = await sellerOrdersApi.incoming({ verification_status: 'pending', per_page: 1 })
        setPendingRequests(pending?.meta?.total ?? 0)
      }
    } catch (err) {
      setError(extractError(err, 'Failed to load your listings.'))
      setItems([])
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [isSeller, tab, statusFilter, requestFilter])

  useEffect(() => {
    load()
  }, [load])

  // Live: buyer payments, inspections, and disputes refresh incoming
  // requests and inventory without a manual reload.
  useOrderStatusListener(() => {
    load()
  })

  const stats = useMemo(() => {
    if (!summary) return []
    const live = (summary.cars?.active || 0) + (summary.parts?.active || 0)
    const drafts = (summary.cars?.draft || 0) + (summary.parts?.draft || 0)
    const sold = (summary.cars?.sold || 0) + (summary.parts?.sold || 0)
    return [
      { label: 'Live on Marketplace', value: live, className: 'stat--live' },
      { label: 'Pending Review', value: summary.pending_moderation || 0, className: 'stat--pending' },
      { label: 'Drafts', value: drafts, className: 'stat--draft' },
      { label: 'Sold', value: sold, className: 'stat--sold' },
    ]
  }, [summary])

  const runAction = async (id, action, successMsg, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setActingId(`${action}-${id}`)
    setError(null)
    setNotice(null)
    try {
      await api[action](id)
      setNotice(successMsg)
      await load()
    } catch (err) {
      setError(extractError(err, `Failed to ${action} listing.`))
    } finally {
      setActingId(null)
    }
  }

  const runSubmitInspection = async (carId, inspectionType = 'garage_dropoff') => {
    const label = inspectionType === 'onsite_visit' ? 'Mobile On-Site Visit' : 'Garage Drop-off'
    if (!window.confirm(`Submit this build for ${label} inspection? It enters the verification queue (not the marketplace) until approved.`)) return
    setActingId(`inspect-${carId}`)
    setError(null)
    setNotice(null)
    try {
      await sellerCars.submitInspection(carId, { inspection_type: inspectionType })
      setNotice(`Submitted for ${label} inspection — an inspector will be assigned. You will be notified of the result.`)
      await load()
    } catch (err) {
      setError(extractError(err, 'Failed to submit for inspection.'))
    } finally {
      setActingId(null)
    }
  }

  const runSubmitProof = async (order) => {
    const note = window.prompt('Handover note for the admin reviewer (e.g. turnover location, odometer, keys handed over):', '')
    if (note === null) return
    const urls = window.prompt('Photo proof URLs, comma-separated (handover photos, OR/CR, odometer):', '')
    if (urls === null) return
    const images = urls.split(',').map((u) => u.trim()).filter(Boolean)
    setActingId(`proof-${order.id}`)
    setError(null)
    setNotice(null)
    try {
      await sellerOrdersApi.submitProof(order.id, { images, note: note.trim() || undefined })
      setNotice('Handover proof submitted — admin review releases your held funds to your wallet.')
      await load()
    } catch (err) {
      setError(extractError(err, 'Failed to submit handover proof.'))
    } finally {
      setActingId(null)
    }
  }

  const runOrderStatusChange = async (order, status) => {
    if (!status || status === order.status) {
      await load()
      return
    }
    if (!window.confirm(`Move order ${order.order_number || `#${order.id}`} to "${status}"?`)) {
      await load()
      return
    }
    setActingId(`status-${order.id}`)
    setError(null)
    setNotice(null)
    try {
      await sellerOrdersApi.updateStatus(order.id, { status })
      setNotice(`Order moved to ${status}.`)
      await load()
    } catch (err) {
      setError(extractError(err, 'Failed to update order status.'))
      await load()
    } finally {
      setActingId(null)
    }
  }

  const runRequestAction = async (order, action) => {
    const note =
      action === 'reject'
        ? window.prompt('Reason for declining (optional, shown to buyer):', '')
        : null
    if (action === 'reject' && note === null) return
    if (action === 'accept' && !window.confirm(`Accept request ${order.order_number || `#${order.id}`}? Other pending requests for this listing will auto-decline.`)) return
    setActingId(`${action}-${order.id}`)
    setError(null)
    setNotice(null)
    try {
      await sellerOrdersApi[action](order.id, action === 'reject' && note ? note : undefined)
      setNotice(action === 'accept' ? 'Request verified & accepted. Payment is now unlocked for the buyer.' : 'Request declined.')
      await load()
    } catch (err) {
      setError(extractError(err, `Failed to ${action} request.`))
    } finally {
      setActingId(null)
    }
  }

  const runRefund = async (order) => {
    const isCar = (order.item?.type || order.item_type || tab) === 'car'
    const note = window.prompt('Refund note for the buyer (optional):', isCar ? 'Refunded after inspection dispute.' : 'Refunded after dispute resolution.')
    if (note === null) return
    if (!window.confirm(`Refund the payment for order ${order.order_number || `#${order.id}`} back to the buyer?`)) return
    setActingId(`refund-${order.id}`)
    setError(null)
    setNotice(null)
    try {
      await sellerOrdersApi.refund(order.id, note || undefined)
      setNotice('Payment refunded to the buyer. Order closed as refunded.')
      await load()
    } catch (err) {
      setError(extractError(err, 'Failed to refund order.'))
      await load()
    } finally {
      setActingId(null)
    }
  }

  const canPublish = (status) =>
    tab === 'cars'
      ? ['draft', 'archived', 'rejected', 'pending_inspection'].includes(status)
      : ['draft', 'archived'].includes(status)

  const detailPath = (item) =>
    tab === 'cars'
      ? `/marketplace/${item.uuid || item.id}`
      : `/parts/${item.uuid || item.id}`

  const handleOpenSlotModal = (carId = '') => {
    setSelectedCarId(carId ? String(carId) : (showroomData?.cars?.[0]?.id ? String(showroomData.cars[0].id) : ''))
    setPaymentMethod('gcash')
    setPaymentReference('')
    setSellerNotes('')
    setSlotModalOpen(true)
  }

  const handleApplySlot = async (e) => {
    e.preventDefault()
    if (!selectedCarId) {
      alert('Please select a vehicle listing.')
      return
    }
    setSlotSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      const res = await showroomApi.applySlot({
        car_id: parseInt(selectedCarId, 10),
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        seller_notes: sellerNotes,
      })
      setNotice(res.message || 'Showroom parking application submitted successfully!')
      setSlotModalOpen(false)
      await load()
    } catch (err) {
      setError(extractError(err, 'Failed to submit showroom application.'))
    } finally {
      setSlotSubmitting(false)
    }
  }

  const selectedCarObj = showroomData?.cars?.find((c) => String(c.id) === String(selectedCarId))
  const selectedCarFee = selectedCarObj?.calculated_fee || (selectedCarObj?.price ? selectedCarObj.price * 0.05 : 0)

  if (!loading && !isSeller) {
    return (
      <div className="my-listings-page">
        <div className="my-listings-container">
          <div className="my-listings-card my-listings-card--center">
            <Store size={36} className="my-listings-accent" />
            <h1>Seller dashboard</h1>
            <p className="muted">
              {isAuthenticated
                ? 'Your buyer account needs a seller upgrade before you can manage listings.'
                : 'Sign in with your buyer account, then apply for a seller upgrade.'}
            </p>
            <Link to="/become-seller" className="btn btn-primary">Become a Seller</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="my-listings-page">
      <div className="my-listings-container">
        <div className="my-listings-head">
          <div>
            <h1><LayoutDashboard size={22} /> My Listings</h1>
            <p className="muted">Track every listing across draft, inspection, live, and sold — cars and parts in one place.</p>
          </div>
          <div className="my-listings-head-actions">
            <button type="button" className="btn btn-ghost" onClick={load} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
            <Link to="/sell" className="btn btn-primary">+ New Listing</Link>
          </div>
        </div>

        {error && <div className="my-listings-alert my-listings-alert--error"><ShieldAlert size={15} /> {error}</div>}
        {notice && <div className="my-listings-alert my-listings-alert--success"><BadgeCheck size={15} /> {notice}</div>}

        <div className="my-listings-stats">
          {stats.map((s) => (
            <div key={s.label} className={`my-listings-stat ${s.className}`}>
              <span className="my-listings-stat-value">{s.value}</span>
              <span className="my-listings-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="my-listings-tabs">
          <button type="button" className={tab === 'cars' ? 'my-listings-tab my-listings-tab--active' : 'my-listings-tab'} onClick={() => { switchTab('cars'); setStatusFilter('all') }}>
            <Car size={15} /> Vehicles {(summary?.cars?.total ?? 0) > 0 && <span className="my-listings-count">{summary.cars.total}</span>}
          </button>
          {canSellParts && (
          <button type="button" className={tab === 'parts' ? 'my-listings-tab my-listings-tab--active' : 'my-listings-tab'} onClick={() => { switchTab('parts'); setStatusFilter('all') }}>
            <Package size={15} /> Parts {(summary?.parts?.total ?? 0) > 0 && <span className="my-listings-count">{summary.parts.total}</span>}
          </button>
          )}
          <button type="button" className={tab === 'requests' ? 'my-listings-tab my-listings-tab--active' : 'my-listings-tab'} onClick={() => switchTab('requests')}>
            <Inbox size={15} /> Requests {pendingRequests > 0 && <span className="my-listings-count">{pendingRequests}</span>}
          </button>
          <button type="button" className={tab === 'showroom' ? 'my-listings-tab my-listings-tab--active' : 'my-listings-tab'} onClick={() => switchTab('showroom')}>
            <Building2 size={15} /> Showroom & Parking
            {showroomData?.is_showroom_active && (
              <span className="my-listings-count" style={{ background: '#10b981', color: '#fff' }}>Active</span>
            )}
          </button>
        </div>

        {tab === 'showroom' ? (
          <div>
            {/* Showroom Status Banner */}
            <div
              className="my-listings-card"
              style={{
                marginBottom: 20,
                borderLeft: showroomData?.is_showroom_active ? '4px solid #10b981' : '4px solid var(--color-rust)',
                background: showroomData?.is_showroom_active ? 'rgba(16, 185, 129, 0.05)' : 'rgba(146, 68, 36, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Building2 size={20} color={showroomData?.is_showroom_active ? '#10b981' : 'var(--color-rust)'} />
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                      {showroomData?.is_showroom_active ? 'Showroom Access: ACTIVE' : 'Showroom Access: NOT ACTIVATED'}
                    </h2>
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-muted)', maxWidth: 640 }}>
                    {showroomData?.is_showroom_active
                      ? `Your garage showroom is verified and open to all marketplace buyers. You currently have ${showroomData.cars?.filter(c => c.is_in_showroom).length || 0} vehicle build(s) displayed on the showroom floor.`
                      : `By default, sellers do not have showroom access until activated. Avail a Showroom Parking slot for your marketplace car below. Our standard parking fee is ${showroomData?.fee_config?.parking_fee_percentage ?? 5}% of the listing price. Once approved by admin, your showroom will be activated!`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {showroomData?.is_showroom_active && (
                    <Link
                      to={`/showroom?seller=${user.username}`}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <ExternalLink size={14} />
                      <span>View Live Showroom</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleOpenSlotModal()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={14} />
                    <span>Avail Showroom Parking Slot</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cars & Showroom Floor Status */}
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={18} />
              <span>Your Vehicle Builds & Showroom Status</span>
            </h3>

            {loading ? (
              <div className="my-listings-card"><p className="muted">Loading showroom vehicles...</p></div>
            ) : !showroomData?.cars || showroomData.cars.length === 0 ? (
              <div className="my-listings-card my-listings-card--center">
                <Car size={32} className="my-listings-accent" />
                <h2>No active vehicle builds found</h2>
                <p className="muted">Create an active car listing on the marketplace first to avail showroom parking.</p>
                <Link to="/sell" className="btn btn-primary">+ New Car Listing</Link>
              </div>
            ) : (
              <ul className="my-listings-list" style={{ marginBottom: 32 }}>
                {showroomData.cars.map((car) => {
                  return (
                    <li key={car.id} className="my-listings-row">
                      <div className="my-listings-row-main">
                        <span className="my-listings-title">{car.title}</span>
                        <div className="my-listings-meta">
                          <span className="my-listings-price">{formatPrice(car.price)}</span>
                          <span
                            className={`listing-badge ${
                              car.is_in_showroom
                                ? 'listing-badge--live'
                                : car.showroom_status === 'pending'
                                ? 'listing-badge--pending'
                                : 'listing-badge--draft'
                            }`}
                          >
                            {car.is_in_showroom
                              ? '✓ ON SHOWROOM FLOOR'
                              : car.showroom_status === 'pending'
                              ? '⌛ PARKING FEE PENDING'
                              : 'NOT IN SHOWROOM'}
                          </span>
                          <span className="muted">
                            Showroom Fee ({car.fee_percentage}%): <strong>{formatPrice(car.calculated_fee)}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="my-listings-row-actions">
                        <Link to={`/marketplace/${car.uuid || car.id}`} className="btn btn-ghost btn-sm" title="View Listing">
                          <Eye size={14} />
                        </Link>
                        {!car.is_in_showroom && car.showroom_status !== 'pending' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenSlotModal(car.id)}
                            style={{ fontSize: 12.5 }}
                          >
                            <DollarSign size={14} /> Avail Parking Slot ({formatPrice(car.calculated_fee)})
                          </button>
                        )}
                        {car.is_in_showroom && (
                          <Link
                            to={`/showroom?seller=${user.username}`}
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#10b981', fontWeight: 700 }}
                          >
                            Live on Floor →
                          </Link>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Application History */}
            {showroomData?.applications && showroomData.applications.length > 0 && (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={18} />
                  <span>Showroom Slot Application History</span>
                </h3>
                <ul className="my-listings-list">
                  {showroomData.applications.map((app) => (
                    <li key={app.id} className="my-listings-row">
                      <div className="my-listings-row-main">
                        <span className="my-listings-title">
                          #{app.id} · {app.car?.title || `Car #${app.car_id}`}
                        </span>
                        <div className="my-listings-meta">
                          <span className="my-listings-price">{formatPrice(app.calculated_fee)}</span>
                          <span
                            className={`listing-badge ${
                              app.status === 'approved'
                                ? 'listing-badge--live'
                                : app.status === 'pending'
                                ? 'listing-badge--pending'
                                : 'listing-badge--rejected'
                            }`}
                          >
                            {app.status.toUpperCase()}
                          </span>
                          <span className="muted">Method: {app.payment_method?.toUpperCase()}</span>
                          {app.payment_reference && <span className="muted">Ref: {app.payment_reference}</span>}
                        </div>
                      </div>
                      <div className="my-listings-row-actions">
                        <span className="muted" style={{ fontSize: 12 }}>
                          {app.created_at ? new Date(app.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : tab === 'requests' ? (
          <>
            <div className="my-listings-filters">
              {['pending', 'accepted', 'rejected', 'all'].map((s) => (
                <button key={s} type="button" className={requestFilter === s ? 'my-listings-chip my-listings-chip--active' : 'my-listings-chip'} onClick={() => setRequestFilter(s)}>
                  {s === 'all' ? 'All requests' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="my-listings-card"><p className="muted">Loading incoming requests…</p></div>
            ) : requests.length === 0 ? (
              <div className="my-listings-card my-listings-card--center">
                <Inbox size={32} className="my-listings-accent" />
                <h2>No {requestFilter === 'all' ? '' : `"${requestFilter}"`} requests</h2>
                <p className="muted">Buyer sales-order requests for your listings will appear here. Accept exactly one per listing.</p>
              </div>
            ) : (
              <ul className="my-listings-list">
                {requests.map((order) => {
                  const verification = order.verification_status || 'pending'
                  const payStatus = order.financials?.payment_status || 'pending'
                  return (
                    <li key={order.id} className="my-listings-row">
                      <div className="my-listings-row-main">
                        <span className="my-listings-title">{order.item?.name || order.item_name || `Order #${order.id}`}</span>
                        <div className="my-listings-meta">
                          <span className="my-listings-price">{order.financials?.formatted_total || ''}</span>
                          <span className={`listing-badge ${verification === 'accepted' ? 'listing-badge--live' : verification === 'rejected' ? 'listing-badge--rejected' : 'listing-badge--pending'}`}>
                            {order.verification_label || verification}
                          </span>
                          <span className="muted">{order.status ? `Order: ${order.status}` : ''}</span>
                          <span className="muted">{order.buyer?.name || order.buyer_name || ''}</span>
                          {order.vehicle?.chassis_number && <span className="muted">Chassis: {order.vehicle.chassis_number}</span>}
                        </div>
                        {verification === 'accepted' && (
                          <div className="my-listings-meta" style={{ marginTop: 4 }}>
                            <span className="muted">
                              Payment: {(order.financials?.payment_method || '').replace('_', ' ') || '—'}
                              {' · '}{order.financials?.payment_label || payStatus}
                            </span>
                            {order.financials?.payment_reference && (
                              <span className="muted" style={{ fontFamily: 'monospace' }}>Ref: {order.financials.payment_reference}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="my-listings-row-actions">
                        <Link to={`/sales-order/${order.order_number || order.id}`} className="btn btn-ghost btn-sm" title="View sales order"><Eye size={14} /></Link>
                        {verification === 'accepted' && !['completed', 'refunded', 'cancelled'].includes(order.status) && (
                          <select
                            className="btn btn-secondary btn-sm"
                            value={order.status || 'processing'}
                            disabled={actingId === `status-${order.id}`}
                            onChange={(e) => runOrderStatusChange(order, e.target.value)}
                            title="Advance this order (processing → negotiating → sold → shipped → delivered)"
                            style={{ cursor: 'pointer' }}
                          >
                            {SELLER_ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                        )}
                        {verification === 'accepted' && order.status === 'disputed' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={actingId === `refund-${order.id}`}
                            onClick={() => runRefund(order)}
                            title="Resolve the dispute by refunding the payment to the buyer"
                          >
                            Refund Buyer
                          </button>
                        )}
                        {verification === 'accepted' && (order.item?.type || order.item_type) === 'car' && ['shipped', 'delivered'].includes(order.status) && (order.proof?.status || 'none') !== 'approved' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={actingId === `proof-${order.id}`}
                            onClick={() => runSubmitProof(order)}
                            title="Submit handover photos + note — admin approval releases held funds to your wallet"
                          >
                            {order.proof?.status === 'pending' ? 'Resubmit Proof' : order.proof?.status === 'rejected' ? 'Fix & Resubmit Proof' : 'Submit Handover Proof'}
                          </button>
                        )}
                        {(order.proof?.status === 'pending' || order.proof?.status === 'approved') && (
                          <span className="muted" style={{ fontSize: 12 }}>
                            Proof: {order.proof.status}{order.proof.status === 'rejected' && order.proof.rejection_reason ? ` — ${order.proof.rejection_reason}` : ''}
                          </span>
                        )}
                        )}
                        {verification === 'pending' && (
                          <>
                            <button type="button" className="btn btn-secondary btn-sm" disabled={actingId === `accept-${order.id}`} onClick={() => runRequestAction(order, 'accept')} title="Verify & accept this buyer">
                              <Check size={14} /> Accept
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm btn-danger-ghost" disabled={actingId === `reject-${order.id}`} onClick={() => runRequestAction(order, 'reject')} title="Decline this request">
                              <X size={14} /> Decline
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        ) : (
        <>
        <div className="my-listings-filters">
          <button type="button" className={statusFilter === 'all' ? 'my-listings-chip my-listings-chip--active' : 'my-listings-chip'} onClick={() => setStatusFilter('all')}>
            All statuses
          </button>
          {statuses.map((s) => (
            <button key={s} type="button" className={statusFilter === s ? 'my-listings-chip my-listings-chip--active' : 'my-listings-chip'} onClick={() => setStatusFilter(s)}>
              {STATUS_LABELS[s] || s}
              <span className="my-listings-count">{summary?.[tab]?.[s] ?? 0}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="my-listings-card"><p className="muted">Loading your listings…</p></div>
        ) : items.length === 0 ? (
          <div className="my-listings-card my-listings-card--center">
            <Eye size={32} className="my-listings-accent" />
            <h2>No {statusFilter === 'all' ? '' : `"${STATUS_LABELS[statusFilter] || statusFilter}"`} {tab} listings yet</h2>
            <p className="muted">{statusFilter === 'all' ? 'Create your first listing to appear here.' : 'Try a different status filter.'}</p>
            {statusFilter === 'all' && <Link to="/sell" className="btn btn-primary">+ New Listing</Link>}
          </div>
        ) : (
          <ul className="my-listings-list">
            {items.map((item) => {
              const status = item.status || 'draft'
              return (
                <li key={item.id} className="my-listings-row">
                  <div className="my-listings-row-main">
                    <Link to={detailPath(item)} className="my-listings-title">{item.title || `Listing #${item.id}`}</Link>
                    <div className="my-listings-meta">
                      <span className="my-listings-price">{formatPrice(item.price)}</span>
                      <span className={`listing-badge ${STATUS_CLASS[status] || ''}`}>{STATUS_LABELS[status] || status}</span>
                      {item.city && <span className="muted">{item.city}</span>}
                    </div>
                  </div>
                  <div className="my-listings-row-actions">
                    <Link to={detailPath(item)} className="btn btn-ghost btn-sm" title="View listing"><Eye size={14} /></Link>
                    {tab === 'cars' && ['draft', 'archived', 'rejected'].includes(status) && (
                      <>
                        <select
                          className="btn btn-secondary btn-sm"
                          defaultValue="garage_dropoff"
                          id={`inspect-type-${item.id}`}
                          title="Inspection method: garage drop-off or mobile on-site visit"
                          style={{ cursor: 'pointer' }}
                        >
                          <option value="garage_dropoff">Drop-off</option>
                          <option value="onsite_visit">On-Site</option>
                        </select>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={actingId === `inspect-${item.id}`}
                          onClick={() => {
                            const sel = document.getElementById(`inspect-type-${item.id}`)
                            runSubmitInspection(item.id, sel?.value || 'garage_dropoff')
                          }}
                          title="Submit for mandatory inspection — goes live only after approval"
                        >
                          <ShieldCheck size={14} /> {actingId === `inspect-${item.id}` ? 'Submitting…' : 'Submit for Inspection'}
                        </button>
                      </>
                    )}
                    {tab === 'cars' && ['pending_inspection', 'inspected'].includes(status) && (
                      <span className="muted" style={{ fontSize: 12 }} title="With the inspectors — you will be notified of the result">
                        In inspection queue
                      </span>
                    )}
                    <ListingStatusPicker
                      listingType={tab === 'cars' ? 'car' : 'part'}
                      listingId={item.id}
                      value={normalizeListingStatus(status)}
                      onChanged={() => load()}
                      onError={(err) => setError(extractError(err, 'Failed to update listing status.'))}
                      className="btn btn-secondary btn-sm"
                      style={{ cursor: 'pointer' }}
                    />
                    <button type="button" className="btn btn-ghost btn-sm btn-danger-ghost" disabled={actingId === `destroy-${item.id}`} onClick={() => runAction(item.id, 'destroy', 'Listing deleted.', 'Delete this listing permanently?')} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        </>
        )}
      </div>

      {/* Avail Showroom Parking Slot Modal */}
      {slotModalOpen && (
        <div
          className="admin-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setSlotModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative',
              color: 'var(--color-heading)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="var(--color-rust)" />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Avail Showroom Parking Slot</h3>
              </div>
              <button
                type="button"
                onClick={() => setSlotModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleApplySlot}>
              {/* Select Car */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Choose Vehicle Build to Place in Showroom:
                </label>
                <select
                  className="admin-input"
                  value={selectedCarId}
                  onChange={(e) => setSelectedCarId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 14 }}
                  required
                >
                  <option value="">-- Select a Car Listing --</option>
                  {showroomData?.cars
                    ?.filter((c) => !c.is_in_showroom)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} — {formatPrice(c.price)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Fee Breakdown Box */}
              {selectedCarObj && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: 'var(--color-surface-subtle)',
                    border: '1.5px solid var(--color-border)',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    Showroom Parking Fee Calculation
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}>
                    <span>Vehicle Listing Price:</span>
                    <strong>{formatPrice(selectedCarObj.price)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                    <span>Standard Parking Fee ({showroomData?.fee_config?.parking_fee_percentage ?? 5}%):</span>
                    <strong style={{ color: 'var(--color-rust)', fontSize: 15 }}>{formatPrice(selectedCarFee)}</strong>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', borderTop: '1px dashed var(--color-border)', paddingTop: 6 }}>
                    Once payment is confirmed and admin approves, your showroom profile will activate and this car will be showcased on the Showroom floor!
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Payment Method:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 14 }}
                >
                  <option value="gcash">GCash (QR / Mobile Transfer)</option>
                  <option value="bank_transfer">BDO / BPI Bank Transfer</option>
                  <option value="maya">Maya Digital Wallet</option>
                  <option value="cash_dropoff">Cash on Garage Drop-off</option>
                </select>
              </div>

              {/* Reference Code */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Transaction Reference Code / Note:
                </label>
                <input
                  type="text"
                  placeholder="e.g. GCASH Ref #123456789 or Bank Deposit Ref"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 14 }}
                />
              </div>

              {/* Optional Seller Notes */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Special Garage / Bay Request Note (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Preferred Bay, Track Spec Specs to Highlight"
                  value={sellerNotes}
                  onChange={(e) => setSellerNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSlotModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={slotSubmitting || !selectedCarId}
                  className="btn btn-primary"
                >
                  {slotSubmitting ? 'Submitting Application...' : `Pay ${formatPrice(selectedCarFee)} & Avail Slot`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
