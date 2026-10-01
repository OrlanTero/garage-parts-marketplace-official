import { useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * Google sign-in / create-account button.
 * Uses the backend Socialite redirect flow (no popup, no GIS script):
 * backend builds the Google URL, Google returns to the API callback,
 * which forwards to /oauth/callback?token=... handled by OAuthCallback.
 */
export default function GoogleSignInButton({ role = 'buyer', label = 'Continue with Google', className = '' }) {
  const { startOAuth } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await startOAuth('google', role)
      // Redirects away — no further UI needed.
    } catch {
      setError('Google sign-in is unavailable right now.')
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        className="oauth-btn oauth-btn--google"
        onClick={handleClick}
        disabled={busy}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.4 7.34 24 12 24z" />
          <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.02-3.13z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.6 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
        </svg>
        <span>{busy ? 'Opening Google…' : label}</span>
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
}
