import client from './client.js'

/**
 * Platform Treasury, Wallet & Funds Management API
 */
export const adminFundsApi = {
  getOverview: () => client.get('/admin/funds/overview').then((r) => r.data?.data ?? r.data),
  listTransactions: (params = {}) => client.get('/admin/funds/transactions', { params }).then((r) => r.data),
  getTransaction: (id) => client.get(`/admin/funds/transactions/${id}`).then((r) => r.data?.data ?? r.data),
  generateReport: (params = {}) => client.get('/admin/funds/report', { params }).then((r) => r.data?.data ?? r.data),
  exportReportCsvUrl: (params = {}) => {
    const query = new URLSearchParams({ ...params, format: 'csv' }).toString()
    return `/api/v1/admin/funds/report?${query}`
  },
}
