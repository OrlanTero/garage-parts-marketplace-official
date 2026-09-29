import client from './client.js'

/**
 * Platform Treasury, Wallet & Funds Management API
 */
export const adminFundsApi = {
  getOverview: () => client.get('/admin/funds/overview').then((r) => r.data?.data ?? r.data),
  listTransactions: (params = {}) => client.get('/admin/funds/transactions', { params }).then((r) => r.data),
  getTransaction: (id) => client.get(`/admin/funds/transactions/${id}`).then((r) => r.data?.data ?? r.data),
  generateReport: (params = {}) => client.get('/admin/funds/report', { params }).then((r) => r.data?.data ?? r.data),
  /**
   * Authenticated CSV download. A plain <a href> can't send the Bearer
   * token (and a relative URL hits the Vite dev server, not the API),
   * so fetch via the authed client and trigger a blob download instead.
   * Undefined / empty params are stripped — never sent as literals.
   */
  downloadReportCsv: async (params = {}) => {
    const clean = Object.fromEntries(
      Object.entries({ ...params, format: 'csv' }).filter(
        ([, v]) => v !== undefined && v !== null && v !== '',
      ),
    )
    const res = await client.get('/admin/funds/report', { params: clean, responseType: 'blob' })
    const disposition = res.headers?.['content-disposition'] || ''
    const match = disposition.match(/filename="?([^";]+)"?/)
    const filename = match?.[1] || `garage_treasury_report_${Date.now()}.csv`
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    return filename
  },
}
