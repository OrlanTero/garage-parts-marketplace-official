import { Link } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext.jsx'

/**
 * Bottom-right live toasts for realtime `notification.sent` pushes.
 * Clicking one marks it read and follows its deep link.
 */
export default function NotificationToasts() {
  const { toasts, dismissToast, markRead } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 'calc(100vw - 40px)', width: 340 }}>
      {toasts.map((t) => (
        <div
          key={t.toastId}
          style={{
            background: '#161922', border: '1px solid #d8622c', borderRadius: 12, padding: '12px 14px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.55)', display: 'flex', gap: 10, alignItems: 'flex-start',
            animation: 'toastIn 0.25s ease-out',
          }}
        >
          <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(216, 98, 44, 0.15)', color: '#fb923c', flexShrink: 0 }}>
            <Bell size={15} />
          </span>
          <Link
            to={t.link || '/notifications'}
            onClick={() => { markRead(t.id); dismissToast(t.toastId) }}
            style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>{t.title}</div>
            {t.body && (
              <div style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.body}</div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => dismissToast(t.toastId)}
            aria-label="Dismiss notification"
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
