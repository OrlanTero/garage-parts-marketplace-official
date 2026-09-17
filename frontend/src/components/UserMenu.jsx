import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  User as UserIcon, 
  LogOut, 
  Car, 
  Package, 
  Heart, 
  ShoppingBag, 
  PlusCircle, 
  ChevronDown, 
  ShieldCheck, 
  Coffee, 
  HelpCircle,
  Sparkles,
  ExternalLink,
  CheckCircle2
} from 'lucide-react'

export default function UserMenu({ user, logout, isTransparent = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  // Close menu on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleLogout = async () => {
    setIsOpen(false)
    if (logout) {
      await logout()
    }
  }

  const handleLinkClick = () => {
    setIsOpen(false)
  }

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'
  const isSeller = user?.role === 'seller' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'
  const roleLabel = isAdmin ? 'Admin' : isSeller ? 'Seller' : 'Buyer'
  const roleBadgeClass = isAdmin ? 'badge-admin' : isSeller ? 'badge-seller' : 'badge-buyer'

  return (
    <div className={`user-menu-container ${isTransparent ? 'user-menu--transparent' : ''}`} ref={menuRef}>
      {/* User Pill Trigger Button */}
      <button
        type="button"
        className={`user-pill ${isOpen ? 'user-pill--active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`User menu for ${user?.name || 'Account'}`}
      >
        <div className="user-avatar-wrapper">
          {user?.avatar_url && !imgError ? (
            <img 
              src={user.avatar_url} 
              alt={user.name || 'User Avatar'} 
              className="user-avatar-img"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="user-avatar">{userInitial}</div>
          )}
          <span className={`user-status-dot ${isSeller ? 'dot-seller' : 'dot-buyer'}`} />
        </div>

        <div className="user-info hide-tablet-user">
          <span className="user-name" title={user?.name}>{user?.name || 'My Account'}</span>
          <span className="user-role">{roleLabel}</span>
        </div>

        <ChevronDown 
          size={14} 
          className={`user-menu-chevron hide-tablet-user ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="user-dropdown-menu" role="menu">
          {/* Header Card with User Details */}
          <div className="user-dropdown-header">
            <div className="user-dropdown-avatar-lg">
              {user?.avatar_url && !imgError ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name || 'User Avatar'} 
                  className="user-avatar-img-lg"
                />
              ) : (
                <div className="user-avatar-fallback-lg">{userInitial}</div>
              )}
              <span className={`user-role-chip ${roleBadgeClass}`}>
                {roleLabel}
              </span>
            </div>
            
            <div className="user-dropdown-identity">
              <div className="user-dropdown-name-row">
                <span className="user-dropdown-name">{user?.name || 'Garage Member'}</span>
                <CheckCircle2 size={15} className="user-verified-icon" title="Verified Account" />
              </div>
              <span className="user-dropdown-email">{user?.email || 'member@garagemarket.ph'}</span>
              <div className="user-dropdown-location">
                <span>🇵🇭 Philippines · Verified Member</span>
              </div>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          {/* Contextual Actions / Shortcuts */}
          <div className="user-dropdown-section">
            <div className="user-dropdown-section-title">Marketplace & Activity</div>

            {isSeller ? (
              <>
                <Link to="/sell" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon icon-action">
                    <PlusCircle size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">Sell Your Build / Parts</span>
                    <span className="user-dropdown-item-desc">Post new verified listing</span>
                  </div>
                </Link>

                <Link to="/marketplace" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon">
                    <Car size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">Showroom & Vehicles</span>
                    <span className="user-dropdown-item-desc">Browse 100-Point certified cars</span>
                  </div>
                </Link>

                <Link to="/parts" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon">
                    <Package size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">Parts Catalog & Inquiries</span>
                    <span className="user-dropdown-item-desc">Performance & replacement stock</span>
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link to="/marketplace" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon">
                    <Heart size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">Saved Vehicles & Wishlist</span>
                    <span className="user-dropdown-item-desc">2 cars currently tracked</span>
                  </div>
                </Link>

                <Link to="/parts" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon">
                    <ShoppingBag size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">Parts Inquiries & Cart</span>
                    <span className="user-dropdown-item-desc">4 verified parts in inquiry</span>
                  </div>
                </Link>

                <Link to="/sell" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon icon-action">
                    <Sparkles size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">Sell Your Build</span>
                    <span className="user-dropdown-item-desc">List your vehicle for enthusiasts</span>
                  </div>
                </Link>
              </>
            )}
          </div>

          <div className="user-dropdown-divider" />

          {/* Garage Showroom & Support Services */}
          <div className="user-dropdown-section">
            <div className="user-dropdown-section-title">Garage Services</div>

            <Link to="/services" className="user-dropdown-item" onClick={handleLinkClick}>
              <div className="user-dropdown-item-icon">
                <ShieldCheck size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title">100-Point Inspections</span>
                <span className="user-dropdown-item-desc">Lift inspection guarantee</span>
              </div>
            </Link>

            <Link to="/showroom" className="user-dropdown-item" onClick={handleLinkClick}>
              <div className="user-dropdown-item-icon">
                <Coffee size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title">Makati HQ & Barako Café</span>
                <span className="user-dropdown-item-desc">Tue–Sun test drives & lounge</span>
              </div>
            </Link>

            <Link to="/about" className="user-dropdown-item" onClick={handleLinkClick}>
              <div className="user-dropdown-item-icon">
                <HelpCircle size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title">Help Center & Hotline</span>
                <span className="user-dropdown-item-desc">(02) 8888-AUTO concierge</span>
              </div>
            </Link>
          </div>

          <div className="user-dropdown-divider" />

          {/* Dropdown Footer with Logout */}
          <div className="user-dropdown-footer">
            <button 
              type="button" 
              className="user-dropdown-logout-btn" 
              onClick={handleLogout}
              role="menuitem"
            >
              <LogOut size={16} />
              <span>Log Out of Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
