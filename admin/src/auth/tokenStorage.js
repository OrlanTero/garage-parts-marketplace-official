/**
 * Admin Token Storage
 * Single source of truth for persisting admin session authentication tokens.
 */

const ADMIN_TOKEN_KEY = 'garage_admin_auth_token'

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      if (token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, token)
      } else {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
      }
    } catch {
      /* storage unavailable in restricted private context */
    }
  },
  clear() {
    this.set(null)
  },
}
