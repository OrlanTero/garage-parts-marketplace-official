import client from './client.js'

export const chatApi = {
  /**
   * Listing-focused inbox: cars/parts the user is buying or selling.
   */
  getInbox: () => client.get('/chat/inbox').then((r) => r.data),

  /**
   * All conversations and messages the current user can see on one listing.
   */
  getListingThread: (listingType, listingId) =>
    client.get(`/chat/listings/${listingType}/${listingId}`).then((r) => r.data),

  /**
   * Mark every visible unread message on a listing as read.
   */
  markListingRead: (listingType, listingId) =>
    client.post(`/chat/listings/${listingType}/${listingId}/read`).then((r) => r.data),

  /**
   * Fetch all conversations for the authenticated user with unread counts.
   */
  getConversations: (page = 1) =>
    client.get(`/chat/conversations?page=${page}`).then((r) => r.data),

  /**
   * Fetch a single conversation by ID.
   */
  getConversation: (id) =>
    client.get(`/chat/conversations/${id}`).then((r) => r.data),

  /**
   * Start or find a 1:1 conversation between current user and a recipient.
   */
  startConversation: ({ recipient_id, initial_message, listing_type, listing_id }) =>
    client
      .post('/chat/conversations', {
        recipient_id,
        initial_message,
        listing_type,
        listing_id,
      })
      .then((r) => r.data),

  /**
   * Get paginated messages for a conversation.
   */
  getMessages: (conversationId, page = 1) =>
    client
      .get(`/chat/conversations/${conversationId}/messages?page=${page}&per_page=50`)
      .then((r) => r.data),

  /**
   * Post a new message with optional listing attachment.
   */
  sendMessage: (conversationId, { body, listing_type, listing_id }) =>
    client
      .post(`/chat/conversations/${conversationId}/messages`, {
        body,
        listing_type,
        listing_id,
      })
      .then((r) => r.data),

  /**
   * Mark all messages in a conversation as read.
   */
  markAsRead: (conversationId) =>
    client.post(`/chat/conversations/${conversationId}/read`).then((r) => r.data),

  /**
   * In-chat deal offers: negotiate → accept → confirm → checkout link.
   */
  getDealOffers: (conversationId) =>
    client.get(`/chat/conversations/${conversationId}/offers`).then((r) => r.data?.data ?? r.data ?? []),
  createDealOffer: (conversationId, payload) =>
    client.post(`/chat/conversations/${conversationId}/offers`, payload).then((r) => r.data?.data ?? r.data),
  acceptDealOffer: (offerId) =>
    client.post(`/chat/offers/${offerId}/accept`, {}).then((r) => r.data?.data ?? r.data),
  rejectDealOffer: (offerId) =>
    client.post(`/chat/offers/${offerId}/reject`, {}).then((r) => r.data?.data ?? r.data),
  withdrawDealOffer: (offerId) =>
    client.post(`/chat/offers/${offerId}/withdraw`, {}).then((r) => r.data?.data ?? r.data),
  confirmDealOffer: (offerId) =>
    client.post(`/chat/offers/${offerId}/confirm`, {}).then((r) => r.data?.data ?? r.data),
  issueCheckoutLink: (offerId) =>
    client.post(`/chat/offers/${offerId}/checkout-link`, {}).then((r) => r.data?.data ?? r.data),

  /**
   * Reservation payments (parameterized % fee; scheduled needs seller accept).
   */
  createReservation: (conversationId, payload) =>
    client.post(`/chat/conversations/${conversationId}/reservations`, payload).then((r) => r.data?.data ?? r.data),
  payReservation: (reservationId, payload) =>
    client.post(`/chat/reservations/${reservationId}/pay`, payload).then((r) => r.data?.data ?? r.data),
  acceptReservation: (reservationId) =>
    client.post(`/chat/reservations/${reservationId}/accept`, {}).then((r) => r.data?.data ?? r.data),
  cancelReservation: (reservationId) =>
    client.post(`/chat/reservations/${reservationId}/cancel`, {}).then((r) => r.data?.data ?? r.data),

  /**
   * Get total unread messages count.
   */
  getUnreadCount: () =>
    client.get('/chat/unread-count').then((r) => r.data),
}

export default chatApi
