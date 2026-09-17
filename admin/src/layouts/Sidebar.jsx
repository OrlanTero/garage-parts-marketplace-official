import { useState } from 'react'
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
  ExternalLink,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/cars',
    label: 'Car Builds',
    icon: Car,
    badge: 'Showroom',
  },
  {
    to: '/parts',
    label: 'Parts Catalog',
    icon: Layers,
    badge: 'Inventory',
  },
  {
    to: '/users',
    label: 'Users & Roles',
    icon: Users,
  },
  {
    to: '/inspections',
    label: 'Inspections',
    icon: ShieldCheck,
  },
  {
    to: '/system',
    label: 'System & Health',
    icon: Activity,
  },
  {
    to: '/settings',
    label: 'Admin Settings',
    icon: Settings,
  },
]

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user } = useAuth()
  const location = useLocation()

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
            padding: collapsed ? '0 16px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: '1px solid #1E293B',
          }}
        >
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, var(--color-rust) 0%, #3A1E12 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(146, 68, 36, 0.4)',
                }}
              >
                <Wrench size={20} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: '0.02em',
                    color: '#FFFFFF',
                    lineHeight: 1.2,
                  }}
                >
                  GARAGE<span style={{ color: 'var(--color-orange)' }}>OPS</span>
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, letterSpacing: '0.05em' }}>
                  ADMIN CONTROL HUB
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: 'linear-gradient(135deg, var(--color-rust) 0%, #3A1E12 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
              title="Garage Operations Hub"
            >
              <Wrench size={20} />
            </div>
          )}

          {/* Desktop Toggle Button */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-collapse-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              background: '#1E293B',
              border: '1px solid #334155',
              color: '#94A3B8',
              cursor: 'pointer',
              ...(collapsed ? { display: 'none' } : {}),
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Links */}
        <div style={{ flex: 1, padding: '20px 12px', overflowY: 'auto' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#64748B',
              padding: collapsed ? '0 0 12px 0' : '0 12px 12px 12px',
              textAlign: collapsed ? 'center' : 'left',
            }}
          >
            {collapsed ? '•' : 'Management'}
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to)

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: collapsed ? '12px 0' : '10px 14px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.18s ease',
                    color: isActive ? '#FFFFFF' : '#94A3B8',
                    backgroundColor: isActive ? 'var(--color-rust)' : 'transparent',
                    boxShadow: isActive ? '0 2px 10px rgba(146, 68, 36, 0.35)' : 'none',
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} style={{ flexShrink: 0, color: isActive ? '#FFFFFF' : '#CBD5E1' }} />
                  {!collapsed && (
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                  )}
                  {!collapsed && item.badge && !isActive && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: '#1E293B',
                        color: '#CBD5E1',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>

          <div
            style={{
              margin: '24px 0 12px 0',
              borderTop: '1px solid #1E293B',
              paddingTop: 16,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#64748B',
              paddingLeft: collapsed ? 0 : 12,
              textAlign: collapsed ? 'center' : 'left',
            }}
          >
            {collapsed ? '•' : 'Storefront'}
          </div>

          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: collapsed ? '12px 0' : '10px 14px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              color: '#94A3B8',
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              transition: 'all 0.18s ease',
            }}
            title="Open Live Marketplace"
          >
            <ExternalLink size={16} style={{ flexShrink: 0, color: '#38BDF8' }} />
            {!collapsed && <span>Marketplace View</span>}
          </a>
        </div>

        {/* User Badge / Footer */}
        <div
          style={{
            padding: collapsed ? '16px 8px' : '16px 20px',
            borderTop: '1px solid #1E293B',
            backgroundColor: '#090D16',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'var(--color-rust)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
              color: '#FFFFFF',
              flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>

          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.name || 'Administrator'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#94A3B8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.email || 'admin@garagemarket.ph'}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
