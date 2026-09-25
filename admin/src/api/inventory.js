import client from './client.js'

/**
 * Parts & Catalog Inventory API — suppliers, warehouses/bins, stock ledger,
 * reorder alerts, reports, catalog links, relations, serials.
 * Seller-scoped endpoints (admin role included via middleware).
 */
const unwrapPage = (r) => r.data?.data ?? r.data

export const inventoryApi = {
  // Own parts (stock levels live here) — endpoint caps per_page at 50.
  parts: (params = {}) => client.get('/seller/parts', { params: { per_page: 50, ...params } }).then((r) => r.data),

  // Ledger + reports
  movements: (params = {}) => client.get('/seller/inventory/movements', { params }).then((r) => r.data),
  moveStock: (partId, payload) =>
    client.post(`/seller/parts/${partId}/stock-movements`, payload).then(unwrapPage),
  transferStock: (partId, payload) =>
    client.post(`/seller/parts/${partId}/transfer`, payload).then((r) => r.data),
  lowStock: (params = {}) => client.get('/seller/inventory/low-stock', { params }).then((r) => r.data?.data ?? r.data ?? []),
  summary: (params = {}) => client.get('/seller/inventory/summary', { params }).then((r) => r.data?.data ?? r.data),
  catalogSearch: (q) => client.get('/seller/catalog/search', { params: { q } }).then((r) => r.data),

  // Suppliers
  suppliers: (params = {}) => client.get('/seller/suppliers', { params }).then((r) => r.data),
  createSupplier: (payload) => client.post('/seller/suppliers', payload).then(unwrapPage),
  updateSupplier: (id, payload) => client.patch(`/seller/suppliers/${id}`, payload).then(unwrapPage),
  deleteSupplier: (id) => client.delete(`/seller/suppliers/${id}`).then((r) => r.data),

  // Warehouses + bins
  warehouses: (params = {}) => client.get('/seller/warehouses', { params }).then((r) => r.data?.data ?? r.data ?? []),
  createWarehouse: (payload) => client.post('/seller/warehouses', payload).then(unwrapPage),
  updateWarehouse: (id, payload) => client.patch(`/seller/warehouses/${id}`, payload).then(unwrapPage),
  deleteWarehouse: (id) => client.delete(`/seller/warehouses/${id}`).then((r) => r.data),
  createBin: (warehouseId, payload) =>
    client.post(`/seller/warehouses/${warehouseId}/bins`, payload).then(unwrapPage),
  deleteBin: (id) => client.delete(`/seller/bins/${id}`).then((r) => r.data),

  // Per-part catalog extensions
  partSuppliers: (partId) => client.get(`/seller/parts/${partId}/suppliers`).then((r) => r.data?.data ?? r.data ?? []),
  linkSupplier: (partId, payload) => client.post(`/seller/parts/${partId}/suppliers`, payload).then(unwrapPage),
  partRelations: (partId) => client.get(`/seller/parts/${partId}/relations`).then((r) => r.data?.data ?? r.data ?? []),
  partSerials: (partId) => client.get(`/seller/parts/${partId}/serials`).then((r) => r.data?.data ?? r.data ?? []),
}

export const MOVEMENT_TYPES = [
  'receipt', 'issue', 'transfer_in', 'transfer_out', 'adjustment',
  'return', 'reservation', 'release', 'consumption', 'damage', 'count',
]

export const MOVEMENT_LABELS = {
  receipt: 'Receipt',
  issue: 'Issue',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  adjustment: 'Adjustment',
  return: 'Return',
  reservation: 'Reservation',
  release: 'Release',
  consumption: 'Consumption',
  damage: 'Damaged / Lost',
  count: 'Cycle Count',
}

export const LIFECYCLE_STATUSES = ['active', 'inactive', 'obsolete', 'discontinued']

export default inventoryApi
