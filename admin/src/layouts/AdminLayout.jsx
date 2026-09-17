import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { Header } from './Header.jsx'
import { Breadcrumbs } from './Breadcrumbs.jsx'

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="admin-app">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="admin-main-wrapper">
        <Header setMobileOpen={setMobileOpen} />

        <main className="admin-content">
          <Breadcrumbs />
          <Outlet />
        </main>

        <footer
          style={{
            padding: '16px 32px',
            borderTop: '1px solid var(--admin-border)',
            backgroundColor: '#FFFFFF',
            fontSize: 12,
            color: 'var(--admin-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'auto',
          }}
        >
          <div>
            <strong>Garage Parts & Builds</strong> · Admin Operations Control Center
          </div>
          <div>
            System Version 1.0.0 · Laravel 11 / React 18 / Reverb WebSocket
          </div>
        </footer>
      </div>
    </div>
  )
}
