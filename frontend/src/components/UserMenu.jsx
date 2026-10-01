import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BadgePercent,
  LogOut,
  ShoppingBag,
  ChevronDown,
  ShieldCheck,
  Coffee,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Store,
  SlidersHorizontal,
  Wallet as WalletIcon
} from 'lucide-react'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useProgram } from '../utils/program.js'

export default function UserMenu({ user, logout, isTransparent = false }) {
  const program = useProgram()
  const { favoritesCount, carsCount, partsCount } = useFavorites()
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
    navigate('/login', { replace: true })
  }

  const handleLinkClick = () => {
    setIsOpen(false)
  }

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'
  const role = user?.role
  const isAdmin = role === 'admin'
  const isDealer = role === 'dealer'
  const isPartsSeller = role === 'parts_seller'
  const isSeller = role === 'seller' || isDealer || isPartsSeller || isAdmin

  const roleLabel = isAdmin 
    ? 'Admin' 
    : isDealer 
      ? 'Dealer' 
      : isPartsSeller 
        ? 'Parts Seller' 
        : role === 'seller' 
          ? 'Seller' 
          : 'Buyer'

  const roleBadgeClass = isAdmin 
    ? 'badge-admin' 
    : isDealer 
      ? 'badge-dealer' 
      : isPartsSeller 
        ? 'badge-parts-seller' 
        : role === 'seller' 
          ? 'badge-seller' 
          : 'badge-buyer'

  const dotClass = isAdmin
    ? 'dot-admin'
    : isDealer
      ? 'dot-dealer'
      : isPartsSeller
        ? 'dot-parts-seller'
        : role === 'seller'
          ? 'dot-seller'
          : 'dot-buyer'

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
          <span className={`user-status-dot ${dotClass}`} />
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

          {/* Contextual Actions / Shortcuts — commerce first, account last */}
          <div className="user-dropdown-section">
            <div className="user-dropdown-section-title">Marketplace & Activity</div>

            <Link to="/my-orders" className="user-dropdown-item" onClick={handleLinkClick}>
              <div className="user-dropdown-item-icon">
                <ShoppingBag size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title">My Orders</span>
                <span className="user-dropdown-item-desc">Purchases, payments & receipts</span>
              </div>
            </Link>

            {isSeller ? (
              <Link to="/my-listings?tab=requests" className="user-dropdown-item" onClick={handleLinkClick}>
                <div className="user-dropdown-item-icon icon-action">
                  <Store size={16} />
                </div>
                <div className="user-dropdown-item-text">
                  <span className="user-dropdown-item-title">My Listings & Requests</span>
                  <span className="user-dropdown-item-desc">Paid orders, buyer requests & inventory</span>
                </div>
              </Link>
            ) : (
              <Link to="/become-seller" className="user-dropdown-item" onClick={handleLinkClick}>
                <div className="user-dropdown-item-icon icon-action">
                  <Store size={16} />
                </div>
                <div className="user-dropdown-item-text">
                  <span className="user-dropdown-item-title">Become a Seller</span>
                  <span className="user-dropdown-item-desc">Upgrade to sell cars & parts</span>
                </div>
              </Link>
            )}

            <Link to="/wallet" className="user-dropdown-item" onClick={handleLinkClick}>
              <div className="user-dropdown-item-icon icon-action">
                <WalletIcon size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title">My Wallet</span>
                <span className="user-dropdown-item-desc">Earnings, payouts & cash-outs</span>
              </div>
            </Link>

            {isSeller && (
              <Link to="/seller-analytics" className="user-dropdown-item" onClick={handleLinkClick}>
                <div className="user-dropdown-item-icon icon-action">
                  <BarChart3 size={16} />
                </div>
                <div className="user-dropdown-item-text">
                  <span className="user-dropdown-item-title">Sales Analytics</span>
                  <span className="user-dropdown-item-desc">Revenue, orders & top listings</span>
                </div>
              </Link>
            )}

            <Link to="/agent" className="user-dropdown-item" onClick={handleLinkClick}>
              <div className="user-dropdown-item-icon icon-action">
                <Sparkles size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title">Sales Agent Dashboard</span>
                <span className="user-dropdown-item-desc">{user?.agent_code ? `Code: ${user.agent_code}` : `Earn ${program.agent.commission_car_pct}% cars · ${program.agent.commission_part_pct}% parts sharing`}</span>
              </div>
            </Link>

            <Link to="/perks" className="user-dropdown-item" onClick={handleLinkClick}>
              <div className="user-dropdown-item-icon icon-action">
                <BadgePercent size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title">Member Perks</span>
                <span className="user-dropdown-item-desc">
                  {user?.is_perks_member ? 'Active member · deals unlocked' : `Up to ${program.perks.max_part_discount_pct}% off parts · ₱${program.perks.subscription_fee}/yr`}
                </span>
              </div>
            </Link>

            <Link to="/settings" className="user-dropdown-item" onClick={handleLinkClick}>
              <div className="user-dropdown-item-icon">
                <SlidersHorizontal size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title">Account Settings</span>
                <span className="user-dropdown-item-desc">Profile, address book, KYC & security</span>
              </div>
            </Link>
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
