import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  X as CloseIcon, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Phone, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import './AuthModal.css'

const ROLES = [
  { value: 'buyer', label: 'Buyer (Shop cars & parts)' },
  { value: 'seller', label: 'Seller (List & sell builds)' },
  { value: 'dealer', label: 'Dealer (Dealership & inventory)' },
  { value: 'parts_seller', label: 'Parts Seller (Auto parts & accessories)' },
]

export default function AuthModal({ isOpen, initialView = 'login', onClose, onSuccess }) {
  const { login, register, startOAuth } = useAuth()
  const navigate = useNavigate()
  const modalRef = useRef(null)

  const [activeTab, setActiveTab] = useState(initialView) // 'login' | 'register'
  
  // Login state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [showLoginPw, setShowLoginPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Register state
  const [regForm, setRegForm] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    username: '',
    role: 'buyer',
    password: '',
    password_confirmation: '',
    agree: true,
  })
  const [showRegPw, setShowRegPw] = useState(false)
  const [showRegPw2, setShowRegPw2] = useState(false)

  // General state
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Sync tab when initialView changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialView)
      setError('')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, initialView])

  // Global ESC key listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setError('')
  }

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!loginForm.email.trim() || !loginForm.password) {
      setError('Email and password are required.')
      return
    }

    setLoading(true)
    try {
      await login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      })
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Sign in failed. Check your credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Handle Register Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!regForm.firstName.trim() || !regForm.lastName.trim()) {
      setError('First and last name are required.')
      return
    }
    if (!regForm.username.trim()) {
      setError('Username is required.')
      return
    }
    if (regForm.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (regForm.password !== regForm.password_confirmation) {
      setError('Passwords do not match.')
      return
    }
    if (!regForm.agree) {
      setError('Please agree to the Terms and Conditions.')
      return
    }

    setLoading(true)
    try {
      const name = `${regForm.firstName.trim()} ${regForm.lastName.trim()}`
      await register({
        name,
        email: regForm.email.trim() || `${regForm.username.trim().toLowerCase()}@placeholder.local`,
        password: regForm.password,
        password_confirmation: regForm.password_confirmation,
        role: regForm.role,
      })
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      const data = err.response?.data
      const msg = data?.message || (data?.errors && Object.values(data.errors).flat().join(' ')) || 'Could not create account.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Account Authentication">
      <div 
        ref={modalRef} 
        className={`auth-modal-container ${activeTab === 'register' ? 'auth-modal-container--wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Bar / Handle */}
        <div className="auth-modal-handle" aria-hidden="true" />

        {/* Close Button */}
        <button 
          type="button" 
          className="auth-modal-close" 
          onClick={onClose} 
          aria-label="Close authentication dialog"
        >
          <CloseIcon size={20} />
        </button>

        {/* Brand Banner */}
        <div className="auth-modal-brand">
          <img 
            src="/logos/logo-vector.svg" 
            alt="Garage Logo" 
            className="auth-modal-logo" 
            width="44"
            height="44"
          />
          <div className="auth-modal-brand-text">
            <span className="auth-modal-title">GARAGE</span>
            <span className="auth-modal-sub">Parts & Cars Marketplace</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="auth-modal-tabs">
          <button 
            type="button" 
            className={`auth-modal-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('login')}
          >
            Sign In
          </button>
          <button 
            type="button" 
            className={`auth-modal-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('register')}
          >
            Create Account
          </button>
        </div>

        {/* Heading text */}
        <div className="auth-modal-heading">
          <h3>
            {activeTab === 'login' ? 'Welcome Back, Builder' : 'Join Philippines’ Auto Marketplace'}
          </h3>
          <p>
            {activeTab === 'login' 
              ? 'Access your verified orders, saved wishlist, and garage inquiries.' 
              : 'Buy genuine JDM/OEM parts and sell project builds directly.'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="auth-modal-error">
            <AlertCircle size={16} className="auth-error-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="auth-modal-body">
          {activeTab === 'login' ? (
            /* ==================== SIGN IN FORM ==================== */
            <form onSubmit={handleLoginSubmit} className="auth-modal-form">
              <div className="form-group">
                <label className="field-label" htmlFor="modal-login-email">Email or Username</label>
                <div className="input-wrap">
                  <Mail size={16} className="input-leading-icon" />
                  <input
                    id="modal-login-email"
                    type="email"
                    className="field-input field-input--with-icon"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="label-row">
                  <label className="field-label" htmlFor="modal-login-password">Password</label>
                  <a href="#" onClick={(e) => e.preventDefault()} className="forgot-pw-link">Forgot password?</a>
                </div>
                <div className="input-wrap">
                  <Lock size={16} className="input-leading-icon" />
                  <input
                    id="modal-login-password"
                    type={showLoginPw ? 'text' : 'password'}
                    className="field-input field-input--with-icon field-input--with-trailing"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                  <button 
                    type="button" 
                    className="eye-btn" 
                    onClick={() => setShowLoginPw(!showLoginPw)}
                    aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-options-row">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)} 
                  />
                  <span>Keep me signed in</span>
                </label>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary auth-submit-btn" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Garage</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="auth-modal-divider">
                <span>Or continue with</span>
              </div>

              <div className="oauth-button-grid">
                <button 
                  type="button" 
                  className="oauth-btn" 
                  onClick={() => startOAuth('google')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.4 7.34 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.02-3.13z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.6 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                  </svg>
                  <span>Google Account</span>
                </button>
              </div>

              <div className="auth-modal-switch">
                <span>Don’t have an account?</span>
                <button 
                  type="button" 
                  className="switch-link-btn"
                  onClick={() => handleTabSwitch('register')}
                >
                  Create one now
                </button>
              </div>
            </form>
          ) : (
            /* ==================== SIGN UP FORM ==================== */
            <form onSubmit={handleRegisterSubmit} className="auth-modal-form">
              <div className="two-col-grid">
                <div className="form-group">
                  <label className="field-label" htmlFor="modal-reg-first">First Name <span className="req">*</span></label>
                  <input
                    id="modal-reg-first"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Juan"
                    value={regForm.firstName}
                    onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="field-label" htmlFor="modal-reg-last">Last Name <span className="req">*</span></label>
                  <input
                    id="modal-reg-last"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Dela Cruz"
                    value={regForm.lastName}
                    onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="two-col-grid">
                <div className="form-group">
                  <label className="field-label" htmlFor="modal-reg-mobile">Mobile Number <span className="req">*</span></label>
                  <div className="input-wrap">
                    <Phone size={16} className="input-leading-icon" />
                    <input
                      id="modal-reg-mobile"
                      type="tel"
                      className="field-input field-input--with-icon"
                      placeholder="0917-123-4567"
                      value={regForm.mobile}
                      onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="field-label" htmlFor="modal-reg-email">Email Address</label>
                  <div className="input-wrap">
                    <Mail size={16} className="input-leading-icon" />
                    <input
                      id="modal-reg-email"
                      type="email"
                      className="field-input field-input--with-icon"
                      placeholder="you@example.com"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="two-col-grid">
                <div className="form-group">
                  <label className="field-label" htmlFor="modal-reg-username">Username <span className="req">*</span></label>
                  <div className="input-wrap">
                    <User size={16} className="input-leading-icon" />
                    <input
                      id="modal-reg-username"
                      type="text"
                      className="field-input field-input--with-icon"
                      placeholder="juandelacruz"
                      value={regForm.username}
                      onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="field-label" htmlFor="modal-reg-role">Account Type</label>
                  <select
                    id="modal-reg-role"
                    className="field-input"
                    value={regForm.role}
                    onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="two-col-grid">
                <div className="form-group">
                  <label className="field-label" htmlFor="modal-reg-pw">Password (8+ chars) <span className="req">*</span></label>
                  <div className="input-wrap">
                    <Lock size={16} className="input-leading-icon" />
                    <input
                      id="modal-reg-pw"
                      type={showRegPw ? 'text' : 'password'}
                      className="field-input field-input--with-icon field-input--with-trailing"
                      placeholder="••••••••"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      required
                    />
                    <button 
                      type="button" 
                      className="eye-btn" 
                      onClick={() => setShowRegPw(!showRegPw)}
                      aria-label="Toggle password"
                    >
                      {showRegPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="field-label" htmlFor="modal-reg-pw2">Confirm Password <span className="req">*</span></label>
                  <div className="input-wrap">
                    <Lock size={16} className="input-leading-icon" />
                    <input
                      id="modal-reg-pw2"
                      type={showRegPw2 ? 'text' : 'password'}
                      className="field-input field-input--with-icon field-input--with-trailing"
                      placeholder="••••••••"
                      value={regForm.password_confirmation}
                      onChange={(e) => setRegForm({ ...regForm, password_confirmation: e.target.value })}
                      required
                    />
                    <button 
                      type="button" 
                      className="eye-btn" 
                      onClick={() => setShowRegPw2(!showRegPw2)}
                      aria-label="Toggle confirmation"
                    >
                      {showRegPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="terms-checkbox-wrap">
                <label className="checkbox-label" style={{ alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={regForm.agree}
                    onChange={(e) => setRegForm({ ...regForm, agree: e.target.checked })}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ fontSize: 13, lineHeight: 1.4 }}>
                    I agree to the <a href="#" onClick={(e) => e.preventDefault()} style={{ fontWeight: 700, color: 'var(--color-rust)' }}>Garage Marketplace Terms of Service</a> & <a href="#" onClick={(e) => e.preventDefault()} style={{ fontWeight: 700, color: 'var(--color-rust)' }}>Privacy Policy</a>.
                  </span>
                </label>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary auth-submit-btn" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Garage Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="auth-modal-switch">
                <span>Already have an account?</span>
                <button 
                  type="button" 
                  className="switch-link-btn"
                  onClick={() => handleTabSwitch('login')}
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Footer */}
        <div className="auth-modal-footer">
          <ShieldCheck size={14} className="security-icon" />
          <span>256-bit Encrypted · Verified Seller & Secure Buyer Protection</span>
        </div>
      </div>
    </div>
  )
}
