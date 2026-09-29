import client from './client.js'

/**
 * Account settings — profile, password, and address book.
 */
export const accountApi = {
  updateProfile: (payload) =>
    client.patch('/auth/profile', payload).then((r) => r.data),
  changePassword: (payload) =>
    client.post('/auth/password', payload).then((r) => r.data),

  // Address book
  listAddresses: () => client.get('/addresses').then((r) => r.data?.data ?? r.data ?? []),
  createAddress: (payload) =>
    client.post('/addresses', payload).then((r) => r.data?.data ?? r.data),
  updateAddress: (id, payload) =>
    client.put(`/addresses/${id}`, payload).then((r) => r.data?.data ?? r.data),
  deleteAddress: (id) => client.delete(`/addresses/${id}`).then((r) => r.data),
  setDefaultAddress: (id) =>
    client.post(`/addresses/${id}/default`).then((r) => r.data?.data ?? r.data),
}

export const ADDRESS_LABELS = ['Home', 'Office', 'Warehouse', 'Garage', 'Province', 'Other']

export default accountApi
