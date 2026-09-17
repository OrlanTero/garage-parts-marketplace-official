import { useCallback, useEffect, useState } from 'react'
import { marketplaceParts } from '../api/parts.js'

/**
 * Parts marketplace listing state: filters + paginated results.
 * Usage: const { parts, meta, filters, setFilter, page, setPage, loading, error, reload } = useMarketplaceParts()
 */
const DEFAULT_FILTERS = {
  search: '',
  category: '',
  brand: '',
  condition: '',
  city: '',
  min_price: '',
  max_price: '',
  in_stock: '',
  sort: 'newest',
}

export function useMarketplaceParts(initial = {}) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initial })
  const [page, setPage] = useState(1)
  const [parts, setParts] = useState([])
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
      const res = await marketplaceParts.list(params)
      setParts(res.data ?? [])
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

  return { parts, meta, filters, setFilter, page, setPage, loading, error, reload }
}
