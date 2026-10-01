/**
 * Single forward-only deal pipeline. Sellers advance one step at a time
 * and can never rewind — no status dropdowns anywhere in seller UI.
 * Cars negotiate before they sell; parts go straight to preparing.
 */

export const CLOSED_ORDER_STATUSES = ['completed', 'refunded', 'cancelled']

const NEXT = {
  processing: 'negotiating',
  negotiating: 'sold',
  reserved: 'preparing',
  preparing: 'sold',
  sold: 'shipped',
  shipped: 'delivered',
  delivered: 'completed',
}

export const isCarOrder = (order) => (order?.item?.type || order?.item_type) === 'car'

export function nextStatusFor(order) {
  const status = order?.status || 'processing'
  if (CLOSED_ORDER_STATUSES.includes(status) || status === 'disputed') return null
  if (!isCarOrder(order) && status === 'processing') return 'preparing'
  return NEXT[status] || null
}

export function statusLabel(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

/** Exact-pin Google Maps link — coordinates only, never text search. */
export function mapsLinkFor(delivery) {
  if (delivery && delivery.latitude != null && delivery.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${delivery.latitude},${delivery.longitude}`
  }
  return ''
}

export function mapsLinkForCoords(latitude, longitude) {
  if (latitude == null || longitude == null) return ''
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

export async function copyText(text) {
  if (!text) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      return true
    } catch {
      return false
    }
  }
}
