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
  CheckCircle2,
  MessageSquare,
  UserCheck,
  Store,
  Tag,
  SlidersHorizontal,
  LayoutDashboard
} from 'lucide-react'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useChat } from '../context/ChatContext.jsx'
import KycVerificationModal from './KycVerificationModal.jsx'

export default function UserMenu({ user, logout, isTransparent = false }) {
  const { favoritesCount, carsCount, partsCount } = useFavorites()
  const { unreadCount } = useChat()
  const [isOpen, setIsOpen] = useState(false)
  const [kycModalOpen, setKycModalOpen] = useState(false)
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

          {/* Contextual Actions / Shortcuts */}
          <div className="user-dropdown-section">
            <div className="user-dropdown-section-title">Marketplace & Activity</div>

            <Link to="/settings" className="user-dropdown-item" onClick={handleLinkClick}>
              <div className="user-dropdown-item-icon">
                <SlidersHorizontal size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title">Account Settings</span>
                <span className="user-dropdown-item-desc">Profile, address book, KYC & security</span>
              </div>
            </Link>

            <button
              type="button"
              className="user-dropdown-item"
              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onClick={() => {
                setIsOpen(false)
                setKycModalOpen(true)
              }}
            >
              <div className="user-dropdown-item-icon" style={{ color: user?.is_kyc_verified ? '#10b981' : '#ea580c' }}>
                <UserCheck size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span>Seller KYC & Verification</span>
                  {user?.is_kyc_verified ? (
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                      ✓ Verified
                    </span>
                  ) : user?.kyc_status === 'pending' ? (
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', fontWeight: 700 }}>
                      Pending
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Unverified
                    </span>
                  )}
                </span>
                <span className="user-dropdown-item-desc">
                  {user?.is_kyc_verified
                    ? 'Verified Seller Trust Badge active'
                    : 'Submit government ID to unlock seller badge'}
                </span>
              </div>
            </button>

            <Link to="/agent" className="user-dropdown-item" onClick={handleLinkClick}>
              <div className="user-dropdown-item-icon icon-action">
                <Sparkles size={16} />
              </div>
              <div className="user-dropdown-item-text">
                <span className="user-dropdown-item-title">Sales Agent Dashboard</span>
                <span className="user-dropdown-item-desc">{user?.agent_code ? `Code: ${user.agent_code}` : 'Earn 5% Commission Sharing Listings'}</span>
              </div>
            </Link>

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

                <Link to="/messages" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon">
                    <MessageSquare size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">
                      Buyer Messages {unreadCount > 0 && <span className="action-badge-inline">{unreadCount} new</span>}
                    </span>
                    <span className="user-dropdown-item-desc">Inquiries from prospective buyers</span>
                  </div>
                </Link>

                <Link to="/offers" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon">
                    <Tag size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">Price Offers Received</span>
                    <span className="user-dropdown-item-desc">Buyer offers on your listings</span>
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
                <Link to="/become-seller" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon icon-action">
                    <Store size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">Become a Seller</span>
                    <span className="user-dropdown-item-desc">Upgrade to sell cars & parts</span>
                  </div>
                </Link>

                <Link to="/offers" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon">
                    <Tag size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">My Price Offers</span>
                    <span className="user-dropdown-item-desc">Track offers you submitted</span>
                  </div>
                </Link>

                <Link to="/marketplace" className="user-dropdown-item" onClick={handleLinkClick}>
                  <div className="user-dropdown-item-icon">
                    <Car size={16} />
                  </div>
                  <div className="user-dropdown-item-text">
                    <span className="user-dropdown-item-title">Browse Verified Cars</span>
                    <span className="user-dropdown-item-desc">Discover 100-Point inspected builds</span>
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
      {/* KYC Verification & Seller Accreditation Modal */}
      <KycVerificationModal isOpen={kycModalOpen} onClose={() => setKycModalOpen(false)} />
    </div>
  )
}
