import client from './client.js'

export const wantedApi = {
  list: (params = {}) => client.get('/wanted-requests', { params }).then((r) => r.data),
  show: (id) => client.get(`/wanted-requests/${id}`).then((r) => r.data?.data ?? r.data),
  create: (payload) => client.post('/wanted-requests', payload).then((r) => r.data?.data ?? r.data),
  update: (id, payload) => client.patch(`/wanted-requests/${id}`, payload).then((r) => r.data?.data ?? r.data),
  setStatus: (id, status) => client.post(`/wanted-requests/${id}/status`, { status }).then((r) => r.data?.data ?? r.data),
  offer: (id, payload) => client.post(`/wanted-requests/${id}/offers`, payload).then((r) => r.data?.data ?? r.data),
  accept: (id, offerId) => client.post(`/wanted-requests/${id}/accept`, { offer_id: offerId }).then((r) => r.data?.data ?? r.data),
  destroy: (id) => client.delete(`/wanted-requests/${id}`).then((r) => r.data),
}
