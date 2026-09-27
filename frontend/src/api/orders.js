import client from './client.js'

/**
 * Orders & Sales Order API client module.
 * Communicates with Laravel backend for customer checkout, chassis & VIN serialization,
 * and sales order document retrieval.
 */
export const ordersApi = {
  create: (payload) => client.post('/orders', payload).then((r) => r.data?.data ?? r.data),
  show: (idOrNumber) => client.get(`/orders/${idOrNumber}`).then((r) => r.data?.data ?? r.data),
  list: (params = {}) => client.get('/orders', { params }).then((r) => r.data),
  getDeliveryQuote: (params = {}) => client.get('/delivery-quote', { params }).then((r) => r.data?.data ?? r.data),
  getOfferQuote: (token) => client.get('/offer-quote', { params: { token } }).then((r) => r.data?.data ?? r.data),
  verifyTransaction: (hash) => client.get(`/orders/verify/${hash}`).then((r) => r.data?.data ?? r.data),
  updatePaymentMethod: (idOrNumber, payment_method) =>
    client.patch(`/orders/${idOrNumber}/payment-method`, { payment_method }).then((r) => r.data?.data ?? r.data),
  confirmPayment: (idOrNumber, { payment_method, payment_reference }) =>
    client.post(`/orders/${idOrNumber}/confirm-payment`, { payment_method, payment_reference }).then((r) => r.data?.data ?? r.data),
  acceptInspection: (idOrNumber) =>
    client.post(`/orders/${idOrNumber}/accept-inspection`, {}).then((r) => r.data?.data ?? r.data),
  rejectInspection: (idOrNumber, reason) =>
    client.post(`/orders/${idOrNumber}/reject-inspection`, reason ? { reason } : {}).then((r) => r.data?.data ?? r.data),
  updateDeliveryLocation: (idOrNumber, { latitude, longitude, label }) =>
    client.patch(`/orders/${idOrNumber}/delivery-location`, { latitude, longitude, label }).then((r) => r.data?.data ?? r.data),
}

export const VERIFICATION_LABELS = {
  pending: 'Awaiting Seller Verification',
  accepted: 'Verified & Accepted',
  rejected: 'Declined by Seller',
}

export default ordersApi
