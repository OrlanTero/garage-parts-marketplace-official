import { Fragment, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  HandCoins,
  Megaphone,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'closed', label: 'Closed' },
]

function statusBadge(ad) {
  if (ad.status === 'fulfilled') return <span className="badge badge-success">Fulfilled</span>
  if (ad.status === 'quoted') return <span className="badge badge-info">Quoted · {ad.offers_count ?? 0}</span>
  if (ad.status === 'open') return <span className="badge badge-warning">Open</span>
  return <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{ad.status}</span>
}

/**
 * Wanted ads moderation: board volume, quote activity, spam/abuse removal.
 * Quotes themselves are moderated via chat + reviews tooling; this page
 * governs the request lifecycle.
 */
export default function WantedManagement() {
  const [ads, setAds] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const fetchAds = async (nextPage = page, nextTab = tab, q = search) => {
    setLoading(true)
    try {
      const params = { page: nextPage, per_page: 20 }
      if (nextTab !== 'all') params.status = nextTab
      if (q.trim()) params.q = q.trim()
      const res = await adminApi.getWantedRequests(params)
      setAds(res?.data || [])
      setMeta(res?.meta || null)
    } catch {
      setAds([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAds(1, tab, '')
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const remove = async (ad) => {
    if (!window.confirm(`Remove wanted request "${ad.title}" and all its quotes?`)) return
    setBusyId(ad.id)
    setError('')
    try {
      await adminApi.deleteWantedRequest(ad.id)
      setNotice(`Removed "${ad.title}".`)
      fetchAds()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not remove request.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="admin-page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            Wanted Requests Board
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Rare-part hunts posted by buyers, quoted by sellers. Remove spam or abuse here.
          </p>
        </div>
        <div className="admin-actions-row">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fetchAds()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-success)', background: 'var(--admin-success-bg)', color: 'var(--admin-success)', fontWeight: 600, fontSize: 14 }}>
          {notice}
        </div>
      )}
      {error && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-danger)', background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)', fontWeight: 600, fontSize: 14 }}>
          <AlertCircle size={15} style={{ verticalAlign: -2 }} /> {error}
        </div>
      )}

      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div className="admin-filters">
          <div className="tab-row-scroll">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <form
            className="kyc-search-form"
            style={{ display: 'flex', gap: 8, flex: '1 1 220px', maxWidth: 340, marginLeft: 'auto' }}
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              fetchAds(1, tab, search)
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
              <input
                type="text"
                className="admin-input"
                placeholder="Search codes, titles…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 13 }}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">Search</button>
          </form>
        </div>
      </div>

      <div className="admin-card mod-queue-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ marginBottom: 12 }} />
            <div>Loading wanted board…</div>
          </div>
        ) : ads.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <Megaphone size={32} style={{ marginBottom: 8, opacity: 0.6 }} />
            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: 4 }}>No wanted requests</div>
            <p style={{ margin: 0, fontSize: 13 }}>Nothing in this state right now.</p>
          </div>
        ) : (
          <div className="table-container mod-queue-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Requester</th>
                  <th>Budget</th>
                  <th>Quotes</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <Fragment key={ad.id}>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 700, maxWidth: 320 }}>{ad.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                          {[ad.engine_code, ad.part_number].filter(Boolean).join(' · ') || ad.category || '—'}
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>@{ad.user?.username || ad.user?.name || '—'}</td>
                      <td style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {ad.budget_max != null
                          ? `≤ ₱${Number(ad.budget_max).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
                          : ad.budget_min != null
                            ? `≥ ₱${Number(ad.budget_min).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
                            : 'Open'}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}>
                          <HandCoins size={13} /> {ad.offers_count ?? 0}
                        </span>
                      </td>
                      <td>{statusBadge(ad)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setExpandedId(expandedId === ad.id ? null : ad.id)}
                            title="Preview specs"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={busyId === ad.id}
                            onClick={() => remove(ad)}
                            title="Remove request and quotes"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === ad.id && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--admin-bg-subtle)', fontSize: 13 }}>
                          {ad.specs || 'No extra specs.'}
                          <span style={{ color: 'var(--admin-text-muted)' }}>
                            {' '}· {ad.city || 'Nationwide'} · {ad.condition || 'any condition'}
                            {ad.contact_phone ? ` · ${ad.contact_phone}` : ''}
                          </span>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => { setPage(page - 1); fetchAds(page - 1) }}>
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>Page {meta.current_page} of {meta.last_page}</span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page >= meta.last_page} onClick={() => { setPage(page + 1); fetchAds(page + 1) }}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
