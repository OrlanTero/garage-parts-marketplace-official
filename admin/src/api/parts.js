import client from './client.js'

export const partsApi = {
  list: (params = {}) => client.get('/marketplace/parts', { params }).then((r) => r.data),
  get: (id) => client.get(`/marketplace/parts/${id}`).then((r) => r.data),
}
