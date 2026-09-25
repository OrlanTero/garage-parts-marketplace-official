import client from './client.js'

export const carsApi = {
  list: (params = {}) => client.get('/marketplace/cars', { params }).then((r) => r.data),
  get: (id) => client.get(`/marketplace/cars/${id}`).then((r) => r.data),
  create: (data) => client.post('/seller/cars', data).then((r) => r.data),
  update: (id, data) => client.put(`/seller/cars/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/seller/cars/${id}`).then((r) => r.data),
  publish: (id) => client.post(`/seller/cars/${id}/publish`).then((r) => r.data),
  unpublish: (id) => client.post(`/seller/cars/${id}/unpublish`).then((r) => r.data),
  uploadMedia: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
  uploadMultiple: (files) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files[]', file)
    })
    return client.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}
