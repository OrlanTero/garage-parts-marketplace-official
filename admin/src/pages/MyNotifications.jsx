import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import notificationsApi from '../api/notifications.js'
import { TimeAgo } from '../utils/timeAgo.jsx'
import { adminNotificationLink } from '../utils/notificationLink.js'

const TYPE_COLOR = {
  order: '#d8622c',
  payment: '#b45309',
  chat: '#1d4ed8',
  payout: '#047857',
  kyc: '#7c3aed',
  listing: '#db2777',
  dispute: '#b91c1c',
  broadcast: '#0284c7',
  system: '#64748b',
  info: '#64748b',
}

const FILTERS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['order', 'Orders'],
  ['payout', 'Payouts'],
  ['listing', 'Listings'],
  ['system', 'System'],
]

export default function MyNotifications() {
  const { status } = useAuth()
  const isAuthenticated = status === 'authenticated'
  const { markRead, markAllRead, refreshUnreadCount } = useNotifications()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { per_page: 25 }
      if (filter === 'unread') params.unread = 1
      else if (filter !== 'all') params.type = filter
      const res = await notificationsApi.list(params)
      setItems(res?.data || [])
      setMeta(res?.meta || null)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { if (isAuthenticated) load() }, [isAuthenticated, load])

  const handleOpen = async (n) => {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
      try {
        await markRead(n.id)
      } catch {
        // optimistic state stands
      }
    }
  }

  const handleRemove = async (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
    try {
      await notificationsApi.remove(id)
      refreshUnreadCount()
    } catch {
      load()
    }
  }

  const handleClearRead = async () => {
    if (!window.confirm('Remove all read notifications?')) return
    try {
      await notificationsApi.clearRead()
      load()
      refreshUnreadCount()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not clear notifications.')
    }
  }

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    await markAllRead()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            My Notifications
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Order moves, cash-out requests, inspection queue, and broadcasts — pushed live over Reverb with polling fallback.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={handleMarkAll} className="admin-btn admin-btn-secondary" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCheck size={14} /> Mark all read
          </button>
          <button type="button" onClick={load} disabled={loading} className="admin-btn admin-btn-secondary" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`tab-btn ${filter === id ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClearRead}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--admin-danger)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <Trash2 size={12} /> Clear read
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--admin-danger-bg)', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && items.length === 0 ? (
          <p style={{ color: 'var(--admin-text-muted)', fontSize: 13, padding: 32, textAlign: 'center' }}>Loading notifications…</p>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
            <Bell size={30} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div>Nothing here yet.</div>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              style={{
                display: 'flex', gap: 12, padding: '14px 18px',
                borderBottom: '1px solid var(--admin-border-subtle)',
                background: n.read_at ? 'transparent' : 'rgba(216, 98, 44, 0.05)',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: TYPE_COLOR[n.type] || '#64748b' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14, color: 'var(--admin-text-primary)' }}>{n.title}</strong>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: TYPE_COLOR[n.type] || '#64748b' }}>{n.type}</span>
                </div>
                {n.body && <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{n.body}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--admin-text-muted)' }}><TimeAgo value={n.created_at} /></span>
                  <Link
                    to={adminNotificationLink(n.link)}
                    onClick={() => handleOpen(n)}
                    style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-rust)', textDecoration: 'none' }}
                  >
                    Open →
                  </Link>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                {!n.read_at && (
                  <button
                    type="button"
                    onClick={() => handleOpen(n)}
                    title="Mark as read"
                    className="admin-btn admin-btn-secondary"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(n.id)}
                  title="Remove"
                  style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', padding: 2 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {meta && meta.total > items.length && (
        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Showing {items.length} of {meta.total}</div>
      )}
    </div>
  )
}
