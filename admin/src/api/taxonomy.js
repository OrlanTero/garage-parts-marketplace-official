import client from './client.js'

/**
 * Taxonomy API — live Brand / Model / Category catalog.
 * Reads are public; writes hit the admin endpoints (auth + role:admin).
 * All counts (Compatible Parts, Catalog Items) are computed by the backend.
 */

export const unwrapList = (v) => (Array.isArray(v) ? v : v?.data ?? [])
const unwrapOne = (r) => r.data?.data ?? r.data

export const taxonomyApi = {
  // --- Reads (public) ---
  getBrands: (params = {}) => client.get('/taxonomy/brands', { params }).then((r) => unwrapList(r.data)),
  getModels: (params = {}) =>
    client.get('/taxonomy/models', { params }).then((r) => unwrapList(r.data?.data ?? r.data)),
  getCategories: () => client.get('/taxonomy/categories').then((r) => unwrapList(r.data)),
  // Spec vocabularies (body styles, transmissions, conditions) from backend enums.
  getSpecs: () =>
    client.get('/taxonomy/meta').then((r) => r.data?.data?.specs ?? r.data?.specs ?? {}),

  // --- Brand writes (admin) ---
  createBrand: (payload) => client.post('/admin/taxonomy/brands', payload).then(unwrapOne),
  updateBrand: (id, payload) => client.patch(`/admin/taxonomy/brands/${id}`, payload).then(unwrapOne),
  deleteBrand: (id) => client.delete(`/admin/taxonomy/brands/${id}`).then((r) => r.data),

  // --- Model writes (admin) ---
  createModel: (brandId, payload) =>
    client.post(`/admin/taxonomy/brands/${brandId}/models`, payload).then(unwrapOne),
  updateModel: (id, payload) =>
    client.patch(`/admin/taxonomy/models/${id}`, payload).then(unwrapOne),
  deleteModel: (id) => client.delete(`/admin/taxonomy/models/${id}`).then((r) => r.data),

  // --- Category writes (admin) ---
  createCategory: (payload) => client.post('/admin/taxonomy/categories', payload).then(unwrapOne),
  updateCategory: (id, payload) =>
    client.patch(`/admin/taxonomy/categories/${id}`, payload).then(unwrapOne),
  deleteCategory: (id) => client.delete(`/admin/taxonomy/categories/${id}`).then((r) => r.data),
  createSubcategory: (categoryId, payload) =>
    client.post(`/admin/taxonomy/categories/${categoryId}/subcategories`, payload).then((r) => r.data?.data ?? r.data),
  deleteSubcategory: (id) => client.delete(`/admin/taxonomy/subcategories/${id}`).then((r) => r.data),
}

/** Normalize one brand row regardless of which endpoint produced it. */
export const normalizeBrand = (b) => ({
  ...b,
  id: b.id,
  brand: b.name ?? b.brand,
  country: b.country ?? '—',
  region: b.region ?? 'other',
  carsCount: b.cars_count ?? 0,
  activeModels: (Array.isArray(b.car_models) ? b.car_models : b.car_models?.data ?? b.activeModels ?? []).map((m) => ({
    ...m,
    engines: Array.isArray(m.engines) ? m.engines : m.engines ? [m.engines] : [],
    partsCount: m.compatible_parts_count ?? m.parts_count ?? m.partsCount ?? 0,
    years: m.years_label ?? m.years ?? '',
  })),
})

/** Normalize one category row regardless of which endpoint produced it. */
export const normalizeCategory = (c) => ({
  ...c,
  parts: c.parts_count ?? c.parts ?? 0,
  subcategories: (Array.isArray(c.subcategories) ? c.subcategories : c.subcategories?.data ?? []).map((s) =>
    typeof s === 'string' ? { id: null, name: s, slug: '' } : { id: s.id ?? null, name: s.name, slug: s.slug ?? '' }
  ),
})

export const REGION_LABELS = {
  japanese: 'JAPAN',
  european: 'EUROPE',
  american: 'USA',
  korean: 'KOREA',
  german: 'GERMANY',
  other: 'OTHER',
}

/** Offline fallback spec vocabularies (mirror backend enums). */
export const FALLBACK_SPECS = {
  body_styles: ['sedan', 'hatchback', 'suv', 'crossover', 'coupe', 'convertible', 'pickup', 'van', 'wagon', 'other'],
  transmissions: ['manual', 'automatic', 'semi_automatic'],
  fuel_types: ['petrol', 'diesel', 'hybrid', 'electric', 'other'],
  car_conditions: ['new', 'used'],
  part_conditions: ['new', 'used', 'refurbished'],
}

export const specOptions = (specs, key) =>
  specs?.[key]?.length ? specs[key] : FALLBACK_SPECS[key] ?? []

export const specLabel = (value) =>
  String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
