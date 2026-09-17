// Pure token persistence — the ONLY place that touches storage for auth.
// No UI here; screens (built later) consume this via sessionManager / AuthContext.

const TOKEN_KEY = 'auth_token'

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable (private mode) — session stays in-memory only */
    }
  },
  clear() {
    this.set(null)
  },
}
