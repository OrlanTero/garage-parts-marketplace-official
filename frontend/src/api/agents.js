import client from './client.js'

/**
 * Sales Agent & Product Sharing API client module.
 */
export const agentsApi = {
  verify: (code) => client.get(`/agents/verify/${encodeURIComponent(code)}`).then((r) => r.data),
  getStats: () => client.get('/agent/stats').then((r) => r.data),
  getSubscription: () => client.get('/agent/subscription').then((r) => r.data?.subscription ?? r.data),
  subscribe: (payload = {}) => client.post('/agent/subscribe', payload).then((r) => r.data),
  updateProfile: (payload) => client.post('/agent/profile', payload).then((r) => r.data),
}

export default agentsApi
