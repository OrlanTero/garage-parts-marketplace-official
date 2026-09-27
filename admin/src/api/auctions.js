import client from './client.js'

export const adminAuctionsApi = {
  list: (params = {}) => client.get('/admin/auctions', { params }).then((r) => r.data),
  get: (id) => client.get(`/admin/auctions/${id}`).then((r) => r.data?.data ?? r.data),
  create: (data) => client.post('/admin/auctions', data).then((r) => r.data),
  update: (id, data) => client.put(`/admin/auctions/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/admin/auctions/${id}`).then((r) => r.data),
  end: (id, data = {}) => client.post(`/admin/auctions/${id}/end`, data).then((r) => r.data),
  extend: (id, minutes = 60) => client.post(`/admin/auctions/${id}/extend`, { minutes }).then((r) => r.data),
}
