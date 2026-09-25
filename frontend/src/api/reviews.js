import client from './client.js'

/**
 * Listing reviews — stars + comment on cars and parts.
 * Reviewer identity is username + avatar only, enforced by the backend.
 */
export const reviewsApi = {
  list: (params = {}) => client.get('/reviews', { params }).then((r) => r.data),
  summary: (params = {}) => client.get('/reviews/summary', { params }).then((r) => r.data?.data ?? r.data),
  mine: (params = {}) => client.get('/reviews/mine', { params }).then((r) => r.data?.data ?? r.data),
  create: (payload) => client.post('/reviews', payload).then((r) => r.data?.data ?? r.data),
  update: (id, payload) => client.put(`/reviews/${id}`, payload).then((r) => r.data?.data ?? r.data),
  remove: (id) => client.delete(`/reviews/${id}`).then((r) => r.data),
}

export default reviewsApi
