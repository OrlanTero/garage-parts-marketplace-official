import client from './client.js'

/**
 * Parts module — frontend data layer. Mirrors backend PartResource +
 * Laravel paginator shape ({ data, links, meta }). No JSX here;
 * pages/hooks consume these functions.
 */

// --- Public marketplace (no auth) ---
export const marketplaceParts = {
  list: (params = {}) => client.get('/marketplace/parts', { params }).then((r) => r.data),
  show: (id) => client.get(`/marketplace/parts/${id}`).then((r) => r.data?.data ?? r.data),
}

// --- Seller inventory (auth + role:seller,admin via sessionManager) ---
export const sellerParts = {
  list: (params = {}) => client.get('/seller/parts', { params }).then((r) => r.data),
  show: (id) => client.get(`/seller/parts/${id}`).then((r) => r.data?.data ?? r.data),
  create: (payload) => client.post('/seller/parts', payload).then((r) => r.data?.data ?? r.data),
  update: (id, payload) =>
    client.patch(`/seller/parts/${id}`, payload).then((r) => r.data?.data ?? r.data),
  destroy: (id) => client.delete(`/seller/parts/${id}`).then((r) => r.data),
  publish: (id) => client.post(`/seller/parts/${id}/publish`).then((r) => r.data?.data ?? r.data),
  unpublish: (id) => client.post(`/seller/parts/${id}/unpublish`).then((r) => r.data?.data ?? r.data),
  markSold: (id) => client.post(`/seller/parts/${id}/sold`).then((r) => r.data?.data ?? r.data),
}

export const PART_FILTER_META = {
  sorts: ['newest', 'price_asc', 'price_desc'],
  conditions: ['new', 'used', 'refurbished'],
}
// NOTE: category options are NOT defined here anymore — use `useTaxonomy()`
// from './taxonomy.js' for the live backend Category catalog.
