import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  Layers,
  Users,
  ShieldCheck,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Wrench,
  Tag,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  FileCheck,
  Star,
  Building2,
  Radio,
  LifeBuoy,
  TrendingUp,
  Shield,
  Server,
  Search,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

const NAV_GROUPS = [
  {
    id: 'overview',
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    id: 'marketplace',
    title: 'Marketplace & Inventory',
    items: [
      { to: '/cars', label: 'Car Builds', icon: Car, badge: 'Showroom' },
      { to: '/parts', label: 'Parts Catalog', icon: Layers, badge: 'Inventory' },
      { to: '/taxonomy', label: 'Fitment & Taxonomy', icon: Tag },
      { to: '/promotions', label: 'Promotions & Boosts', icon: Tag, badge: 'Vouchers' },
    ],
  },
  {
    id: 'orders',
    title: 'Sales & Orders Operations',
    items: [
      { to: '/orders', label: 'Orders & Fulfillment', icon: ShoppingBag, badge: '4 Active' },
      { to: '/payouts', label: 'Seller Payouts', icon: CreditCard },
      { to: '/disputes', label: 'Disputes & Returns', icon: AlertTriangle, badge: { label: '1 Open', variant: 'danger' } },
    ],
  },
  {
    id: 'trust',
    title: 'Trust & Governance',
    items: [
      { to: '/verifications', label: 'Seller KYC & Trust', icon: FileCheck, badge: { label: '1 Review', variant: 'warning' } },
      { to: '/reviews', label: 'Customer Reviews', icon: Star },
      { to: '/garages', label: 'Partner Garages', icon: Building2 },
    ],
  },
  {
    id: 'communications',
    title: 'Communications & Desk',
    items: [
      { to: '/notifications', label: 'WebSocket Broadcasts', icon: Radio, badge: { label: '8080', variant: 'success' } },
      { to: '/support', label: 'Support Tickets', icon: LifeBuoy, badge: '2 Open' },
    ],
  },
  {
    id: 'governance',
    title: 'System & Governance',
    items: [
      { to: '/users', label: 'Users & Roles', icon: Users },
      { to: '/analytics', label: 'Analytics & GMV', icon: TrendingUp },
      { to: '/audit-logs', label: 'Security Audit Logs', icon: Shield },
      { to: '/cache-manager', label: 'Nginx Cache & Redis', icon: Server },
      { to: '/system', label: 'System & Edge Health', icon: Activity },
      { to: '/settings', label: 'Admin Settings', icon: Settings },
    ],
  },
]

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user } = useAuth()
  const location = useLocation()
  const [navSearch, setNavSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState([
    'overview',
    'marketplace',
    'orders',
    'trust',
    'communications',
    'governance',
  ])

  // Auto-expand group of current route
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((group) =>
      group.items.some((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to) && item.to !== '/'))
    )
    if (activeGroup && !expandedGroups.includes(activeGroup.id)) {
      setExpandedGroups((prev) => [...prev, activeGroup.id])
    }
  }, [location.pathname])

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      item.label.toLowerCase().includes(navSearch.toLowerCase()) ||
      group.title.toLowerCase().includes(navSearch.toLowerCase())
    ),
  })).filter((group) => group.items.length > 0)

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 40,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      <aside
        style={{
          width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          backgroundColor: 'var(--admin-bg-sidebar)',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
          transition: 'all 0.25s ease',
          boxShadow: 'var(--shadow-card)',
          borderRight: '1px solid #1E293B',
          ...(mobileOpen
            ? {
                position: 'fixed',
                left: 0,
                width: 'var(--sidebar-width)',
              }
            : {}),
        }}
        className={mobileOpen ? 'mobile-open' : ''}
      >
        {/* Brand Header */}
        <div
          style={{
            height: 'var(--header-height)',
            padding: collapsed ? '0 16px' : '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: '1px solid #1E293B',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-rust)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(146, 68, 36, 0.4)',
              }}
            >
              <Wrench size={20} color="#FFFFFF" />
            </div>

            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                  }}
                >
                  GarageParts
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--color-rust)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  Admin Control Portal
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                padding: 6,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              aria-label="Collapse Sidebar"
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Quick Nav Search (Expanded Only) */}
        {!collapsed && (
          <div style={{ padding: '12px 16px 4px 16px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: '#64748b' }} />
              <input
                type="text"
                placeholder="Jump to section..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  fontSize: 12,
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* Navigation Sections with Accordion Groups */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: collapsed ? '16px 8px' : '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.id) || !!navSearch

            return (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Section Accordion Header */}
                {!collapsed ? (
                  <div
                    onClick={() => toggleGroup(group.id)}
                    className={`sidebar-nav-group-header ${isExpanded ? 'is-expanded' : ''}`}
                  >
                    <span>{group.title}</span>
                    <ChevronDown
                      size={14}
                      style={{
                        transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s ease',
                        color: '#64748b',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      height: 1,
                      backgroundColor: '#1e293b',
                      margin: '8px 0',
                    }}
                  />
                )}

                {/* Sub items */}
                {(isExpanded || collapsed) && (
                  <div className={collapsed ? '' : 'sidebar-sub-nav'}>
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const badgeObj = typeof item.badge === 'object' ? item.badge : item.badge ? { label: item.badge, variant: 'neutral' } : null

                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            `sidebar-nav-link ${isActive ? 'active' : ''} ${!collapsed ? 'sub-link' : ''}`
                          }
                          title={collapsed ? item.label : undefined}
                          style={{
                            justifyContent: collapsed ? 'center' : 'flex-start',
                          }}
                        >
                          <Icon size={18} style={{ flexShrink: 0 }} />
                          {!collapsed && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.label}
                              </span>
                              {badgeObj && (
                                <span
                                  className={`badge badge-${badgeObj.variant || 'neutral'}`}
                                  style={{
                                    fontSize: 10,
                                    padding: '1px 6px',
                                    fontWeight: 700,
                                    borderRadius: 'var(--radius-pill)',
                                  }}
                                >
                                  {badgeObj.label}
                                </span>
                              )}
                            </div>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer info & collapse toggle */}
        <div
          style={{
            padding: collapsed ? '16px 8px' : '16px 20px',
            borderTop: '1px solid #1E293B',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            backgroundColor: '#090D16',
            flexShrink: 0,
          }}
        >
          {/* Link to public marketplace */}
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1E293B',
              color: '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF'
              e.currentTarget.style.backgroundColor = '#334155'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94A3B8'
              e.currentTarget.style.backgroundColor = '#1E293B'
            }}
            title={collapsed ? 'Open Storefront' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ExternalLink size={14} />
              {!collapsed && <span>View Storefront</span>}
            </div>
            {!collapsed && <span style={{ fontSize: 10, color: 'var(--color-rust)' }}>:5173</span>}
          </a>

          {/* Expand Toggle Button when collapsed */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              style={{
                width: '100%',
                background: '#1E293B',
                border: 'none',
                color: '#94A3B8',
                padding: '8px 0',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              aria-label="Expand Sidebar"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#FFFFFF'
                e.currentTarget.style.backgroundColor = '#334155'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94A3B8'
                e.currentTarget.style.backgroundColor = '#1E293B'
              }}
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
