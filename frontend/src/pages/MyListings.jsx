import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Car,
  Package,
  Eye,
  BadgeCheck,
  Store,
  ShieldAlert,
  RefreshCw,
  Inbox,
  Building2,
  DollarSign,
  ExternalLink,
  Plus,
  Search,
  Clock,
  FileText,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { sellerCars } from '../api/cars.js'
import { sellerParts } from '../api/parts.js'
import { sellerApi, sellerOrdersApi, CAR_STATUSES, PART_STATUSES, STATUS_LABELS } from '../api/seller.js'
import { useOrderStatusListener } from '../realtime/useOrderStatus.js'
import { showroomApi } from '../api/showroom.js'
import ListingCard from '../components/ListingCard.jsx'
import ListingDetail from '../components/ListingDetail.jsx'
import SellerOrderCard from '../components/orders/SellerOrderCard.jsx'
import SellerOrderDetail from '../components/orders/SellerOrderDetail.jsx'
import './MyListings.css'

const SELLER_ROLES = ['seller', 'dealer', 'parts_seller', 'admin', 'super_admin']

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [selectedListing, setSelectedListing] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest') // newest | price-asc | price-desc | orders

  const switchTab = (next) => {
    setTab(next)
    setSelectedListing(null)
    setSelectedRequest(null)
    setSearchParams(next === 'cars' ? {} : { tab: next })
  }

  // URL-managed details — shareable, refresh-safe, back-button friendly:
  // /my-listings?tab=cars&listing=12 · /my-listings?tab=requests&order=SO-…
  const paramListing = searchParams.get('listing')
  const paramOrder = searchParams.get('order')

  const openListing = (item) => {
    setSelectedListing(item)
    setSelectedRequest(null)
    setSearchParams(tab === 'cars' ? { listing: String(item.id) } : { tab, listing: String(item.id) })
  }

  const closeListing = () => {
    setSelectedListing(null)
    setSearchParams(tab === 'cars' ? {} : { tab })
  }

  const openRequest = (order) => {
    setSelectedRequest(order)
    setSelectedListing(null)
    setSearchParams({ tab: 'requests', order: String(order.order_number || order.id) })
  }

  const closeRequest = () => {
    setSelectedRequest(null)
    setSearchParams({ tab: 'requests' })
    load()
  }

  const activeListing = selectedListing || (paramListing && tab !== 'requests' && tab !== 'showroom'
    ? { id: paramListing }
    : null)
  const activeRequest = selectedRequest || (tab === 'requests' && paramOrder
    ? { id: paramOrder, order_number: paramOrder }
    : null)

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
      { label: 'Live on Marketplace', value: live, className: 'stat--live', icon: Eye },
      { label: 'Pending Review', value: summary.pending_moderation || 0, className: 'stat--pending', icon: Clock },
      { label: 'Requests to Review', value: pendingRequests, className: 'stat--action', icon: Inbox, action: () => switchTab('requests') },
      { label: 'Drafts', value: drafts, className: 'stat--draft', icon: FileText },
      { label: 'Sold', value: sold, className: 'stat--sold', icon: BadgeCheck },
    ]
  }, [summary, pendingRequests])

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = (q ? items.filter((it) => String(it.title || '').toLowerCase().includes(q)) : [...items])
    switch (sort) {
      case 'price-asc':
        return rows.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
      case 'price-desc':
        return rows.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
      case 'orders':
        return rows.sort((a, b) => Number(b.orders_count || 0) - Number(a.orders_count || 0))
      default:
        return rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || Number(b.id || 0) - Number(a.id || 0))
    }
  }, [items, query, sort])

  // Listing + order mutations now live in ListingDetail / SellerOrderCard —
  // this page only reloads lists and surfaces their notices via refresh.

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

  if (activeRequest) {
    return (
      <div className="my-listings-page">
        <div className="my-listings-container">
          <SellerOrderDetail
            orderId={activeRequest.id}
            orderNumber={activeRequest.order_number}
            onBack={closeRequest}
          />
        </div>
      </div>
    )
  }

  if (activeListing) {
    return (
      <div className="my-listings-page">
        <div className="my-listings-container">
          <ListingDetail
            listing={activeListing}
            type={tab === 'cars' ? 'car' : 'part'}
            onBack={closeListing}
            onAction={load}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="my-listings-page">
      <div className="my-listings-container">
        <div className="my-listings-hero">
          <div className="my-listings-hero-id">
            <span className="my-listings-avatar">{String(user?.username || user?.name || 'S').charAt(0).toUpperCase()}</span>
            <div>
              <div className="my-listings-eyebrow">Seller Studio</div>
              <h1>{user?.username || user?.name || 'My Listings'}</h1>
              <p className="muted">Drafts, inspections, live units, sales requests and showroom — run the whole shop from here.</p>
            </div>
          </div>
          <div className="my-listings-head-actions">
            <button type="button" className="btn btn-ghost" onClick={load} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
            <Link to="/sell" className="btn btn-primary"><Plus size={15} /> New Listing</Link>
          </div>
        </div>

        {error && <div className="my-listings-alert my-listings-alert--error"><ShieldAlert size={15} /> {error}</div>}
        {notice && <div className="my-listings-alert my-listings-alert--success"><BadgeCheck size={15} /> {notice}</div>}

        <div className="my-listings-stats">
          {stats.map((s) => {
            const Icon = s.icon
            const clickable = typeof s.action === 'function'
            return (
              <div
                key={s.label}
                className={`my-listings-stat ${s.className}${clickable ? ' my-listings-stat--clickable' : ''}`}
                onClick={clickable ? s.action : undefined}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.action() } } : undefined}
                title={clickable ? 'Jump to buyer requests' : undefined}
              >
                <span className="my-listings-stat-top">
                  {Icon && <Icon size={16} className="my-listings-stat-icon" />}
                  <span className="my-listings-stat-value">{s.value}</span>
                </span>
                <span className="my-listings-stat-label">{s.label}</span>
              </div>
            )
          })}
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
              <div className="showroom-grid" style={{ marginBottom: 32 }}>
                {showroomData.cars.map((car) => {
                  const img = car.primary_image_url || car.image_urls?.[0] || null
                  const onFloor = car.is_in_showroom
                  const pending = car.showroom_status === 'pending'
                  return (
                    <div key={car.id} className={`showroom-card${onFloor ? ' showroom-card--live' : ''}`}>
                      <div className="showroom-card-media">
                        {img ? (
                          <img src={img} alt={car.title} loading="lazy" />
                        ) : (
                          <div className="showroom-card-fallback"><Car size={30} /></div>
                        )}
                        <span className={`listing-badge ${onFloor ? 'listing-badge--live' : pending ? 'listing-badge--pending' : 'listing-badge--draft'}`}>
                          {onFloor ? '✓ ON SHOWROOM FLOOR' : pending ? '⌛ FEE PENDING' : 'NOT IN SHOWROOM'}
                        </span>
                      </div>
                      <div className="showroom-card-body">
                        <h3 className="showroom-card-title">{car.title}</h3>
                        <div className="showroom-card-price">{formatPrice(car.price)}</div>
                        <div className="showroom-card-fee muted">
                          Parking fee ({car.fee_percentage}%): <strong>{formatPrice(car.calculated_fee)}</strong>
                        </div>
                      </div>
                      <div className="showroom-card-actions">
                        <Link to={`/marketplace/${car.uuid || car.id}`} className="btn btn-ghost btn-sm" title="View Listing">
                          <Eye size={14} /> View
                        </Link>
                        {!onFloor && !pending && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenSlotModal(car.id)}
                          >
                            <DollarSign size={14} /> Park it · {formatPrice(car.calculated_fee)}
                          </button>
                        )}
                        {onFloor && (
                          <Link
                            to={`/showroom?seller=${user.username}`}
                            className="btn btn-secondary btn-sm"
                          >
                            Live on Floor →
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Application History */}
            {showroomData?.applications && showroomData.applications.length > 0 && (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={18} />
                  <span>Showroom Slot Application History</span>
                </h3>
                <div className="slot-history">
                  {showroomData.applications.map((app) => (
                    <div key={app.id} className="slot-history-card">
                      <div>
                        <div className="slot-history-title">
                          #{app.id} · {app.car?.title || `Car #${app.car_id}`}
                        </div>
                        <div className="slot-history-meta muted">
                          {formatPrice(app.calculated_fee)} · {app.payment_method?.toUpperCase()}
                          {app.payment_reference ? ` · Ref: ${app.payment_reference}` : ''}
                          {app.created_at ? ` · ${new Date(app.created_at).toLocaleDateString()}` : ''}
                        </div>
                      </div>
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
                    </div>
                  ))}
                </div>
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
                <p className="muted">Buyer sales-order requests for your listings will appear here. Accept exactly one per listing — click a card to expand its full receipt, timeline, and funds status.</p>
              </div>
            ) : (
              <div className="orders-list">
                <div className="my-listings-resultline muted" style={{ marginBottom: 4 }}>
                  {requests.length} request{requests.length === 1 ? '' : 's'} · Manage opens the full order view
                </div>
                {requests.map((order) => (
                  <SellerOrderCard key={order.id} order={order} onChanged={load} showListing onOpen={openRequest} />
                ))}
              </div>
            )}
          </>
        ) : (
        <>
        <div className="my-listings-toolbar">
          <div className="my-listings-search">
            <Search size={15} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search your ${tab === 'cars' ? 'vehicles' : 'parts'}…`}
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="my-listings-sort" title="Sort listings">
            <option value="newest">Newest first</option>
            <option value="orders">Most orders</option>
            <option value="price-desc">Price: high → low</option>
            <option value="price-asc">Price: low → high</option>
          </select>
        </div>
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
        ) : visibleItems.length === 0 ? (
          <div className="my-listings-card my-listings-card--center">
            <Search size={28} className="my-listings-accent" />
            <h2>No matches for “{query}”</h2>
            <p className="muted">Try a different search or clear the status filter.</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setQuery(''); setStatusFilter('all') }}>Clear search</button>
          </div>
        ) : (
          <>
            <div className="my-listings-resultline muted">
              {visibleItems.length} of {items.length} {tab === 'cars' ? 'vehicle' : 'part'}{items.length === 1 ? '' : 's'} · click a card to manage its sales
            </div>
            <div className="listings-grid">
              {visibleItems.map((item) => (
                <ListingCard
                  key={item.id}
                  item={item}
                  type={tab === 'cars' ? 'car' : 'part'}
                  orderCount={item.orders_count || 0}
                  onClick={() => openListing(item)}
                />
              ))}
            </div>
          </>
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
