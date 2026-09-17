import client from './client.js'

/**
 * Cars module — frontend data layer. Mirrors backend CarResource +
 * Laravel paginator shape ({ data, links, meta }). No JSX here;
 * pages/hooks consume these functions.
 */

// --- Public marketplace (no auth) ---
export const marketplaceCars = {
  list: (params = {}) => client.get('/marketplace/cars', { params }).then((r) => r.data),
  show: (id) => client.get(`/marketplace/cars/${id}`).then((r) => r.data?.data ?? r.data),
}

// --- Seller inventory (auth + role:seller,admin via sessionManager) ---
export const sellerCars = {
  list: (params = {}) => client.get('/seller/cars', { params }).then((r) => r.data),
  show: (id) => client.get(`/seller/cars/${id}`).then((r) => r.data?.data ?? r.data),
  create: (payload) => client.post('/seller/cars', payload).then((r) => r.data?.data ?? r.data),
  update: (id, payload) =>
    client.patch(`/seller/cars/${id}`, payload).then((r) => r.data?.data ?? r.data),
  destroy: (id) => client.delete(`/seller/cars/${id}`).then((r) => r.data),
  publish: (id) => client.post(`/seller/cars/${id}/publish`).then((r) => r.data?.data ?? r.data),
  unpublish: (id) => client.post(`/seller/cars/${id}/unpublish`).then((r) => r.data?.data ?? r.data),
  markSold: (id) => client.post(`/seller/cars/${id}/sold`).then((r) => r.data?.data ?? r.data),
}

export const CAR_FILTER_META = {
  sorts: ['newest', 'price_asc', 'price_desc', 'mileage_asc', 'year_desc'],
  bodyStyles: ['sedan', 'hatchback', 'suv', 'crossover', 'coupe', 'convertible', 'pickup', 'van', 'wagon', 'other'],
  fuelTypes: ['petrol', 'diesel', 'hybrid', 'electric', 'other'],
  transmissions: ['manual', 'automatic', 'semi_automatic'],
  conditions: ['new', 'used'],
}
