import client from './client.js'

/**
 * Car Bidding & Auctions API Client
 */
export const auctionsApi = {
  // Get active or filtered auctions
  list: (params = {}) => client.get('/auctions', { params }).then((r) => r.data),
  
  // Get single auction details
  show: (id) => client.get(`/auctions/${id}`).then((r) => r.data?.data ?? r.data),
  
  // Place a bid
  placeBid: (id, payload) => client.post(`/auctions/${id}/bid`, payload).then((r) => r.data),
  
  // Get Winner's Circle / Concluded auctions
  getWinners: () => client.get('/auctions/winners').then((r) => r.data?.data ?? r.data),
}
