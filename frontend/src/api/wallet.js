import client from './client.js'

export const walletApi = {
  summary: () => client.get('/seller/wallet').then((r) => r.data?.data ?? r.data),
  statements: (params = {}) =>
    client.get('/seller/wallet/statements', { params }).then((r) => r.data),

  accounts: () => client.get('/seller/payout-accounts').then((r) => r.data?.data ?? r.data ?? []),
  createAccount: (payload) =>
    client.post('/seller/payout-accounts', payload).then((r) => r.data?.data ?? r.data),
  updateAccount: (id, payload) =>
    client.patch(`/seller/payout-accounts/${id}`, payload).then((r) => r.data?.data ?? r.data),
  deleteAccount: (id) =>
    client.delete(`/seller/payout-accounts/${id}`).then((r) => r.data),

  withdrawals: (params = {}) =>
    client.get('/seller/withdrawals', { params }).then((r) => r.data),
  withdraw: (payload) =>
    client.post('/seller/withdrawals', payload).then((r) => r.data),

  analytics: () => client.get('/seller/analytics').then((r) => r.data?.data ?? r.data),
}

export default walletApi
