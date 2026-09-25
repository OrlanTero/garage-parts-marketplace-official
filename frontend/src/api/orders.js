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
  updatePaymentMethod: (idOrNumber, payment_method) =>
    client.patch(`/orders/${idOrNumber}/payment-method`, { payment_method }).then((r) => r.data?.data ?? r.data),
}

export const VERIFICATION_LABELS = {
  pending: 'Awaiting Seller Verification',
  accepted: 'Verified & Accepted',
  rejected: 'Declined by Seller',
}

export default ordersApi
