import client from '../api/client.js'
import { tokenStorage } from './tokenStorage.js'

const STAFF_ROLES = ['admin', 'super_admin', 'inspector']

function unwrapSession(payload) {
  const token = payload?.token ?? null
  const user = payload?.user ?? null

  if (user && !STAFF_ROLES.includes(user.role)) {
    tokenStorage.clear()
    const err = new Error('Access denied. Staff privileges (admin or inspector) are required to access this portal.')
    err.code = 'ROLE_UNAUTHORIZED'
    throw err
  }

  if (token) {
    tokenStorage.set(token)
  }
  return { token, user }
}

export const sessionManager = {
  login: async ({ email, password, device_name = 'admin-control-portal' }) => {
    const response = await client.post('/auth/login', { email, password, device_name })
    return unwrapSession(response.data)
  },

  logout: async () => {
    try {
      await client.post('/auth/logout')
    } catch {
      // Ignore network failures on logout
    } finally {
      tokenStorage.clear()
    }
  },

  logoutAll: async () => {
    try {
      await client.post('/auth/logout-all')
    } catch {
      // Ignore network failures on logout-all
    } finally {
      tokenStorage.clear()
    }
  },

  me: async () => {
    const response = await client.get('/auth/me')
    const user = response.data
    if (user && !STAFF_ROLES.includes(user.role)) {
      tokenStorage.clear()
      const err = new Error('Access denied. Staff privileges are required.')
      err.code = 'ROLE_UNAUTHORIZED'
      throw err
    }
    return user
  },

  isAdmin: (user) => user?.role === 'admin' || user?.role === 'super_admin',
  isStaff: (user) => STAFF_ROLES.includes(user?.role),
  isInspector: (user) => user?.role === 'inspector',
}
