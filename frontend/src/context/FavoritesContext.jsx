import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { favoritesApi } from '../api/favorites.js'
import { useAuth } from '../auth/AuthContext.jsx'

const FavoritesContext = createContext(null)

const LOCAL_CARS_KEY = 'gpm_local_saved_cars_v1'
const LOCAL_PARTS_KEY = 'gpm_local_saved_parts_v1'

function getLocalItems(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Failed reading favorites from localStorage', e)
    return []
  }
}

function setLocalItems(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch (e) {
    console.error('Failed saving favorites to localStorage', e)
  }
}

export function FavoritesProvider({ children }) {
  const { isAuthenticated, user } = useAuth()

  const [favoriteCarIds, setFavoriteCarIds] = useState(() => new Set(getLocalItems(LOCAL_CARS_KEY).map(c => Number(c.id || c))))
  const [favoritePartIds, setFavoritePartIds] = useState(() => new Set(getLocalItems(LOCAL_PARTS_KEY).map(p => Number(p.id || p))))
  
  const [savedCarsList, setSavedCarsList] = useState(() => getLocalItems(LOCAL_CARS_KEY).filter(i => typeof i === 'object'))
  const [savedPartsList, setSavedPartsList] = useState(() => getLocalItems(LOCAL_PARTS_KEY).filter(i => typeof i === 'object'))
  
  const [loading, setLoading] = useState(false)
  const [syncedWithBackend, setSyncedWithBackend] = useState(false)

  // Fetch from backend when authenticated
  const fetchBackendFavorites = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      setLoading(true)
      const [idsData, fullData] = await Promise.all([
        favoritesApi.getIds().catch(() => ({ cars: [], parts: [] })),
        favoritesApi.list({ per_page: 100 }).catch(() => ({ data: [] })),
      ])

      const cars = new Set((idsData.cars || []).map(Number))
      const parts = new Set((idsData.parts || []).map(Number))

      setFavoriteCarIds(cars)
      setFavoritePartIds(parts)

      const fetchedCars = []
      const fetchedParts = []

      if (Array.isArray(fullData.data)) {
        fullData.data.forEach((fav) => {
          if (fav.type === 'car' && fav.item) {
            fetchedCars.push({ ...fav.item, favorite_id: fav.id, is_saved: true })
          } else if (fav.type === 'part' && fav.item) {
            fetchedParts.push({ ...fav.item, favorite_id: fav.id, is_saved: true })
          }
        })
      }

      setSavedCarsList(fetchedCars)
      setSavedPartsList(fetchedParts)
      setSyncedWithBackend(true)
    } catch (err) {
      console.error('Error fetching favorites from API:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  // Sync with backend on auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchBackendFavorites()
    } else {
      // Load local guest items
      const localCars = getLocalItems(LOCAL_CARS_KEY)
      const localParts = getLocalItems(LOCAL_PARTS_KEY)
      setFavoriteCarIds(new Set(localCars.map(c => Number(c.id || c))))
      setFavoritePartIds(new Set(localParts.map(p => Number(p.id || p))))
      setSavedCarsList(localCars.filter(i => typeof i === 'object'))
      setSavedPartsList(localParts.filter(i => typeof i === 'object'))
      setSyncedWithBackend(false)
    }
  }, [isAuthenticated, user?.id, fetchBackendFavorites])

  // Check methods
  const isCarSaved = useCallback((carId) => {
    if (carId == null) return false
    return favoriteCarIds.has(Number(carId))
  }, [favoriteCarIds])

  const isPartSaved = useCallback((partId) => {
    if (partId == null) return false
    return favoritePartIds.has(Number(partId))
  }, [favoritePartIds])

  // Toggle Car Favorite
  const toggleCarFavorite = useCallback(async (carOrId) => {
    const id = Number(typeof carOrId === 'object' ? carOrId.id : carOrId)
    if (!id) return false

    const currentlySaved = favoriteCarIds.has(id)
    const nextSaved = !currentlySaved

    // Optimistic UI Update
    setFavoriteCarIds(prev => {
      const next = new Set(prev)
      if (nextSaved) next.add(id)
      else next.delete(id)
      return next
    })

    if (nextSaved) {
      const carObj = typeof carOrId === 'object' ? carOrId : { id }
      setSavedCarsList(prev => {
        if (prev.some(c => Number(c.id) === id)) return prev
        const updated = [carObj, ...prev]
        if (!isAuthenticated) setLocalItems(LOCAL_CARS_KEY, updated)
        return updated
      })
    } else {
      setSavedCarsList(prev => {
        const updated = prev.filter(c => Number(c.id) !== id)
        if (!isAuthenticated) setLocalItems(LOCAL_CARS_KEY, updated)
        return updated
      })
    }

    if (isAuthenticated) {
      try {
        await favoritesApi.toggle({ type: 'car', id })
      } catch (err) {
        console.error('Failed toggling car favorite on server', err)
        // Revert on server error
        setFavoriteCarIds(prev => {
          const next = new Set(prev)
          if (currentlySaved) next.add(id)
          else next.delete(id)
          return next
        })
      }
    } else {
      const localCars = getLocalItems(LOCAL_CARS_KEY)
      const nextLocal = nextSaved 
        ? [...localCars.filter(c => Number(c.id || c) !== id), typeof carOrId === 'object' ? carOrId : { id }]
        : localCars.filter(c => Number(c.id || c) !== id)
      setLocalItems(LOCAL_CARS_KEY, nextLocal)
    }

    return nextSaved
  }, [favoriteCarIds, isAuthenticated])

  // Toggle Part Favorite
  const togglePartFavorite = useCallback(async (partOrId) => {
    const id = Number(typeof partOrId === 'object' ? partOrId.id : partOrId)
    if (!id) return false

    const currentlySaved = favoritePartIds.has(id)
    const nextSaved = !currentlySaved

    // Optimistic UI Update
    setFavoritePartIds(prev => {
      const next = new Set(prev)
      if (nextSaved) next.add(id)
      else next.delete(id)
      return next
    })

    if (nextSaved) {
      const partObj = typeof partOrId === 'object' ? partOrId : { id }
      setSavedPartsList(prev => {
        if (prev.some(p => Number(p.id) === id)) return prev
        const updated = [partObj, ...prev]
        if (!isAuthenticated) setLocalItems(LOCAL_PARTS_KEY, updated)
        return updated
      })
    } else {
      setSavedPartsList(prev => {
        const updated = prev.filter(p => Number(p.id) !== id)
        if (!isAuthenticated) setLocalItems(LOCAL_PARTS_KEY, updated)
        return updated
      })
    }

    if (isAuthenticated) {
      try {
        await favoritesApi.toggle({ type: 'part', id })
      } catch (err) {
        console.error('Failed toggling part favorite on server', err)
        // Revert on server failure
        setFavoritePartIds(prev => {
          const next = new Set(prev)
          if (currentlySaved) next.add(id)
          else next.delete(id)
          return next
        })
      }
    } else {
      const localParts = getLocalItems(LOCAL_PARTS_KEY)
      const nextLocal = nextSaved 
        ? [...localParts.filter(p => Number(p.id || p) !== id), typeof partOrId === 'object' ? partOrId : { id }]
        : localParts.filter(p => Number(p.id || p) !== id)
      setLocalItems(LOCAL_PARTS_KEY, nextLocal)
    }

    return nextSaved
  }, [favoritePartIds, isAuthenticated])

  // Remove by type and id
  const removeFavorite = useCallback(async (type, id) => {
    if (type === 'car') {
      await toggleCarFavorite(id)
    } else if (type === 'part') {
      await togglePartFavorite(id)
    }
  }, [toggleCarFavorite, togglePartFavorite])

  // Clear all
  const clearAllFavorites = useCallback(async (type = null) => {
    if (!type || type === 'car') {
      setFavoriteCarIds(new Set())
      setSavedCarsList([])
      setLocalItems(LOCAL_CARS_KEY, [])
    }
    if (!type || type === 'part') {
      setFavoritePartIds(new Set())
      setSavedPartsList([])
      setLocalItems(LOCAL_PARTS_KEY, [])
    }

    if (isAuthenticated) {
      try {
        await favoritesApi.clear(type)
      } catch (e) {
        console.error('Failed clearing favorites on server', e)
      }
    }
  }, [isAuthenticated])

  const totalCount = favoriteCarIds.size + favoritePartIds.size
  const carsCount = favoriteCarIds.size
  const partsCount = favoritePartIds.size

  const value = useMemo(() => ({
    favoriteCarIds,
    favoritePartIds,
    savedCarsList,
    savedPartsList,
    favoritesCount: totalCount,
    carsCount,
    partsCount,
    loading,
    syncedWithBackend,
    isCarSaved,
    isPartSaved,
    toggleCarFavorite,
    togglePartFavorite,
    removeFavorite,
    clearAllFavorites,
    refreshFavorites: fetchBackendFavorites,
  }), [
    favoriteCarIds,
    favoritePartIds,
    savedCarsList,
    savedPartsList,
    totalCount,
    carsCount,
    partsCount,
    loading,
    syncedWithBackend,
    isCarSaved,
    isPartSaved,
    toggleCarFavorite,
    togglePartFavorite,
    removeFavorite,
    clearAllFavorites,
    fetchBackendFavorites,
  ])

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return ctx
}
