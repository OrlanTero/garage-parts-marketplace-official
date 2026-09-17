import { useCallback, useEffect, useState } from 'react'
import { marketplaceCars } from '../api/cars.js'

/**
 * Marketplace listing state: filters + paginated results.
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

export function useMarketplaceCars(initial = {}) {
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

  return { cars, meta, filters, setFilter, page, setPage, loading, error, reload }
}
