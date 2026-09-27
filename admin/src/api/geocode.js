/**
 * Geocoding via OpenStreetMap Nominatim (no API key needed).
 * Search is biased to the Philippines; reverse-geocode works worldwide.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org'

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Geocode request failed (${res.status})`)
  return res.json()
}

export async function searchPlaces(query, { limit = 5, countrycodes = 'ph' } = {}) {
  const q = String(query || '').trim()
  if (q.length < 3) return []
  const params = new URLSearchParams({
    format: 'jsonv2',
    q,
    limit: String(limit),
    addressdetails: '1',
  })
  if (countrycodes) params.set('countrycodes', countrycodes)
  const rows = await fetchJson(`${NOMINATIM}/search?${params.toString()}`)
  return (Array.isArray(rows) ? rows : []).map((r) => ({
    latitude: Number(r.lat),
    longitude: Number(r.lon),
    label: r.display_name,
  }))
}

export async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '18',
    addressdetails: '1',
  })
  const row = await fetchJson(`${NOMINATIM}/reverse?${params.toString()}`)
  return row?.display_name || ''
}

export const osmLink = (latitude, longitude, zoom = 16) =>
  `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`
