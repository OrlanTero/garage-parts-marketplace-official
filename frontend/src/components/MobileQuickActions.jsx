import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Heart, MessageSquare, Plus, Search } from 'lucide-react'
import './MobileQuickActions.css'

/**
 * Mobile floating quick-actions menu (≤768px).
 *
 * The navbar Search / Favorites / Messages buttons are hidden on mobile
 * and live here instead — a toggleable FAB pinned to the right edge.
 *
 * ADDING A FUTURE BUTTON: append one entry to ACTION_DEFS:
 *   { id: 'my-button', label: 'My Button', icon: MyIcon, to: '/my-route' }
 * or for a custom action:
 *   { id: 'my-button', label: 'My Button', icon: MyIcon, action: 'myAction' }
 * then handle the action id in handleAction below. Badges: add
 * `badge: <count>` on the entry (numbers > 0 render automatically).
 */
const ACTION_DEFS = [
  { id: 'search', label: 'Search', icon: Search, action: 'search' },
  { id: 'favorites', label: 'Saved', icon: Heart, to: '/favorites', badgeKey: 'favoritesCount' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, to: '/messages', badgeKey: 'unreadCount', badgeClass: 'action-badge--chat' },
]

export default function MobileQuickActions({ onSearch, favoritesCount = 0, unreadCount = 0 }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Collapse the menu on every route change.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open ])

  const counts = { favoritesCount, unreadCount }

  const handleAction = (def) => {
    if (def.action === 'search' && onSearch) onSearch()
    setOpen(false)
  }

  return (
    <div className={`mobile-quick-actions ${open ? 'mobile-quick-actions--open' : ''}`}>
      <div className="mobile-quick-actions-list" aria-hidden={!open}>
        {ACTION_DEFS.map((def, index) => {
          const Icon = def.icon
          const badge = def.badgeKey ? counts[def.badgeKey] || 0 : def.badge || 0
          const content = (
            <>
              <span className="mobile-quick-actions-label">{def.label}</span>
              <span className="mobile-quick-actions-btn" tabIndex={-1}>
                <Icon
                  size={19}
                  fill={def.id === 'favorites' && badge > 0 ? '#d8622c' : 'none'}
                  color={def.id === 'favorites' && badge > 0 ? '#d8622c' : 'currentColor'}
                />
                {badge > 0 && (
                  <span className={`action-badge ${def.badgeClass || ''}`}>{badge > 99 ? '99+' : badge}</span>
                )}
              </span>
            </>
          )
          return def.to ? (
            <Link
              key={def.id}
              to={def.to}
              className="mobile-quick-actions-item"
              style={{ transitionDelay: open ? `${index * 45}ms` : '0ms' }}
              tabIndex={open ? 0 : -1}
              aria-label={def.label}
              onClick={() => setOpen(false)}
            >
              {content}
            </Link>
          ) : (
            <button
              key={def.id}
              type="button"
              className="mobile-quick-actions-item"
              style={{ transitionDelay: open ? `${index * 45}ms` : '0ms' }}
              tabIndex={open ? 0 : -1}
              aria-label={def.label}
              onClick={() => handleAction(def)}
            >
              {content}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="mobile-quick-actions-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
      >
        <Plus size={22} />
      </button>
    </div>
  )
}
