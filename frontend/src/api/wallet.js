import client from './client.js'

export const walletApi = {
  summary: () => client.get('/wallet').then((r) => r.data?.data ?? r.data),
  statements: (params = {}) =>
    client.get('/wallet/statements', { params }).then((r) => r.data),

  accounts: () => client.get('/payout-accounts').then((r) => r.data?.data ?? r.data ?? []),
  createAccount: (payload) =>
    client.post('/payout-accounts', payload).then((r) => r.data?.data ?? r.data),
  updateAccount: (id, payload) =>
    client.patch(`/payout-accounts/${id}`, payload).then((r) => r.data?.data ?? r.data),
  deleteAccount: (id) =>
    client.delete(`/payout-accounts/${id}`).then((r) => r.data),

  withdrawals: (params = {}) =>
    client.get('/withdrawals', { params }).then((r) => r.data),
  withdraw: (payload) =>
    client.post('/withdrawals', payload).then((r) => r.data),

  analytics: () => client.get('/seller/analytics').then((r) => r.data?.data ?? r.data),
}

export default walletApi
