import axios from 'axios'
import { tokenStorage } from '../auth/tokenStorage.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1'

// Sanctum Bearer-token HTTP client (stateless).
// Backend is now stateless (no statefulApi) so NO CSRF is required for
// register/login. We keep withCredentials:false to avoid triggering
// Sanctum's stateful path that caused the 419.
const client = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  withCredentials: false,
  headers: { Accept: 'application/json' },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

// Optional helper if you ever re-enable stateful cookie auth:
// export const getCsrfCookie = () =>
//   axios.get(`${API_URL}/sanctum/csrf-cookie`, { withCredentials: true })

client.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Drop dead tokens so AuthProvider falls back to guest instead of looping 401s.
client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && tokenStorage.get()) tokenStorage.clear()
    return Promise.reject(error)
  },
)

export const api = {
  health: () => client.get('/health').then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
}

export default client
