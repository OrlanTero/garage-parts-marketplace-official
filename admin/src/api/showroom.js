import client from './client.js'

/**
 * Admin Showroom & Parking Fee Management API
 */
export const adminShowroomApi = {
  list: (params = {}) => client.get('/admin/showroom', { params }).then((r) => r.data),
  getSettings: () => client.get('/admin/showroom/settings').then((r) => r.data?.data ?? r.data),
  updateSettings: (payload) => client.put('/admin/showroom/settings', payload).then((r) => r.data),
  approveSlot: (slotId, payload = {}) => client.post(`/admin/showroom/slots/${slotId}/approve`, payload).then((r) => r.data),
  rejectSlot: (slotId, payload = {}) => client.post(`/admin/showroom/slots/${slotId}/reject`, payload).then((r) => r.data),
  revokeSlot: (slotId, payload = {}) => client.post(`/admin/showroom/slots/${slotId}/revoke`, payload).then((r) => r.data),
  toggleSeller: (sellerId, payload = {}) => client.post(`/admin/showroom/sellers/${sellerId}/toggle`, payload).then((r) => r.data),
  toggleCar: (carId, payload = {}) => client.post(`/admin/showroom/cars/${carId}/toggle`, payload).then((r) => r.data),
}
