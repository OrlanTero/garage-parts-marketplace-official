import client from './client.js'

export const restocksApi = {
  mine: () => client.get('/restocks').then((r) => r.data?.data ?? r.data ?? []),
  subscribe: (listingType, listingId) =>
    client.post('/restocks', { listing_type: listingType, listing_id: listingId }).then((r) => r.data?.data ?? r.data),
  unsubscribe: (id) => client.delete(`/restocks/${id}`).then((r) => r.data),
}

export default restocksApi
