import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import notificationsApi from '../api/notifications.js'
import { TimeAgo } from '../utils/timeAgo.jsx'

const TYPE_COLOR = {
  order: '#fb923c',
  payment: '#eab308',
  chat: '#60a5fa',
  payout: '#10b981',
  kyc: '#a78bfa',
  listing: '#f472b6',
  dispute: '#ef4444',
  broadcast: '#38bdf8',
  system: '#94a3b8',
  info: '#94a3b8',
}

const FILTERS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['order', 'Orders'],
  ['chat', 'Chat'],
  ['payout', 'Payouts'],
  ['system', 'System'],
]

export default function Notifications() {
  const { isAuthenticated } = useAuth()
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

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
        <Bell size={40} style={{ color: '#64748b' }} />
        <h2 style={{ color: '#f8fafc' }}>Notifications</h2>
        <p style={{ color: '#94a3b8' }}>Log in to see your order updates, chat mentions, payouts, and announcements.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>Notifications</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Orders, payments, chat, payouts, and platform announcements.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleMarkAll}>
            <CheckCheck size={14} /> Mark all read
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            style={{ fontSize: 12, fontWeight: 700, padding: '7px 13px', borderRadius: 999, cursor: 'pointer', border: '1px solid #2d3748', background: filter === id ? '#1e293b' : 'transparent', color: filter === id ? '#f8fafc' : '#64748b' }}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClearRead}
          style={{ fontSize: 12, fontWeight: 700, padding: '7px 13px', borderRadius: 999, cursor: 'pointer', border: '1px solid transparent', background: 'transparent', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
        >
          <Trash2 size={12} /> Clear read
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#161922', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
        {loading && items.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 13, padding: 24, textAlign: 'center' }}>Loading notifications…</p>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            <Bell size={30} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div>Nothing here yet.</div>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid #1e293b', background: n.read_at ? 'transparent' : 'rgba(216, 98, 44, 0.05)' }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: TYPE_COLOR[n.type] || '#94a3b8' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14, color: '#f8fafc' }}>{n.title}</strong>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: TYPE_COLOR[n.type] || '#94a3b8' }}>{n.type}</span>
                </div>
                {n.body && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2, lineHeight: 1.5 }}>{n.body}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}><TimeAgo value={n.created_at} /></span>
                  {n.link && (
                    <Link
                      to={n.link}
                      onClick={() => handleOpen(n)}
                      style={{ fontSize: 12, fontWeight: 700, color: '#fb923c', textDecoration: 'none' }}
                    >
                      Open →
                    </Link>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                {!n.read_at && (
                  <button
                    type="button"
                    onClick={() => handleOpen(n)}
                    title="Mark as read"
                    style={{ background: 'none', border: '1px solid #2d3748', borderRadius: 6, color: '#60a5fa', fontSize: 11, fontWeight: 700, padding: '4px 8px', cursor: 'pointer' }}
                  >
                    Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(n.id)}
                  title="Remove"
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {meta && meta.total > items.length && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>Showing {items.length} of {meta.total}</div>
      )}
    </div>
  )
}
