import client from '../api/client.js'
import { tokenStorage } from './tokenStorage.js'

/**
 * Pure session manager — backend ↔ frontend core. No JSX, no pages.
 *
 * Contract mirrors backend UserResource + { token, token_type, user } payloads.
 * Roles: 'buyer' | 'seller'. OAuth providers: 'google' | 'facebook' | 'github'.
 */

export const SUPPORTED_ROLES = ['buyer', 'seller']
export const SUPPORTED_OAUTH_PROVIDERS = ['google', 'facebook', 'github']

function unwrapSession(payload) {
  const token = payload?.token ?? null
  const user = payload?.user ?? null
  if (token) tokenStorage.set(token)
  return { token, user }
}

export const sessionManager = {
  // --- Credential flows ---
  register: ({ name, email, password, password_confirmation, role = 'buyer' }) =>
    client
      .post('/auth/register', { name, email, password, password_confirmation, role })
      .then((r) => unwrapSession(r.data)),

  login: ({ email, password, device_name }) =>
    client.post('/auth/login', { email, password, device_name }).then((r) => unwrapSession(r.data)),

  logout: () =>
    client
      .post('/auth/logout')
      .catch(() => null)
      .finally(() => tokenStorage.clear()),

  logoutAll: () =>
    client
      .post('/auth/logout-all')
      .catch(() => null)
      .finally(() => tokenStorage.clear()),

  me: () => client.get('/auth/me').then((r) => r.data),

  // --- OAuth flows ---
  /** Ask backend for the provider URL (role travels as signup intent). */
  oauthRedirectUrl: (provider, role = 'buyer') => {
    if (!SUPPORTED_OAUTH_PROVIDERS.includes(provider)) throw new Error(`Unsupported provider: ${provider}`)
    return client
      .get(`/auth/oauth/${provider}/redirect`, { params: { role } })
      .then((r) => r.data.url)
  },

  /** Full browser redirect (used by the login screen later). */
  startOAuth: (provider, role = 'buyer') =>
    sessionManager.oauthRedirectUrl(provider, role).then((url) => {
      window.location.assign(url)
    }),

  /**
   * Called on the /oauth/callback route (built later): pulls ?token= from the URL,
   * persists it, fetches the user. Returns { token, user }.
   */
  handleOAuthCallbackUrl: (url = window.location.href) => {
    const params = new URL(url).searchParams
    const token = params.get('token')
    if (!token) throw new Error('OAuth callback missing ?token=')
    tokenStorage.set(token)
    return sessionManager.me().then((user) => ({ token, user }))
  },

  // --- Helpers for route guards (screens built later) ---
  hasRole: (user, ...roles) => !!user && roles.includes(user?.role),
  isBuyer: (user) => user?.role === 'buyer',
  isSeller: (user) => user?.role === 'seller',
}
