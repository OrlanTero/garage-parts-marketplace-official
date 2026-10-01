import { Link, useLocation } from 'react-router-dom'
import { Bell, Heart, Home, MessageSquare, Search } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext.jsx'
import './MobileQuickActions.css'

/**
 * Mobile bottom navigation (≤768px): Home, Search, Saved, Messages,
 * Notifications — a proper app-style foot navbar. Badges ride on
 * Saved / Messages / Notifications; the active route highlights.
 */
export default function MobileQuickActions({ onSearch, favoritesCount = 0, unreadCount = 0 }) {
  const location = useLocation()
  const { unreadCount: notifUnread = 0 } = useNotifications()

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  const items = [
    { id: 'home', label: 'Home', icon: Home, to: '/' },
    { id: 'search', label: 'Search', icon: Search, action: 'search' },
    { id: 'favorites', label: 'Saved', icon: Heart, to: '/favorites', badge: favoritesCount },
    { id: 'messages', label: 'Messages', icon: MessageSquare, to: '/messages', badge: unreadCount, badgeClass: 'action-badge--chat' },
    { id: 'notifications', label: 'Alerts', icon: Bell, to: '/notifications', badge: notifUnread },
  ]

  return (
    <nav className="mobile-quick-actions" aria-label="Quick actions">
      {items.map((def) => {
        const Icon = def.icon
        const badge = Number(def.badge || 0)
        const active = def.to ? isActive(def.to) : false
        const content = (
          <>
            <span className="mobile-quick-actions-btn">
              <Icon
                size={20}
                fill={active || (def.id === 'favorites' && badge > 0) ? '#d8622c' : 'none'}
                color={active || (def.id === 'favorites' && badge > 0) ? '#d8622c' : 'currentColor'}
              />
              {badge > 0 && (
                <span className={`action-badge ${def.badgeClass || ''}`}>{badge > 99 ? '99+' : badge}</span>
              )}
            </span>
            <span className="mobile-quick-actions-label">{def.label}</span>
          </>
        )
        const cls = `mobile-quick-actions-item${active ? ' mobile-quick-actions-item--active' : ''}`
        return def.to ? (
          <Link key={def.id} to={def.to} className={cls} aria-label={def.label} aria-current={active ? 'page' : undefined}>
            {content}
          </Link>
        ) : (
          <button
            key={def.id}
            type="button"
            className={cls}
            aria-label={def.label}
            onClick={() => { if (def.action === 'search' && onSearch) onSearch() }}
          >
            {content}
          </button>
        )
      })}
    </nav>
  )
}
