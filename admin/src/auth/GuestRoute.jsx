import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { Loader2 } from 'lucide-react'

export function GuestRoute({ children }) {
  const { isLoading, isAuthenticated, isStaff } = useAuth()

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-rust)' }} />
      </div>
    )
  }

  if (isAuthenticated && isStaff) {
    return <Navigate to="/" replace />
  }

  return children ? children : <Outlet />
}
