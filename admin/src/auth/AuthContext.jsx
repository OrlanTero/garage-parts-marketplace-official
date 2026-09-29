import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { sessionManager } from './sessionManager.js'
import { tokenStorage } from './tokenStorage.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'authenticated' | 'guest'
  const [error, setError] = useState(null)

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
      setError(null)
      return me
    } catch (err) {
      tokenStorage.clear()
      setUser(null)
      setStatus('guest')
      setError(err?.response?.data?.message || err?.message || 'Session expired')
      return null
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (credentials) => {
    setError(null)
    try {
      const { user: u } = await sessionManager.login(credentials)
      setUser(u)
      setStatus('authenticated')
      return u
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Authentication failed'
      setError(msg)
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await sessionManager.logout()
    } finally {
      setUser(null)
      setStatus('guest')
      setError(null)
    }
  }, [])

  const logoutAll = useCallback(async () => {
    try {
      await sessionManager.logoutAll()
    } finally {
      setUser(null)
      setStatus('guest')
      setError(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      token: tokenStorage.get(),
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      role: user?.role || null,
      isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
      isInspector: user?.role === 'inspector',
      isStaff: ['admin', 'super_admin', 'inspector'].includes(user?.role),
      error,
      login,
      logout,
      logoutAll,
      refresh,
      clearError: () => setError(null),
    }),
    [user, status, error, login, logout, logoutAll, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth() must be used within an <AuthProvider>')
  }
  return context
}
