/**
 * Shared catalog preset matchers — single source of truth for the quick
 * filter pills on Home (Verified Showroom / Performance Catalog) and the
 * full Marketplace / Parts pages.
 *
 * Matchers accept both live API shapes and curated mock shapes:
 *  cars:  brand | make, body_style | bodyStyle, fuel_type | fuel,
 *         year, category
 *  parts: category | cat, name | title
 */

const JDM_BRANDS = ['nissan', 'toyota', 'honda', 'mazda', 'subaru', 'mitsubishi', 'datsun', 'lexus', 'acura']

const norm = (v) => String(v ?? '').toLowerCase()

function carBrand(c) {
  return norm(c.brand || c.make)
}

function carBody(c) {
  return norm(c.body_style || c.bodyStyle)
}

function carFuel(c) {
  return norm(c.fuel_type || c.fuel)
}

function carCategory(c) {
  return norm(c.category)
}

export const CAR_PRESETS = [
  { id: 'all', label: 'All Featured' },
  {
    id: 'jdm',
    label: 'JDM Legends',
    match: (c) => JDM_BRANDS.includes(carBrand(c)),
  },
  {
    id: 'classics',
    label: 'Restored Classics',
    match: (c) =>
      carCategory(c) === 'classics' ||
      (c.year != null && Number(c.year) <= 1990),
  },
  {
    id: '4x4',
    label: '4x4 & Overland',
    match: (c) => {
      const body = carBody(c)
      return (
        carCategory(c) === '4x4' ||
        body === 'suv' ||
        body === 'pickup' ||
        body.includes('4x4') ||
        body.includes('truck')
      )
    },
  },
  {
    id: 'coupe',
    label: 'Coupes & Turbos',
    match: (c) => carBody(c) === 'coupe' || carFuel(c).includes('turbo'),
  },
]

export const PART_PRESETS = [
  { id: 'all', label: 'All Trending' },
  {
    id: 'engine',
    label: 'Engine & Turbo',
    match: (p) => {
      const cat = norm(p.category || p.cat)
      const name = norm(p.name || p.title)
      return (
        cat.includes('engine') ||
        name.includes('turbo') ||
        name.includes('engine') ||
        cat.includes('turbo') ||
        cat.includes('performance')
      )
    },
  },
  {
    id: 'wheels',
    label: 'Wheels & Rims',
    match: (p) => {
      const cat = norm(p.category || p.cat)
      return (
        cat.includes('wheel') ||
        cat.includes('rim') ||
        cat.includes('tire') ||
        cat.includes('tyre')
      )
    },
  },
  {
    id: 'brakes',
    label: 'Brakes & BBK',
    match: (p) => {
      const cat = norm(p.category || p.cat)
      return cat.includes('brake') || cat.includes('bbk') || cat.includes('suspension')
    },
  },
  {
    id: 'interior',
    label: 'Interior & Seats',
    match: (p) => {
      const cat = norm(p.category || p.cat)
      return cat.includes('interior') || cat.includes('seat') || cat.includes('cabin')
    },
  },
]

export function applyCarPreset(cars, presetId) {
  if (!Array.isArray(cars)) return []
  if (!presetId || presetId === 'all') return cars
  const preset = CAR_PRESETS.find((p) => p.id === presetId)
  if (!preset?.match) return cars
  return cars.filter((c) => {
    try {
      return preset.match(c)
    } catch {
      return false
    }
  })
}

export function applyPartPreset(parts, presetId) {
  if (!Array.isArray(parts)) return []
  if (!presetId || presetId === 'all') return parts
  const preset = PART_PRESETS.find((p) => p.id === presetId)
  if (!preset?.match) return parts
  return parts.filter((p) => {
    try {
      return preset.match(p)
    } catch {
      return false
    }
  })
}
