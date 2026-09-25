import client from './client.js'

export const chatApi = {
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
   * Get total unread messages count.
   */
  getUnreadCount: () =>
    client.get('/chat/unread-count').then((r) => r.data),
}

export default chatApi
