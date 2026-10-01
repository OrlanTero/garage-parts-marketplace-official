import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Megaphone, Plus, Search } from 'lucide-react'
import { wantedApi } from '../api/wanted.js'
import { useAuth } from '../auth/AuthContext.jsx'
import './Wanted.css'

const STATUS_TABS = [
  { id: 'open', label: 'Open requests' },
  { id: 'quoted', label: 'With quotes' },
  { id: 'mine', label: 'My requests' },
]

function budgetLabel(ad) {
  const lo = ad.budget_min != null ? Number(ad.budget_min) : null
  const hi = ad.budget_max != null ? Number(ad.budget_max) : null
  const fmt = (v) => '₱' + Number(v).toLocaleString('en-PH', { maximumFractionDigits: 0 })
  if (lo != null && hi != null) return `${fmt(lo)} – ${fmt(hi)}`
  if (hi != null) return `Up to ${fmt(hi)}`
  if (lo != null) return `From ${fmt(lo)}`
  return 'Budget open'
}

function statusPill(ad) {
  if (ad.status === 'fulfilled') return <span className="wanted-pill wanted-pill--ok">Fulfilled</span>
  if (ad.status === 'quoted' || (ad.offers_count ?? 0) > 0) {
    return <span className="wanted-pill wanted-pill--accent">{ad.offers_count ?? 0} quote{(ad.offers_count ?? 0) === 1 ? '' : 's'}</span>
  }
  return <span className="wanted-pill">Open</span>
}

/**
 * Wanted board: browse rare-part requests, post your own, track quotes.
 * Sellers quote from the detail page; requesters accept there too.
 */
export default function Wanted() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const [tab, setTab] = useState('open')
  const [search, setSearch] = useState('')
  const [ads, setAds] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const initialTab = searchParams.get('tab')
  useEffect(() => {
    if (initialTab === 'mine' && isAuthenticated) setTab('mine')
  }, [initialTab, isAuthenticated])

  useEffect(() => {
    let alive = true
    setLoading(true)
    const params = { page, per_page: 12 }
    if (tab === 'mine') {
      if (!isAuthenticated) {
        setAds([])
        setMeta(null)
        setLoading(false)
        return undefined
      }
      params.mine = true
    } else {
      params.status = tab
    }
    if (search.trim()) params.q = search.trim()
    wantedApi
      .list(params)
      .then((res) => {
        if (!alive) return
        setAds(res?.data || [])
        setMeta(res?.meta || null)
      })
      .catch(() => {
        if (!alive) return
        setAds([])
        setMeta(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [tab, page, isAuthenticated])

  const submitSearch = (e) => {
    e.preventDefault()
    setPage(1)
    const q = search.trim()
    setLoading(true)
    wantedApi
      .list({ page: 1, per_page: 12, ...(tab === 'mine' ? { mine: true } : { status: tab }), ...(q ? { q } : {}) })
      .then((res) => {
        setAds(res?.data || [])
        setMeta(res?.meta || null)
      })
      .catch(() => {
        setAds([])
        setMeta(null)
      })
      .finally(() => setLoading(false))
  }

  const visibleTabs = useMemo(
    () => (isAuthenticated ? STATUS_TABS : STATUS_TABS.filter((t) => t.id !== 'mine')),
    [isAuthenticated],
  )

  return (
    <div className="page-container wanted-page">
      <div className="wanted-hero">
        <div>
          <span className="wanted-eyebrow"><Megaphone size={14} /> Wanted board</span>
          <h1 className="wanted-title">Need a rare part? Ask the network.</h1>
          <p className="wanted-lead">
            Post a free wanted ad with your engine code or specs — verified sellers
            and surplus shops reply with quotes.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate(isAuthenticated ? '/wanted/new' : '/login')}>
          <Plus size={15} /> <span>Post wanted request</span>
        </button>
      </div>

      <div className="wanted-toolbar">
        <div className="wanted-tabs" role="tablist">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`wanted-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => {
                setTab(t.id)
                setPage(1)
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <form className="wanted-search" onSubmit={submitSearch}>
          <Search size={15} />
          <input
            type="text"
            placeholder="Search engine codes, titles, specs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search wanted requests"
          />
        </form>
      </div>

      {loading ? (
        <div className="wanted-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-skel" aria-hidden="true">
              <div className="card-skel-body">
                <div className="card-skel-line card-skel-line--full" />
                <div className="card-skel-line card-skel-line--mid" />
                <div className="card-skel-line card-skel-line--short" />
              </div>
            </div>
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="home-empty-state">
          <p className="home-empty-title">
            {tab === 'mine' ? (isAuthenticated ? 'You have no wanted requests yet' : 'Log in to track your requests') : 'No wanted requests here yet'}
          </p>
          <p className="home-empty-sub">
            {tab === 'mine' && !isAuthenticated
              ? 'Sign in to post and follow quotes on your rare-part hunts.'
              : 'Be the first — post what you are hunting for.'}
          </p>
          <div className="home-empty-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(isAuthenticated ? '/wanted/new' : '/login')}>
              <span>Post wanted request</span> <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="wanted-grid">
            {ads.map((ad) => (
              <Link key={ad.id} to={`/wanted/${ad.id}`} className="wanted-card">
                <div className="wanted-card-top">
                  {statusPill(ad)}
                  {ad.category && <span className="wanted-cat">{ad.category}</span>}
                </div>
                <h3 className="wanted-card-title">{ad.title}</h3>
                {(ad.engine_code || ad.part_number) && (
                  <p className="wanted-card-code">
                    {[ad.engine_code, ad.part_number].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="wanted-card-foot">
                  <span className="wanted-budget">{budgetLabel(ad)}</span>
                  <span className="wanted-by">@{ad.user?.username || ad.user?.name || 'member'}</span>
                </div>
              </Link>
            ))}
          </div>
          {meta && meta.last_page > 1 && (
            <div className="wanted-pager">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className="muted">Page {meta.current_page} of {meta.last_page}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
