import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext.jsx'
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

export default function NotificationBell() {
  const { unreadCount, items, markRead, markAllRead, fetchNotifications } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    fetchNotifications()
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, fetchNotifications])

  const preview = items.slice(0, 7)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="action-btn topbar-quick"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="action-badge action-badge--chat">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 360, maxWidth: 'calc(100vw - 32px)',
            maxHeight: 440, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            background: '#161922', border: '1px solid #2d3748', borderRadius: 12, zIndex: 1200,
            boxShadow: '0 20px 45px rgba(0,0,0,0.55)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #1e293b' }}>
            <strong style={{ color: '#f8fafc', fontSize: 14 }}>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} title="Mark all as read" style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {preview.length === 0 && (
              <div style={{ padding: 28, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                <Bell size={26} style={{ opacity: 0.5, marginBottom: 8 }} />
                <div>No notifications yet.</div>
              </div>
            )}
            {preview.map((n) => (
              <Link
                key={n.id}
                to={n.link || '/notifications'}
                onClick={() => { if (!n.read_at) markRead(n.id); setOpen(false) }}
                style={{
                  display: 'flex', gap: 10, padding: '11px 14px', textDecoration: 'none',
                  borderBottom: '1px solid #1e293b', background: n.read_at ? 'transparent' : 'rgba(216, 98, 44, 0.06)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: TYPE_COLOR[n.type] || '#94a3b8' }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: n.read_at ? 600 : 800, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.title}
                  </span>
                  {n.body && (
                    <span style={{ display: 'block', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.body}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#64748b' }}><TimeAgo value={n.created_at} /></span>
                </span>
              </Link>
            ))}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            style={{ display: 'block', textAlign: 'center', padding: '10px', fontSize: 13, fontWeight: 700, color: '#fb923c', textDecoration: 'none', borderTop: '1px solid #1e293b' }}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
