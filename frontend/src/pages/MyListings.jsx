import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { sellerCars } from '../api/cars.js'
import { sellerParts } from '../api/parts.js'
import { sellerApi, sellerOrdersApi, CAR_STATUSES, PART_STATUSES, STATUS_LABELS } from '../api/seller.js'
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
  const [tab, setTab] = useState('cars') // cars | parts | requests
  const [statusFilter, setStatusFilter] = useState('all')
  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [requests, setRequests] = useState([])
  const [pendingRequests, setPendingRequests] = useState(0)
  const [requestFilter, setRequestFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const isSeller = isAuthenticated && user && SELLER_ROLES.includes(user.role)
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
      if (tab === 'requests') {
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

  const canPublish = (status) =>
    tab === 'cars'
      ? ['draft', 'archived', 'rejected', 'pending_inspection'].includes(status)
      : ['draft', 'archived'].includes(status)

  const detailPath = (item) =>
    tab === 'cars'
      ? `/marketplace/${item.uuid || item.id}`
      : `/parts/${item.uuid || item.id}`

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
          <button type="button" className={tab === 'cars' ? 'my-listings-tab my-listings-tab--active' : 'my-listings-tab'} onClick={() => { setTab('cars'); setStatusFilter('all') }}>
            <Car size={15} /> Vehicles {(summary?.cars?.total ?? 0) > 0 && <span className="my-listings-count">{summary.cars.total}</span>}
          </button>
          <button type="button" className={tab === 'parts' ? 'my-listings-tab my-listings-tab--active' : 'my-listings-tab'} onClick={() => { setTab('parts'); setStatusFilter('all') }}>
            <Package size={15} /> Parts {(summary?.parts?.total ?? 0) > 0 && <span className="my-listings-count">{summary.parts.total}</span>}
          </button>
          <button type="button" className={tab === 'requests' ? 'my-listings-tab my-listings-tab--active' : 'my-listings-tab'} onClick={() => setTab('requests')}>
            <Inbox size={15} /> Requests {pendingRequests > 0 && <span className="my-listings-count">{pendingRequests}</span>}
          </button>
        </div>

        {tab === 'requests' ? (
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
                  return (
                    <li key={order.id} className="my-listings-row">
                      <div className="my-listings-row-main">
                        <span className="my-listings-title">{order.item?.name || order.item_name || `Order #${order.id}`}</span>
                        <div className="my-listings-meta">
                          <span className="my-listings-price">{order.financials?.formatted_total || ''}</span>
                          <span className={`listing-badge ${verification === 'accepted' ? 'listing-badge--live' : verification === 'rejected' ? 'listing-badge--rejected' : 'listing-badge--pending'}`}>
                            {order.verification_label || verification}
                          </span>
                          <span className="muted">{order.buyer?.name || order.buyer_name || ''}</span>
                          {order.vehicle?.chassis_number && <span className="muted">Chassis: {order.vehicle.chassis_number}</span>}
                        </div>
                      </div>
                      <div className="my-listings-row-actions">
                        <Link to={`/sales-order/${order.order_number || order.id}`} className="btn btn-ghost btn-sm" title="View sales order"><Eye size={14} /></Link>
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
                    {canPublish(status) && (
                      <button type="button" className="btn btn-secondary btn-sm" disabled={actingId === `publish-${item.id}`} onClick={() => runAction(item.id, 'publish', 'Listing published to the marketplace.')} title="Publish">
                        <Rocket size={14} /> Publish
                      </button>
                    )}
                    {status === 'active' && (
                      <>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={actingId === `unpublish-${item.id}`} onClick={() => runAction(item.id, 'unpublish', 'Listing unpublished back to draft.')} title="Unpublish">
                          <PauseCircle size={14} /> Unpublish
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={actingId === `markSold-${item.id}`} onClick={() => runAction(item.id, 'markSold', 'Listing marked as sold.')} title="Mark sold">
                          <BadgeCheck size={14} /> Sold
                        </button>
                      </>
                    )}
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
    </div>
  )
}
