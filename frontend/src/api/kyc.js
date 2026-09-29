import client from './client.js'

export const kycApi = {
  getStatus: () => client.get('/kyc/status').then((r) => r.data),
  submit: (formData) =>
    client
      .post('/kyc/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((r) => r.data),
}
