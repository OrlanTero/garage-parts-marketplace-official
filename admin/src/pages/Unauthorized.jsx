import { ShieldAlert, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Unauthorized() {
  const { user, logout } = useAuth()

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="admin-card"
        style={{
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
          padding: 36,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: 16,
            backgroundColor: 'var(--admin-danger-bg)',
            color: 'var(--admin-danger)',
            borderRadius: '50%',
            marginBottom: 20,
          }}
        >
          <ShieldAlert size={44} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            fontWeight: 800,
            color: 'var(--admin-text-primary)',
            marginBottom: 8,
          }}
        >
          403 — Unauthorized Access
        </h1>

        <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          You are currently signed in as <strong>{user?.email || 'Guest'}</strong> (Role: <span className="badge badge-warning">{user?.role || 'user'}</span>).
          This management section requires verified Administrator privileges.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={logout}>
            <LogOut size={16} />
            <span>Sign In With Admin Account</span>
          </button>
        </div>
      </div>
    </div>
  )
}
