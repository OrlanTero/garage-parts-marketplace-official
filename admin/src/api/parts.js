import client from './client.js'

export const partsApi = {
  list: (params = {}) => client.get('/marketplace/parts', { params }).then((r) => r.data),
  get: (id) => client.get(`/marketplace/parts/${id}`).then((r) => r.data),
  create: (data) => client.post('/seller/parts', data).then((r) => r.data),
  update: (id, data) => client.put(`/seller/parts/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/seller/parts/${id}`).then((r) => r.data),
  publish: (id) => client.post(`/seller/parts/${id}/publish`).then((r) => r.data),
  unpublish: (id) => client.post(`/seller/parts/${id}/unpublish`).then((r) => r.data),
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
