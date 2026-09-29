import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext.jsx'
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

export default function NotificationBell() {
  const { unreadCount, items, markRead, markAllRead, fetchNotifications, connection } = useNotifications()
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
        onClick={() => setOpen((v) => !v)}
        title={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''} · realtime ${connection}`}
        aria-label="Notifications"
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '1px solid transparent',
          background: open ? 'var(--admin-bg-subtle)' : 'transparent',
          color: 'var(--admin-text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bell size={18} />
        <span
          title={`Realtime: ${connection}`}
          style={{
            position: 'absolute',
            top: 6,
            right: 7,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connection === 'connected' ? '#10b981' : '#cbd5e1',
            border: '1.5px solid #fff',
          }}
        />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: '#ef4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              padding: '0 4px',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 440,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            border: '1px solid var(--admin-border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-dropdown)',
            zIndex: 60,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--admin-border-subtle)' }}>
            <strong style={{ fontSize: 14, color: 'var(--admin-text-primary)' }}>Notifications</strong>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{ background: 'none', border: 'none', color: 'var(--color-rust)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {preview.length === 0 && (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
                <Bell size={26} style={{ opacity: 0.5, marginBottom: 8 }} />
                <div>No notifications yet.</div>
              </div>
            )}
            {preview.map((n) => (
              <Link
                key={n.id}
                to={adminNotificationLink(n.link)}
                onClick={() => { if (!n.read_at) markRead(n.id); setOpen(false) }}
                style={{
                  display: 'flex', gap: 10, padding: '11px 14px', textDecoration: 'none',
                  borderBottom: '1px solid var(--admin-border-subtle)',
                  background: n.read_at ? 'transparent' : 'rgba(216, 98, 44, 0.06)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: TYPE_COLOR[n.type] || '#64748b' }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: n.read_at ? 600 : 800, color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.title}
                  </span>
                  {n.body && (
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.body}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}><TimeAgo value={n.created_at} /></span>
                </span>
              </Link>
            ))}
          </div>

          <Link
            to="/my-notifications"
            onClick={() => setOpen(false)}
            style={{ display: 'block', textAlign: 'center', padding: '10px', fontSize: 13, fontWeight: 700, color: 'var(--color-rust)', textDecoration: 'none', borderTop: '1px solid var(--admin-border-subtle)' }}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
