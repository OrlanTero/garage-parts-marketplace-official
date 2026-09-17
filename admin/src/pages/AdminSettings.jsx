import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings,
  Shield,
  Key,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  User,
  Mail,
  Lock,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

export default function AdminSettings() {
  const { user, token, logout, logoutAll } = useAuth()
  const navigate = useNavigate()
  const [successMessage, setSuccessMessage] = useState(null)

  const handleLogoutCurrent = async () => {
    await logout()
    navigate('/login')
  }

  const handleLogoutAll = async () => {
    if (window.confirm('Revoke all tokens across all logged-in admin devices?')) {
      await logoutAll()
      navigate('/login')
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            fontWeight: 800,
            color: 'var(--admin-text-primary)',
            margin: '0 0 4px 0',
          }}
        >
          Administrator Account & Security Settings
        </h1>
        <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
          Manage your operational credentials, active Sanctum authentication tokens, and session security.
        </p>
      </div>

      {successMessage && (
        <div
          style={{
            backgroundColor: 'var(--admin-success-bg)',
            border: '1px solid #A7F3D0',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            color: '#047857',
            fontSize: 14,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Admin Profile Card */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={20} style={{ color: 'var(--color-rust)' }} />
            <h2 className="admin-card-title">Active Operator Profile</h2>
          </div>
          <span className="badge badge-admin">Administrator Role</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
              Full Name
            </label>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--admin-text-primary)' }}>
              {user?.name || 'Garage Admin'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
              Email Address
            </label>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--admin-text-primary)' }}>
              {user?.email || 'admin@garagemarket.ph'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
              Account Scope
            </label>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-rust)' }}>
              All Showrooms & System Probes
            </div>
          </div>
        </div>
      </div>

      {/* Security & Token Session Card */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Key size={20} style={{ color: 'var(--color-steel)' }} />
            <h2 className="admin-card-title">Sanctum Bearer Session Token</h2>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Current Token (Encrypted Session Identifier)
          </label>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--admin-bg-subtle)',
              border: '1px solid var(--admin-border)',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 13,
              color: 'var(--admin-text-secondary)',
              wordBreak: 'break-all',
            }}
          >
            {token ? `${token.substring(0, 24)}...${token.substring(token.length - 8)}` : 'No active token'}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            onClick={handleLogoutCurrent}
            className="btn btn-secondary btn-sm"
          >
            <LogOut size={14} />
            <span>Logout Current Browser Session</span>
          </button>

          <button
            type="button"
            onClick={handleLogoutAll}
            className="btn btn-danger btn-sm"
          >
            <Shield size={14} />
            <span>Revoke All Device Tokens (Force Re-auth)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
