import { useCallback, useEffect, useState } from 'react'
import { marketplaceCars } from '../api/cars.js'
import { useChannel } from '../realtime/useChannel.js'

/**
 * Marketplace listing state: filters + paginated results + real-time sync.
 * Usage: const { cars, meta, filters, setFilter, page, setPage, loading, error, reload } = useMarketplaceCars()
 */
const DEFAULT_FILTERS = {
  search: '',
  brand: '',
  body_style: '',
  fuel_type: '',
  transmission: '',
  condition: '',
  city: '',
  min_price: '',
  max_price: '',
  min_year: '',
  max_year: '',
  max_mileage: '',
  sort: 'newest',
}

export function useMarketplaceCars(initial = {}, { enableRealtime = true } = {}) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initial })
  const [page, setPage] = useState(1)
  const [cars, setCars] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const setFilter = useCallback((key, value) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = Object.fromEntries(
        Object.entries({ ...filters, page }).filter(([, v]) => v !== '' && v != null),
      )
      const res = await marketplaceCars.list(params)
      setCars(res.data ?? [])
      setMeta(res.meta ?? null)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    reload()
  }, [reload])

  // Real-time synchronization over WebSocket
  useChannel(enableRealtime ? 'marketplace.cars' : null, {
    'car.created': () => {
      reload()
    },
    'car.updated': (payload) => {
      if (payload?.car?.id) {
        setCars((prev) =>
          prev.map((c) => (c.id === payload.car.id ? { ...c, ...payload.car } : c)),
        )
      }
    },
    'car.status_changed': () => {
      reload()
    },
    'car.sold': (payload) => {
      if (payload?.car?.id) {
        setCars((prev) =>
          prev.map((c) =>
            c.id === payload.car.id
              ? { ...c, status: 'sold', sold_at: payload.sold_at }
              : c,
          ),
        )
      }
    },
  })

  return { cars, meta, filters, setFilter, page, setPage, loading, error, reload }
}
