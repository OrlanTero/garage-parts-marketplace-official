import axios from 'axios'
import { tokenStorage } from '../auth/tokenStorage.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1'

/**
 * Admin Axios Client
 * Seamlessly injects Bearer token for Sanctum authentication and purges stale credentials upon 401.
 */
const client = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && tokenStorage.get()) {
      tokenStorage.clear()
    }
    return Promise.reject(error)
  },
)

export default client
