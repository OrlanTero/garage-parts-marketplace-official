import client from './client.js'

export const adminApi = {
  // Listing Moderation & Vehicle Inspection
  getModerationCars: (params = {}) => client.get('/admin/moderation/cars', { params }).then((r) => r.data),
  scheduleInspection: (carId, data) => client.post(`/admin/moderation/cars/${carId}/schedule-inspection`, data).then((r) => r.data),
  recordInspection: (carId, data) => client.post(`/admin/moderation/cars/${carId}/record-inspection`, data).then((r) => r.data),
  approveCar: (carId) => client.post(`/admin/moderation/cars/${carId}/approve`).then((r) => r.data),
  rejectCar: (carId, reason) => client.post(`/admin/moderation/cars/${carId}/reject`, { reason }).then((r) => r.data),

  // Appointment Monitoring
  getAppointments: (params = {}) => client.get('/admin/appointments', { params }).then((r) => r.data),

  // Basic Chat Moderation
  getChatConversations: (params = {}) => client.get('/admin/chat/conversations', { params }).then((r) => r.data),
  getChatConversationMessages: (conversationId, params = {}) => client.get(`/admin/chat/conversations/${conversationId}`, { params }).then((r) => r.data),

  // User & RBAC Management
  getUsers: (params = {}) => client.get('/admin/users', { params }).then((r) => r.data),
  updateUserRole: (userId, role) => client.patch(`/admin/users/${userId}/role`, { role }).then((r) => r.data),

  // KYC Verification & Seller Accreditation
  getKycVerifications: (params = {}) => client.get('/admin/kyc-verifications', { params }).then((r) => r.data),
  approveKyc: (userId) => client.post(`/admin/kyc-verifications/${userId}/approve`).then((r) => r.data),
  rejectKyc: (userId, reason) => client.post(`/admin/kyc-verifications/${userId}/reject`, { reason }).then((r) => r.data),

  // Buyer-to-Seller Upgrade Application Review
  getSellerApplications: (params = {}) => client.get('/admin/seller-applications', { params }).then((r) => r.data),
  approveSellerApplication: (applicationId, data = {}) => client.post(`/admin/seller-applications/${applicationId}/approve`, data).then((r) => r.data),
  rejectSellerApplication: (applicationId, reason, reviewNotes) =>
    client.post(`/admin/seller-applications/${applicationId}/reject`, { reason, review_notes: reviewNotes || undefined }).then((r) => r.data),

  // Orders Management
  getOrders: (params = {}) => client.get('/admin/orders', { params }).then((r) => r.data),
  updateOrderStatus: (orderId, data) => client.patch(`/admin/orders/${orderId}/status`, data).then((r) => r.data),

  // Seller Verification Queue (admins share the seller accept/reject endpoints)
  acceptSellerOrder: (orderId, verification_note) =>
    client.post(`/seller/orders/${orderId}/accept`, verification_note ? { verification_note } : {}).then((r) => r.data?.data ?? r.data),
  rejectSellerOrder: (orderId, verification_note) =>
    client.post(`/seller/orders/${orderId}/reject`, verification_note ? { verification_note } : {}).then((r) => r.data?.data ?? r.data),
}
