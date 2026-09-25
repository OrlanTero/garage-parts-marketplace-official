import client from './client.js'

/**
 * Buyer-to-seller upgrade applications — frontend data layer.
 * Mirrors backend SellerApplicationResource + eligibility flags.
 */
export const sellerApplicationsApi = {
  mine: (params = {}) => client.get('/seller-applications', { params }).then((r) => r.data),
  apply: (payload) => client.post('/seller-applications', payload).then((r) => r.data),
  withdraw: (id) => client.post(`/seller-applications/${id}/withdraw`).then((r) => r.data),
}

export const REQUESTABLE_ROLES = [
  {
    value: 'seller',
    label: 'Seller',
    desc: 'List vehicle builds & project cars. Ideal for individual builders and collectors.',
  },
  {
    value: 'parts_seller',
    label: 'Parts Seller',
    desc: 'List auto parts & accessories. Ideal for parts shops and garage inventories.',
  },
  {
    value: 'dealer',
    label: 'Dealer / Merchant',
    desc: 'List both vehicles and parts. Ideal for dealerships and full-line merchants.',
  },
]
