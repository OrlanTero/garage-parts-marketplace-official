import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  Store,
  Building2,
  Car,
  ShieldCheck,
  Tag,
  Layers,
  ShoppingBag,
  Calendar,
  MessageSquare,
  TrendingUp,
  Shield,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Wrench,
  CreditCard,
  AlertTriangle,
  FileCheck,
  Star,
  Radio,
  LifeBuoy,
  Server,
  Activity,
  Search,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

// Navigation grouped into collapsible accordion sections
const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/analytics', label: 'Analytics & Reports', icon: TrendingUp },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace & Inventory',
    icon: ShoppingBag,
    items: [
      { to: '/buyers', label: 'Buyer Management', icon: Users },
      { to: '/sellers', label: 'Seller Management', icon: Store },
      { to: '/dealers', label: 'Dealer Management', icon: Building2 },
      { to: '/garages', label: 'Partner Garages', icon: Building2 },
      { to: '/cars', label: 'Vehicle Management', icon: Car, badge: 'Builds' },
      { to: '/parts', label: 'Parts & Product Management', icon: Layers },
      { to: '/orders', label: 'Order Management', icon: ShoppingBag, badge: 'Orders' },
    ],
  },
  {
    id: 'trust',
    label: 'Trust & Moderation',
    icon: ShieldCheck,
    items: [
      { to: '/kyc', label: 'KYC & Seller Verification', icon: UserCheck, badge: { label: 'KYC', variant: 'info' } },
      { to: '/seller-applications', label: 'Seller Upgrade Requests', icon: UserPlus, badge: { label: 'Apply', variant: 'warning' } },
      { to: '/moderation', label: 'Listing Approval & Moderation', icon: ShieldCheck, badge: { label: 'Inspect', variant: 'warning' } },
      { to: '/taxonomy', label: 'Brand, Model & Category', icon: Tag },
      { to: '/verifications', label: 'Seller KYC & Trust', icon: FileCheck },
      { to: '/reviews', label: 'Customer Reviews', icon: Star },
      { to: '/chat-moderation', label: 'Basic Chat Moderation', icon: MessageSquare, badge: 'PII Alert' },
      { to: '/disputes', label: 'Disputes & Returns', icon: AlertTriangle },
    ],
  },
  {
    id: 'operations',
    label: 'Operations & Growth',
    icon: Wrench,
    items: [
      { to: '/appointments', label: 'Appointment Monitoring', icon: Calendar, badge: 'Slots' },
      { to: '/promotions', label: 'Promotions & Boosts', icon: Tag },
      { to: '/payouts', label: 'Seller Payouts', icon: CreditCard },
      { to: '/notifications', label: 'WebSocket Broadcasts', icon: Radio },
      { to: '/support', label: 'Support Tickets', icon: LifeBuoy },
    ],
  },
  {
    id: 'administration',
    label: 'Administration & Infrastructure',
    icon: Settings,
    items: [
      { to: '/users', label: 'Admin Users & Permissions', icon: Shield },
      { to: '/audit-logs', label: 'Audit / Activity Logs', icon: FileText },
      { to: '/cache-manager', label: 'Nginx Cache & Redis', icon: Server },
      { to: '/system', label: 'System & Edge Health', icon: Activity },
      { to: '/settings', label: 'System Settings', icon: Settings },
    ],
  },
]

// Inspectors get a focused workspace: queue, inspections, schedule.
const INSPECTOR_ROUTES = ['/', '/moderation', '/appointments']

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

const isItemActive = (item, pathname) =>
  item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user } = useAuth()
  const isInspectorOnly = user?.role === 'inspector'
  const location = useLocation()
  const [navSearch, setNavSearch] = useState('')
  const [openGroups, setOpenGroups] = useState(() => {
    const activeGroup = NAV_GROUPS.find((group) =>
      group.items.some((item) => isItemActive(item, location.pathname))
    )
    return activeGroup ? [activeGroup.id] : ['overview']
  })

  // Auto-expand accordion group that contains the active route
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((group) =>
      group.items.some((item) => isItemActive(item, location.pathname))
    )
    if (activeGroup && !openGroups.includes(activeGroup.id)) {
      setOpenGroups((prev) => [...prev, activeGroup.id])
    }
  }, [location.pathname])

  const toggleGroup = (id) =>
    setOpenGroups((prev) =>
      prev.includes(id) ? prev.filter((groupId) => groupId !== id) : [...prev, id]
    )

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(navSearch.toLowerCase()) &&
        (!isInspectorOnly || INSPECTOR_ROUTES.includes(item.to))
    ),
  })).filter((group) => group.items.length > 0)

  const railItems = isInspectorOnly
    ? ALL_NAV_ITEMS.filter((item) => INSPECTOR_ROUTES.includes(item.to))
    : ALL_NAV_ITEMS

  const renderNavItem = (item) => {
    const Icon = item.icon
    const badgeObj =
      typeof item.badge === 'object' ? item.badge : item.badge ? { label: item.badge, variant: 'neutral' } : null

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''} ${!collapsed ? 'sub-link' : ''}`}
        title={collapsed ? item.label : undefined}
        style={{
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <Icon size={collapsed ? 18 : 16} style={{ flexShrink: 0 }} />
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
  }

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

        {/* Navigation grouped into accordion sections */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: collapsed ? '16px 8px' : '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {collapsed ? (
            /* Collapsed: flat icon rail, no group headers */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {railItems.map(renderNavItem)}
            </div>
          ) : (
            /* Expanded: accordion sections */
            filteredGroups.map((group) => {
              const GroupIcon = group.icon
              const isOpen = openGroups.includes(group.id)

              return (
                <div key={group.id} style={{ marginBottom: 2 }}>
                  <div
                    onClick={() => toggleGroup(group.id)}
                    className={`sidebar-nav-group-header ${isOpen ? 'is-expanded' : ''}`}
                    aria-expanded={isOpen}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleGroup(group.id)
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      backgroundColor: isOpen ? 'rgba(30, 41, 59, 0.7)' : 'transparent',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <GroupIcon size={13} style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {group.label}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#475569' }}>
                        {group.items.length}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      style={{
                        transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s ease',
                        color: '#64748b',
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  {isOpen && (
                    <div
                      className="sidebar-sub-nav"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        marginTop: 4,
                      }}
                    >
                      {group.items.map(renderNavItem)}
                    </div>
                  )}
                </div>
              )
            })
          )}
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
