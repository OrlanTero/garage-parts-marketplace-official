import { Link } from 'react-router-dom'
import { Heart, MessageSquare, Search } from 'lucide-react'
import './MobileQuickActions.css'

/**
 * Mobile quick-actions bar (≤768px): exactly three buttons —
 * Search, Saved, Messages. The navbar buttons are hidden on mobile
 * and live here instead as a fixed bottom-center pill.
 */
const ACTION_DEFS = [
  { id: 'search', label: 'Search', icon: Search, action: 'search' },
  { id: 'favorites', label: 'Saved', icon: Heart, to: '/favorites', badgeKey: 'favoritesCount' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, to: '/messages', badgeKey: 'unreadCount', badgeClass: 'action-badge--chat' },
]

export default function MobileQuickActions({ onSearch, favoritesCount = 0, unreadCount = 0 }) {
  const counts = { favoritesCount, unreadCount }

  return (
    <nav className="mobile-quick-actions" aria-label="Quick actions">
      {ACTION_DEFS.map((def) => {
        const Icon = def.icon
        const badge = def.badgeKey ? counts[def.badgeKey] || 0 : def.badge || 0
        const content = (
          <>
            <span className="mobile-quick-actions-btn">
              <Icon
                size={20}
                fill={def.id === 'favorites' && badge > 0 ? '#d8622c' : 'none'}
                color={def.id === 'favorites' && badge > 0 ? '#d8622c' : 'currentColor'}
              />
              {badge > 0 && (
                <span className={`action-badge ${def.badgeClass || ''}`}>{badge > 99 ? '99+' : badge}</span>
              )}
            </span>
            <span className="mobile-quick-actions-label">{def.label}</span>
          </>
        )
        return def.to ? (
          <Link key={def.id} to={def.to} className="mobile-quick-actions-item" aria-label={def.label}>
            {content}
          </Link>
        ) : (
          <button
            key={def.id}
            type="button"
            className="mobile-quick-actions-item"
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
