import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { sessionManager } from './sessionManager.js'
import { tokenStorage } from './tokenStorage.js'

/**
 * Session state provider — wrap <App/> with <AuthProvider> when screens arrive.
 * No UI rendered here; exposes { user, token, status, login, register,
 * logout, logoutAll, refresh, startOAuth } to any component via useAuth().
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | authenticated | guest
  const [authModal, setAuthModal] = useState({ isOpen: false, view: 'login' })

  const openLoginModal = useCallback(() => setAuthModal({ isOpen: true, view: 'login' }), [])
  const openRegisterModal = useCallback(() => setAuthModal({ isOpen: true, view: 'register' }), [])
  const closeAuthModal = useCallback(() => setAuthModal((prev) => ({ ...prev, isOpen: false })), [])

  const refresh = useCallback(async () => {
    if (!tokenStorage.get()) {
      setUser(null)
      setStatus('guest')
      return null
    }
    try {
      const me = await sessionManager.me()
      setUser(me)
      setStatus('authenticated')
      return me
    } catch {
      tokenStorage.clear()
      setUser(null)
      setStatus('guest')
      return null
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // A dead/expired token anywhere (401) drops the session immediately so
  // route guards bounce to /login instead of stranding the user.
  useEffect(() => {
    const onExpired = () => {
      setUser(null)
      setStatus('guest')
    }
    window.addEventListener('gpm:session-expired', onExpired)
    return () => window.removeEventListener('gpm:session-expired', onExpired)
  }, [])

  const login = useCallback(async (input) => {
    const { user: u } = await sessionManager.login(input)
    setUser(u)
    setStatus('authenticated')
    return u
  }, [])

  const register = useCallback(async (input) => {
    const { user: u } = await sessionManager.register(input)
    setUser(u)
    setStatus('authenticated')
    return u
  }, [])

  const logout = useCallback(async () => {
    await sessionManager.logout()
    setUser(null)
    setStatus('guest')
  }, [])

  const logoutAll = useCallback(async () => {
    await sessionManager.logoutAll()
    setUser(null)
    setStatus('guest')
  }, [])

  const value = useMemo(
    () => ({
      user,
      token: tokenStorage.get(),
      status,
      isAuthenticated: status === 'authenticated',
      authModal,
      openLoginModal,
      openRegisterModal,
      closeAuthModal,
      login,
      register,
      logout,
      logoutAll,
      refresh,
      startOAuth: sessionManager.startOAuth,
      hasRole: (...roles) => sessionManager.hasRole(user, ...roles),
    }),
    [user, status, authModal, openLoginModal, openRegisterModal, closeAuthModal, login, register, logout, logoutAll, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>')
  return ctx
}
