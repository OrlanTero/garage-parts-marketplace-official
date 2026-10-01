import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { sessionManager } from '../auth/sessionManager.js'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * Landing spot for the backend OAuth flow:
 *   /auth/oauth/{provider}/redirect → Google → API callback →
 *   /oauth/callback?token=...&provider=google
 * Persists the token, loads the user, then routes to the setup wizard
 * for fresh accounts or the marketplace for returning ones.
 */
export default function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refresh } = useAuth()
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function finish() {
      try {
        await sessionManager.handleOAuthCallbackUrl(window.location.href)
        const user = await refresh()
        try {
          sessionStorage.removeItem('gpm_oauth_role')
        } catch { /* ignore */ }
        const next = searchParams.get('next')
        if (user?.needs_onboarding) {
          navigate('/welcome', { replace: true })
        } else if (next && next.startsWith('/')) {
          navigate(next, { replace: true })
        } else {
          navigate('/marketplace', { replace: true })
        }
      } catch {
        setError('Google sign-in did not complete. The session token was missing or expired — please try again.')
      }
    }
    finish()
  }, [navigate, refresh, searchParams])

  if (error) {
    return (
      <div className="auth-shell">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <AlertCircle size={36} color="var(--color-error)" style={{ margin: '0 auto 12px' }} />
          <h2 className="auth-title">Sign-in incomplete</h2>
          <p className="auth-subtitle">{error}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/login', { replace: true })}>
              Back to sign in
            </button>
            <Link to="/" className="btn btn-secondary">Home</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <Loader2 size={32} className="spinner" style={{ margin: '0 auto 12px', color: 'var(--color-rust)' }} />
        <h2 className="auth-title">Finishing Google sign-in…</h2>
        <p className="auth-subtitle">Securing your session, one moment.</p>
      </div>
    </div>
  )
}
