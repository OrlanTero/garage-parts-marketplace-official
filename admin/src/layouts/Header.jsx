import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Activity,
  Bell,
  LogOut,
  User,
  Shield,
  Settings,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { healthApi } from '../api/health.js'

export function Header({ setMobileOpen }) {
  const { user, logout, logoutAll } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [healthStatus, setHealthStatus] = useState('checking') // checking | online | offline
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Poll health status once on mount
  useEffect(() => {
    let mounted = true
    healthApi
      .check()
      .then((res) => {
        if (mounted) {
          setHealthStatus(res?.status === 'ok' ? 'online' : 'degraded')
        }
      })
      .catch(() => {
        if (mounted) {
          setHealthStatus('offline')
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleLogoutAll = async () => {
    if (window.confirm('Are you sure you want to invalidate all active admin sessions?')) {
      await logoutAll()
      navigate('/login')
    }
  }

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--admin-bg-header)',
        borderBottom: '1px solid var(--admin-border)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Left: Mobile Trigger & Quick Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, maxWidth: 500 }}>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            padding: 8,
            color: 'var(--admin-text-secondary)',
            cursor: 'pointer',
          }}
          className="mobile-toggle-btn"
          aria-label="Open sidebar menu"
        >
          <Menu size={22} />
        </button>

        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 380,
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--admin-text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search cars, parts, users, or logs..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid var(--admin-border)',
              backgroundColor: 'var(--admin-bg-subtle)',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                navigate(`/cars?q=${encodeURIComponent(e.target.value.trim())}`)
              }
            }}
          />
        </div>
      </div>

      {/* Right: Status Pill & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} ref={dropdownRef}>
        {/* System Health Status Indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor:
              healthStatus === 'online'
                ? 'var(--admin-success-bg)'
                : healthStatus === 'checking'
                ? 'var(--admin-bg-subtle)'
                : 'var(--admin-danger-bg)',
            border: `1px solid ${
              healthStatus === 'online'
                ? '#A7F3D0'
                : healthStatus === 'checking'
                ? 'var(--admin-border)'
                : '#FECACA'
            }`,
            fontSize: 12,
            fontWeight: 600,
            color:
              healthStatus === 'online'
                ? '#047857'
                : healthStatus === 'checking'
                ? 'var(--admin-text-muted)'
                : '#B91C1C',
          }}
          title="Backend API Cluster Health"
        >
          {healthStatus === 'online' ? (
            <CheckCircle2 size={14} />
          ) : healthStatus === 'checking' ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <AlertCircle size={14} />
          )}
          <span>{healthStatus === 'online' ? 'API Online' : healthStatus === 'checking' ? 'Checking...' : 'API Degraded'}</span>
        </div>

        {/* User Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 10px',
              borderRadius: 8,
              background: dropdownOpen ? 'var(--admin-bg-subtle)' : 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-rust) 0%, #3A1E12 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)', lineHeight: 1.2 }}>
                {user?.name || 'Admin'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-rust)', fontWeight: 600, textTransform: 'uppercase' }}>
                ADMINISTRATOR
              </span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--admin-text-muted)', marginLeft: 4 }} />
          </button>

          {/* Dropdown Menu Popup */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: 240,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                boxShadow: 'var(--shadow-dropdown)',
                border: '1px solid var(--admin-border)',
                padding: '8px 0',
                zIndex: 60,
                animation: 'fadeIn 0.15s ease',
              }}
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--admin-border-subtle)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </div>
              </div>

              <div style={{ padding: '6px 0' }}>
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 16px',
                    fontSize: 13,
                    color: 'var(--admin-text-secondary)',
                    fontWeight: 500,
                  }}
                >
                  <Settings size={16} />
                  <span>Admin Settings</span>
                </Link>
                <Link
                  to="/system"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 16px',
                    fontSize: 13,
                    color: 'var(--admin-text-secondary)',
                    fontWeight: 500,
                  }}
                >
                  <Activity size={16} />
                  <span>System Diagnostics</span>
                </Link>
              </div>

              <div style={{ borderTop: '1px solid var(--admin-border-subtle)', padding: '6px 0' }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 16px',
                    fontSize: 13,
                    color: 'var(--admin-danger)',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                  }}
                >
                  <LogOut size={16} />
                  <span>Logout Current Session</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogoutAll}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 16px',
                    fontSize: 12,
                    color: 'var(--admin-text-muted)',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                  }}
                >
                  <Shield size={16} />
                  <span>Revoke All Device Tokens</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
