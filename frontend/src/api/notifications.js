import client from './client.js'

export const notificationsApi = {
  list: (params = {}) => client.get('/notifications', { params }).then((r) => r.data),
  unreadCount: () => client.get('/notifications/unread-count').then((r) => r.data?.unread_count ?? 0),
  markRead: (id) => client.post(`/notifications/${id}/read`, {}).then((r) => r.data?.data ?? r.data),
  markAllRead: () => client.post('/notifications/read-all', {}).then((r) => r.data),
  remove: (id) => client.delete(`/notifications/${id}`).then((r) => r.data),
  clearRead: () => client.delete('/notifications').then((r) => r.data),
}

export default notificationsApi
