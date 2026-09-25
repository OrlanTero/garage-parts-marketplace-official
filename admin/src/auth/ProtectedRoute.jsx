import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { ShieldAlert, Loader2 } from 'lucide-react'

export function ProtectedRoute({ children }) {
  const { isLoading, isAuthenticated, isStaff, user, logout } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0F172A', color: '#F8FAFC' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-rust)', marginBottom: 16 }} />
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8' }}>
          VERIFYING ADMIN SECURITY SESSION...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isStaff) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', padding: 24 }}>
        <div className="admin-card" style={{ maxWidth: 480, width: '100%', textAlign: 'center', border: '1px solid #334155', background: '#1E293B', color: '#F8FAFC' }}>
          <div style={{ display: 'inline-flex', padding: 16, background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', color: '#EF4444', marginBottom: 20 }}>
            <ShieldAlert size={48} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 8, color: '#FFFFFF' }}>
            Restricted Staff Area
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            The account <strong>{user?.email}</strong> is registered as a <span className="badge badge-warning">{user?.role}</span>. Staff privileges (admin or inspector) are strictly required to access the Garage Parts operational portal.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={logout}>
              Sign In With Staff Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children ? children : <Outlet />
}
