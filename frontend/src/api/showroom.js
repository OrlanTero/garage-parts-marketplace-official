import client from './client.js'

/**
 * Showroom API — public catalog of verified builders, dealers, and parts merchants,
 * plus seller showroom activation and parking slot application tools.
 */
export const showroomApi = {
  // Public Showroom Catalog
  getSellers: (params = {}) => client.get('/showroom/sellers', { params }).then((r) => r.data),
  getSeller: (username) => client.get(`/showroom/sellers/${username}`).then((r) => r.data?.data ?? r.data),
  getStats: () => client.get('/showroom/stats').then((r) => r.data?.data ?? r.data),

  // Seller Showroom Activation & Parking Slot Tools
  getSellerStatus: () => client.get('/seller/showroom/status').then((r) => r.data?.data ?? r.data),
  calculateFee: (params) => client.post('/seller/showroom/calculate-fee', params).then((r) => r.data?.data ?? r.data),
  applySlot: (payload) => client.post('/seller/showroom/apply', payload).then((r) => r.data),
}
