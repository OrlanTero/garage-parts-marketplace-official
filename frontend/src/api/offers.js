import client from './client.js'

/**
 * Buyer price offers — amount + comment proposals on car/part listings.
 * Seller accepts exactly one; competing pending offers auto-reject.
 */
export const offersApi = {
  // Buyer side
  mine: (params = {}) => client.get('/offers', { params }).then((r) => r.data),
  create: (payload) => client.post('/offers', payload).then((r) => r.data?.data ?? r.data),
  withdraw: (id) => client.post(`/offers/${id}/withdraw`).then((r) => r.data?.data ?? r.data),

  // Seller side (incoming on my listings)
  incoming: (params = {}) => client.get('/seller/offers', { params }).then((r) => r.data),
  accept: (id, seller_note) =>
    client.post(`/seller/offers/${id}/accept`, seller_note ? { seller_note } : {}).then((r) => r.data?.data ?? r.data),
  reject: (id, seller_note) =>
    client.post(`/seller/offers/${id}/reject`, seller_note ? { seller_note } : {}).then((r) => r.data?.data ?? r.data),
}

export const OFFER_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn']

export const OFFER_STATUS_LABELS = {
  pending: 'Awaiting Seller',
  accepted: 'Accepted',
  rejected: 'Declined',
  withdrawn: 'Withdrawn',
}

export default offersApi
