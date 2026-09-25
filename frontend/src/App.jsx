import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { 
  Search, 
  Heart, 
  User as UserIcon, 
  Menu as MenuIcon, 
  X as CloseIcon, 
  ShieldCheck, 
  Truck, 
  MapPin, 
  Phone, 
  ArrowRight,
  Sparkles,
  LogOut,
  Car,
  Layers,
  Coffee,
  MessageSquare
} from 'lucide-react'
import Home from './pages/Home.jsx'
import Marketplace from './pages/Marketplace.jsx'
import CarDetail from './pages/CarDetail.jsx'
import PartsMarketplace from './pages/PartsMarketplace.jsx'
import PartDetail from './pages/PartDetail.jsx'
import Checkout from './pages/Checkout.jsx'
import SalesOrder from './pages/SalesOrder.jsx'
import AgentPortal from './pages/AgentPortal.jsx'
import CreateListing from './pages/CreateListing.jsx'
import BecomeSeller from './pages/BecomeSeller.jsx'
import MyListings from './pages/MyListings.jsx'
import Offers from './pages/Offers.jsx'
import Settings from './pages/Settings.jsx'
import Favorites from './pages/Favorites.jsx'
import Messages from './pages/Messages.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import SearchModal from './components/SearchModal.jsx'
import MobileQuickActions from './components/MobileQuickActions.jsx'
import AuthModal from './components/AuthModal.jsx'
import UserMenu from './components/UserMenu.jsx'
import FloatingChatDrawer from './components/chat/FloatingChatDrawer.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import { useFavorites } from './context/FavoritesContext.jsx'
import { useChat } from './context/ChatContext.jsx'
import { getActiveReferralCode } from './utils/referral.js'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/marketplace', label: 'Cars' },
  { to: '/parts', label: 'Parts & Accessories' },
  { to: '/showroom', label: 'Showroom & Café' },
  { to: '/sell', label: 'Sell Your Build' },
  { to: '/services', label: 'Inspections' },
  { to: '/about', label: 'About Us' },
]

const ANNOUNCEMENTS = [
  { icon: Sparkles, text: 'Become a Sales Agent — Earn 5% commission sharing parts & car listings to Facebook' },
  { icon: Truck, text: 'Free Nationwide Freight on Verified Parts orders over ₱8,000' },
  { icon: ShieldCheck, text: '100-Point Garage Certified Inspection Guarantee on all vehicles' },
  { icon: MapPin, text: 'Makati Showroom & Barako Café open Tue–Sun · Test drives & Lift inspections' },
]

function Placeholder({ title }) {
  return (
    <div style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', padding: 16, background: 'var(--color-orange-light)', borderRadius: '50%', color: 'var(--color-rust)', marginBottom: 20 }}>
        <Sparkles size={32} />
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 12, color: 'var(--color-heading)' }}>{title}</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 16, maxWidth: 500, margin: '0 auto 28px' }}>
        We are crafting this experience for Philippine car enthusiasts. Meanwhile, explore our verified catalog.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link to="/marketplace" className="btn btn-primary">Browse Verified Cars</Link>
        <Link to="/parts" className="btn btn-secondary">Shop Parts</Link>
      </div>
    </div>
  )
}

export default function App() {
  const { 
    isAuthenticated, 
    user, 
    logout, 
    authModal, 
    openLoginModal, 
    openRegisterModal, 
    closeAuthModal 
  } = useAuth()
  const { favoritesCount } = useFavorites()
  const { unreadCount } = useChat()
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register'
  const isHome = location.pathname === '/'
  
  const [scrolled, setScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [announcementIndex, setAnnouncementIndex] = useState(0)

  const isBuyer = user?.role === 'buyer'
  const isSellerAccount = user && ['seller', 'dealer', 'parts_seller', 'admin', 'super_admin'].includes(user.role)
  const navItems = [
    ...NAV.filter((item) => !(isBuyer && item.to === '/sell')),
    ...(isAuthenticated && isBuyer ? [{ to: '/become-seller', label: 'Become a Seller' }] : []),
  ]

  // Global Keyboard Shortcut for Search (Cmd+K / Ctrl+K / "/")
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if already typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchModalOpen((prev) => !prev)
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setSearchModalOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Rotate announcement ticker every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // Track scroll position and calculate progress
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      const currentScroll = window.scrollY
      setScrolled(currentScroll > 32)
      if (totalScroll > 0) {
        setScrollProgress((currentScroll / totalScroll) * 100)
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-detect and store referral attribution parameters
  useEffect(() => {
    getActiveReferralCode()
  }, [location.search])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/parts?search=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
  }

  const ActiveAnnouncementIcon = ANNOUNCEMENTS[announcementIndex].icon

  const topbarClass = `topbar ${isHome ? (scrolled ? 'topbar--solid' : 'topbar--transparent') : 'topbar--solid'}`

  return (
    <div className="shell">
      {/* Scroll Progress Indicator Bar */}
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} aria-hidden="true" />

      {/* Modern Announcement Utility Bar (afhome.ph inspired) */}
      <div className="announcement-bar">
        <div className="announcement-inner">
          <div className="announcement-item">
            <ActiveAnnouncementIcon size={14} className="announcement-icon" />
            <span className="announcement-text">{ANNOUNCEMENTS[announcementIndex].text}</span>
          </div>
          <div className="announcement-meta">
            <span className="announcement-link">
              <Phone size={12} /> (02) 8888-AUTO
            </span>
            <span className="announcement-divider">|</span>
            <span className="announcement-badge">🇵🇭 Manila, PHP ₱</span>
            <span className="announcement-divider">|</span>
            <Link to="/about" className="announcement-link">Help & Showroom</Link>
          </div>
        </div>
      </div>

      {/* Main Modern Navigation Topbar */}
      <header className={topbarClass}>
        <div className="topbar-inner">
          {/* Brand Logo */}
          <Link to="/" className="brand" aria-label="Garage Parts & Cars Marketplace">
            <img 
              src="/logos/logo-vector.svg" 
              alt="Garage Logo" 
              className="brand-logo-img" 
              width="40"
              height="40"
            />
            <div className="brand-text">
              <span className="brand-name">GARAGE</span>
              <span className="brand-sub">Parts & Cars Marketplace</span>
            </div>
          </Link>

          {/* Primary Navigation */}
          <nav className="nav nav--main">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Action Icons & Account Area */}
          <div className="topbar-actions">
            {/* Dedicated Search Action Trigger with Keyboard Hint */}
            <button
              type="button"
              className="action-btn topbar-search-btn topbar-quick"
              onClick={() => setSearchModalOpen(true)}
              title="Search Parts & Cars "
              aria-label="Search Marketplace"
            >
              <Search size={18} />
            </button>

            <Link to="/favorites" className="action-btn topbar-quick" title="Saved Vehicles & Wishlist" aria-label="Wishlist">
              <Heart size={18} fill={favoritesCount > 0 ? '#d8622c' : 'none'} color={favoritesCount > 0 ? '#d8622c' : 'currentColor'} />
              {favoritesCount > 0 && <span className="action-badge">{favoritesCount}</span>}
            </Link>

            <Link to="/messages" className="action-btn topbar-quick" title="Messages & Seller Inquiries" aria-label="Messages">
              <MessageSquare size={18} />
              {unreadCount > 0 && <span className="action-badge action-badge--chat">{unreadCount}</span>}
            </Link>

            {isAuthenticated ? (
              <UserMenu 
                user={user} 
                logout={logout} 
                isTransparent={isHome && !scrolled} 
              />
            ) : (
              <button 
                type="button" 
                className="btn btn-secondary topbar-login-btn"
                onClick={openLoginModal}
                aria-label="Log in to your account"
              >
                <UserIcon size={15} />
                <span>Log In</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button 
              type="button" 
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <div className={`mobile-drawer-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-drawer-head">
            <Link to="/" className="brand" onClick={() => setMobileMenuOpen(false)} aria-label="Garage Home">
              <img 
                src="/logos/logo-vector.svg" 
                alt="Garage Logo" 
                className="brand-logo-img" 
                width="36"
                height="36"
              />
              <div className="brand-text">
                <span className="brand-name" style={{ fontSize: 18 }}>GARAGE</span>
                <span className="brand-sub">Marketplace</span>
              </div>
            </Link>
            <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <CloseIcon size={20} />
            </button>
          </div>

          <form 
            className="mobile-drawer-search" 
            onSubmit={(e) => {
              e.preventDefault()
              setMobileMenuOpen(false)
              setSearchModalOpen(true)
            }}
          >
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search parts, cars, engines..." 
              value={searchQuery}
              onClick={() => {
                setMobileMenuOpen(false)
                setSearchModalOpen(true)
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }}>Search</button>
          </form>

          <nav className="mobile-nav-list">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              >
                <span>{item.label}</span>
                <ArrowRight size={16} className="mobile-nav-arrow" />
              </NavLink>
            ))}
          </nav>

          <div className="mobile-drawer-footer">
            {isAuthenticated ? (
              <div className="mobile-drawer-user-card">
                <div className="mobile-drawer-user-header">
                  <div className="mobile-drawer-user-avatar">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user?.name || 'User'} className="mobile-drawer-avatar-img" />
                    ) : (
                      <div className="mobile-drawer-avatar-fallback">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <div className="mobile-drawer-user-meta">
                    <div className="mobile-drawer-user-name">{user?.name}</div>
                    <div className="mobile-drawer-user-email">{user?.email}</div>
                    <span className="mobile-drawer-user-badge">{user?.role}</span>
                  </div>
                </div>

                <div className="mobile-drawer-user-links">
                  <Link 
                    to="/agent" 
                    className="mobile-drawer-quicklink" 
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Sparkles size={15} />
                    <span>Sales Agent Dashboard</span>
                  </Link>
                  {!isBuyer && (
                    <Link 
                      to="/sell" 
                      className="mobile-drawer-quicklink" 
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Car size={15} />
                      <span>Sell Your Build / Parts</span>
                    </Link>
                  )}
                  <Link 
                    to="/favorites" 
                    className="mobile-drawer-quicklink" 
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Heart size={15} fill={favoritesCount > 0 ? '#d8622c' : 'none'} color={favoritesCount > 0 ? '#d8622c' : 'currentColor'} />
                    <span>Saved Wishlist & Cars ({favoritesCount})</span>
                  </Link>
                  <Link 
                    to="/messages" 
                    className="mobile-drawer-quicklink" 
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageSquare size={15} />
                    <span>Messages & Inquiries {unreadCount > 0 ? `(${unreadCount})` : ''}</span>
                  </Link>
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary mobile-drawer-logout-btn" 
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                >
                  <LogOut size={16} />
                  <span>Log Out of Session</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    openLoginModal()
                  }}
                >
                  Log In
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    openRegisterModal()
                  }}
                >
                  Sign Up
                </button>
              </div>
            )}
            <div className="mobile-drawer-hotline">
              <Phone size={14} /> Hotline: (02) 8888-AUTO · Makati Showroom
            </div>
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      <SearchModal 
        isOpen={searchModalOpen} 
        onClose={() => setSearchModalOpen(false)} 
      />

      {/* Global Auth Modal (Login / Sign Up) */}
      <AuthModal 
        isOpen={authModal?.isOpen} 
        initialView={authModal?.view || 'login'} 
        onClose={closeAuthModal} 
      />

      {/* Floating 1:1 Live Chat Drawer */}
      <FloatingChatDrawer />

      {/* Mobile floating quick-actions (Search / Saved / Messages) */}
      <MobileQuickActions
        onSearch={() => setSearchModalOpen(true)}
        favoritesCount={favoritesCount}
        unreadCount={unreadCount}
      />

      {/* Main Content View */}
      <main className={isAuthRoute ? 'content--auth' : isHome ? 'content--home' : 'content'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/:id" element={<CarDetail />} />
          <Route path="/cars" element={<Marketplace />} />
          <Route path="/cars/:id" element={<CarDetail />} />
          <Route path="/parts" element={<PartsMarketplace />} />
          <Route path="/parts/:id" element={<PartDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/sales-order/:orderNumber" element={<SalesOrder />} />
          <Route path="/orders/:orderNumber" element={<SalesOrder />} />
          <Route path="/agent" element={<AgentPortal />} />
          <Route path="/agents" element={<AgentPortal />} />
          <Route path="/agent-portal" element={<AgentPortal />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/saved" element={<Favorites />} />
          <Route path="/wishlist" element={<Favorites />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/inbox" element={<Messages />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/account" element={<Settings />} />
          <Route path="/sell" element={<CreateListing />} />
          <Route path="/sell/cars" element={<CreateListing defaultType="car" />} />
          <Route path="/sell/parts" element={<CreateListing defaultType="part" />} />
          <Route path="/create-listing" element={<CreateListing />} />
          <Route path="/become-seller" element={<BecomeSeller />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/seller-dashboard" element={<MyListings />} />
          <Route path="/showroom" element={<Placeholder title="Showroom & Café" />} />
          <Route path="/services" element={<Placeholder title="Garage Inspection Services" />} />
          <Route path="/about" element={<Placeholder title="About Garage Marketplace" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<div style={{ padding: 48, textAlign: 'center' }}><h2>Page Not Found</h2><p>The page you are looking for does not exist. <Link to="/">Return to Homepage</Link></p></div>} />
        </Routes>
      </main>
    </div>
  )
}
