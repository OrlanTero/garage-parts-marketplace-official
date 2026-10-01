import client from './client.js'

export const perksApi = {
  status: () => client.get('/perks').then((r) => r.data?.data ?? r.data),
  subscribe: (payload = {}) => client.post('/perks/subscribe', payload).then((r) => r.data?.data ?? r.data),
  catalog: () => client.get('/perks/catalog').then((r) => r.data?.data ?? r.data),
}
