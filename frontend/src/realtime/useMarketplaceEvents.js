import { useChannel } from './useChannel.js'

/**
 * High-level hook for real-time marketplace events (Parts & Cars).
 *
 * @param {Object} callbacks
 * @param {Function} [callbacks.onPartCreated] - (payload: { part })
 * @param {Function} [callbacks.onPartUpdated] - (payload: { part })
 * @param {Function} [callbacks.onPartStatusChanged] - (payload: { part, previous_status, status })
 * @param {Function} [callbacks.onPartSold] - (payload: { part, sold_at })
 * @param {Function} [callbacks.onCarCreated] - (payload: { car })
 * @param {Function} [callbacks.onCarUpdated] - (payload: { car })
 * @param {Function} [callbacks.onCarStatusChanged] - (payload: { car, previous_status, status })
 * @param {Function} [callbacks.onCarSold] - (payload: { car, sold_at })
 * @param {Function} [callbacks.onAnyMarketplaceChange] - (type, payload)
 */
export function useMarketplaceEvents({
  onPartCreated,
  onPartUpdated,
  onPartStatusChanged,
  onPartSold,
  onCarCreated,
  onCarUpdated,
  onCarStatusChanged,
  onCarSold,
  onAnyMarketplaceChange,
} = {}) {
  useChannel('marketplace.parts', {
    'part.created': (data) => {
      onPartCreated?.(data)
      onAnyMarketplaceChange?.('part.created', data)
    },
    'part.updated': (data) => {
      onPartUpdated?.(data)
      onAnyMarketplaceChange?.('part.updated', data)
    },
    'part.status_changed': (data) => {
      onPartStatusChanged?.(data)
      onAnyMarketplaceChange?.('part.status_changed', data)
    },
    'part.sold': (data) => {
      onPartSold?.(data)
      onAnyMarketplaceChange?.('part.sold', data)
    },
  })

  useChannel('marketplace.cars', {
    'car.created': (data) => {
      onCarCreated?.(data)
      onAnyMarketplaceChange?.('car.created', data)
    },
    'car.updated': (data) => {
      onCarUpdated?.(data)
      onAnyMarketplaceChange?.('car.updated', data)
    },
    'car.status_changed': (data) => {
      onCarStatusChanged?.(data)
      onAnyMarketplaceChange?.('car.status_changed', data)
    },
    'car.sold': (data) => {
      onCarSold?.(data)
      onAnyMarketplaceChange?.('car.sold', data)
    },
  })
}
