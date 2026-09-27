import client from './client.js'

/**
 * Seller storefront overview — per-status inventory counts
 * across the authenticated seller's own cars and parts.
 */
export const sellerApi = {
  summary: () => client.get('/seller/summary').then((r) => r.data),
}

/**
 * Incoming sales-order requests on my listings.
 * Accept exactly one — competing pending requests auto-reject.
 */
export const sellerOrdersApi = {
  incoming: (params = {}) => client.get('/seller/orders', { params }).then((r) => r.data),
  accept: (id, verification_note) =>
    client.post(`/seller/orders/${id}/accept`, verification_note ? { verification_note } : {}).then((r) => r.data?.data ?? r.data),
  reject: (id, verification_note) =>
    client.post(`/seller/orders/${id}/reject`, verification_note ? { verification_note } : {}).then((r) => r.data?.data ?? r.data),
  updateStatus: (id, payload) =>
    client.patch(`/seller/orders/${id}/status`, payload).then((r) => r.data?.data ?? r.data),
  refund: (id, verification_note) =>
    client.post(`/seller/orders/${id}/refund`, verification_note ? { verification_note } : {}).then((r) => r.data?.data ?? r.data),
}

// Order lifecycle — cars via escrow (processing → negotiating → sold →
// shipped → delivered → completed on inspection payout, or disputed →
// refunded); parts via direct capture (processing → preparing → shipped
// → delivered → completed, payout on completion).
export const SELLER_ORDER_STATUSES = ['processing', 'negotiating', 'reserved', 'preparing', 'sold', 'shipped', 'delivered', 'completed', 'disputed']

export const CAR_STATUSES = [
  'draft',
  'pending_inspection',
  'inspected',
  'active',
  'rejected',
  'sold',
  'archived',
]

export const PART_STATUSES = ['draft', 'active', 'sold', 'archived']

export const STATUS_LABELS = {
  draft: 'Draft',
  pending_inspection: 'Pending Inspection',
  inspected: 'Inspected',
  active: 'Live on Marketplace',
  rejected: 'Rejected',
  sold: 'Sold',
  archived: 'Archived',
}
