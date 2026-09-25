import client from './client.js'

export const carsApi = {
  list: (params = {}) => client.get('/marketplace/cars', { params }).then((r) => r.data),
  get: (id) => client.get(`/marketplace/cars/${id}`).then((r) => r.data),
  create: (data) => client.post('/seller/cars', data).then((r) => r.data),
  update: (id, data) => client.put(`/seller/cars/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/seller/cars/${id}`).then((r) => r.data),
  publish: (id) => client.post(`/seller/cars/${id}/publish`).then((r) => r.data),
  unpublish: (id) => client.post(`/seller/cars/${id}/unpublish`).then((r) => r.data),
}
