import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Wrench,
  KeyRound,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('admin@garagemarket.ph')
  const [password, setPassword] = useState('password')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      await login({
        email: email.trim(),
        password,
        device_name: 'admin-browser-session',
      })
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Authentication failed. Please verify administrator credentials.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickFill = () => {
    setEmail('admin@garagemarket.ph')
    setPassword('password')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090D16',
        backgroundImage:
          'radial-gradient(at 0% 0%, rgba(146, 68, 36, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(44, 66, 80, 0.2) 0px, transparent 50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: '#F8FAFC',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#0F172A',
          borderRadius: 20,
          border: '1px solid #1E293B',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '36px 32px',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--color-rust) 0%, #3A1E12 100%)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(146, 68, 36, 0.4)',
              marginBottom: 16,
            }}
          >
            <Wrench size={28} />
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 6px 0',
            }}
          >
            GARAGE<span style={{ color: 'var(--color-orange)' }}>OPS</span>
          </h1>
          <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>
            Automotive Operations & Admin Control Portal
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 24,
              color: '#FCA5A5',
              fontSize: 13,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1, color: '#EF4444' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#CBD5E1',
                marginBottom: 8,
              }}
            >
              Admin Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@garagemarket.ph"
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 42px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#CBD5E1',
                marginBottom: 8,
              }}
            >
              Master Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                }}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 42px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px 20px',
              fontSize: 15,
              borderRadius: 10,
              marginTop: 6,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Authenticating Admin...</span>
              </>
            ) : (
              <>
                <span>Sign In to Control Center</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Quick Fill */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid #1E293B',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
            Seeded Admin Account
          </div>
          <button
            type="button"
            onClick={handleQuickFill}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              backgroundColor: '#1E293B',
              border: '1px dashed #334155',
              borderRadius: 8,
              color: '#CBD5E1',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <KeyRound size={14} style={{ color: 'var(--color-orange)' }} />
            <span>Fill Seeded Credentials (`admin@garagemarket.ph`)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
