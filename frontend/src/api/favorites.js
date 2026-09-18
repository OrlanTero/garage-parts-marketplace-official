import client from './client.js'

export const favoritesApi = {
  /**
   * List all user favorites with item details & counts.
   * @param {Object} [params] - { type: 'car'|'part', page, per_page }
   */
  list: (params = {}) =>
    client.get('/favorites', { params }).then((r) => r.data),

  /**
   * Fast sync returning { cars: [id...], parts: [id...], total }
   */
  getIds: () =>
    client.get('/favorites/ids').then((r) => r.data?.data || { cars: [], parts: [], total: 0 }),

  /**
   * Toggle favorite state for a car build or part.
   * @param {{ type: 'car'|'part', id: number|string }} payload
   */
  toggle: ({ type, id }) =>
    client.post('/favorites/toggle', { type, id: Number(id) }).then((r) => r.data?.data),

  /**
   * Add item to favorites
   * @param {{ type: 'car'|'part', id: number|string }} payload
   */
  add: ({ type, id }) =>
    client.post('/favorites', { type, id: Number(id) }).then((r) => r.data?.data),

  /**
   * Remove item from favorites
   * @param {{ type: 'car'|'part', id: number|string } | number} target
   */
  remove: (target) => {
    if (typeof target === 'object') {
      return client.delete('/favorites', { data: { type: target.type, id: Number(target.id) } }).then((r) => r.data)
    }
    return client.delete(`/favorites/${target}`).then((r) => r.data)
  },

  /**
   * Clear all favorites or filtered by type.
   * @param {string} [type] - 'car'|'part'|null
   */
  clear: (type) =>
    client.delete('/favorites/clear', { params: type ? { type } : {} }).then((r) => r.data),
}

export default favoritesApi
