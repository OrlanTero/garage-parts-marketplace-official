import client from './client.js'

export const healthApi = {
  check: () => client.get('/health').then((r) => r.data),
}
