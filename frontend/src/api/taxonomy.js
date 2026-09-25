import { useEffect, useMemo, useState } from 'react'
import client from './client.js'
import { Wrench, Disc, Flame, Armchair, Compass, Sliders, Cog, Zap, Car, Droplet, Package, Box } from 'lucide-react'

/**
 * Taxonomy data layer — live Brand / Model / Category / Spec catalog.
 * Replaces every hardcoded option list in the storefront.
 *
 * Strategy: load-first from backend, then persist to localStorage —
 * every select renders cached values instantly on repeat visits while a
 * background refresh keeps them in sync with the server.
 */

const unwrap = (v) => (Array.isArray(v) ? v : v?.data ?? [])

const CACHE_KEY = 'gpm_taxonomy_meta_v1'

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.data?.brands)) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    // Storage full or unavailable — live fetch still works.
  }
}

const EMPTY_META = { brands: [], categories: [], specs: {}, counts: {} }

let metaPromise = null
function fetchMeta() {
  if (!metaPromise) {
    metaPromise = client
      .get('/taxonomy/meta')
      .then((r) => {
        const inner = r.data?.data ?? r.data ?? {}
        const data = {
          brands: unwrap(inner.brands),
          categories: unwrap(inner.categories),
          specs: inner.specs ?? {},
          counts: inner.counts ?? {},
        }
        writeCache(data)
        return data
      })
      .catch((err) => {
        metaPromise = null
        throw err
      })
  }
  return metaPromise
}

export const taxonomyApi = {
  meta: fetchMeta,
  brands: (params = {}) => client.get('/taxonomy/brands', { params }).then((r) => unwrap(r.data)),
  models: (params = {}) =>
    client.get('/taxonomy/models', { params }).then((r) => unwrap(r.data?.data ?? r.data)),
  categories: () => client.get('/taxonomy/categories').then((r) => unwrap(r.data)),
  partBrands: () => client.get('/taxonomy/part-brands').then((r) => unwrap(r.data)),
}

export function useTaxonomy() {
  const [data, setData] = useState(() => readCache() ?? EMPTY_META)
  const [loading, setLoading] = useState(() => readCache() === null)

  useEffect(() => {
    let alive = true
    fetchMeta()
      .then((d) => {
        if (alive) {
          setData(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  // Every model across all brands, flattened once — so Model/Chassis
  // dropdowns always have contents, even before a Make is picked.
  const models = useMemo(() => flattenModels(data.brands), [data.brands])

  return {
    brands: data.brands,
    categories: data.categories,
    specs: data.specs ?? {},
    counts: data.counts,
    models,
    loading,
  }
}

/** Flatten nested brand.car_models into [{...model, brand_name}]. */
export function flattenModels(brands = []) {
  const out = []
  for (const b of brands) {
    const list = Array.isArray(b.car_models) ? b.car_models : b.car_models?.data ?? []
    for (const m of list) {
      out.push({ ...m, brand_id: m.brand_id ?? b.id, brand_name: b.name })
    }
  }
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

/** Offline fallback spec vocabularies (mirror backend enums). */
export const FALLBACK_SPECS = {
  body_styles: ['sedan', 'hatchback', 'suv', 'crossover', 'coupe', 'convertible', 'pickup', 'van', 'wagon', 'other'],
  transmissions: ['manual', 'automatic', 'semi_automatic'],
  fuel_types: ['petrol', 'diesel', 'hybrid', 'electric', 'other'],
  car_conditions: ['new', 'used'],
  part_conditions: ['new', 'used', 'refurbished'],
}

/** Live spec list with offline fallback. */
export const specOptions = (specs, key) =>
  specs?.[key]?.length ? specs[key] : FALLBACK_SPECS[key] ?? []

/** 'semi_automatic' -> 'Semi Automatic'. */
export const specLabel = (value) =>
  String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

/** Models for one vehicle brand (quick-finder Model / Chassis dropdown). */
export function useBrandModels(brandId) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!brandId) {
      setModels([])
      return
    }
    let alive = true
    setLoading(true)
    taxonomyApi
      .models({ brand_id: brandId, per_page: 100 })
      .then((list) => {
        if (alive) setModels(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [brandId])

  return { models, loading }
}

/** Region code -> display label for brand optgroups. */
export const REGION_LABELS = {
  japanese: 'Japanese Brands',
  european: 'European Brands',
  american: 'American Brands',
  korean: 'Korean Brands',
  german: 'German Brands',
  other: 'Other Makes',
}

export function groupBrandsByRegion(brands = []) {
  const groups = []
  const seen = new Map()
  for (const b of brands) {
    const key = b.region || 'other'
    if (!seen.has(key)) {
      const g = { key, region: REGION_LABELS[key] || key, brands: [] }
      seen.set(key, g)
      groups.push(g)
    }
    seen.get(key).brands.push(b)
  }
  // Deterministic order: known regions first, then the rest alphabetically.
  const order = ['japanese', 'european', 'american', 'korean', 'german', 'other']
  return groups.sort((a, b) => {
    const ia = order.indexOf(a.key)
    const ib = order.indexOf(b.key)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.region.localeCompare(b.region)
  })
}

/**
 * Presentation mapping keyed by category slug (icons + card imagery).
 * Names, slugs and item counts always come from the API — this only maps
 * display assets for known catalog slugs, falling back to defaults.
 */
export const CATEGORY_DISPLAY = {
  engine: { icon: Wrench, img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600&auto=format&fit=crop' },
  exhaust: { icon: Flame, img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600&auto=format&fit=crop' },
  suspension: { icon: Sliders, img: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=600&auto=format&fit=crop' },
  brakes: { icon: Sliders, img: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=600&auto=format&fit=crop' },
  tires_wheels: { icon: Disc, img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop' },
  wheels: { icon: Disc, img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop' },
  interior: { icon: Armchair, img: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=600&auto=format&fit=crop' },
  body_exterior: { icon: Car, img: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600&auto=format&fit=crop' },
  transmission: { icon: Cog, img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600&auto=format&fit=crop' },
  electrical: { icon: Zap, img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600&auto=format&fit=crop' },
  fluids_lubricants: { icon: Droplet, img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600&auto=format&fit=crop' },
  accessories: { icon: Compass, img: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600&auto=format&fit=crop' },
  other: { icon: Box, img: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=600&auto=format&fit=crop' },
}

const DEFAULT_DISPLAY = { icon: Package, img: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=600&auto=format&fit=crop' }
export const categoryDisplay = (slug) => CATEGORY_DISPLAY[slug] || DEFAULT_DISPLAY

export const formatCount = (n) => `${Number(n ?? 0).toLocaleString('en-US')} items`
