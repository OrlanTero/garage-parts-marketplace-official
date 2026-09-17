import client from './client.js'

export const carsApi = {
  list: (params = {}) => client.get('/marketplace/cars', { params }).then((r) => r.data),
  get: (id) => client.get(`/marketplace/cars/${id}`).then((r) => r.data),
}
